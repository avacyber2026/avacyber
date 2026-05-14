"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SideMenu } from "@/Components";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useColorMode } from "@/contexts/ThemeContext";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import {
  MdSecurity,
  MdOutlineShield,
  MdOutlineWarningAmber,
  MdOutlineRule,
  MdOutlineStorage,
  MdOutlineStream,
  MdClose,
  MdCheck,
  MdAutoAwesome,
  MdRefresh,
  MdAdd,
} from "react-icons/md";
import {
  IoAlertCircle,
  IoCheckmarkCircle,
  IoSearch,
  IoEllipsisHorizontal,
  IoChevronDown,
} from "react-icons/io5";
import { FaShieldAlt, FaServer, FaCloud, FaNetworkWired, FaDesktop } from "react-icons/fa";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SiemStats {
  events24h: number;
  activeAlerts: number;
  activeRules: number;
  activeSources: number;
  severityBreakdown: Record<string, number>;
}

interface SiemAlert {
  id: number;
  rule_name: string;
  severity: string;
  status: string;
  source_ip: string | null;
  username: string | null;
  hostname: string | null;
  description: string | null;
  ai_score: number | null;
  ai_summary: string | null;
  ai_generated: boolean | null;
  assigned_to: string | null;
  ticket_id: number | null;
  created_at: string;
}

interface SiemEvent {
  id: number;
  source_name: string | null;
  event_type: string;
  severity: string;
  source_ip: string | null;
  destination_ip: string | null;
  username: string | null;
  hostname: string | null;
  raw_log: string | null;
  ingested_at: string;
}

interface SiemRule {
  id: number;
  name: string;
  description: string | null;
  severity: string;
  enabled: boolean;
  ai_generated: boolean;
  hit_count: number;
  false_positive_count: number;
  logic: Record<string, unknown>;
  sigma_yaml: string | null;
  spl: string | null;
  kql: string | null;
  created_at: string;
}

interface SiemSource {
  id: number;
  name: string;
  type: string;
  description: string | null;
  enabled: boolean;
  last_seen: string | null;
  event_count: number;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEV_LEFT: Record<string, string> = {
  critical: "border-l-red-500",
  high:     "border-l-orange-500",
  medium:   "border-l-amber-500",
  low:      "border-l-blue-400",
  info:     "border-l-slate-300 dark:border-l-slate-600",
};

const SEV_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high:     "bg-orange-500",
  medium:   "bg-amber-500",
  low:      "bg-blue-400",
  info:     "bg-slate-400",
};

const SEV_TEXT: Record<string, string> = {
  critical: "text-red-500",
  high:     "text-orange-500",
  medium:   "text-amber-500",
  low:      "text-blue-400",
  info:     "text-slate-400",
};

// kept for compatibility
const SEV_COLOR: Record<string, string> = {
  critical: "text-red-500 bg-red-500/8 border-red-500/20",
  high:     "text-orange-500 bg-orange-500/8 border-orange-500/20",
  medium:   "text-amber-500 bg-amber-500/8 border-amber-500/20",
  low:      "text-blue-400 bg-blue-400/8 border-blue-400/20",
  info:     "text-slate-400 bg-slate-400/8 border-slate-400/15",
};

function SevBadge({ severity }: { severity: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide ${SEV_TEXT[severity] ?? "text-slate-400"}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEV_DOT[severity] ?? "bg-slate-400"}`} />
      {severity}
    </span>
  );
}

function AiScore({ score }: { score: number | null }) {
  if (score === null) return <span className="text-sm text-slate-300 dark:text-slate-600 tabular-nums font-mono">—</span>;
  const color = score >= 80 ? "text-red-500" : score >= 50 ? "text-orange-500" : "text-slate-400";
  return (
    <span className={`text-sm font-bold tabular-nums font-mono ${color}`}>{score}</span>
  );
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatRelative(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

const SOURCE_ICON: Record<string, React.ReactNode> = {
  syslog:   <FaNetworkWired size={14} />,
  api:      <FaServer size={14} />,
  aws:      <FaCloud size={14} />,
  azure:    <FaCloud size={14} />,
  gcp:      <FaCloud size={14} />,
  endpoint: <FaDesktop size={14} />,
  custom:   <FaServer size={14} />,
};

const card = "rounded-xl border border-slate-200 dark:border-[#1e1e1e] bg-white dark:bg-[#111111]";
const glass = card; // alias kept so existing uses work

// ── Status filter tabs ─────────────────────────────────────────────────────────

type Tab = "overview" | "alerts" | "events" | "rules" | "sources";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview",  icon: <MdOutlineShield size={16} /> },
  { key: "alerts",   label: "Alerts",    icon: <MdOutlineWarningAmber size={16} /> },
  { key: "events",   label: "Events",    icon: <MdOutlineStream size={16} /> },
  { key: "rules",    label: "Detections",icon: <MdOutlineRule size={16} /> },
  { key: "sources",  label: "Sources",   icon: <MdOutlineStorage size={16} /> },
];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SiemPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { colorMode } = useColorMode();
  const isDark = colorMode === "dark";

  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<SiemStats | null>(null);
  const [alerts, setAlerts] = useState<SiemAlert[]>([]);
  const [events, setEvents] = useState<SiemEvent[]>([]);
  const [rules, setRules] = useState<SiemRule[]>([]);
  const [sources, setSources] = useState<SiemSource[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Rules tab state
  const [aiRulePrompt, setAiRulePrompt] = useState("");
  const [aiRuleLoading, setAiRuleLoading] = useState(false);
  const [generatedRule, setGeneratedRule] = useState<Partial<SiemRule & { reasoning: string; sigma_yaml: string }> | null>(null);

  // Rules expand state
  const [expandedRules, setExpandedRules] = useState<Set<number>>(new Set());
  const toggleRuleExpand = (id: number) => setExpandedRules(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const [ruleQueryTab, setRuleQueryTab] = useState<Record<number, string>>({});
  const [translatingRules, setTranslatingRules] = useState<Set<number>>(new Set());

  async function translateRule(id: number) {
    setTranslatingRules(prev => new Set(prev).add(id));
    try {
      const res = await api.post(`/siem/ai/translate-rule/${id}`);
      setRules(prev => prev.map(r => r.id === id ? { ...r, spl: res.data.spl, kql: res.data.kql, sigma_yaml: r.sigma_yaml || res.data.sigma_yaml } : r));
      toast.success("SPL & KQL generated");
    } catch {
      toast.error("Translation failed");
    } finally {
      setTranslatingRules(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  // Sources tab state
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSource, setNewSource] = useState({ name: "", type: "syslog", description: "" });

  // Events tab state
  const [eventSearch, setEventSearch] = useState("");
  const [eventSearchInput, setEventSearchInput] = useState("");

  // Alerts tab state
  const [alertFilter, setAlertFilter] = useState<string>("all");

  useEffect(() => {
    if (!isAuthenticated && !isLoading) router.push("/");
  }, [isAuthenticated, isLoading, router]);

  const fetchAll = useCallback(async () => {
    if (!isAuthenticated) return;
    setDataLoading(true);
    try {
      const [statsRes, alertsRes, eventsRes, rulesRes, sourcesRes] = await Promise.all([
        api.get("/siem/stats"),
        api.get("/siem/alerts?limit=20"),
        api.get("/siem/events?limit=30"),
        api.get("/siem/rules"),
        api.get("/siem/sources"),
      ]);
      setStats(statsRes.data);
      setAlerts(alertsRes.data.alerts ?? []);
      setEvents(eventsRes.data.events ?? []);
      setRules(rulesRes.data ?? []);
      setSources(sourcesRes.data ?? []);
    } catch {
      // silently fail — empty states shown
    } finally {
      setDataLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchEvents = useCallback(async (search = "") => {
    try {
      const res = await api.get(`/siem/events?limit=50${search ? `&search=${encodeURIComponent(search)}` : ""}`);
      setEvents(res.data.events ?? []);
    } catch {}
  }, []);

  // ── AI Rule Generation ──────────────────────────────────────────────────────
  async function handleGenerateRule() {
    if (!aiRulePrompt.trim()) return;
    setAiRuleLoading(true);
    setGeneratedRule(null);
    try {
      const res = await api.post("/siem/ai/generate-rule", { description: aiRulePrompt });
      setGeneratedRule(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "AI rule generation failed");
    } finally {
      setAiRuleLoading(false);
    }
  }

  async function handleSaveGeneratedRule() {
    if (!generatedRule?.name) return;
    try {
      const res = await api.post("/siem/rules", {
        name: generatedRule.name,
        description: generatedRule.description,
        logic: generatedRule.logic ?? {},
        sigma_yaml: generatedRule.sigma_yaml,
        severity: generatedRule.severity ?? "medium",
        ai_generated: true,
      });
      setRules((prev) => [res.data, ...prev]);
      setGeneratedRule(null);
      setAiRulePrompt("");
      toast.success("Detection rule saved");
    } catch {
      toast.error("Failed to save rule");
    }
  }

  async function toggleRule(rule: SiemRule) {
    try {
      const res = await api.put(`/siem/rules/${rule.id}`, { enabled: !rule.enabled });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, ...res.data } : r)));
    } catch {
      toast.error("Failed to update rule");
    }
  }

  async function deleteRule(id: number) {
    try {
      await api.delete(`/siem/rules/${id}`);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast.success("Rule deleted");
    } catch {
      toast.error("Failed to delete rule");
    }
  }

  // ── Alert actions ───────────────────────────────────────────────────────────
  async function updateAlertStatus(id: number, status: string) {
    try {
      await api.put(`/siem/alerts/${id}`, { status });
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      toast.success(status === "resolved" ? "Alert resolved" : "Alert updated");
    } catch {
      toast.error("Failed to update alert");
    }
  }

  async function triageAlert(id: number) {
    try {
      toast.loading("AI is triaging...", { id: `triage-${id}` });
      const res = await api.post(`/siem/ai/triage/${id}`);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ai_score: res.data.score, ai_summary: res.data.summary } : a)));
      toast.success(`AI score: ${res.data.score}/100 — ${res.data.recommended_action}`, { id: `triage-${id}` });
    } catch {
      toast.error("AI triage failed", { id: `triage-${id}` });
    }
  }

  // ── Source management ────────────────────────────────────────────────────────
  async function addSource() {
    if (!newSource.name || !newSource.type) return;
    try {
      const res = await api.post("/siem/sources", newSource);
      setSources((prev) => [res.data, ...prev]);
      setNewSource({ name: "", type: "syslog", description: "" });
      setShowAddSource(false);
      toast.success("Source added");
    } catch {
      toast.error("Failed to add source");
    }
  }

  async function deleteSource(id: number) {
    try {
      await api.delete(`/siem/sources/${id}`);
      setSources((prev) => prev.filter((s) => s.id !== id));
      toast.success("Source removed");
    } catch {
      toast.error("Failed to remove source");
    }
  }

  if (!isAuthenticated && !isLoading) return null;

  const filteredAlerts = alertFilter === "all" ? alerts : alerts.filter((a) => a.status === alertFilter);

  // ── Stats cards data ─────────────────────────────────────────────────────────
  const statCards = [
    {
      label: "Events (24h)",
      value: dataLoading ? "—" : (stats?.events24h ?? 0).toLocaleString(),
      icon: <MdOutlineStream size={22} />,
      grad: "from-[#103E36] to-[#1F6A5C]",
      sub: "ingested log events",
    },
    {
      label: "Active Alerts",
      value: dataLoading ? "—" : (stats?.activeAlerts ?? 0).toLocaleString(),
      icon: <IoAlertCircle size={22} />,
      grad: "from-red-700 to-red-500",
      sub: "require attention",
    },
    {
      label: "Detection Rules",
      value: dataLoading ? "—" : (stats?.activeRules ?? 0).toLocaleString(),
      icon: <MdOutlineRule size={22} />,
      grad: "from-[#1F6A5C] to-[#50BFA0]",
      sub: "active rules",
    },
    {
      label: "Log Sources",
      value: dataLoading ? "—" : (stats?.activeSources ?? 0).toLocaleString(),
      icon: <MdOutlineStorage size={22} />,
      grad: "from-[#103E36] to-[#50BFA0]",
      sub: "connected sources",
    },
  ];

  return (
    <>
      <SideMenu />
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A]" style={{ paddingLeft: "var(--app-sidebar-width, 308px)" }}>
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-8 pb-16">

          {/* ── Header ── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">SIEM</h1>
              <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                live
              </span>
            </div>
            <button onClick={fetchAll} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-[#2a2a2a] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors">
              <MdRefresh size={14} />
              Refresh
            </button>
          </motion.div>

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {statCards.map((c, i) => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`${card} p-5`}>
                <div className="text-3xl font-semibold tabular-nums text-slate-900 dark:text-white mb-1">{c.value}</div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wide">{c.label}</div>
              </motion.div>
            ))}
          </div>

          {/* ── Severity breakdown ── */}
          {stats && Object.keys(stats.severityBreakdown).length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center gap-4 mb-6 px-1">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-600 uppercase tracking-wide">Open</span>
              {(["critical","high","medium","low","info"] as const).map((sev) =>
                (stats.severityBreakdown[sev] ?? 0) > 0 ? (
                  <span key={sev} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                    <span className={`w-1.5 h-1.5 rounded-full ${SEV_DOT[sev]}`} />
                    <span className="capitalize">{sev}</span>
                    <span className="text-slate-400 dark:text-slate-600">{stats.severityBreakdown[sev]}</span>
                  </span>
                ) : null
              )}
            </motion.div>
          )}

          {/* ── Tab navigation ── */}
          <div className="flex gap-0 border-b border-slate-200 dark:border-[#1e1e1e] mb-6">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                  tab === t.key
                    ? "border-slate-900 dark:border-white text-slate-900 dark:text-white"
                    : "border-transparent text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300"
                }`}>
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Tab content ── */}
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

              {/* ────────── OVERVIEW ────────── */}
              {tab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                  {/* Recent alerts */}
                  <div className={`lg:col-span-2 ${card} overflow-hidden`}>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#1e1e1e]">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">Recent Alerts</span>
                      <button onClick={() => setTab("alerts")} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">View all →</button>
                    </div>
                    {dataLoading ? (
                      <div className="p-4 space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-slate-100 dark:bg-[#1a1a1a] animate-pulse" />)}</div>
                    ) : alerts.length === 0 ? (
                      <EmptyState icon={<IoAlertCircle size={28} />} title="No alerts yet" sub="Alerts appear when detection rules match events." />
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-[#1a1a1a]">
                        {alerts.slice(0, 8).map((a) => (
                          <div key={a.id} className={`flex items-center gap-3 px-5 py-3 border-l-[3px] hover:bg-slate-50 dark:hover:bg-[#161616] transition-colors ${SEV_LEFT[a.severity] ?? "border-l-slate-200"}`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{a.rule_name}</span>
                                <SevBadge severity={a.severity} />
                              </div>
                              <div className="text-xs text-slate-400 dark:text-slate-600 mt-0.5 font-mono truncate">
                                {a.source_ip && <span className="mr-3">{a.source_ip}</span>}
                                {a.username && <span className="mr-3">{a.username}</span>}
                                {formatRelative(a.created_at)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <AiScore score={a.ai_score} />
                              <StatusBadge status={a.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right column */}
                  <div className="flex flex-col gap-4">
                    <div className={`${card} overflow-hidden`}>
                      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#1e1e1e]">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">Log Sources</span>
                        <button onClick={() => setTab("sources")} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Manage →</button>
                      </div>
                      {sources.length === 0 ? (
                        <EmptyState icon={<MdOutlineStorage size={24} />} title="No sources" sub="Connect a log source." compact />
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-[#1a1a1a]">
                          {sources.slice(0, 5).map((s) => (
                            <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{s.name}</div>
                                <div className="text-xs text-slate-400 font-mono">{s.event_count.toLocaleString()} events</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={`${card} overflow-hidden`}>
                      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#1e1e1e]">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">Top Rules</span>
                        <button onClick={() => setTab("rules")} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">All →</button>
                      </div>
                      {rules.length === 0 ? (
                        <EmptyState icon={<MdOutlineRule size={24} />} title="No rules" sub="Detection rules load from DB." compact />
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-[#1a1a1a]">
                          {rules.filter(r => r.enabled).slice(0, 5).map((r) => (
                            <div key={r.id} className="flex items-center gap-2 px-5 py-3">
                              <SevBadge severity={r.severity} />
                              <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">{r.name}</span>
                              <span className="text-xs text-slate-400 tabular-nums font-mono">{r.hit_count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ────────── ALERTS ────────── */}
              {tab === "alerts" && (
                <div className={`${card} overflow-hidden`}>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#1e1e1e] flex-wrap gap-3">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">Alert Queue <span className="text-slate-400 font-normal ml-1">({filteredAlerts.length})</span></span>
                    <div className="flex gap-1 flex-wrap">
                      {(["all","open","investigating","resolved","suppressed"] as const).map((f) => (
                        <button key={f} onClick={() => setAlertFilter(f)}
                          className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${
                            alertFilter === f
                              ? "bg-slate-900 dark:bg-white text-white dark:text-black"
                              : "text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                          }`}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredAlerts.length === 0 ? (
                    <EmptyState icon={<IoAlertCircle size={32} />} title="No alerts" sub="When detection rules fire, alerts appear here." />
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-[#1a1a1a]">
                      {filteredAlerts.map((a) => (
                        <div key={a.id} className={`flex items-start gap-4 px-5 py-4 border-l-[3px] hover:bg-slate-50 dark:hover:bg-[#161616] transition-colors ${SEV_LEFT[a.severity] ?? "border-l-slate-200"}`}>
                          <div className="pt-0.5 shrink-0 w-8 text-center">
                            <AiScore score={a.ai_score} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-semibold text-slate-900 dark:text-white">{a.rule_name}</span>
                              <SevBadge severity={a.severity} />
                              <StatusBadge status={a.status} />
                              {a.ai_generated && <span className="text-xs text-purple-400 font-medium">· AI</span>}
                            </div>
                            {a.description && <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 line-clamp-2">{a.description}</p>}
                            {a.ai_summary && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1.5 flex items-start gap-1">
                                <MdAutoAwesome size={12} className="mt-0.5 shrink-0 text-purple-400" />
                                {a.ai_summary}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-3 text-xs text-slate-400 dark:text-slate-600 font-mono">
                              {a.source_ip && <span>{a.source_ip}</span>}
                              {a.username && <span>{a.username}</span>}
                              {a.hostname && <span>{a.hostname}</span>}
                              <span>{formatTime(a.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5 shrink-0">
                            {a.ai_score === null && a.status === "open" && (
                              <button onClick={() => triageAlert(a.id)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-slate-200 dark:border-[#2a2a2a] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors whitespace-nowrap">
                                <MdAutoAwesome size={12} className="text-purple-400" /> AI Triage
                              </button>
                            )}
                            {a.status === "open" && (
                              <button onClick={() => updateAlertStatus(a.id, "investigating")}
                                className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-slate-200 dark:border-[#2a2a2a] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors whitespace-nowrap">
                                Investigate
                              </button>
                            )}
                            {a.status !== "resolved" && (
                              <button onClick={() => updateAlertStatus(a.id, "resolved")}
                                className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-slate-200 dark:border-[#2a2a2a] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-colors whitespace-nowrap">
                                Resolve
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ────────── EVENTS ────────── */}
              {tab === "events" && (
                <div className={`${card} overflow-hidden`}>
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-[#1e1e1e] flex-wrap">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white flex-1">Live Event Stream</span>
                    <div className="flex gap-2 items-center">
                      <div className="relative">
                        <IoSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          value={eventSearchInput}
                          onChange={(e) => setEventSearchInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { setEventSearch(eventSearchInput); fetchEvents(eventSearchInput); }}}
                          placeholder="Search logs, IPs, usernames…"
                          className="pl-8 pr-3 py-1.5 rounded-lg text-sm border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0A0A0A] text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 w-56"
                        />
                      </div>
                      <button onClick={() => { setEventSearch(eventSearchInput); fetchEvents(eventSearchInput); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 dark:bg-white text-white dark:text-black transition-colors">
                        Search
                      </button>
                    </div>
                  </div>

                  {events.length === 0 ? (
                    <EmptyState icon={<MdOutlineStream size={32} />} title="No events ingested yet"
                      sub="Send logs to POST /siem/events/ingest or connect a log source." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-600 border-b border-slate-100 dark:border-[#1e1e1e]">
                            <th className="pb-3 pt-3 px-5 pr-4">Time</th>
                            <th className="pb-3 pt-3 pr-4">Source</th>
                            <th className="pb-3 pt-3 pr-4">Type</th>
                            <th className="pb-3 pt-3 pr-4">Severity</th>
                            <th className="pb-3 pt-3 pr-4">IP</th>
                            <th className="pb-3 pt-3 pr-4">User</th>
                            <th className="pb-3 pt-3 pr-5">Message</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#1a1a1a]">
                          {events.map((e) => (
                            <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-[#161616] transition-colors">
                              <td className="py-2.5 px-5 pr-4 text-xs text-slate-400 whitespace-nowrap font-mono">{formatRelative(e.ingested_at)}</td>
                              <td className="py-2.5 pr-4 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">{e.source_name ?? "—"}</td>
                              <td className="py-2.5 pr-4 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">{e.event_type}</td>
                              <td className="py-2.5 pr-4"><SevBadge severity={e.severity} /></td>
                              <td className="py-2.5 pr-4 text-xs font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">{e.source_ip ?? "—"}</td>
                              <td className="py-2.5 pr-4 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">{e.username ?? "—"}</td>
                              <td className="py-2.5 pr-5 text-xs text-slate-400 dark:text-slate-600 max-w-xs truncate">{e.raw_log ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ────────── RULES (DETECTIONS) ────────── */}
              {tab === "rules" && (
                <div className="space-y-4">
                  {/* AI Rule Builder */}
                  <div className={`${card} overflow-hidden`}>
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 dark:border-[#1e1e1e]">
                      <MdAutoAwesome size={15} className="text-purple-400" />
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">AI Rule Builder</span>
                      <span className="text-xs text-purple-400 font-medium ml-1">· AI</span>
                    </div>
                    <div className="p-5">
                      <p className="text-xs text-slate-400 dark:text-slate-600 mb-3">Describe what you want to detect in plain English.</p>
                      <div className="flex gap-2 flex-wrap">
                        <input
                          value={aiRulePrompt}
                          onChange={(e) => setAiRulePrompt(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && !aiRuleLoading) handleGenerateRule(); }}
                          placeholder='e.g. "Alert when a user logs in from outside the US between midnight and 6am"'
                          className="flex-1 min-w-[260px] px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0A0A0A] text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                        <button onClick={handleGenerateRule} disabled={aiRuleLoading || !aiRulePrompt.trim()}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-900 dark:bg-white text-white dark:text-black disabled:opacity-40 transition-colors flex items-center gap-1.5">
                          {aiRuleLoading ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</> : <><MdAutoAwesome size={14} /> Generate</>}
                        </button>
                      </div>

                      {generatedRule && (
                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          className="mt-4 rounded-lg border border-slate-200 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#161616] p-4">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{generatedRule.name}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{generatedRule.description}</div>
                              {generatedRule.reasoning && <div className="text-xs text-purple-400 mt-1.5">{generatedRule.reasoning}</div>}
                            </div>
                            {generatedRule.severity && <SevBadge severity={generatedRule.severity} />}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={handleSaveGeneratedRule} className="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-900 dark:bg-white text-white dark:text-black">Save Rule</button>
                            <button onClick={() => setGeneratedRule(null)} className="px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 dark:border-[#2a2a2a] text-slate-500 dark:text-slate-400">Discard</button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {/* Rules list */}
                  <div className={`${card} overflow-hidden`}>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#1e1e1e]">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">Detection Rules <span className="text-slate-400 font-normal ml-1">({rules.length})</span></span>
                    </div>
                    {rules.length === 0 ? (
                      <EmptyState icon={<MdOutlineRule size={32} />} title="No rules" sub="Run the migration to load default detection rules." />
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-[#1a1a1a]">
                        {rules.map((r) => (
                          <div key={r.id} className={`flex items-start gap-4 px-5 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-[#161616] ${!r.enabled ? "opacity-50" : ""}`}>
                            {/* Toggle */}
                            <button onClick={() => toggleRule(r)}
                              className={`mt-0.5 w-9 h-5 rounded-full transition-colors shrink-0 relative ${r.enabled ? "bg-slate-900 dark:bg-white" : "bg-slate-200 dark:bg-[#2a2a2a]"}`}>
                              <span className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-transform ${r.enabled ? "translate-x-[18px] bg-white dark:bg-slate-900" : "translate-x-0.5 bg-white dark:bg-slate-400"}`} />
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-sm font-medium text-slate-900 dark:text-white">{r.name}</span>
                                <SevBadge severity={r.severity} />
                                {r.ai_generated && <span className="text-xs text-purple-400 font-medium">· AI</span>}
                              </div>
                              {r.description && <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">{r.description}</p>}
                              <div className="flex gap-4 text-xs text-slate-400 dark:text-slate-600 font-mono mb-2">
                                <span>{r.hit_count} hits</span>
                                <span>{r.false_positive_count} fp</span>
                                <span>{formatRelative(r.created_at)}</span>
                              </div>
                              {/* Expand button */}
                              <button onClick={() => toggleRuleExpand(r.id)}
                                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors font-medium">
                                <IoChevronDown size={12} className={`transition-transform ${expandedRules.has(r.id) ? "rotate-180" : ""}`} />
                                {expandedRules.has(r.id) ? "Hide" : "View logic"}
                              </button>
                              {/* Expanded logic */}
                              <AnimatePresence>
                                {expandedRules.has(r.id) && (
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                    className="mt-3 overflow-hidden">
                                    {/* Query language tabs */}
                                    <div className="flex items-center gap-1 mb-3 flex-wrap">
                                      {(["logic","sigma","spl","kql"] as const).map(qt => (
                                        <button key={qt} onClick={() => setRuleQueryTab(p => ({ ...p, [r.id]: qt }))}
                                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                            (ruleQueryTab[r.id] ?? "logic") === qt
                                              ? "bg-slate-900 dark:bg-white text-white dark:text-black"
                                              : "text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300 border border-transparent"
                                          }`}>
                                          {qt === "logic" ? "Logic" : qt === "sigma" ? "Sigma" : qt === "spl" ? "SPL" : "KQL"}
                                        </button>
                                      ))}
                                      {(!r.spl || !r.kql) && (
                                        <button onClick={() => translateRule(r.id)} disabled={translatingRules.has(r.id)}
                                          className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 dark:border-[#2a2a2a] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1a1a1a] disabled:opacity-50 transition-colors">
                                          {translatingRules.has(r.id)
                                            ? <><span className="w-3 h-3 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" /> Generating…</>
                                            : <><MdAutoAwesome size={11} className="text-purple-400" /> Generate SPL &amp; KQL</>}
                                        </button>
                                      )}
                                    </div>

                                    {/* Logic */}
                                    {(ruleQueryTab[r.id] ?? "logic") === "logic" && (
                                      <pre className="text-xs font-mono rounded-lg bg-slate-900 text-emerald-400 p-4 overflow-x-auto border border-slate-700/50">
                                        {JSON.stringify(r.logic, null, 2)}
                                      </pre>
                                    )}
                                    {/* Sigma */}
                                    {ruleQueryTab[r.id] === "sigma" && (
                                      r.sigma_yaml
                                        ? <pre className="text-xs font-mono rounded-lg bg-slate-900 text-sky-300 p-4 overflow-x-auto border border-slate-700/50 whitespace-pre-wrap">{r.sigma_yaml}</pre>
                                        : <div className="text-xs text-slate-500 italic p-3">No Sigma rule yet — click "Generate SPL &amp; KQL" to create all formats.</div>
                                    )}
                                    {/* SPL */}
                                    {ruleQueryTab[r.id] === "spl" && (
                                      r.spl
                                        ? <pre className="text-xs font-mono rounded-lg bg-slate-900 text-orange-300 p-4 overflow-x-auto border border-slate-700/50 whitespace-pre-wrap">{r.spl}</pre>
                                        : <div className="flex flex-col items-start gap-2 p-3">
                                            <div className="text-xs text-slate-400 dark:text-slate-600">No SPL query yet.</div>
                                            <button onClick={() => translateRule(r.id)} disabled={translatingRules.has(r.id)}
                                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-slate-200 dark:border-[#2a2a2a] text-slate-500 disabled:opacity-50 transition-colors">
                                              {translatingRules.has(r.id) ? "Generating…" : <><MdAutoAwesome size={12} className="text-purple-400" /> Generate SPL</>}
                                            </button>
                                          </div>
                                    )}
                                    {/* KQL */}
                                    {ruleQueryTab[r.id] === "kql" && (
                                      r.kql
                                        ? <pre className="text-xs font-mono rounded-lg bg-slate-900 text-blue-300 p-4 overflow-x-auto border border-slate-700/50 whitespace-pre-wrap">{r.kql}</pre>
                                        : <div className="flex flex-col items-start gap-2 p-3">
                                            <div className="text-xs text-slate-400 dark:text-slate-600">No KQL query yet.</div>
                                            <button onClick={() => translateRule(r.id)} disabled={translatingRules.has(r.id)}
                                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-slate-200 dark:border-[#2a2a2a] text-slate-500 disabled:opacity-50 transition-colors">
                                              {translatingRules.has(r.id) ? "Generating…" : <><MdAutoAwesome size={12} className="text-purple-400" /> Generate KQL</>}
                                            </button>
                                          </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                            <button onClick={() => deleteRule(r.id)}
                              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-[#1a1a1a] text-slate-300 dark:text-slate-700 hover:text-red-400 dark:hover:text-red-500 transition-colors shrink-0">
                              <MdClose size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ────────── SOURCES ────────── */}
              {tab === "sources" && (
                <div className={`${card} overflow-hidden`}>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#1e1e1e]">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">Log Sources</span>
                    <button onClick={() => setShowAddSource(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 dark:bg-white text-white dark:text-black transition-colors">
                      <MdAdd size={13} /> Add Source
                    </button>
                  </div>

                  <AnimatePresence>
                    {showAddSource && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="border-b border-slate-100 dark:border-[#1e1e1e] bg-slate-50 dark:bg-[#161616] p-5 overflow-hidden">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">Connect a Log Source</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                          <input value={newSource.name} onChange={(e) => setNewSource(s => ({ ...s, name: e.target.value }))}
                            placeholder="Source name (e.g. Firewall-01)"
                            className="px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0A0A0A] text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
                          <select value={newSource.type} onChange={(e) => setNewSource(s => ({ ...s, type: e.target.value }))}
                            className="px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0A0A0A] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-400">
                            <option value="syslog">Syslog (UDP/TCP 514)</option>
                            <option value="api">REST API</option>
                            <option value="aws">AWS CloudTrail</option>
                            <option value="azure">Azure Activity Logs</option>
                            <option value="gcp">GCP Audit Logs</option>
                            <option value="endpoint">Endpoint Agent</option>
                            <option value="custom">Custom</option>
                          </select>
                          <input value={newSource.description} onChange={(e) => setNewSource(s => ({ ...s, description: e.target.value }))}
                            placeholder="Description (optional)"
                            className="px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0A0A0A] text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={addSource} className="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-900 dark:bg-white text-white dark:text-black">Add</button>
                          <button onClick={() => setShowAddSource(false)} className="px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 dark:border-[#2a2a2a] text-slate-500 dark:text-slate-400">Cancel</button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {sources.length === 0 ? (
                    <EmptyState icon={<MdOutlineStorage size={32} />} title="No sources connected"
                      sub="Connect your first log source. Supports syslog, REST API, AWS, Azure, GCP." />
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-[#1a1a1a]">
                      {sources.map((s) => (
                        <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-[#161616] transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#1a1a1a] flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                            {SOURCE_ICON[s.type] ?? <FaServer size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-medium text-slate-900 dark:text-white">{s.name}</span>
                              <span className="text-xs text-slate-400 capitalize">{s.type}</span>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />
                            </div>
                            <div className="flex gap-4 text-xs text-slate-400 dark:text-slate-600 font-mono">
                              <span>{s.event_count.toLocaleString()} events</span>
                              {s.last_seen && <span>last {formatRelative(s.last_seen)}</span>}
                              {s.description && <span className="font-sans">{s.description}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <code className="text-xs font-mono text-slate-400 dark:text-slate-600">POST /siem/events/ingest</code>
                            <button onClick={() => deleteSource(s.id)}
                              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-[#1a1a1a] text-slate-300 dark:text-slate-700 hover:text-red-400 dark:hover:text-red-500 transition-colors">
                              <MdClose size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyState({ icon, title, sub, compact = false }: { icon: React.ReactNode; title: string; sub: string; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "py-6" : "py-12"}`}>
      <div className="mb-2 text-slate-200 dark:text-slate-800">{icon}</div>
      <div className="text-sm font-medium text-slate-500 dark:text-slate-500 mb-1">{title}</div>
      <div className="text-xs text-slate-400 dark:text-slate-600 max-w-xs">{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open:          "text-red-500",
    investigating: "text-amber-500",
    resolved:      "text-slate-400 dark:text-slate-600",
    suppressed:    "text-slate-400 dark:text-slate-600",
  };
  return (
    <span className={`text-xs font-medium capitalize ${map[status] ?? map.open}`}>
      {status}
    </span>
  );
}
