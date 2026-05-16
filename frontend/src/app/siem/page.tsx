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
  ai_narrative: string | null;
  ai_generated: boolean | null;
  assigned_to: string | null;
  ticket_id: number | null;
  created_at: string;
  updated_at: string;
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

const SEV_COLOR: Record<string, string> = {
  critical: "text-red-500 bg-red-500/10 border-red-500/30",
  high:     "text-orange-400 bg-orange-400/10 border-orange-400/30",
  medium:   "text-amber-400 bg-amber-400/10 border-amber-400/30",
  low:      "text-teal-400 bg-teal-400/10 border-teal-400/30",
  info:     "text-[#1F6A5C]/60 bg-[#50BFA0]/40 border-[#1F6A5C]/35",
};

const SEV_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high:     "bg-orange-400",
  medium:   "bg-amber-400",
  low:      "bg-teal-400",
  info:     "bg-[#50BFA0]/40",
};

function SevBadge({ severity }: { severity: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${SEV_COLOR[severity] ?? SEV_COLOR.info}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${SEV_DOT[severity] ?? "bg-[#50BFA0]/40"}`} />
      {severity}
    </span>
  );
}

function AiScore({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-[#1F6A5C]/70">—</span>;
  const color = score >= 80 ? "text-red-400" : score >= 50 ? "text-orange-400" : "text-[#1F6A5C]/60";
  const ring = score >= 80 ? "ring-red-500/40" : score >= 50 ? "ring-orange-400/40" : "ring-slate-400/20";
  return (
    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full ring-2 ${ring} bg-transparent text-sm font-bold tabular-nums ${color}`}>
      {score}
    </span>
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

const glass = "rounded-xl border border-white/60 dark:border-[#192420] bg-white/55 dark:bg-[#1B2620] shadow-[0_4px_24px_-8px_rgba(31,106,92,0.12)]";

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

  // Alert detail panel
  const [selectedAlert, setSelectedAlert] = useState<SiemAlert | null>(null);
  const [investigatingId, setInvestigatingId] = useState<number | null>(null);

  // Resolve modal
  const [resolveModal, setResolveModal] = useState<number | null>(null);
  const [resolveType, setResolveType] = useState<"true_positive" | "false_positive" | "benign">("true_positive");
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolving, setResolving] = useState(false);

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

  async function submitResolve() {
    if (resolveModal === null) return;
    setResolving(true);
    try {
      await api.post(`/siem/alerts/${resolveModal}/resolve`, { resolution_type: resolveType, notes: resolveNotes });
      setAlerts((prev) => prev.map((a) => (a.id === resolveModal ? { ...a, status: "resolved" } : a)));
      if (selectedAlert?.id === resolveModal) setSelectedAlert(p => p ? { ...p, status: "resolved" } : p);
      toast.success("Alert resolved — queued for AI QA");
      setResolveModal(null);
      setResolveNotes("");
      setResolveType("true_positive");
    } catch {
      toast.error("Failed to resolve alert");
    } finally {
      setResolving(false);
    }
  }

  function openResolveModal(id: number) {
    setResolveModal(id);
    setResolveNotes("");
    setResolveType("true_positive");
  }

  async function triageAlert(id: number) {
    try {
      toast.loading("AI is triaging...", { id: `triage-${id}` });
      const res = await api.post(`/siem/ai/triage/${id}`);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ai_score: res.data.score, ai_summary: res.data.summary } : a)));
      if (selectedAlert?.id === id) setSelectedAlert((prev) => prev ? { ...prev, ai_score: res.data.score, ai_summary: res.data.summary } : prev);
      toast.success(`AI score: ${res.data.score}/100 — ${res.data.recommended_action}`, { id: `triage-${id}` });
    } catch {
      toast.error("AI triage failed", { id: `triage-${id}` });
    }
  }

  async function investigateAlert(id: number) {
    setInvestigatingId(id);
    try {
      toast.loading("AI is investigating...", { id: `inv-${id}` });
      const res = await api.post(`/siem/ai/investigate/${id}`);
      const narrative = JSON.stringify(res.data);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ai_narrative: narrative } : a)));
      if (selectedAlert?.id === id) setSelectedAlert((prev) => prev ? { ...prev, ai_narrative: narrative } : prev);
      toast.success("AI investigation complete", { id: `inv-${id}` });
    } catch {
      toast.error("AI investigation failed", { id: `inv-${id}` });
    } finally {
      setInvestigatingId(null);
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
      <div className="min-h-screen bg-[#F4F3F4] dark:bg-[#131C18]" style={{ paddingLeft: "var(--app-sidebar-width, 308px)" }}>
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-6 pb-16">

          {/* ── Header ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#103E36] to-[#1F6A5C] flex items-center justify-center text-white shadow-lg shadow-emerald-900/20">
                <MdSecurity size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-[#1C1E1C] dark:text-white leading-tight">SIEM</h1>
                <p className="text-sm text-[#1F6A5C]/70 dark:text-[#1F6A5C]/60">Security Information &amp; Event Management</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <button
              onClick={fetchAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-white/70 dark:border-[#192420] bg-white/60 dark:bg-[#1B2620] text-[#103E36] dark:text-[#F4F3F4]/80 hover:bg-white/90 dark:hover:bg-[#192420] transition-colors"
            >
              <MdRefresh size={16} />
              Refresh
            </button>
          </motion.div>

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((c, i) => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className={`${glass} p-5`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${c.grad} flex items-center justify-center text-white shadow-md`}>
                    {c.icon}
                  </div>
                </div>
                <div className="text-3xl font-light tabular-nums text-[#1C1E1C] dark:text-white mb-0.5">{c.value}</div>
                <div className="text-sm font-semibold text-[#103E36] dark:text-[#F4F3F4]/80">{c.label}</div>
                <div className="text-xs text-[#1F6A5C]/70 dark:text-[#1F6A5C]/60 mt-0.5">{c.sub}</div>
              </motion.div>
            ))}
          </div>

          {/* ── Severity breakdown ── */}
          {stats && Object.keys(stats.severityBreakdown).length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className={`${glass} p-4 mb-6 flex flex-wrap items-center gap-4`}>
              <span className="text-xs font-bold uppercase tracking-wider text-[#1F6A5C]/70 dark:text-[#1F6A5C]/60 mr-1">Open alerts by severity</span>
              {(["critical","high","medium","low","info"] as const).map((sev) =>
                (stats.severityBreakdown[sev] ?? 0) > 0 ? (
                  <span key={sev} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border capitalize ${SEV_COLOR[sev]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${SEV_DOT[sev]}`} />
                    {sev} &nbsp;·&nbsp; {stats.severityBreakdown[sev]}
                  </span>
                ) : null
              )}
            </motion.div>
          )}

          {/* ── Tab navigation ── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
            className={`${glass} p-1 mb-6 flex gap-1 flex-wrap`}>
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === t.key
                    ? "bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white shadow-md shadow-emerald-900/15"
                    : "text-[#1F6A5C] dark:text-[#F4F3F4]/60 hover:bg-white/60 dark:hover:bg-[#192420]"
                }`}>
                {t.icon}
                {t.label}
              </button>
            ))}
          </motion.div>

          {/* ── Tab content ── */}
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

              {/* ────────── OVERVIEW ────────── */}
              {tab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Recent alerts */}
                  <div className={`lg:col-span-2 ${glass} p-5`}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-bold text-[#1C1E1C] dark:text-white">Recent Alerts</h2>
                      <button onClick={() => setTab("alerts")} className="text-xs text-[#1F6A5C] dark:text-[#50BFA0] hover:underline font-semibold">View all</button>
                    </div>
                    {dataLoading ? (
                      <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-[#50BFA0]/15 dark:bg-[#192420]/60 animate-pulse" />)}</div>
                    ) : alerts.length === 0 ? (
                      <EmptyState icon={<IoAlertCircle size={32} />} title="No alerts yet" sub="Alerts will appear here when detection rules match incoming events." />
                    ) : (
                      <div className="space-y-2">
                        {alerts.slice(0, 8).map((a) => (
                          <div key={a.id} onClick={() => setSelectedAlert(a)} className="flex items-center gap-3 rounded-lg px-3 py-3 border border-white/50 dark:border-[#192420] bg-white/40 dark:bg-[#192420]/40 hover:bg-white/70 dark:hover:bg-[#192420] transition-colors cursor-pointer">
                            <AiScore score={a.ai_score} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-[#1C1E1C] dark:text-white truncate">{a.rule_name}</span>
                                <SevBadge severity={a.severity} />
                              </div>
                              <div className="text-xs text-[#1F6A5C]/70 dark:text-[#1F6A5C]/60 mt-0.5 truncate">
                                {a.source_ip && <span className="mr-2">IP: {a.source_ip}</span>}
                                {a.username && <span className="mr-2">User: {a.username}</span>}
                                {formatRelative(a.created_at)}
                              </div>
                            </div>
                            <StatusBadge status={a.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right column: sources + quick rule stats */}
                  <div className="flex flex-col gap-4">
                    {/* Sources */}
                    <div className={`${glass} p-5`}>
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-[#1C1E1C] dark:text-white">Log Sources</h2>
                        <button onClick={() => setTab("sources")} className="text-xs text-[#1F6A5C] dark:text-[#50BFA0] hover:underline font-semibold">Manage</button>
                      </div>
                      {sources.length === 0 ? (
                        <EmptyState icon={<MdOutlineStorage size={28} />} title="No sources" sub="Connect a log source to start ingesting events." compact />
                      ) : (
                        <div className="space-y-2">
                          {sources.slice(0, 5).map((s) => (
                            <div key={s.id} className="flex items-center gap-3 py-2">
                              <div className="w-8 h-8 rounded-lg bg-[#1F6A5C]/12 dark:bg-[#50BFA0]/15 flex items-center justify-center text-[#1F6A5C] dark:text-[#50BFA0]">
                                {SOURCE_ICON[s.type] ?? <FaServer size={14} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-[#1C1E1C] dark:text-white truncate">{s.name}</div>
                                <div className="text-xs text-[#1F6A5C]/70">{s.event_count.toLocaleString()} events</div>
                              </div>
                              <span className={`w-2 h-2 rounded-full ${s.enabled ? "bg-emerald-500" : "bg-[#50BFA0]/40"}`} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Top rules */}
                    <div className={`${glass} p-5`}>
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-[#1C1E1C] dark:text-white">Top Rules</h2>
                        <button onClick={() => setTab("rules")} className="text-xs text-[#1F6A5C] dark:text-[#50BFA0] hover:underline font-semibold">All rules</button>
                      </div>
                      {rules.length === 0 ? (
                        <EmptyState icon={<MdOutlineRule size={28} />} title="No rules yet" sub="Detection rules are loaded from the DB." compact />
                      ) : (
                        <div className="space-y-2">
                          {rules.filter(r => r.enabled).slice(0, 5).map((r) => (
                            <div key={r.id} className="flex items-center gap-2 py-1.5">
                              <SevBadge severity={r.severity} />
                              <span className="text-sm text-[#103E36] dark:text-[#F4F3F4]/80 flex-1 truncate">{r.name}</span>
                              <span className="text-xs text-[#1F6A5C]/60 tabular-nums">{r.hit_count} hits</span>
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
                <div className={`${glass} p-5`}>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <h2 className="font-bold text-[#1C1E1C] dark:text-white text-lg">Alert Queue</h2>
                    <div className="flex gap-2 flex-wrap">
                      {(["all","open","investigating","resolved","suppressed"] as const).map((f) => (
                        <button key={f} onClick={() => setAlertFilter(f)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                            alertFilter === f
                              ? "bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white"
                              : "border border-white/60 dark:border-[#192420] bg-white/40 dark:bg-[#192420]/40 text-[#1F6A5C] dark:text-[#F4F3F4]/60"
                          }`}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredAlerts.length === 0 ? (
                    <EmptyState icon={<IoAlertCircle size={40} />} title="No alerts" sub="When detection rules fire, alerts appear here with AI triage scores." />
                  ) : (
                    <div className="space-y-2">
                      {filteredAlerts.map((a) => (
                        <div key={a.id} onClick={() => setSelectedAlert(a)} className="flex items-start gap-4 rounded-xl px-4 py-4 border border-white/50 dark:border-[#192420] bg-white/40 dark:bg-[#192420]/40 hover:bg-white/70 dark:hover:bg-[#192420] transition-colors cursor-pointer">
                          <AiScore score={a.ai_score} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-bold text-[#1C1E1C] dark:text-white">{a.rule_name}</span>
                              <SevBadge severity={a.severity} />
                              <StatusBadge status={a.status} />
                              {a.ai_generated && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 font-semibold">AI</span>}
                            </div>
                            {a.description && <p className="text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/60 mb-1 line-clamp-2">{a.description}</p>}
                            {a.ai_summary && (
                              <p className="text-xs text-[#1F6A5C] dark:text-[#50BFA0] mb-1.5 flex items-start gap-1">
                                <MdAutoAwesome size={13} className="mt-0.5 shrink-0" />
                                {a.ai_summary}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-3 text-xs text-[#1F6A5C]/70 dark:text-[#1F6A5C]/60">
                              {a.source_ip && <span>IP: <span className="font-mono text-[#103E36] dark:text-[#F4F3F4]/80">{a.source_ip}</span></span>}
                              {a.username && <span>User: <span className="font-semibold text-[#103E36] dark:text-[#F4F3F4]/80">{a.username}</span></span>}
                              {a.hostname && <span>Host: <span className="font-mono text-[#103E36] dark:text-[#F4F3F4]/80">{a.hostname}</span></span>}
                              <span>{formatTime(a.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            {a.ai_score === null && a.status === "open" && (
                              <button onClick={() => triageAlert(a.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/10 border border-purple-500/25 text-purple-400 hover:bg-purple-500/20 transition-colors whitespace-nowrap">
                                <MdAutoAwesome size={13} /> AI Triage
                              </button>
                            )}
                            {a.status === "open" && (
                              <button onClick={() => updateAlertStatus(a.id, "investigating")}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-400/10 border border-amber-400/25 text-amber-400 hover:bg-amber-400/20 transition-colors whitespace-nowrap">
                                Investigate
                              </button>
                            )}
                            {a.status !== "resolved" && (
                              <button onClick={(e) => { e.stopPropagation(); openResolveModal(a.id); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 hover:bg-emerald-500/20 transition-colors whitespace-nowrap">
                                <MdCheck size={13} /> Resolve
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
                <div className={`${glass} p-5`}>
                  <div className="flex items-center gap-3 mb-5 flex-wrap">
                    <h2 className="font-bold text-[#1C1E1C] dark:text-white text-lg flex-1">Live Event Stream</h2>
                    <div className="flex gap-2 items-center">
                      <div className="relative">
                        <IoSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F6A5C]/60" />
                        <input
                          value={eventSearchInput}
                          onChange={(e) => setEventSearchInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { setEventSearch(eventSearchInput); fetchEvents(eventSearchInput); }}}
                          placeholder="Search logs, IPs, usernames…"
                          className="pl-8 pr-3 py-2 rounded-lg text-sm border border-white/60 dark:border-[#192420] bg-white/60 dark:bg-[#131C18] text-[#103E36] dark:text-[#F4F3F4]/80 placeholder:text-[#1F6A5C]/60 focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/40 w-64"
                        />
                      </div>
                      <button onClick={() => { setEventSearch(eventSearchInput); fetchEvents(eventSearchInput); }}
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white">
                        Search
                      </button>
                    </div>
                  </div>

                  {events.length === 0 ? (
                    <EmptyState icon={<MdOutlineStream size={40} />} title="No events ingested yet"
                      sub="Send logs to the ingest API at POST /siem/events/ingest or connect a log source." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs font-bold uppercase tracking-wider text-[#1F6A5C]/70 dark:text-[#1F6A5C]/60 border-b border-white/40 dark:border-[#192420]">
                            <th className="pb-3 pr-4">Time</th>
                            <th className="pb-3 pr-4">Source</th>
                            <th className="pb-3 pr-4">Type</th>
                            <th className="pb-3 pr-4">Severity</th>
                            <th className="pb-3 pr-4">IP</th>
                            <th className="pb-3 pr-4">User</th>
                            <th className="pb-3">Message</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/30 dark:divide-[#192420]/60">
                          {events.map((e) => (
                            <tr key={e.id} className="hover:bg-white/30 dark:hover:bg-[#192420]/30 transition-colors">
                              <td className="py-2.5 pr-4 text-xs text-[#1F6A5C]/70 whitespace-nowrap font-mono">{formatRelative(e.ingested_at)}</td>
                              <td className="py-2.5 pr-4 text-xs font-semibold text-[#103E36] dark:text-[#F4F3F4]/80 whitespace-nowrap">{e.source_name ?? "—"}</td>
                              <td className="py-2.5 pr-4 text-xs font-mono text-[#1F6A5C] dark:text-[#F4F3F4]/60 whitespace-nowrap">{e.event_type}</td>
                              <td className="py-2.5 pr-4"><SevBadge severity={e.severity} /></td>
                              <td className="py-2.5 pr-4 text-xs font-mono text-[#1F6A5C] dark:text-[#F4F3F4]/60 whitespace-nowrap">{e.source_ip ?? "—"}</td>
                              <td className="py-2.5 pr-4 text-xs text-[#1F6A5C] dark:text-[#F4F3F4]/60 whitespace-nowrap">{e.username ?? "—"}</td>
                              <td className="py-2.5 text-xs text-[#1F6A5C]/70 dark:text-[#1F6A5C]/60 max-w-xs truncate">{e.raw_log ?? "—"}</td>
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
                <div className="space-y-5">
                  {/* AI Rule Builder */}
                  <div className={`${glass} p-5`}>
                    <div className="flex items-center gap-2 mb-3">
                      <MdAutoAwesome size={18} className="text-purple-400" />
                      <h2 className="font-bold text-[#1C1E1C] dark:text-white">AI Detection Rule Builder</h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 font-semibold">AI</span>
                    </div>
                    <p className="text-sm text-[#1F6A5C]/70 dark:text-[#1F6A5C]/60 mb-4">Describe what you want to detect in plain English. The AI will write the detection rule for you.</p>
                    <div className="flex gap-3 flex-wrap">
                      <input
                        value={aiRulePrompt}
                        onChange={(e) => setAiRulePrompt(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !aiRuleLoading) handleGenerateRule(); }}
                        placeholder='e.g. "Alert when a user logs in from outside the US between midnight and 6am"'
                        className="flex-1 min-w-[260px] px-4 py-2.5 rounded-lg text-sm border border-white/60 dark:border-[#192420] bg-white/60 dark:bg-[#131C18] text-[#103E36] dark:text-[#F4F3F4]/80 placeholder:text-[#1F6A5C]/60 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                      />
                      <button onClick={handleGenerateRule} disabled={aiRuleLoading || !aiRulePrompt.trim()}
                        className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 transition-colors flex items-center gap-2">
                        {aiRuleLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</> : <><MdAutoAwesome size={15} /> Generate Rule</>}
                      </button>
                    </div>

                    {/* Generated rule preview */}
                    {generatedRule && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="mt-4 rounded-xl border border-purple-500/25 bg-purple-500/5 p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="font-bold text-[#1C1E1C] dark:text-white mb-1">{generatedRule.name}</div>
                            <div className="text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/60">{generatedRule.description}</div>
                            {generatedRule.reasoning && (
                              <div className="text-xs text-purple-400 mt-1.5 italic">{generatedRule.reasoning}</div>
                            )}
                          </div>
                          {generatedRule.severity && <SevBadge severity={generatedRule.severity} />}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSaveGeneratedRule}
                            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white">
                            Save Rule
                          </button>
                          <button onClick={() => setGeneratedRule(null)}
                            className="px-4 py-2 rounded-lg text-sm font-semibold border border-white/60 dark:border-[#192420] text-[#1F6A5C] dark:text-[#F4F3F4]/60">
                            Discard
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Rules list */}
                  <div className={`${glass} p-5`}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-bold text-[#1C1E1C] dark:text-white text-lg">Detection Rules <span className="ml-2 text-sm font-normal text-[#1F6A5C]/70">({rules.length})</span></h2>
                    </div>
                    {rules.length === 0 ? (
                      <EmptyState icon={<MdOutlineRule size={40} />} title="No rules" sub="Rules were seeded from the database. Run the migration to load defaults." />
                    ) : (
                      <div className="space-y-2">
                        {rules.map((r) => (
                          <div key={r.id} className={`flex items-start gap-4 rounded-xl px-4 py-4 border transition-colors ${
                            r.enabled
                              ? "border-white/50 dark:border-[#192420] bg-white/40 dark:bg-[#192420]/40"
                              : "border-white/30 dark:border-[#192420]/50 bg-white/20 dark:bg-[#192420]/20 opacity-60"
                          }`}>
                            {/* Toggle */}
                            <button onClick={() => toggleRule(r)}
                              className={`mt-0.5 w-10 h-6 rounded-full transition-colors shrink-0 relative ${r.enabled ? "bg-gradient-to-r from-[#1F6A5C] to-[#50BFA0]" : "bg-[#50BFA0]/25 dark:bg-slate-600"}`}>
                              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${r.enabled ? "translate-x-5" : "translate-x-1"}`} />
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-semibold text-[#1C1E1C] dark:text-white">{r.name}</span>
                                <SevBadge severity={r.severity} />
                                {r.ai_generated && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 font-semibold">AI generated</span>}
                              </div>
                              {r.description && <p className="text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/60 mb-1">{r.description}</p>}
                              <div className="flex gap-4 text-xs text-[#1F6A5C]/70 mb-2">
                                <span>{r.hit_count} hits</span>
                                <span>{r.false_positive_count} false positives</span>
                                <span>Created {formatRelative(r.created_at)}</span>
                              </div>
                              {/* Expand button */}
                              <button onClick={() => toggleRuleExpand(r.id)}
                                className="flex items-center gap-1 text-xs text-[#1F6A5C] dark:text-[#50BFA0] hover:underline font-semibold">
                                <IoChevronDown size={13} className={`transition-transform ${expandedRules.has(r.id) ? "rotate-180" : ""}`} />
                                {expandedRules.has(r.id) ? "Hide logic" : "View rule logic"}
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
                                          className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                                            (ruleQueryTab[r.id] ?? "logic") === qt
                                              ? qt === "logic" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                : qt === "sigma" ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                                                : qt === "spl" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                              : "text-[#1F6A5C]/70 hover:text-[#F4F3F4]/60 border border-transparent"
                                          }`}>
                                          {qt === "logic" ? "Logic" : qt === "sigma" ? "Sigma" : qt === "spl" ? "SPL (Splunk)" : "KQL (Sentinel)"}
                                        </button>
                                      ))}
                                      {(!r.spl || !r.kql) && (
                                        <button onClick={() => translateRule(r.id)} disabled={translatingRules.has(r.id)}
                                          className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-purple-500/10 border border-purple-500/25 text-purple-400 hover:bg-purple-500/20 disabled:opacity-50 transition-colors">
                                          {translatingRules.has(r.id)
                                            ? <><span className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" /> Generating…</>
                                            : <><MdAutoAwesome size={12} /> Generate SPL &amp; KQL</>}
                                        </button>
                                      )}
                                    </div>

                                    {/* Logic */}
                                    {(ruleQueryTab[r.id] ?? "logic") === "logic" && (
                                      <pre className="text-xs font-mono rounded-lg bg-[#103E36] text-emerald-400 p-4 overflow-x-auto border border-[#1F6A5C]/50">
                                        {JSON.stringify(r.logic, null, 2)}
                                      </pre>
                                    )}
                                    {/* Sigma */}
                                    {ruleQueryTab[r.id] === "sigma" && (
                                      r.sigma_yaml
                                        ? <pre className="text-xs font-mono rounded-lg bg-[#103E36] text-sky-300 p-4 overflow-x-auto border border-[#1F6A5C]/50 whitespace-pre-wrap">{r.sigma_yaml}</pre>
                                        : <div className="text-xs text-[#1F6A5C]/70 italic p-3">No Sigma rule yet — click "Generate SPL &amp; KQL" to create all formats.</div>
                                    )}
                                    {/* SPL */}
                                    {ruleQueryTab[r.id] === "spl" && (
                                      r.spl
                                        ? <pre className="text-xs font-mono rounded-lg bg-[#103E36] text-orange-300 p-4 overflow-x-auto border border-[#1F6A5C]/50 whitespace-pre-wrap">{r.spl}</pre>
                                        : <div className="flex flex-col items-start gap-2 p-3">
                                            <div className="text-xs text-[#1F6A5C]/70 italic">No SPL query yet.</div>
                                            <button onClick={() => translateRule(r.id)} disabled={translatingRules.has(r.id)}
                                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-orange-500/10 border border-orange-500/25 text-orange-400 hover:bg-orange-500/20 disabled:opacity-50 transition-colors">
                                              {translatingRules.has(r.id) ? "Generating…" : <><MdAutoAwesome size={12} /> Generate SPL (Splunk)</>}
                                            </button>
                                          </div>
                                    )}
                                    {/* KQL */}
                                    {ruleQueryTab[r.id] === "kql" && (
                                      r.kql
                                        ? <pre className="text-xs font-mono rounded-lg bg-[#103E36] text-blue-300 p-4 overflow-x-auto border border-[#1F6A5C]/50 whitespace-pre-wrap">{r.kql}</pre>
                                        : <div className="flex flex-col items-start gap-2 p-3">
                                            <div className="text-xs text-[#1F6A5C]/70 italic">No KQL query yet.</div>
                                            <button onClick={() => translateRule(r.id)} disabled={translatingRules.has(r.id)}
                                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-colors">
                                              {translatingRules.has(r.id) ? "Generating…" : <><MdAutoAwesome size={12} /> Generate KQL (Sentinel)</>}
                                            </button>
                                          </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                            <button onClick={() => deleteRule(r.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#1F6A5C]/60 hover:text-red-400 transition-colors shrink-0">
                              <MdClose size={16} />
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
                <div className={`${glass} p-5`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-[#1C1E1C] dark:text-white text-lg">Log Sources</h2>
                    <button onClick={() => setShowAddSource(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white shadow-md hover:opacity-90 transition-opacity">
                      <MdAdd size={16} /> Add Source
                    </button>
                  </div>

                  {/* Add source form */}
                  <AnimatePresence>
                    {showAddSource && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="mb-4 rounded-xl border border-[#1F6A5C]/30 bg-[#1F6A5C]/5 p-4 overflow-hidden">
                        <h3 className="font-semibold text-[#1C1E1C] dark:text-white mb-3">Connect a Log Source</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                          <input value={newSource.name} onChange={(e) => setNewSource(s => ({ ...s, name: e.target.value }))}
                            placeholder="Source name (e.g. Firewall-01)"
                            className="px-3 py-2 rounded-lg text-sm border border-white/60 dark:border-[#192420] bg-white/80 dark:bg-[#131C18] text-[#103E36] dark:text-[#F4F3F4]/80 placeholder:text-[#1F6A5C]/60 focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/40" />
                          <select value={newSource.type} onChange={(e) => setNewSource(s => ({ ...s, type: e.target.value }))}
                            className="px-3 py-2 rounded-lg text-sm border border-white/60 dark:border-[#192420] bg-white/80 dark:bg-[#131C18] text-[#103E36] dark:text-[#F4F3F4]/80 focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/40">
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
                            className="px-3 py-2 rounded-lg text-sm border border-white/60 dark:border-[#192420] bg-white/80 dark:bg-[#131C18] text-[#103E36] dark:text-[#F4F3F4]/80 placeholder:text-[#1F6A5C]/60 focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/40" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={addSource}
                            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white">
                            Add Source
                          </button>
                          <button onClick={() => setShowAddSource(false)}
                            className="px-4 py-2 rounded-lg text-sm font-semibold border border-white/60 dark:border-[#192420] text-[#1F6A5C] dark:text-[#F4F3F4]/60">
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {sources.length === 0 ? (
                    <EmptyState icon={<MdOutlineStorage size={40} />} title="No sources connected"
                      sub='Click "Add Source" to connect your first log source. Supports syslog, REST API, AWS, Azure, GCP, and endpoint agents.' />
                  ) : (
                    <div className="space-y-3">
                      {sources.map((s) => (
                        <div key={s.id} className="flex items-center gap-4 rounded-xl px-4 py-4 border border-white/50 dark:border-[#192420] bg-white/40 dark:bg-[#192420]/40">
                          <div className="w-10 h-10 rounded-xl bg-[#1F6A5C]/12 dark:bg-[#50BFA0]/15 flex items-center justify-center text-[#1F6A5C] dark:text-[#50BFA0]">
                            {SOURCE_ICON[s.type] ?? <FaServer size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-semibold text-[#1C1E1C] dark:text-white">{s.name}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-[#F4F3F4] dark:bg-[#192420] text-[#1F6A5C]/70 border border-[#1F6A5C]/20 dark:border-[#3d4240] capitalize">{s.type}</span>
                              <span className={`w-2 h-2 rounded-full ${s.enabled ? "bg-emerald-500" : "bg-[#50BFA0]/40"}`} />
                            </div>
                            <div className="flex gap-4 text-xs text-[#1F6A5C]/70">
                              <span>{s.event_count.toLocaleString()} events total</span>
                              {s.last_seen && <span>Last seen {formatRelative(s.last_seen)}</span>}
                              {s.description && <span>{s.description}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <div className="text-xs text-[#1F6A5C]/70">Ingest endpoint</div>
                              <code className="text-xs font-mono text-[#1F6A5C] dark:text-[#50BFA0]">POST /siem/events/ingest</code>
                            </div>
                            <button onClick={() => deleteSource(s.id)}
                              className="p-2 rounded-lg hover:bg-red-500/10 text-[#1F6A5C]/60 hover:text-red-400 transition-colors">
                              <MdClose size={16} />
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

      {/* ── Resolve Modal ── */}
      <AnimatePresence>
        {resolveModal !== null && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setResolveModal(null)}
              className="fixed inset-0 bg-black/50 z-40" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white dark:bg-[#1a1c1a] rounded-2xl shadow-2xl border border-white/20 dark:border-[#192420] p-6">
                <h3 className="font-bold text-[#1C1E1C] dark:text-white text-lg mb-1">Resolve Alert</h3>
                <p className="text-sm text-[#1F6A5C]/70 dark:text-[#1F6A5C]/60 mb-4">Record your determination — this feeds into AI QA review.</p>

                <div className="mb-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#1F6A5C]/60 mb-2">Resolution Type</div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["true_positive", "false_positive", "benign"] as const).map(t => (
                      <button key={t} onClick={() => setResolveType(t)}
                        className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          resolveType === t
                            ? t === "true_positive" ? "bg-red-500/15 border-red-500/40 text-red-400"
                              : t === "false_positive" ? "bg-[#50BFA0]/40 border-[#1F6A5C]/35 text-[#1F6A5C]/60"
                              : "bg-emerald-500/15 border-emerald-500/40 text-emerald-500"
                            : "border-white/60 dark:border-[#192420] text-[#1F6A5C]/70 hover:bg-[#F4F3F4]/50 dark:hover:bg-[#192420]"
                        }`}>
                        {t === "true_positive" ? "True Positive" : t === "false_positive" ? "False Positive" : "Benign"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#1F6A5C]/60 mb-2">Notes</div>
                  <textarea
                    value={resolveNotes}
                    onChange={e => setResolveNotes(e.target.value)}
                    placeholder="Document your findings, actions taken, evidence…"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-sm border border-white/60 dark:border-[#192420] bg-[#F4F3F4]/50 dark:bg-[#1c1e1c] text-[#103E36] dark:text-[#F4F3F4]/80 placeholder:text-[#1F6A5C]/60 focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/40 resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button onClick={submitResolve} disabled={resolving}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white disabled:opacity-50 flex items-center justify-center gap-2">
                    {resolving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Resolving…</> : <><MdCheck size={16} /> Resolve & Queue for QA</>}
                  </button>
                  <button onClick={() => setResolveModal(null)}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-white/60 dark:border-[#192420] text-[#1F6A5C] dark:text-[#F4F3F4]/60">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Alert Detail Panel ── */}
      <AnimatePresence>
        {selectedAlert && (
          <>
            {/* Backdrop */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedAlert(null)}
              className="fixed inset-0 bg-black/40 z-40" />

            {/* Panel */}
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-[#1a1c1a] shadow-2xl z-50 flex flex-col overflow-hidden border-l border-white/20 dark:border-[#192420]">

              {/* Panel header */}
              <div className="flex items-start justify-between px-6 py-5 border-b border-[#1F6A5C]/12 dark:border-[#192420] shrink-0">
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <SevBadge severity={selectedAlert.severity} />
                    <StatusBadge status={selectedAlert.status} />
                    {selectedAlert.ai_generated && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 font-semibold">AI</span>}
                  </div>
                  <h2 className="text-lg font-bold text-[#1C1E1C] dark:text-white">{selectedAlert.rule_name}</h2>
                </div>
                <button onClick={() => setSelectedAlert(null)} className="p-1.5 rounded-lg hover:bg-[#F4F3F4] dark:hover:bg-[#192420] text-[#1F6A5C]/60 transition-colors shrink-0">
                  <MdClose size={20} />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* Description */}
                {selectedAlert.description && (
                  <p className="text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/60">{selectedAlert.description}</p>
                )}

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Source IP", value: selectedAlert.source_ip, mono: true },
                    { label: "Username", value: selectedAlert.username, mono: false },
                    { label: "Hostname", value: selectedAlert.hostname, mono: true },
                    { label: "Detected", value: formatTime(selectedAlert.created_at), mono: false },
                  ].map(({ label, value, mono }) => value ? (
                    <div key={label} className="rounded-lg bg-[#F4F3F4]/50 dark:bg-[#1B2620] px-4 py-3 border border-[#1F6A5C]/12 dark:border-[#192420]">
                      <div className="text-xs text-[#1F6A5C]/60 mb-1">{label}</div>
                      <div className={`text-sm font-semibold text-[#1C1E1C] dark:text-white ${mono ? "font-mono" : ""}`}>{value}</div>
                    </div>
                  ) : null)}
                </div>

                {/* AI Triage */}
                <div className="rounded-xl border border-white/60 dark:border-[#192420] bg-white/55 dark:bg-[#1B2620] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MdAutoAwesome size={16} className="text-purple-400" />
                      <span className="font-semibold text-[#1C1E1C] dark:text-white text-sm">AI Triage</span>
                    </div>
                    {selectedAlert.ai_score !== null && (
                      <AiScore score={selectedAlert.ai_score} />
                    )}
                  </div>
                  {selectedAlert.ai_summary ? (
                    <p className="text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/60">{selectedAlert.ai_summary}</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-[#1F6A5C]/60">No AI triage yet.</p>
                      <button onClick={(e) => { e.stopPropagation(); triageAlert(selectedAlert.id); }}
                        className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/10 border border-purple-500/25 text-purple-400 hover:bg-purple-500/20 transition-colors">
                        <MdAutoAwesome size={13} /> Run AI Triage
                      </button>
                    </div>
                  )}
                </div>

                {/* AI Investigation */}
                <div className="rounded-xl border border-white/60 dark:border-[#192420] bg-white/55 dark:bg-[#1B2620] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MdAutoAwesome size={16} className="text-blue-400" />
                      <span className="font-semibold text-[#1C1E1C] dark:text-white text-sm">AI Investigation</span>
                    </div>
                    {!selectedAlert.ai_narrative && (
                      <button onClick={(e) => { e.stopPropagation(); investigateAlert(selectedAlert.id); }}
                        disabled={investigatingId === selectedAlert.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-colors">
                        {investigatingId === selectedAlert.id
                          ? <><span className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" /> Investigating…</>
                          : <><MdAutoAwesome size={13} /> Investigate</>}
                      </button>
                    )}
                  </div>
                  {selectedAlert.ai_narrative ? (() => {
                    try {
                      const n = JSON.parse(selectedAlert.ai_narrative);
                      return (
                        <div className="space-y-4">
                          {n.narrative && <p className="text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/60">{n.narrative}</p>}
                          {n.mitre_techniques?.length > 0 && (
                            <div>
                              <div className="text-xs font-bold uppercase tracking-wider text-[#1F6A5C]/60 mb-2">MITRE ATT&CK</div>
                              <div className="flex flex-wrap gap-2">
                                {n.mitre_techniques.map((t: string) => (
                                  <span key={t} className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">{t}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {n.recommended_steps?.length > 0 && (
                            <div>
                              <div className="text-xs font-bold uppercase tracking-wider text-[#1F6A5C]/60 mb-2">Recommended Steps</div>
                              <ol className="space-y-1">
                                {n.recommended_steps.map((s: string, i: number) => (
                                  <li key={i} className="text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/60 flex gap-2">
                                    <span className="text-[#1F6A5C]/60 shrink-0">{i + 1}.</span>{s}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      );
                    } catch { return <p className="text-sm text-[#1F6A5C]/60">Investigation data unavailable.</p>; }
                  })() : (
                    <p className="text-xs text-[#1F6A5C]/60">Click Investigate to generate a full AI investigation narrative with MITRE ATT&CK mapping and remediation steps.</p>
                  )}
                </div>
              </div>

              {/* Action footer */}
              <div className="px-6 py-4 border-t border-[#1F6A5C]/12 dark:border-[#192420] flex gap-2 shrink-0">
                {selectedAlert.status === "open" && (
                  <button onClick={() => { updateAlertStatus(selectedAlert.id, "investigating"); setSelectedAlert(p => p ? { ...p, status: "investigating" } : p); }}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold bg-amber-400/10 border border-amber-400/25 text-amber-400 hover:bg-amber-400/20 transition-colors">
                    Mark Investigating
                  </button>
                )}
                {selectedAlert.status !== "resolved" && (
                  <button onClick={() => openResolveModal(selectedAlert.id)}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 hover:bg-emerald-500/20 transition-colors">
                    <span className="flex items-center justify-center gap-1.5"><MdCheck size={15} /> Resolve</span>
                  </button>
                )}
                {selectedAlert.status === "resolved" && (
                  <p className="flex-1 text-center text-sm text-[#1F6A5C]/60 py-2">Alert resolved</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyState({ icon, title, sub, compact = false }: { icon: React.ReactNode; title: string; sub: string; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "py-6" : "py-12"} text-[#1F6A5C]/60`}>
      <div className="mb-3 opacity-40">{icon}</div>
      <div className="font-semibold text-[#1F6A5C] dark:text-[#F4F3F4]/60 mb-1">{title}</div>
      <div className="text-sm text-[#1F6A5C]/70 dark:text-[#1F6A5C]/60 max-w-sm">{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open:          "bg-red-500/10 border-red-500/25 text-red-400",
    investigating: "bg-amber-400/10 border-amber-400/25 text-amber-400",
    resolved:      "bg-emerald-500/10 border-emerald-500/25 text-emerald-500",
    suppressed:    "bg-[#50BFA0]/40 border-[#1F6A5C]/35 text-[#1F6A5C]/60",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${map[status] ?? map.open}`}>
      {status}
    </span>
  );
}
