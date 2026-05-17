"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { FiSearch } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import type { Ticket, ReportItem, UserStatus } from "@/types";
import { TEAM_ROLES } from "@/types";
import type { Locale } from "@/lib/i18n/translations";
import {
  MdOutlineDevices, MdOutlinePhoneIphone, MdOutlineLock,
  MdOutlineWarningAmber, MdOutlineUsb, MdOutlineAccountCircle,
  MdOutlineFolderShared, MdOutlineHelpOutline, MdAdd, MdRefresh,
  MdOutlineShield, MdOutlineMarkEmailRead, MdOutlineVerified,
} from "react-icons/md";
import { IoAlertCircle, IoBugOutline, IoAttachOutline, IoChevronDown, IoChevronUp } from "react-icons/io5";

// ── Types ─────────────────────────────────────────────────────────────────────

type TableRow =
  | { kind: "ticket"; key: string; ticket: Ticket }
  | { kind: "report"; key: string; report: ReportItem };

type SiemMatch = { id: number; rule_name: string; severity: string };

const VERIFICATION_OPTIONS = [
  { value: "Aware", label: "I was aware of this" },
  { value: "Not Aware", label: "Not aware — this wasn't me" },
  { value: "Description is not clear", label: "Description unclear" },
] as const;

const LOCALE_TAG: Record<Locale, string> = {
  en: "en-US", cs: "cs-CZ", fr: "fr-FR", es: "es-ES", de: "de-DE",
};

// ── Incident categories ───────────────────────────────────────────────────────

const INCIDENT_CATEGORIES = [
  { value: "suspicious_device", label: "Suspicious Device Activity", icon: <MdOutlineDevices size={20} />, desc: "Strange behavior on your computer or device" },
  { value: "lost_device", label: "Lost or Stolen Device", icon: <MdOutlinePhoneIphone size={20} />, desc: "Corporate laptop, phone, or badge is missing" },
  { value: "unauthorized_access", label: "Unauthorized Access", icon: <MdOutlineLock size={20} />, desc: "Someone accessed your account or system without permission" },
  { value: "phishing_click", label: "Accidental Phishing Click", icon: <MdOutlineWarningAmber size={20} />, desc: "Clicked a suspicious link or opened a malicious attachment" },
  { value: "physical_security", label: "Physical Security Incident", icon: <MdOutlineUsb size={20} />, desc: "Found a USB drive, tailgating, suspicious person" },
  { value: "account_anomaly", label: "Account Anomaly", icon: <MdOutlineAccountCircle size={20} />, desc: "Unexpected password change, login, or account behavior" },
  { value: "data_concern", label: "Data Concern", icon: <MdOutlineFolderShared size={20} />, desc: "Accidental data share or suspicious request for data" },
  { value: "other", label: "Other Security Concern", icon: <MdOutlineHelpOutline size={20} />, desc: "Anything else that seems suspicious or wrong" },
];

function categoryForValue(v?: string | null) {
  return INCIDENT_CATEGORIES.find(c => c.value === v) ?? INCIDENT_CATEGORIES[INCIDENT_CATEGORIES.length - 1];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string | Date | undefined, locale: Locale): string {
  if (iso == null) return "—";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  const tag = LOCALE_TAG[locale] ?? "en-US";
  return d.toLocaleString(tag, { month: "short", day: "numeric" });
}

function priorityColor(p?: string) {
  const v = (p || "").toLowerCase();
  if (v === "critical") return "text-red-500 bg-red-500/10 border-red-500/25";
  if (v === "high") return "text-orange-400 bg-orange-400/10 border-orange-400/25";
  if (v === "medium") return "text-amber-400 bg-amber-400/10 border-amber-400/25";
  return "text-teal-400 bg-teal-400/10 border-teal-400/25";
}

function statusInfo(status: string) {
  const s = (status || "").toLowerCase();
  if (s.includes("resolved")) return { label: "Resolved", cls: "text-emerald-500 bg-emerald-500/10 border-emerald-500/25" };
  if (s.includes("updated")) return { label: "Updated", cls: "text-violet-400 bg-violet-400/10 border-violet-400/25" };
  if (s.includes("progress")) return { label: "In Progress", cls: "text-blue-400 bg-blue-400/10 border-blue-400/25" };
  return { label: "Open", cls: "text-sky-400 bg-sky-400/10 border-sky-400/25" };
}

function sevColor(sev: string) {
  const s = (sev || "").toLowerCase();
  if (s === "critical") return "text-red-500";
  if (s === "high") return "text-orange-400";
  if (s === "medium") return "text-amber-400";
  return "text-[#F4F3F4]/45 dark:text-[#F4F3F4]/45";
}

function normalizeTicketRow(t: Record<string, unknown>): Ticket {
  const created = t.createdAt ?? t.created_at;
  return { ...t, createdAt: created } as Ticket;
}

const getTickets = () => api.get("/tickets").then((r) => r.data);
const getProfile = () => api.get("/profile").then((r) => r.data).catch(() => null);
const sendTicketAnswer = (id: number, answer: string) =>
  api.patch(`/tickets/${id}/answer`, { answer }).then((r) => r.data);

// ── Main Component ─────────────────────────────────────────────────────────────

export function TicketsSimple() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [ticketRows, setTicketRows] = useState<Ticket[]>([]);
  const [reportRows, setReportRows] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [search, setSearch] = useState("");
  const [answer, setAnswer] = useState("");
  const [idTicket, setIdTicket] = useState<number | "">("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"action" | "mine" | "all">("action");
  const [socTab, setSocTab] = useState<"all" | "from_users" | "sent_to_users" | "grc" | "pentesting" | "vuln_mgmt">("all");
  const [siemMatches, setSiemMatches] = useState<Record<string, SiemMatch[]>>({});
  const [siemLoading, setSiemLoading] = useState(false);

  const isEndUser = role === "End-User";
  const isSecurityTeam = role === "Security Manager" || role === "GSOC" || role === "Admin";
  const isTeamMember = role != null && TEAM_ROLES.includes(role as UserStatus);

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    const ticketP = getTickets();
    const reportP = isEndUser
      ? api.get("/reports").then((r) => (Array.isArray(r.data) ? r.data : []))
      : Promise.resolve([] as ReportItem[]);

    Promise.all([ticketP, reportP])
      .then(([rawTickets, rawReports]) => {
        const tlist = Array.isArray(rawTickets) ? rawTickets : [];
        setTicketRows(tlist.map((x) => normalizeTicketRow(x as Record<string, unknown>)));
        setReportRows(Array.isArray(rawReports) ? rawReports : []);
      })
      .catch(() => toast({ title: t("tickets.errorLoading"), status: "error", duration: 4000 }))
      .finally(() => setLoading(false));
  }, [toast, t, isEndUser, role]);

  useEffect(() => {
    getProfile().then((p) => p && setFirstName(p.firstName || (user?.email ?? "").split("@")[0] || ""));
  }, [user?.email]);

  // ── SIEM correlation (for security teams only) ─────────────────────────────

  useEffect(() => {
    if (!isSecurityTeam || ticketRows.length === 0) return;
    setSiemLoading(true);
    const items = ticketRows
      .filter(t => t.fromUser || (t as unknown as { hostname?: string }).hostname)
      .map(t => ({
        username: t.fromUser || null,
        hostname: (t as unknown as { hostname?: string }).hostname || null,
      }))
      .filter(i => i.username || i.hostname);

    if (items.length === 0) { setSiemLoading(false); return; }

    api.post("/siem/bulk-correlate", { items })
      .then(r => setSiemMatches(r.data?.matches ?? {}))
      .catch(() => {})
      .finally(() => setSiemLoading(false));
  }, [ticketRows, isSecurityTeam]);

  function getSiemMatchForTicket(ticket: Ticket): SiemMatch[] {
    const key = `${ticket.fromUser || ""}:${(ticket as unknown as { hostname?: string }).hostname || ""}`;
    return siemMatches[key] ?? [];
  }

  // ── Merged rows ────────────────────────────────────────────────────────────

  const mergedRows = useMemo((): TableRow[] => {
    const fromTickets: TableRow[] = ticketRows.map(ticket => ({ kind: "ticket", key: `t-${ticket.id}`, ticket }));
    const fromReports: TableRow[] = isEndUser
      ? reportRows.map(report => ({ kind: "report", key: `r-${report.id}`, report }))
      : [];
    return [...fromTickets, ...fromReports].sort((a, b) => {
      const ta = a.kind === "ticket" ? a.ticket.createdAt : a.report.createdAt;
      const tb = b.kind === "ticket" ? b.ticket.createdAt : b.report.createdAt;
      return (tb ? new Date(tb).getTime() : 0) - (ta ? new Date(ta).getTime() : 0);
    });
  }, [ticketRows, reportRows, isEndUser]);

  // ── End-user splits ────────────────────────────────────────────────────────

  const fromSocItems = useMemo(() =>
    ticketRows.filter(t => t.answer === "" || t.answer == null),
    [ticketRows]
  );

  const myReportItems = useMemo(() =>
    reportRows,
    [reportRows]
  );

  // ── SOC tab splits ─────────────────────────────────────────────────────────

  const TEAM_ROLE_NAMES = ["GRC", "IAM", "Pentesting", "Security Manager", "GSOC", "Admin"];

  const fromUserRows = useMemo(() =>
    ticketRows.filter(t => t.createdByRole === "End-User"),
    [ticketRows]
  );

  const sentToUserRows = useMemo(() =>
    ticketRows.filter(t => {
      const assignedTo = t.assignedTo || "";
      const createdByRole = t.createdByRole || "";
      const isTeamCreated = TEAM_ROLE_NAMES.includes(createdByRole);
      const isAssignedToUser = assignedTo && !TEAM_ROLE_NAMES.includes(assignedTo) && assignedTo !== "MULTI" && assignedTo !== "";
      return isTeamCreated && isAssignedToUser;
    }),
    [ticketRows]
  );

  const grcRows = useMemo(() =>
    ticketRows.filter(t => t.type === "Policy Notification" || t.type === "Notification"),
    [ticketRows]
  );

  const pentestingRows = useMemo(() =>
    ticketRows.filter(t => t.type === "Investigation" || t.type === "Investigation Response"),
    [ticketRows]
  );

  const vulnMgmtRows = useMemo(() =>
    ticketRows.filter(t => t.type === "Vulnerability Coordination"),
    [ticketRows]
  );

  function getSocTabRows(): Ticket[] {
    if (socTab === "from_users") return fromUserRows;
    if (socTab === "sent_to_users") return sentToUserRows;
    if (socTab === "grc") return grcRows;
    if (socTab === "pentesting") return pentestingRows;
    if (socTab === "vuln_mgmt") return vulnMgmtRows;
    return ticketRows;
  }

  const socFilteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = getSocTabRows();
    if (!q) return rows;
    return rows.filter(t =>
      t.title?.toLowerCase().includes(q) ||
      t.text?.toLowerCase().includes(q) ||
      String(t.id).includes(q)
    );
  }, [socTab, ticketRows, search, fromUserRows, sentToUserRows, grcRows, pentestingRows, vulnMgmtRows]);

  // ── General filtered rows (for non-security-team roles) ────────────────────

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = mergedRows;
    if (!q) return rows;
    return rows.filter(row => {
      if (row.kind === "ticket") {
        const x = row.ticket;
        return x.title?.toLowerCase().includes(q) || x.text?.toLowerCase().includes(q) || String(x.id).includes(q);
      }
      const r = row.report;
      return (r.subject && r.subject.toLowerCase().includes(q)) || String(r.id).toLowerCase().includes(q);
    });
  }, [mergedRows, search]);

  // ── Answer ─────────────────────────────────────────────────────────────────

  async function sendAnswer() {
    if (!idTicket || !answer) return;
    try {
      const updated = await sendTicketAnswer(idTicket as number, answer);
      setTicketRows(prev => prev.map(x => x.id === idTicket ? { ...x, answer: updated.answer, status: updated.status } : x));
      setAnswer(""); setIdTicket(""); setExpandedId(null);
      toast({ title: t("tickets.toastReplySent"), description: t("tickets.toastReplySentDesc"), status: "success", duration: 4000 });
    } catch {
      toast({ title: t("tickets.toastReplyFailed"), description: t("tickets.toastReplyFailedDesc"), status: "error", duration: 4000 });
    }
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────

  const card = "rounded-xl border border-white/60 dark:border-white/8 bg-white/80 dark:bg-[#1E2128] shadow-sm";

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45">
      <span className="w-5 h-5 border-2 border-[#1F6A5C]/25 border-t-slate-600 rounded-full animate-spin mr-3" />
      Loading…
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // END-USER VIEW
  // ══════════════════════════════════════════════════════════════════════════

  if (isEndUser) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#1C1E1C] dark:text-white">
              Hi{firstName ? `, ${firstName}` : ""}!
            </h1>
            <p className="text-sm text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45 mt-0.5">
              Report security concerns or respond to requests from the security team.
            </p>
          </div>
          <Link href="/tickets/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white shadow-sm hover:opacity-90 transition-opacity">
            <MdAdd size={18} /> Report Incident
          </Link>
        </div>

        {/* Action needed banner */}
        {fromSocItems.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-amber-400/30 bg-amber-400/8 dark:bg-amber-400/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <IoAlertCircle size={18} className="text-amber-400 shrink-0" />
              <span className="text-sm font-bold text-amber-500 dark:text-amber-400">
                {fromSocItems.length} request{fromSocItems.length > 1 ? "s" : ""} need{fromSocItems.length === 1 ? "s" : ""} your response
              </span>
            </div>
            <div className="space-y-3">
              {fromSocItems.map(x => (
                <div key={x.id} className="rounded-lg bg-white dark:bg-[#1c1e1c] border border-white/60 dark:border-white/8 p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-[#1F6A5C]/10 dark:bg-white/[0.05] flex items-center justify-center shrink-0 mt-0.5">
                      {x.type === "Activity Verification" ? <MdOutlineVerified size={16} className="text-[#1F6A5C] dark:text-[#F4F3F4]/55" /> :
                        x.type === "Security Announcement" ? <MdOutlineMarkEmailRead size={16} className="text-[#1F6A5C] dark:text-[#F4F3F4]/55" /> :
                        <MdOutlineShield size={16} className="text-[#1F6A5C] dark:text-[#F4F3F4]/55" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-xs font-bold uppercase tracking-wide text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 dark:text-[#F4F3F4]/55">
                          {x.type === "Activity Verification" ? "Activity Verification" :
                           x.type === "Security Announcement" ? "Security Announcement" : "Request from Security Team"}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[#1C1E1C] dark:text-white">{x.title}</p>
                      <p className="text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/60 mt-0.5 line-clamp-2">{x.text}</p>
                    </div>
                  </div>
                  {/* Response buttons */}
                  {x.type === "Activity Verification" ? (
                    <div className="flex flex-wrap gap-2">
                      {VERIFICATION_OPTIONS.map(({ value, label }) => (
                        <button key={value}
                          onClick={() => { setAnswer(value); setIdTicket(x.id); }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            idTicket === x.id && answer === value
                              ? "bg-[#1F6A5C] border-[#1F6A5C] text-white"
                              : "border-white/60 dark:border-white/8 text-[#1F6A5C] dark:text-[#F4F3F4]/60 hover:border-[#1F6A5C]/50"
                          }`}>
                          {label}
                        </button>
                      ))}
                      <button onClick={sendAnswer} disabled={idTicket !== x.id || !answer}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white disabled:opacity-40 transition-opacity">
                        Send Reply
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setAnswer("Acknowledged"); setIdTicket(x.id); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          idTicket === x.id && answer === "Acknowledged"
                            ? "bg-[#1F6A5C] border-[#1F6A5C] text-white"
                            : "border-white/60 dark:border-white/8 text-[#1F6A5C] dark:text-[#F4F3F4]/60"
                        }`}>
                        Acknowledge
                      </button>
                      <button onClick={sendAnswer} disabled={idTicket !== x.id || !answer}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white disabled:opacity-40">
                        Send
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* My submitted reports */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[#103E36] dark:text-[#F4F3F4]/60 uppercase tracking-wide">
              My Reports {myReportItems.length > 0 && <span className="text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 font-normal normal-case tracking-normal">({myReportItems.length})</span>}
            </h2>
          </div>
          {myReportItems.length === 0 ? (
            <div className={`${card} p-8 flex flex-col items-center text-center text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45`}>
              <IoBugOutline size={32} className="mb-2 opacity-40" />
              <p className="text-sm font-medium text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45">No reports yet</p>
              <p className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 dark:text-[#F4F3F4]/55 mt-1">Click "Report Incident" to submit your first security concern.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myReportItems.map((r) => {
                const cat = categoryForValue((r as ReportItem & { category?: string }).category);
                const pipelineStatus = r.pipelineStatus ?? "new";
                const isResolved = r.status === true || pipelineStatus === "resolved";
                return (
                  <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    onClick={() => router.push("/report")}
                    className={`${card} p-4 cursor-pointer hover:border-[#1F6A5C]/30 transition-colors`}>
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#F4F3F4] dark:bg-[#1c1e1c] flex items-center justify-center text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45 shrink-0">
                        {cat.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-sm font-semibold text-[#1C1E1C] dark:text-white truncate">{r.subject}</span>
                          {r.priority && (
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold capitalize ${priorityColor(r.priority)}`}>
                              {r.priority}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45 truncate">{String(r.description || "").slice(0, 100)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${isResolved ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/25" : "text-sky-400 bg-sky-400/10 border-sky-400/25"}`}>
                          {isResolved ? "Resolved" : pipelineStatus.replace(/_/g, " ")}
                        </span>
                        <p className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 mt-1">{formatRelativeTime(r.createdAt, locale)}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Resolved tickets */}
        {ticketRows.filter(t => t.answer && t.answer !== "").length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-[#103E36] dark:text-[#F4F3F4]/60 uppercase tracking-wide mb-3">
              Completed Requests
            </h2>
            <div className="space-y-2">
              {ticketRows.filter(t => t.answer && t.answer !== "").map(x => (
                <div key={x.id} className={`${card} p-4 opacity-70`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <MdOutlineVerified size={15} className="text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#103E36] dark:text-[#F4F3F4]/60 truncate">{x.title}</p>
                      <p className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45">Your response: <span className="font-semibold text-emerald-500">{x.answer}</span></p>
                    </div>
                    <span className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45">{formatRelativeTime(x.createdAt, locale)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECURITY TEAM VIEW (SOC / Manager / IAM / GRC / Pentesting)
  // ══════════════════════════════════════════════════════════════════════════

  const siemMatchedCount = fromUserRows.filter(t => getSiemMatchForTicket(t).length > 0).length;
  const openCount = fromUserRows.filter(t => !t.status?.toLowerCase().includes("resolved")).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#1C1E1C] dark:text-white">Comms</h1>
            <p className="text-sm text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45 mt-0.5">Incoming reports and team communications</p>
          </div>
          {/* Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/60 dark:bg-[#1E2128] border border-white/60 dark:border-white/8">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span className="text-sm font-semibold text-[#103E36] dark:text-[#F4F3F4]/80">{openCount} open</span>
            </div>
            {siemMatchedCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25">
                <IoAlertCircle size={14} className="text-red-400" />
                <span className="text-sm font-semibold text-red-400">{siemMatchedCount} SIEM match{siemMatchedCount > 1 ? "es" : ""}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/tickets/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white shadow-sm hover:opacity-90 transition-opacity">
            <MdAdd size={16} /> Send Request
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[#1F6A5C]/20 dark:border-white/8 flex-wrap">
        {([
          { key: "all", label: "All", count: ticketRows.length },
          { key: "from_users", label: "From Users", count: fromUserRows.length },
          { key: "sent_to_users", label: "To Users", count: sentToUserRows.length },
          { key: "grc", label: "GRC", count: grcRows.length },
          { key: "pentesting", label: "Pentesting", count: pentestingRows.length },
          { key: "vuln_mgmt", label: "Vuln Mgmt", count: vulnMgmtRows.length },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setSocTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-all ${
              socTab === tab.key
                ? "border-[#1F6A5C] text-[#1F6A5C] dark:text-[#F4F3F4]/55"
                : "border-transparent text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 dark:text-[#F4F3F4]/55 hover:text-[#103E36] dark:hover:text-[#F4F3F4]/60"
            }`}>
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                socTab === tab.key ? "bg-[#1F6A5C]/15 text-[#1F6A5C] dark:text-[#F4F3F4]/55" : "bg-[#F4F3F4] dark:bg-[#1E2128] text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45"
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 pointer-events-none" />
        <input
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 pr-3 py-2 w-full rounded-lg text-sm border border-white/60 dark:border-white/8 bg-white/60 dark:bg-[#1E2128] text-[#103E36] dark:text-[#F4F3F4]/80 placeholder:text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/40"
        />
      </div>

      {/* Items list */}
      {socFilteredRows.length === 0 ? (
        <div className={`${card} p-12 flex flex-col items-center text-center`}>
          <MdOutlineShield size={36} className="mb-3 text-[#F4F3F4]/80 dark:text-[#F4F3F4]/65" />
          <p className="text-sm font-medium text-[#1C1E1C]/60 dark:text-[#F4F3F4]/55">
            {socTab === "from_users" ? "No reports from users yet" :
             socTab === "sent_to_users" ? "No requests sent to users yet" :
             socTab === "grc" ? "No GRC communications yet" :
             socTab === "pentesting" ? "No Pentesting investigations yet" :
             socTab === "vuln_mgmt" ? "No vulnerability coordination tickets yet" :
             "No requests found"}
          </p>
          <p className="text-xs mt-1 text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 dark:text-[#F4F3F4]/65">
            {socTab === "sent_to_users" ? 'Click "Send Request" to send an activity verification or announcement.' : ""}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {socFilteredRows.map((x) => {
            const siemHits = getSiemMatchForTicket(x);
            const hasSiem = siemHits.length > 0;
            const st = statusInfo(x.status || "");
            const cat = categoryForValue((x as Ticket & { category?: string }).category);

            return (
              <motion.div key={x.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => router.push(`/tickets/${x.id}`)}
                className={`${card} p-4 cursor-pointer hover:border-[#1F6A5C]/30 transition-colors ${hasSiem ? "border-red-500/30 dark:border-red-500/20" : ""}`}>
                {hasSiem && (
                  <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg bg-red-500/8 border border-red-500/20">
                    <IoAlertCircle size={14} className="text-red-400 shrink-0" />
                    <span className="text-xs font-semibold text-red-400">SIEM Match:</span>
                    <span className={`text-xs font-semibold ${sevColor(siemHits[0].severity)}`}>
                      {siemHits[0].rule_name}{siemHits.length > 1 && ` +${siemHits.length - 1} more`}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3 min-h-[56px]">
                  <div className="w-9 h-9 rounded-lg bg-[#F4F3F4] dark:bg-[#1c1e1c] flex items-center justify-center text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 shrink-0">
                    {x.type === "Activity Verification" ? <MdOutlineVerified size={17} className="text-[#1F6A5C] dark:text-[#F4F3F4]/55" /> :
                     x.type === "Security Announcement" ? <MdOutlineMarkEmailRead size={17} className="text-[#1F6A5C] dark:text-[#F4F3F4]/55" /> :
                     cat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs font-bold uppercase tracking-wide text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 dark:text-[#F4F3F4]/55">{x.type || "Incident"}</span>
                      {x.priority && <span className={`text-xs px-1.5 py-0.5 rounded border font-semibold capitalize ${priorityColor(x.priority)}`}>{x.priority}</span>}
                    </div>
                    <p className="text-sm font-semibold text-[#1C1E1C] dark:text-white line-clamp-1">{x.title}</p>
                    <p className="text-xs text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45 line-clamp-1 mt-0.5">
                      {x.fromUser && <span className="mr-2 font-mono">{x.fromUser}</span>}
                      {x.text?.slice(0, 100)}{(x.text?.length ?? 0) > 100 ? "…" : ""}
                    </p>
                    {x.answer && <p className="text-xs text-emerald-500 mt-1 font-semibold">✓ Responded: {x.answer}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${st.cls}`}>{st.label}</span>
                    <p className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 mt-1">{formatRelativeTime(x.createdAt, locale)}</p>
                    {(x.attachmentCount ?? 0) > 0 && (
                      <span className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 flex items-center gap-0.5 justify-end mt-0.5">
                        <IoAttachOutline size={12} />{x.attachmentCount}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
