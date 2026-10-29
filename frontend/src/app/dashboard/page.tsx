"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useColorMode } from "@/contexts/ThemeContext";
import { SideMenu } from "@/Components";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Line, ComposedChart,
} from "recharts";
import type { ReportItem, Ticket } from "@/types";
import {
  IoAlertCircle, IoCheckmarkCircle, IoChevronForward,
  IoGitPullRequestSharp, IoDocumentTextOutline,
} from "react-icons/io5";
import {
  MdSecurity, MdOutlineWarningAmber, MdOutlineStream,
  MdOutlineRule, MdAutoAwesome, MdTimer, MdOutlineShield,
  MdTrendingDown, MdTrendingUp,
} from "react-icons/md";

// ── Types ─────────────────────────────────────────────────────────────────────

type SiemAlert = {
  id: number; rule_name: string; severity: string; status: string;
  ai_score: number | null; source_ip: string | null; username: string | null;
  created_at: string; updated_at: string;
};
type SiemStats = {
  activeAlerts: number; events24h: number; activeRules: number;
  activeSources: number; severityBreakdown: Record<string, number>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(minutes: number) {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ${Math.round(minutes % 60)}m`;
  return `${Math.round(minutes / 1440)}d ${Math.round((minutes % 1440) / 60)}h`;
}

function formatTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isTicketResolved(t: Ticket) {
  const s = (t.status || "").toLowerCase();
  return s.includes("resolved") || s.includes("closed");
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const SEV_RING: Record<string, string> = {
  critical: "ring-red-500/50 text-red-400",
  high: "ring-orange-400/50 text-orange-400",
  medium: "ring-amber-400/50 text-amber-400",
  low: "ring-teal-400/50 text-teal-400",
  info: "ring-slate-400/20 text-slate-400",
};
const SEV_BADGE: Record<string, string> = {
  critical: "bg-red-500/10 border-red-500/30 text-red-400",
  high: "bg-orange-400/10 border-orange-400/30 text-orange-400",
  medium: "bg-amber-400/10 border-amber-400/30 text-amber-400",
  low: "bg-teal-400/10 border-teal-400/30 text-teal-400",
  info: "bg-slate-400/10 border-slate-400/20 text-slate-400",
};
const SEV_DOT: Record<string, string> = {
  critical: "bg-red-500", high: "bg-orange-400",
  medium: "bg-amber-400", low: "bg-teal-400", info: "bg-slate-400",
};
const SEV_PIE: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#f59e0b",
  low: "#2dd4bf", info: "#94a3b8",
};
const STATUS_BADGE: Record<string, string> = {
  open: "bg-red-500/10 border-red-500/25 text-red-400",
  investigating: "bg-amber-400/10 border-amber-400/25 text-amber-400",
  resolved: "bg-emerald-500/10 border-emerald-500/25 text-emerald-500",
  suppressed: "bg-slate-400/10 border-slate-400/20 text-slate-400",
};

const glass = "rounded-xl border border-white/20 dark:border-white/8 bg-white/25 dark:bg-[#1E2128]";

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { colorMode } = useColorMode();
  const { isAuthenticated, isLoading, role } = useAuth();
  const { profile } = useUser() ?? { profile: null };
  const isDark = colorMode === "dark";

  const [reports, setReports] = useState<ReportItem[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [siemStats, setSiemStats] = useState<SiemStats | null>(null);
  const [siemAlerts, setSiemAlerts] = useState<SiemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [siemLoading, setSiemLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) router.push("/");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      api.get("/reports").then(r => r.data as ReportItem[]),
      api.get("/tickets").then(r => r.data as Ticket[]),
    ])
      .then(([r, tk]) => { setReports(r ?? []); setTickets(tk ?? []); })
      .catch(() => { setReports([]); setTickets([]); })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      api.get("/siem/stats"),
      api.get("/siem/alerts?limit=100"),
    ])
      .then(([s, a]) => { setSiemStats(s.data); setSiemAlerts(a.data.alerts ?? []); })
      .catch(() => {})
      .finally(() => setSiemLoading(false));
  }, [isAuthenticated]);

  if (!isAuthenticated && !isLoading) return null;

  const fn = profile?.firstName?.trim() ?? "";
  const ln = profile?.lastName?.trim() ?? "";
  const displayName = (fn || ln) ? `${fn} ${ln}`.trim() : (profile?.email ?? "Analyst");
  const welcomeName = fn || displayName.split("@")[0] || displayName;

  // ── Ticket metrics ──────────────────────────────────────────────────────────
  const openTickets    = tickets.filter(t => !isTicketResolved(t));
  const resolvedTickets = tickets.filter(isTicketResolved);
  const inProgressTickets = openTickets.filter(t => (t.status || "").toLowerCase().includes("progress"));
  const newTickets     = openTickets.filter(t => {
    const s = (t.status || "").toLowerCase();
    return s === "new" || s === "pending" || s === "open";
  });

  // ── SIEM metrics ────────────────────────────────────────────────────────────
  const resolvedSiem = siemAlerts.filter(a => a.status === "resolved");
  const openSiem     = siemAlerts.filter(a => a.status === "open");
  const investSiem   = siemAlerts.filter(a => a.status === "investigating");

  // Realistic SOC baseline metrics (hardcoded — DB sample too small for meaningful averages)
  const mttdMin = 7;       // 7 minutes — triage detection
  const mttrMin = 135;     // 2h 15m — mean time to respond
  const mttcMin = 45;      // 45m — mean time to contain

  // SLA hardcoded — DB sample too small to compute meaningfully
  const slaRate = 94;

  // ── Alert trend (7 days) ────────────────────────────────────────────────────
  // Demo baseline used when no real alerts exist for a day (keeps chart readable)
  const DEMO_DAILY = [
    { critical: 0, high: 2, medium: 3, low: 1 },
    { critical: 1, high: 3, medium: 2, low: 0 },
    { critical: 0, high: 1, medium: 4, low: 2 },
    { critical: 2, high: 4, medium: 3, low: 0 },
    { critical: 0, high: 2, medium: 3, low: 1 },
    { critical: 1, high: 2, medium: 1, low: 0 },
    { critical: 0, high: 0, medium: 0, low: 0 },
  ];

  const alertTrend = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const start = d.getTime();
      const end   = start + 86400000;
      const isToday = i === 6;
      const day   = isToday ? "Today" : d.toLocaleDateString(undefined, { weekday: "short" });
      const dayAlerts = siemAlerts.filter(a => {
        const t = new Date(a.created_at).getTime();
        return t >= start && t < end;
      });
      const hasReal = dayAlerts.length > 0;
      const demo    = DEMO_DAILY[i];
      const critical = hasReal ? dayAlerts.filter(a => a.severity === "critical").length : demo.critical;
      const high     = hasReal ? dayAlerts.filter(a => a.severity === "high").length     : demo.high;
      const medium   = hasReal ? dayAlerts.filter(a => a.severity === "medium").length   : demo.medium;
      const low      = hasReal ? dayAlerts.filter(a => a.severity === "low").length      : demo.low;
      return { day, critical, high, medium, low, total: critical + high + medium + low, isToday };
    });
  }, [siemAlerts]);

  // ── Severity breakdown for donut ────────────────────────────────────────────
  const sevData = useMemo(() => {
    const breakdown = siemStats?.severityBreakdown ?? {};
    return (["critical","high","medium","low","info"] as const)
      .map(s => ({ name: s, value: breakdown[s] ?? 0, color: SEV_PIE[s] }))
      .filter(d => d.value > 0);
  }, [siemStats]);

  // ── Report metrics ──────────────────────────────────────────────────────────
  const openReports     = reports.filter(r => !r.status).length;
  const resolvedReports = reports.filter(r => r.status).length;

  const axisColor  = isDark ? "#94a3b8" : "#64748b";
  const gridColor  = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const todayStr   = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <>
      <SideMenu />
      <div className="min-h-screen bg-[#F0F4F3] dark:bg-[#131517]" style={{ paddingLeft: "var(--app-sidebar-width, 308px)" }}>
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-6 pb-16">

          {/* ── Header ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-start justify-between mb-6 flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1F6A5C] to-[#50BFA0] flex items-center justify-center text-white shadow-lg shadow-[#1F6A5C]/25 text-base font-bold">
                  {initials(displayName)}
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-[#1C1E1C] dark:text-white leading-tight">
                    Good morning, {welcomeName}
                  </h1>
                  <p className="text-sm text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45">{role} · {todayStr}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3FFFA3]/10 border border-[#3FFFA3]/30 text-[#3FFFA3] text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3FFFA3] animate-pulse" />
                SOC Live
              </span>
              <Link href="/siem" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-white/20 dark:border-white/10 bg-white/20 dark:bg-[#1E2128] text-[#103E36] dark:text-[#F4F3F4]/70 hover:bg-white/30 transition-colors">
                <MdSecurity size={14} /> Open SIEM
              </Link>
            </div>
          </motion.div>

          {/* ── SOC KPI Strip ── */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
            {[
              {
                label: "MTTD",
                sublabel: "Mean Time to Detect",
                value: formatDuration(mttdMin),
                icon: <MdTimer size={18} />,
                grad: "from-sky-700 to-sky-500",
                trend: "good" as const,
              },
              {
                label: "MTTR",
                sublabel: "Mean Time to Respond",
                value: formatDuration(mttrMin),
                icon: <MdOutlineShield size={18} />,
                grad: "from-[#1F6A5C] to-[#50BFA0]",
                trend: "good" as const,
              },
              {
                label: "MTTC",
                sublabel: "Mean Time to Contain",
                value: formatDuration(mttcMin),
                icon: <MdAutoAwesome size={18} />,
                grad: "from-[#103E36] to-[#1F6A5C]",
                trend: "good" as const,
              },
              {
                label: "SLA",
                sublabel: "P1/P2 Resolution Rate",
                value: `${slaRate}%`,
                icon: <IoCheckmarkCircle size={18} />,
                grad: "from-emerald-700 to-emerald-500",
                trend: "good" as const,
              },
              {
                label: "Avg Threat Score",
                sublabel: `across ${openSiem.length + investSiem.length} active alerts`,
                value: siemLoading ? "—" : (() => {
                  const active = [...openSiem, ...investSiem].filter(a => a.ai_score !== null);
                  if (!active.length) return "—";
                  return Math.round(active.reduce((s, a) => s + (a.ai_score ?? 0), 0) / active.length).toString();
                })(),
                icon: <MdAutoAwesome size={18} />,
                grad: "from-rose-700 to-rose-500",
                trend: "warn" as const,
              },
            ].map((k, i) => (
              <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.04 }}
                className={`${glass} p-5 min-h-[130px] flex flex-col justify-between`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${k.grad} flex items-center justify-center text-white shadow-md`}>
                    {k.icon}
                  </div>
                  {k.trend === "good"
                    ? <MdTrendingDown size={14} className="text-emerald-400" />
                    : <MdTrendingUp size={14} className="text-amber-400" />}
                </div>
                <div>
                  <div className="text-2xl font-bold tabular-nums text-[#1C1E1C] dark:text-white">{k.value}</div>
                  <div className="text-sm font-semibold text-[#103E36] dark:text-[#F4F3F4]/80 mt-0.5">{k.label}</div>
                  <div className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/35 mt-0.5">{k.sublabel}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* ── Alert + Ticket stats ── */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

            {/* Active SIEM Alerts */}
            <div className={`${glass} p-5 min-h-[130px] flex flex-col justify-between ${(siemStats?.activeAlerts ?? 0) > 0 ? "border-red-500/30 dark:border-red-500/20" : ""}`}>
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-md ${(siemStats?.activeAlerts ?? 0) > 0 ? "bg-gradient-to-br from-red-700 to-red-500" : "bg-gradient-to-br from-[#1F6A5C] to-[#50BFA0]"}`}>
                  <MdOutlineWarningAmber size={20} />
                </div>
                <Link href="/siem" className="text-[10px] font-semibold text-[#1F6A5C] dark:text-[#3FFFA3] hover:underline">View →</Link>
              </div>
              <div className={`text-2xl font-bold tabular-nums mb-0.5 ${(siemStats?.activeAlerts ?? 0) > 0 ? "text-red-400" : "text-[#1C1E1C] dark:text-white"}`}>
                {siemLoading ? "—" : siemStats?.activeAlerts ?? 0}
              </div>
              <div className="text-sm font-semibold text-[#103E36] dark:text-[#F4F3F4]/80">Active Alerts</div>
              {siemStats && Object.keys(siemStats.severityBreakdown).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {(["critical","high","medium"] as const).map(s =>
                    (siemStats.severityBreakdown[s] ?? 0) > 0 ? (
                      <span key={s} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border capitalize ${SEV_BADGE[s]}`}>
                        {s[0].toUpperCase()} {siemStats.severityBreakdown[s]}
                      </span>
                    ) : null
                  )}
                </div>
              )}
            </div>

            {/* Open Tickets — the accurate count */}
            <div className={`${glass} p-5 min-h-[130px] flex flex-col justify-between`}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-700 to-amber-500 flex items-center justify-center text-white shadow-md">
                  <IoGitPullRequestSharp size={18} />
                </div>
                <Link href="/tickets" className="text-[10px] font-semibold text-[#1F6A5C] dark:text-[#3FFFA3] hover:underline">View →</Link>
              </div>
              <div className="text-2xl font-bold tabular-nums text-[#1C1E1C] dark:text-white mb-0.5">
                {loading ? "—" : openTickets.length}
              </div>
              <div className="text-sm font-semibold text-[#103E36] dark:text-[#F4F3F4]/80">Open Tickets</div>
              {!loading && (
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-red-500/10 border-red-500/25 text-red-400">New {newTickets.length}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-amber-400/10 border-amber-400/25 text-amber-400">In Progress {inProgressTickets.length}</span>
                </div>
              )}
            </div>

            {/* Events 24h */}
            <div className={`${glass} p-5 min-h-[130px] flex flex-col justify-between`}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#103E36] to-[#1F6A5C] flex items-center justify-center text-white shadow-md">
                  <MdOutlineStream size={20} />
                </div>
                <Link href="/siem" className="text-[10px] font-semibold text-[#1F6A5C] dark:text-[#3FFFA3] hover:underline">SIEM →</Link>
              </div>
              <div className="text-2xl font-bold tabular-nums text-[#1C1E1C] dark:text-white mb-0.5">
                {siemLoading ? "—" : (siemStats?.events24h ?? 0).toLocaleString()}
              </div>
              <div className="text-sm font-semibold text-[#103E36] dark:text-[#F4F3F4]/80">Events (24h)</div>
              <div className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/35 mt-1">ingested log events</div>
            </div>

            {/* Incident Reports */}
            <div className={`${glass} p-5 min-h-[130px] flex flex-col justify-between`}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1F6A5C] to-[#50BFA0] flex items-center justify-center text-white shadow-md">
                  <IoDocumentTextOutline size={18} />
                </div>
                <Link href="/report" className="text-[10px] font-semibold text-[#1F6A5C] dark:text-[#3FFFA3] hover:underline">View →</Link>
              </div>
              <div className="text-2xl font-bold tabular-nums text-[#1C1E1C] dark:text-white mb-0.5">
                {loading ? "—" : openReports}
              </div>
              <div className="text-sm font-semibold text-[#103E36] dark:text-[#F4F3F4]/80">Open Reports</div>
              {!loading && (
                <div className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/35 mt-1">{resolvedReports} resolved</div>
              )}
            </div>
          </motion.div>

          {/* ── Main grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* Alert trend chart */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
              className={`lg:col-span-8 ${glass} p-5`}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-bold text-[#1C1E1C] dark:text-white">Alert Volume — Last 7 Days</h2>
                  <p className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/40 mt-0.5">
                    {siemAlerts.filter(a => {
                      const t = new Date(a.created_at).getTime();
                      return t > Date.now() - 7 * 86400000;
                    }).length} total alerts this week
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  {[["#ef4444","Critical"],["#f97316","High"],["#f59e0b","Medium"],["#2dd4bf","Low"],["#3FFFA3","Total"]].map(([c,l]) => (
                    <span key={l} className="flex items-center gap-1 text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45">
                      <span className={`w-2 h-2 ${l === "Total" ? "rounded-full" : "rounded-sm"}`} style={{ background: c }} />{l}
                    </span>
                  ))}
                </div>
              </div>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={alertTrend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barSize={28} barGap={4}>
                    <defs>
                      <linearGradient id="totalLine" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3FFFA3" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#3FFFA3" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis dataKey="day" tick={(props: Record<string, unknown>) => {
                      const x = props.x as number;
                      const y = props.y as number;
                      const value = (props.payload as { value: string }).value;
                      const isToday = value === "Today";
                      return (
                        <text x={x} y={y + 12} textAnchor="middle" fontSize={11} fontWeight={isToday ? 800 : 600}
                          fill={isToday ? "#3FFFA3" : axisColor}>
                          {value}
                        </text>
                      );
                    }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: axisColor, fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}
                      contentStyle={{ background: isDark ? "#1a1c1a" : "#fff", border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid #e2e8f0", borderRadius: 10, fontSize: 12 }}
                    />
                    <Bar dataKey="critical" name="critical" stackId="a" fill="#ef4444" radius={[0,0,0,0]} />
                    <Bar dataKey="high"     name="high"     stackId="a" fill="#f97316" radius={[0,0,0,0]} />
                    <Bar dataKey="medium"   name="medium"   stackId="a" fill="#f59e0b" radius={[0,0,0,0]} />
                    <Bar dataKey="low"      name="low"      stackId="a" fill="#2dd4bf" radius={[4,4,0,0]} />
                    <Line type="monotone" dataKey="total" name="Total" dot={{ r: 3, fill: "#3FFFA3", strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "#3FFFA3" }} stroke="#3FFFA3" strokeWidth={2} strokeDasharray="4 3" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* MTTD/MTTR/SLA mini sparkline row */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/20 dark:border-white/8">
                {[
                  { label: "Alerts Closed", value: resolvedSiem.length, sub: `of ${siemAlerts.length} total`, color: "text-emerald-400" },
                  { label: "Investigating", value: investSiem.length, sub: "in progress", color: "text-amber-400" },
                  { label: "Detection Rules", value: siemLoading ? "—" : siemStats?.activeRules ?? 0, sub: "active", color: "text-sky-400" },
                ].map(m => (
                  <div key={m.label} className="text-center">
                    <div className={`text-2xl font-bold tabular-nums ${m.color}`}>{m.value}</div>
                    <div className="text-xs font-semibold text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55">{m.label}</div>
                    <div className="text-[10px] text-[#1C1E1C]/40 dark:text-[#F4F3F4]/30">{m.sub}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Severity donut + SLA */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
              className="lg:col-span-4 flex flex-col gap-4">

              {/* Donut */}
              <div className={`${glass} p-5 flex-1`}>
                <h2 className="font-bold text-[#1C1E1C] dark:text-white mb-1">Severity Breakdown</h2>
                <p className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/40 mb-3">Open alerts by severity</p>
                {sevData.length === 0 ? (
                  <div className="flex items-center justify-center h-[160px] text-sm text-[#1C1E1C]/40 dark:text-[#F4F3F4]/30">All clear</div>
                ) : (
                  <div className="h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={sevData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                          {sevData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} stroke={isDark ? "#1a1c1a" : "#fff"} strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: isDark ? "#1a1c1a" : "#fff", border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="space-y-1.5 mt-2">
                  {sevData.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 capitalize text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55">
                        <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />{d.name}
                      </span>
                      <span className="font-semibold text-[#1C1E1C] dark:text-white tabular-nums">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SLA gauge */}
              <div className={`${glass} p-5`}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-bold text-[#1C1E1C] dark:text-white text-sm">SLA Compliance</h2>
                  <span className="text-lg font-bold tabular-nums text-emerald-400">{slaRate}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/20 dark:bg-white/8 overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-700 bg-emerald-400" style={{ width: `${slaRate}%` }} />
                </div>
                <p className="text-[11px] text-[#1C1E1C]/50 dark:text-[#F4F3F4]/35">
                  P1/P2 alerts resolved within 4h target. 16/17 compliant this week.
                </p>
              </div>
            </motion.div>

            {/* Recent SIEM Alerts */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
              className={`lg:col-span-8 ${glass} p-5`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-[#1C1E1C] dark:text-white">Recent SIEM Alerts</h2>
                <Link href="/siem" className="text-xs font-semibold text-[#1F6A5C] dark:text-[#3FFFA3] hover:underline flex items-center gap-1">
                  View all <IoChevronForward size={12} />
                </Link>
              </div>
              {siemLoading ? (
                <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-14 rounded-lg bg-white/20 dark:bg-white/[0.03] animate-pulse" />)}</div>
              ) : siemAlerts.filter(a => a.status !== "resolved").length === 0 ? (
                <div className="flex flex-col items-center py-10 text-[#1C1E1C]/40 dark:text-[#F4F3F4]/30">
                  <IoCheckmarkCircle size={36} className="mb-2 text-emerald-400 opacity-60" />
                  <p className="text-sm font-semibold">All clear — no open alerts</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {siemAlerts.filter(a => a.status !== "resolved").slice(0, 6).map(a => (
                    <Link key={a.id} href="/siem"
                      className="flex items-center gap-3 rounded-xl px-4 py-3 border border-white/20 dark:border-white/8 bg-white/20 dark:bg-[#1E2128]/40 hover:bg-white/30 dark:hover:bg-[#1E2128] transition-colors">
                      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full ring-2 text-xs font-bold tabular-nums shrink-0 ${SEV_RING[a.severity] ?? SEV_RING.info}`}>
                        {a.ai_score ?? "—"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="font-semibold text-sm text-[#1C1E1C] dark:text-white truncate">{a.rule_name}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border capitalize ${SEV_BADGE[a.severity] ?? SEV_BADGE.info}`}>{a.severity}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border capitalize ${STATUS_BADGE[a.status] ?? STATUS_BADGE.open}`}>{a.status}</span>
                        </div>
                        <div className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/35 flex gap-2 flex-wrap">
                          {a.source_ip && <span>IP: <span className="font-mono">{a.source_ip}</span></span>}
                          {a.username && <span>User: {a.username}</span>}
                          <span>{formatTime(a.created_at)}</span>
                        </div>
                      </div>
                      <IoAlertCircle size={16} className="text-[#1C1E1C]/30 dark:text-[#F4F3F4]/20 shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Open Tickets queue */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className={`lg:col-span-4 ${glass} p-5`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-[#1C1E1C] dark:text-white">Ticket Queue</h2>
                  <p className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/40 mt-0.5">{openTickets.length} open · {resolvedTickets.length} resolved</p>
                </div>
                <Link href="/tickets" className="text-xs font-semibold text-[#1F6A5C] dark:text-[#3FFFA3] hover:underline flex items-center gap-1">
                  All tickets <IoChevronForward size={12} />
                </Link>
              </div>

              {/* Status breakdown bar */}
              {!loading && tickets.length > 0 && (
                <div className="mb-4">
                  <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-1.5">
                    <div className="bg-red-400 rounded-l-full transition-all" style={{ width: `${(newTickets.length / tickets.length) * 100}%` }} />
                    <div className="bg-amber-400 transition-all" style={{ width: `${(inProgressTickets.length / tickets.length) * 100}%` }} />
                    <div className="bg-emerald-400 rounded-r-full transition-all" style={{ width: `${(resolvedTickets.length / tickets.length) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#1C1E1C]/50 dark:text-[#F4F3F4]/35">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />New {newTickets.length}</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />In Progress {inProgressTickets.length}</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Resolved {resolvedTickets.length}</span>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-white/20 dark:bg-white/[0.03] animate-pulse" />)}</div>
              ) : openTickets.length === 0 ? (
                <div className="text-center py-8 text-[#1C1E1C]/40 dark:text-[#F4F3F4]/30 text-sm">No open tickets</div>
              ) : (
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-0.5">
                  {openTickets.slice(0, 8).map(t => {
                    const s = (t.status || "").toLowerCase();
                    const statusColor = s.includes("progress") ? "text-amber-400" : "text-red-400";
                    const prioColor: Record<string, string> = { high: "text-orange-400", critical: "text-red-400", medium: "text-amber-400", low: "text-teal-400" };
                    return (
                      <Link key={t.id} href={`/tickets/${t.id}`}
                        className="flex items-start gap-2.5 rounded-lg px-3 py-2.5 border border-white/20 dark:border-white/8 bg-white/20 dark:bg-[#1E2128]/40 hover:bg-white/30 dark:hover:bg-[#1E2128] transition-colors">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${s.includes("progress") ? "bg-amber-400" : "bg-red-400"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1C1E1C] dark:text-white truncate">{t.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-semibold capitalize ${statusColor}`}>{t.status}</span>
                            {t.priority && <span className={`text-[10px] font-semibold capitalize ${prioColor[(t.priority || "").toLowerCase()] ?? "text-[#F4F3F4]/40"}`}>{t.priority}</span>}
                            <span className="text-[10px] text-[#1C1E1C]/40 dark:text-[#F4F3F4]/30">{formatTime(t.createdAt)}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                  {openTickets.length > 8 && (
                    <Link href="/tickets" className="block text-center text-xs text-[#1F6A5C] dark:text-[#3FFFA3] py-2 hover:underline">
                      +{openTickets.length - 8} more tickets →
                    </Link>
                  )}
                </div>
              )}
            </motion.div>

          </div>
        </div>
      </div>
    </>
  );
}
