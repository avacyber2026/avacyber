"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { VStack, Box, Text, Icon } from "@/ui";
import { useColorMode } from "@/contexts/ThemeContext";
import { SideMenu, FocusTimerCard } from "@/Components";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { ReportItem } from "@/types";
import type { Ticket } from "@/types";
import {
  IoDocumentTextOutline,
  IoGitPullRequestSharp,
  IoCheckmarkCircle,
  IoAlertCircle,
  IoChevronDown,
  IoChevronForward,
} from "react-icons/io5";
import dash from "@/styles/Dashboard.module.css";
import reportLayout from "@/styles/Report.module.css";

function formatShortDate(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function isTicketResolved(t: Ticket) {
  const s = (t.status || "").toLowerCase();
  return s.includes("resolved") || s.includes("closed");
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const mon = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + mon);
  x.setHours(0, 0, 0, 0);
  return x;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function sameCalendarDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { colorMode } = useColorMode();
  const { isAuthenticated, isLoading, role } = useAuth();
  const { profile } = useUser() ?? { profile: null };
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedProfile, setExpandedProfile] = useState(true);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) router.push("/");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      api.get("/reports").then((r) => r.data as ReportItem[]),
      api.get("/tickets").then((r) => r.data as Ticket[]),
    ])
      .then(([r, tk]) => {
        setReports(r ?? []);
        setTickets(tk ?? []);
      })
      .catch(() => {
        setReports([]);
        setTickets([]);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const fn = profile?.firstName?.trim() ?? "";
  const ln = profile?.lastName?.trim() ?? "";
  const hasName = Boolean(fn || ln);
  const displayName = hasName ? `${fn} ${ln}`.trim() : (profile?.email ?? "User");
  const welcomeShort = hasName ? (fn || ln) : displayName.split("@")[0] || displayName;

  const stats = useMemo(() => {
    const reportsResolved = reports.filter((x) => x.status).length;
    const reportsOpen = reports.length - reportsResolved;
    const ticketsResolved = tickets.filter(isTicketResolved).length;
    const ticketsOpen = tickets.length - ticketsResolved;
    const totalItems = reports.length + tickets.length;
    const totalResolved = reportsResolved + ticketsResolved;
    const resolvedRate = totalItems > 0 ? Math.round((totalResolved / totalItems) * 100) : 0;
    const repPct = reports.length > 0 ? Math.round((reportsResolved / reports.length) * 100) : 0;
    const tktPct = tickets.length > 0 ? Math.round((ticketsResolved / tickets.length) * 100) : 0;
    const maxDayTotal = Math.max(
      1,
      ...Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        d.setHours(0, 0, 0, 0);
        const a = d.getTime();
        const b = a + 86400000 - 1;
        const rc = reports.filter((r) => {
          const ts = r.createdAt ? new Date(r.createdAt).getTime() : 0;
          return ts >= a && ts <= b;
        }).length;
        const tc = tickets.filter((tk) => {
          const ts = tk.createdAt ? new Date(tk.createdAt).getTime() : 0;
          return ts >= a && ts <= b;
        }).length;
        return rc + tc;
      })
    );
    const last7Sum = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const a = d.getTime();
      const b = a + 86400000 - 1;
      return (
        reports.filter((r) => {
          const ts = r.createdAt ? new Date(r.createdAt).getTime() : 0;
          return ts >= a && ts <= b;
        }).length +
        tickets.filter((tk) => {
          const ts = tk.createdAt ? new Date(tk.createdAt).getTime() : 0;
          return ts >= a && ts <= b;
        }).length
      );
    }).reduce((x, y) => x + y, 0);
    const pulse = Math.min(100, Math.round((last7Sum / (maxDayTotal * 7)) * 100) || 0);
    return {
      reports: reports.length,
      tickets: tickets.length,
      open: reportsOpen + ticketsOpen,
      resolved: totalResolved,
      resolvedRate,
      repPct,
      tktPct,
      pulse,
      reportsOpen,
      ticketsOpen,
    };
  }, [reports, tickets]);

  const activityData = useMemo(() => {
    const days: { date: string; day: string; incidents: number; requests: number; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dayStart = d.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;
      const reportCount = reports.filter((r) => {
        const ts = r.createdAt ? new Date(r.createdAt).getTime() : 0;
        return ts >= dayStart && ts <= dayEnd;
      }).length;
      const ticketCount = tickets.filter((tk) => {
        const ts = tk.createdAt ? new Date(tk.createdAt).getTime() : 0;
        return ts >= dayStart && ts <= dayEnd;
      }).length;
      days.push({
        date: formatShortDate(d),
        day: d.toLocaleDateString(undefined, { weekday: "narrow" }),
        incidents: reportCount,
        requests: ticketCount,
        total: reportCount + ticketCount,
      });
    }
    return days;
  }, [reports, tickets]);

  const statusData = useMemo(() => {
    const reportOpen = reports.filter((r) => !r.status).length;
    const reportResolved = reports.filter((r) => r.status).length;
    const ticketResolved = tickets.filter(isTicketResolved).length;
    const ticketOpen = tickets.length - ticketResolved;
    const openTotal = reportOpen + ticketOpen;
    const resolvedTotal = reportResolved + ticketResolved;
    const data = [
      { name: t("dashboard.open"), value: openTotal, color: "#3FFFA3" },
      { name: t("dashboard.resolved"), value: resolvedTotal, color: "#1F6A5C" },
    ];
    if (openTotal === 0 && resolvedTotal === 0) {
      return [{ name: "—", value: 1, color: "#5a6b64" }];
    }
    return data;
  }, [reports, tickets, t]);

  const pipeline = useMemo(() => {
    const total = reports.length + tickets.length;
    if (total === 0) {
      return [
        { key: "r", pct: 33, color: "linear-gradient(90deg,#103E36,#1F6A5C)", label: t("dashboard.openQueue") },
        { key: "t", pct: 34, color: "linear-gradient(90deg,#143d35,#1F6A5C)", label: t("dashboard.inProgressQueue") },
        { key: "c", pct: 33, color: "linear-gradient(90deg,#1F6A5C,#50BFA0)", label: t("dashboard.closedQueue") },
      ];
    }
    const ro = stats.reportsOpen;
    const to = stats.ticketsOpen;
    const p1 = Math.floor((ro / total) * 100);
    const p2 = Math.floor((to / total) * 100);
    const p3 = Math.max(0, 100 - p1 - p2);
    return [
      { key: "r", pct: p1, color: "linear-gradient(90deg,#103E36,#1F6A5C)", label: `${t("dashboard.openQueue")} (${t("dashboard.reports")})` },
      { key: "t", pct: p2, color: "linear-gradient(90deg,#143d35,#1F6A5C)", label: `${t("dashboard.openQueue")} (${t("dashboard.tickets")})` },
      { key: "c", pct: p3, color: "linear-gradient(90deg,#1F6A5C,#50BFA0)", label: t("dashboard.closedQueue") },
    ];
  }, [reports.length, tickets.length, stats, t]);

  const weekDays = useMemo(() => {
    const base = startOfWeek(new Date());
    base.setDate(base.getDate() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const weekLabel = useMemo(() => {
    const mid = weekDays[3] ?? new Date();
    return mid.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }, [weekDays]);

  const weekEvents = useMemo(() => {
    const start = weekDays[0]?.getTime() ?? 0;
    const end = (weekDays[6]?.getTime() ?? 0) + 86400000;
    type Ev = { id: string; title: string; at: Date; kind: "report" | "ticket"; resolved: boolean };
    const ev: Ev[] = [];
    reports.forEach((r) => {
      const at = r.createdAt ? new Date(r.createdAt) : null;
      if (!at || Number.isNaN(at.getTime())) return;
      const tms = at.getTime();
      if (tms < start || tms >= end) return;
      ev.push({ id: `r-${r.id}`, title: r.subject || "Report", at, kind: "report", resolved: !!r.status });
    });
    tickets.forEach((tk) => {
      const at = tk.createdAt ? new Date(tk.createdAt) : null;
      if (!at || Number.isNaN(at.getTime())) return;
      const tms = at.getTime();
      if (tms < start || tms >= end) return;
      ev.push({
        id: `t-${tk.id}`,
        title: tk.title || "Ticket",
        at,
        kind: "ticket",
        resolved: isTicketResolved(tk),
      });
    });
    return ev.sort((a, b) => b.at.getTime() - a.at.getTime());
  }, [reports, tickets, weekDays]);

  const recentItems = useMemo(() => {
    type Row = { id: string; title: string; sub: string; href: string; resolved: boolean; kind: "report" | "ticket"; ts: number };
    const rows: Row[] = [];
    reports.forEach((r) => {
      const ts = r.createdAt ? new Date(r.createdAt).getTime() : 0;
      rows.push({
        id: `r-${r.id}`,
        title: r.subject || "—",
        sub: formatTime(r.createdAt),
        href: "/report",
        resolved: !!r.status,
        kind: "report",
        ts,
      });
    });
    tickets.forEach((tk) => {
      const ts = tk.createdAt ? new Date(tk.createdAt).getTime() : 0;
      rows.push({
        id: `t-${tk.id}`,
        title: tk.title || "—",
        sub: formatTime(tk.createdAt),
        href: `/tickets/${tk.id}`,
        resolved: isTicketResolved(tk),
        kind: "ticket",
        ts,
      });
    });
    rows.sort((a, b) => b.ts - a.ts);
    return rows.slice(0, 8);
  }, [reports, tickets]);

  const itemsThisWeek = useMemo(() => {
    const start = weekDays[0]?.getTime() ?? 0;
    const end = (weekDays[6]?.getTime() ?? 0) + 86400000;
    let n = 0;
    reports.forEach((r) => {
      const ts = r.createdAt ? new Date(r.createdAt).getTime() : 0;
      if (ts >= start && ts < end) n += 1;
    });
    tickets.forEach((tk) => {
      const ts = tk.createdAt ? new Date(tk.createdAt).getTime() : 0;
      if (ts >= start && ts < end) n += 1;
    });
    return n;
  }, [reports, tickets, weekDays]);

  const isDark = colorMode === "dark";
  const axisColor = isDark ? "#e2e8f0" : "#475569";
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";

  if (!isAuthenticated && !isLoading) return null;

  const trackedLine = t("dashboard.itemsTracked")
    .replace("{done}", String(stats.resolved))
    .replace("{total}", String(stats.reports + stats.tickets));

  return (
    <>
      <SideMenu />
      <VStack className="w-full min-h-screen items-stretch">
        <div className={`${reportLayout.main} min-h-screen bg-[#D8E8E3] dark:bg-[#1C1E1C] relative z-0`}>
          <Box className="relative px-4 pb-12 pt-4 md:px-6 lg:px-8 max-w-[1600px] mx-auto w-full">
            {/* Hero */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-8">
              <Text className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#1C1E1C] dark:text-white mb-1">
                {t("dashboard.welcomeBack")}, {welcomeShort}
              </Text>
              <Text className="text-[#1F6A5C] dark:text-[#F4F3F4]/60 text-base md:text-lg">{t("dashboard.subtitle")}</Text>
            </motion.div>

            {/* Metric bars + big stats */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`xl:col-span-7 rounded-lg p-6 md:p-8 ${dash.glass}`}
              >
                <div className="grid gap-4">
                  {[
                    { label: t("dashboard.metricReports"), v: stats.repPct, bg: "linear-gradient(90deg,#103E36,#1F6A5C)" },
                    { label: t("dashboard.metricTickets"), v: stats.tktPct, bg: "linear-gradient(90deg,#143d35,#1F6A5C)" },
                    { label: t("dashboard.metricThroughput"), v: stats.resolvedRate, bg: "linear-gradient(90deg,#1F6A5C,#50BFA0)" },
                    { label: t("dashboard.metricPulse"), v: stats.pulse, bg: "linear-gradient(90deg,#50BFA0,#103E36)" },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="flex justify-between text-sm font-medium text-[#103E36] dark:text-[#F4F3F4]/80 mb-1.5">
                        <span>{m.label}</span>
                        <span className="tabular-nums">{loading ? "—" : `${m.v}%`}</span>
                      </div>
                      <div className="h-3 rounded-full bg-[#50BFA0]/15 dark:bg-[#3FFFA3]/8 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${dash.stripedBar}`}
                          style={{ width: loading ? "0%" : `${m.v}%`, background: m.bg }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className={`xl:col-span-5 rounded-lg p-6 md:p-8 ${dash.glassStrong}`}
              >
                <div className="grid grid-cols-3 gap-4 items-start">
                  {[
                    {
                      n: loading ? "—" : stats.reports,
                      lab: t("dashboard.reports"),
                      icon: IoDocumentTextOutline,
                      grad: "from-[#103E36] to-[#1F6A5C]",
                    },
                    {
                      n: loading ? "—" : stats.tickets,
                      lab: t("dashboard.tickets"),
                      icon: IoGitPullRequestSharp,
                      grad: "from-[#1F6A5C] to-[#50BFA0]",
                    },
                    {
                      n: loading ? "—" : stats.open,
                      lab: t("dashboard.open"),
                      icon: IoAlertCircle,
                      grad: "from-[#103E36] to-[#50BFA0]",
                    },
                  ].map((c) => (
                    <div key={c.lab} className="flex flex-col items-center text-center w-full min-w-0">
                      <div
                        className={`mx-auto mb-2 w-12 h-12 shrink-0 rounded-lg bg-gradient-to-br ${c.grad} flex items-center justify-center shadow-lg dark:shadow-[0_2px_14px_-2px_rgba(0,0,0,0.3)]`}
                      >
                        <Icon as={c.icon} className="text-white text-xl" />
                      </div>
                      <Text className="text-2xl md:text-3xl font-bold tabular-nums text-[#1C1E1C] dark:text-[#3FFFA3] shrink-0">
                        {c.n}
                      </Text>
                      <Text className="text-xs md:text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/55 font-medium leading-snug mt-1 px-0.5 w-full">
                        {c.lab}
                      </Text>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Profile card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`lg:col-span-4 rounded-lg overflow-hidden ${dash.glass}`}
              >
                <div className={`relative h-56 md:h-64 ${dash.profileShine}`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-white/90 shadow-2xl dark:shadow-[0_6px_28px_-6px_rgba(0,0,0,0.28)] bg-gradient-to-br from-[#50BFA0] to-[#1F6A5C] flex items-center justify-center">
                      {profile?.avatarSrc ? (
                        <img src={profile.avatarSrc} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-bold text-white">{initials(displayName)}</span>
                      )}
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[#1C1E1C]/92 to-transparent">
                    <Text className="text-white font-bold text-xl">{displayName}</Text>
                    <Text className="text-[#b8e8dd] text-sm">{role ?? t("dashboard.profileCardRole")}</Text>
                  </div>
                  <div className="absolute bottom-4 right-4 px-3 py-1 rounded-full bg-white/25 backdrop-blur text-white text-sm font-semibold border border-white/30">
                    {loading ? "—" : `${stats.resolvedRate}%`}
                  </div>
                </div>
                <div className="p-4 border-t border-white/40 dark:border-white/8">
                  <button
                    type="button"
                    onClick={() => setExpandedProfile((e) => !e)}
                    className="w-full flex items-center justify-between text-left py-2 text-[#103E36] dark:text-[#F4F3F4]/80 font-medium"
                  >
                    {t("dashboard.quickLinks")}
                    <Icon as={expandedProfile ? IoChevronDown : IoChevronForward} />
                  </button>
                  {expandedProfile && (
                    <div className="space-y-1 pt-1">
                      <Link
                        href="/tickets"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/60 dark:hover:bg-white/[0.06] transition-colors text-[#103E36] dark:text-[#F4F3F4]/80"
                      >
                        <Icon as={IoGitPullRequestSharp} className="text-[#1F6A5C] dark:text-[#F4F3F4]/55" />
                        {t("dashboard.goToTickets")}
                        <Icon as={IoChevronForward} className="ml-auto text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45" />
                      </Link>
                      <Link
                        href="/report"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/60 dark:hover:bg-white/[0.06] transition-colors text-[#103E36] dark:text-[#F4F3F4]/80"
                      >
                        <Icon as={IoDocumentTextOutline} className="text-[#1F6A5C] dark:text-[#F4F3F4]/55" />
                        {t("dashboard.goToReport")}
                        <Icon as={IoChevronForward} className="ml-auto text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45" />
                      </Link>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Activity chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className={`lg:col-span-5 rounded-lg p-6 ${dash.glass}`}
              >
                <div className="flex items-baseline justify-between mb-4">
                  <Text className="text-lg font-bold text-[#1C1E1C] dark:text-white">{t("dashboard.progress")}</Text>
                  <Text className="text-2xl font-light text-[#1F6A5C] dark:text-[#F4F3F4]/55 tabular-nums">
                    {loading ? "—" : itemsThisWeek}{" "}
                    <span className="text-sm font-medium text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45">{t("dashboard.hoursThisWeek")}</span>
                  </Text>
                </div>
                <Box className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityData} margin={{ top: 16, right: 8, left: -12, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barInc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3FFFA3" />
                          <stop offset="100%" stopColor="#1F6A5C" />
                        </linearGradient>
                        <linearGradient id="barReq" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#103E36" />
                          <stop offset="100%" stopColor="#1F6A5C" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                      <XAxis dataKey="day" tick={{ fill: axisColor, fontSize: 12, fontWeight: 600 }} />
                      <YAxis tick={{ fill: axisColor, fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }}
                        content={({ active, payload, label }) =>
                          active && payload?.length ? (
                            <div
                              className={`rounded-lg px-3 py-2 border ${isDark ? "bg-[#103E36] border-[#103E36] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.25)]" : "bg-white border-[#1F6A5C]/20 shadow-xl"}`}
                            >
                              <p className="text-xs font-semibold text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 mb-1">{label}</p>
                              {payload.map((p, i) => (
                                <p key={i} className="text-sm text-[#1C1E1C] dark:text-[#F4F3F4]">
                                  {p.name}: {p.value}
                                </p>
                              ))}
                            </div>
                          ) : null
                        }
                      />
                      <Bar dataKey="incidents" name={t("dashboard.incidents")} fill="url(#barInc)" radius={[8, 8, 0, 0]} maxBarSize={36} />
                      <Bar dataKey="requests" name={t("dashboard.requests")} fill="url(#barReq)" radius={[8, 8, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </motion.div>

              {/* Timer + donut column */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="lg:col-span-3 flex flex-col gap-6"
              >
                <FocusTimerCard isDark={isDark} glassClass={dash.glass} />

                <div className={`rounded-lg p-5 flex-1 min-h-[200px] ${dash.glass}`}>
                  <Text className="text-sm font-bold text-[#1C1E1C] dark:text-white mb-2">{t("dashboard.closureOverview")}</Text>
                  <Box className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={72}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`c-${index}`} fill={entry.color} stroke={isDark ? "#103E36" : "#fff"} strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: isDark ? "#103E36" : "#fff",
                            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb"}`,
                            borderRadius: "8px",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </div>

                <div className={`rounded-lg p-5 ${dash.glass}`}>
                  <Text className="text-sm font-bold text-[#1C1E1C] dark:text-white mb-3">{t("dashboard.pipelineTitle")}</Text>
                  <div className="flex h-4 rounded-full overflow-hidden shadow-inner bg-[#50BFA0]/15 dark:bg-[#1E2128]">
                    {pipeline.map((seg) => (
                      <div
                        key={seg.key}
                        title={seg.label}
                        style={{ width: `${seg.pct}%`, background: seg.color }}
                        className="min-w-[4px] transition-all duration-700"
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-[#1F6A5C] dark:text-[#F4F3F4]/60">
                    {pipeline.map((seg) => (
                      <span key={seg.key} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ background: seg.color }} />
                        {seg.label} {seg.pct}%
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Week strip */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className={`lg:col-span-8 rounded-lg p-6 ${dash.glass}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <Text className="text-lg font-bold text-[#1C1E1C] dark:text-white">{t("dashboard.thisWeek")}</Text>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setWeekOffset((w) => w - 1)}
                      className="px-3 py-1 rounded-full bg-white/70 dark:bg-[#1E2128] text-sm font-medium text-[#103E36] dark:text-[#F4F3F4]/80 border border-white/80 dark:border-white/8"
                    >
                      ←
                    </button>
                    <span className="text-sm font-semibold text-[#103E36] dark:text-[#F4F3F4]/80 min-w-[140px] text-center">{weekLabel}</span>
                    <button
                      type="button"
                      onClick={() => setWeekOffset((w) => w + 1)}
                      className="px-3 py-1 rounded-full bg-white/70 dark:bg-[#1E2128] text-sm font-medium text-[#103E36] dark:text-[#F4F3F4]/80 border border-white/80 dark:border-white/8"
                    >
                      →
                    </button>
                    <button
                      type="button"
                      onClick={() => setWeekOffset(0)}
                      className="px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white shadow-md dark:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.35)]"
                    >
                      {t("dashboard.today")}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-2 mb-6">
                  {weekDays.map((d) => {
                    const isToday = sameCalendarDay(d, new Date());
                    return (
                      <div
                        key={d.toISOString()}
                        className={`text-center rounded-lg py-3 px-1 border transition-all ${
                          isToday
                            ? "bg-gradient-to-br from-[#103E36] to-[#1F6A5C] text-white border-transparent shadow-lg dark:shadow-[0_4px_18px_-4px_rgba(0,0,0,0.32)] scale-[1.02]"
                            : "bg-white/30 dark:bg-[#1E2128]/55 border-white/40 dark:border-white/8 text-[#103E36] dark:text-[#F4F3F4]/80"
                        }`}
                      >
                        <div className="text-xs font-medium opacity-80">{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
                        <div className="text-lg font-bold tabular-nums">{d.getDate()}</div>
                      </div>
                    );
                  })}
                </div>
                <Text className="text-sm font-semibold text-[#103E36] dark:text-[#F4F3F4]/80 mb-3">{t("dashboard.activityChart")}</Text>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {weekEvents.length === 0 ? (
                    <Text className="text-[#1C1E1C]/60 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45 text-sm py-4 text-center">{t("dashboard.noRecent")}</Text>
                  ) : (
                    weekEvents.slice(0, 12).map((ev) => (
                      <Link
                        key={ev.id}
                        href={
                          ev.kind === "ticket"
                            ? `/tickets#incident-${ev.id.replace(/^t-/, "")}`
                            : "/report"
                        }
                        className={`flex items-center gap-3 rounded-lg px-4 py-3 border transition-all hover:shadow-md dark:hover:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.22)] ${
                          ev.resolved
                            ? "bg-[#F4F3F4]/80 dark:bg-[#1E2128]/70 border-[#1F6A5C]/20 dark:border-white/8"
                            : "bg-gradient-to-r from-[#1F6A5C]/12 to-[#50BFA0]/10 border-[#1F6A5C]/25 dark:border-white/10"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${
                            ev.kind === "ticket"
                              ? "bg-[#1F6A5C]/15 text-[#1F6A5C] dark:bg-white/[0.06] dark:text-[#F4F3F4]/55"
                              : "bg-[#50BFA0]/15 text-[#103E36] dark:bg-white/[0.05] dark:text-[#F4F3F4]/55"
                          }`}
                        >
                          <Icon as={ev.kind === "ticket" ? IoGitPullRequestSharp : IoDocumentTextOutline} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Text className="font-medium text-[#1C1E1C] dark:text-white truncate">{ev.title}</Text>
                          <Text className="text-xs text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45">{formatTime(ev.at.toISOString())}</Text>
                        </div>
                        {ev.resolved ? (
                          <Icon as={IoCheckmarkCircle} className="text-[#1F6A5C] dark:text-[#F4F3F4]/55 text-xl shrink-0" />
                        ) : (
                          <Icon as={IoAlertCircle} className="text-[#1F6A5C] dark:text-[#F4F3F4]/55 text-xl shrink-0 opacity-90" />
                        )}
                      </Link>
                    ))
                  )}
                </div>
              </motion.div>

              {/* Latest items */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={`lg:col-span-4 rounded-lg p-6 ${dash.glass}`}
              >
                <div className="flex items-center justify-between mb-5 gap-2">
                  <Text className="text-lg font-bold text-[#1C1E1C] dark:text-white">{t("dashboard.latestItems")}</Text>
                  <span className="text-xs font-mono tabular-nums shrink-0 text-[#1F6A5C] dark:text-[#3FFFA3] bg-[#1F6A5C]/10 dark:bg-[#3FFFA3]/10 px-3 py-1 rounded-full border border-[#1F6A5C]/20 dark:border-[#3FFFA3]/25">
                    {trackedLine}
                  </span>
                </div>
                <div className="space-y-2">
                  {recentItems.length === 0 ? (
                    <Text className="text-[#1C1E1C]/60 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45 text-sm py-6 text-center">{t("dashboard.noRecent")}</Text>
                  ) : (
                    recentItems.map((row) => (
                      <Link
                        key={row.id}
                        href={row.href}
                        className="flex items-center gap-3 rounded-lg px-3 py-3 border border-white/30 dark:border-white/8 bg-white/25 dark:bg-[#1E2128]/40 hover:bg-white/45 dark:hover:bg-white/[0.06] transition-colors"
                      >
                        <div className="w-9 h-9 rounded-md bg-gradient-to-br from-[#103E36]/25 to-[#50BFA0]/30 dark:from-[#103E36]/40 dark:to-[#1F6A5C]/35 flex items-center justify-center shrink-0">
                          <Icon
                            as={row.kind === "ticket" ? IoGitPullRequestSharp : IoDocumentTextOutline}
                            className="text-[#1F6A5C] dark:text-[#F4F3F4]/55"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Text className="font-medium text-[#1C1E1C] dark:text-white text-sm truncate">{row.title}</Text>
                          <Text className="text-xs text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45">{row.sub}</Text>
                        </div>
                        <div
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            row.resolved
                              ? "border-[#1F6A5C] dark:border-[#50BFA0] bg-[#1F6A5C]/10 dark:bg-white/[0.05]"
                              : "border-[#1F6A5C]/25 dark:border-[#3d4240]"
                          }`}
                        >
                          {row.resolved && <Icon as={IoCheckmarkCircle} className="text-[#1F6A5C] dark:text-[#F4F3F4]/55" />}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </motion.div>
            </div>
          </Box>
        </div>
      </VStack>
    </>
  );
}
