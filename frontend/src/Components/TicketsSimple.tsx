"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import style from "@/styles/Tickets.module.css";
import { IoBugOutline, IoAttachOutline } from "react-icons/io5";
import { FiSearch } from "react-icons/fi";
import { Button, Box, Text, HStack, Input, Select } from "@/ui";
import { useToast } from "@/hooks/useToast";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import type { Ticket, ReportItem, UserStatus } from "@/types";
import { TEAM_ROLES } from "@/types";
import type { Locale } from "@/lib/i18n/translations";

const getTickets = () => api.get("/tickets").then((r) => r.data);
const getProfile = () => api.get("/profile").then((r) => r.data).catch(() => null);
const sendTicketAnswer = (id: number, answer: string) => api.patch(`/tickets/${id}/answer`, { answer }).then((r) => r.data);

const LOCALE_TAG: Record<Locale, string> = {
  en: "en-US",
  cs: "cs-CZ",
  fr: "fr-FR",
  es: "es-ES",
  de: "de-DE",
};

/** Значения ответа API (PATCH /tickets/:id/answer) — подписи через i18n */
const VERIFICATION_OPTIONS = [
  { value: "Aware", labelKey: "tickets.answerAware" },
  { value: "Not Aware", labelKey: "tickets.answerNotAware" },
  { value: "Description is not clear", labelKey: "tickets.answerDescUnclear" },
] as const;

function statusBadgeLabel(status: string, t: (key: string) => string): string | null {
  const s = (status || "").toLowerCase();
  if (s.includes("resolved")) return t("tickets.statusResolved");
  if (s.includes("updated")) return t("tickets.statusUpdated");
  if (s === "new" || s.startsWith("new ")) return t("tickets.statusNew");
  return null;
}

function onCallLabel(email: string): string {
  const part = email.split("@")[0] || "";
  const [name, rest] = part.split(".");
  const a = (name || part).charAt(0).toUpperCase() + (name || part).slice(1);
  const b = rest ? rest.charAt(0).toUpperCase() : "";
  return b ? `${a} ${b}.` : a;
}

/** Значение <option> для фильтра «по роли создателя» (GSOC / Management). */
const FILTER_BY_CREATOR_ROLE_PREFIX = "byCreatorRole:";
const FILTER_CREATOR_UNKNOWN = "creator_unknown";

const TICKET_CREATOR_ROLES_FOR_FILTER = [
  "Security Manager",
  "GSOC",
  "Admin",
  "GRC",
  "IAM",
  "Pentesting",
  "End-User",
] as const;

function labelForCreatorRole(roleName: string, t: (key: string) => string): string {
  const keyMap: Record<string, string> = {
    "Security Manager": "tickets.creatorRole.securityManager",
    GSOC: "tickets.creatorRole.gsoc",
    Admin: "tickets.creatorRole.admin",
    GRC: "tickets.creatorRole.grc",
    IAM: "tickets.creatorRole.iam",
    Pentesting: "tickets.creatorRole.pentesting",
    "End-User": "tickets.creatorRole.endUser",
  };
  const k = keyMap[roleName];
  return k ? t(k) : roleName;
}

type TableRow =
  | { kind: "ticket"; key: string; ticket: Ticket }
  | { kind: "report"; key: string; report: ReportItem };

function normalizeTicketRow(t: Record<string, unknown>): Ticket {
  const created = t.createdAt ?? t.created_at;
  return { ...t, createdAt: created } as Ticket;
}

export function TicketsSimple() {
  const router = useRouter();
  const [ticketRows, setTicketRows] = useState<Ticket[]>([]);
  const [reportRows, setReportRows] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [firstName, setFirstName] = useState("");
  const [answer, setAnswer] = useState("");
  const [idTicket, setIdTicket] = useState<number | "">("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  /** End-User: all | soc | mine. GSOC/Management/Admin: all | created_me | byCreatorRole:* | creator_unknown */
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const { toast } = useToast();
  const { t, locale } = useLanguage();
  const { user, role } = useAuth();

  const showInlineReply =
    role === "End-User" || (role != null && TEAM_ROLES.includes(role as UserStatus));

  const showSourceFilter =
    role === "End-User" ||
    role === "Security Manager" ||
    role === "GSOC" ||
    role === "Admin";

  useEffect(() => {
    setSourceFilter("all");
  }, [role]);

  const sourceFilterOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: "all", label: t("tickets.filterAll") },
    ];
    if (role === "End-User") {
      opts.push(
        { value: "soc", label: t("tickets.filterFromSoc") },
        { value: "mine", label: t("tickets.filterMySubmissions") }
      );
    } else {
      opts.push({ value: "created_me", label: t("tickets.filterICreated") });
      TICKET_CREATOR_ROLES_FOR_FILTER.forEach((r) => {
        opts.push({
          value: `${FILTER_BY_CREATOR_ROLE_PREFIX}${r}`,
          label: labelForCreatorRole(r, t),
        });
      });
      opts.push({ value: FILTER_CREATOR_UNKNOWN, label: t("tickets.filterUnknownCreator") });
    }
    return opts;
  }, [role, t]);

  const formatStartedAt = useCallback(
    (createdAt: string | Date | undefined): string => {
      if (createdAt == null) return "—";
      const d = createdAt instanceof Date ? createdAt : new Date(createdAt);
      if (Number.isNaN(d.getTime())) return "—";
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      if (diffDays === 0) return t("tickets.timeToday");
      if (diffDays === 1) return t("tickets.timeOneDayAgo");
      if (diffDays < 7) return t("tickets.timeDaysAgo").replace("{n}", String(diffDays));
      if (diffDays < 14) return t("tickets.timeOneWeekAgo");
      const tag = LOCALE_TAG[locale] ?? "en-US";
      return d.toLocaleString(tag, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    },
    [locale, t]
  );

  const mergedTableRows = useMemo((): TableRow[] => {
    const fromTickets: TableRow[] = ticketRows.map((ticket) => ({
      kind: "ticket",
      key: `t-${ticket.id}`,
      ticket,
    }));
    const fromReports: TableRow[] =
      role === "End-User"
        ? reportRows.map((report) => ({
            kind: "report",
            key: `r-${report.id}`,
            report,
          }))
        : [];
    const combined = [...fromTickets, ...fromReports];
    combined.sort((a, b) => {
      const ta = a.kind === "ticket" ? a.ticket.createdAt : a.report.createdAt;
      const tb = b.kind === "ticket" ? b.ticket.createdAt : b.report.createdAt;
      const da = ta ? new Date(ta).getTime() : 0;
      const db = tb ? new Date(tb).getTime() : 0;
      return db - da;
    });
    return combined;
  }, [ticketRows, reportRows, role]);

  const sourceFilteredRows = useMemo(() => {
    const merged = mergedTableRows;
    if (role === "End-User") {
      if (sourceFilter === "soc") return merged.filter((r) => r.kind === "ticket");
      if (sourceFilter === "mine") return merged.filter((r) => r.kind === "report");
      return merged;
    }
    if (role === "Security Manager" || role === "GSOC" || role === "Admin") {
      const email = (user?.email || "").toLowerCase();
      if (sourceFilter === "created_me") {
        return merged.filter((r) => {
          if (r.kind !== "ticket") return false;
          return (r.ticket.createdBy || "").toLowerCase() === email;
        });
      }
      if (sourceFilter === FILTER_CREATOR_UNKNOWN) {
        return merged.filter((r) => {
          if (r.kind !== "ticket") return false;
          const cr = r.ticket.createdByRole;
          return cr == null || String(cr).trim() === "";
        });
      }
      if (sourceFilter.startsWith(FILTER_BY_CREATOR_ROLE_PREFIX)) {
        const roleName = sourceFilter.slice(FILTER_BY_CREATOR_ROLE_PREFIX.length);
        return merged.filter((r) => {
          if (r.kind !== "ticket") return false;
          return (r.ticket.createdByRole || "") === roleName;
        });
      }
      return merged;
    }
    return merged;
  }, [mergedTableRows, role, user?.email, sourceFilter]);

  const filteredTableRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sourceFilteredRows;
    return sourceFilteredRows.filter((row) => {
      if (row.kind === "ticket") {
        const x = row.ticket;
        return (
          x.title?.toLowerCase().includes(q) ||
          x.text?.toLowerCase().includes(q) ||
          String(x.id).includes(q)
        );
      }
      const r = row.report;
      return (
        (r.subject && r.subject.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        String(r.id).toLowerCase().includes(q)
      );
    });
  }, [sourceFilteredRows, search]);

  useEffect(() => {
    setLoading(true);
    const ticketP = getTickets();
    const reportP =
      role === "End-User"
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
  }, [toast, t, role]);

  useEffect(() => {
    if (loading || typeof window === "undefined") return;
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw.startsWith("incident-")) return;
    requestAnimationFrame(() => {
      document.getElementById(raw)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [loading, filteredTableRows]);

  useEffect(() => {
    getProfile().then((p) => p && setFirstName(p.firstName || (user?.email ?? "").split("@")[0] || ""));
  }, [user?.email]);

  async function sendAnswer() {
    const answerValue = answer;
    const ticketId = idTicket;
    if (!ticketId || !answerValue) return;
    try {
      const updated = await sendTicketAnswer(ticketId, answerValue);
      setTicketRows((prev) =>
        prev.map((x) => (x.id === ticketId ? { ...x, answer: updated.answer, status: updated.status } : x))
      );
      setAnswer("");
      setIdTicket("");
      setExpandedId(null);
      toast({
        title: t("tickets.toastReplySent"),
        description: t("tickets.toastReplySentDesc"),
        status: "success",
        duration: 4000,
      });
    } catch {
      toast({
        title: t("tickets.toastReplyFailed"),
        description: t("tickets.toastReplyFailedDesc"),
        status: "error",
        duration: 4000,
      });
    }
  }

  if (loading) return <div className={style.simpleUserBlock}>{t("common.loading")}</div>;

  const textColor = "text-gray-800 dark:text-gray-100";
  const labelColor = "text-gray-500 dark:text-gray-400";

  return (
    <div className={style.simpleUserBlock}>
      {/* Header: greeting, search, Report button */}
      <HStack className="flex-wrap gap-4 mb-6" justify="space-between" align="center">
        <Text fontSize="xl" fontWeight={700} className={textColor}>
          {t("tickets.welcomeUser").replace("{name}", firstName || t("tickets.welcomeAnonymous"))}
        </Text>
        <HStack spacing={3} className="flex-nowrap items-center overflow-x-auto max-w-full min-w-0 pb-0.5">
          {showSourceFilter ? (
            <Select
              size="sm"
              value={sourceFilter}
              onChange={setSourceFilter}
              options={sourceFilterOptions}
              className="min-w-[180px] max-w-[260px] w-[min(260px,45vw)] shrink-0 h-9"
              aria-label={t("tickets.filterListAria")}
            />
          ) : null}
          <Box className="relative h-9 flex items-center shrink-0">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none" size={18} />
            <Input
              placeholder={t("tickets.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-40 sm:w-48 min-w-[120px] max-w-[200px] h-9"
            />
          </Box>
          <Button
            as={Link}
            href="/tickets/new"
            className="bg-[#1F6A5C] hover:bg-[#267E6D] text-white rounded-lg px-4 !h-9 min-h-[36px] shrink-0 whitespace-nowrap"
            size="sm"
          >
            {t("tickets.createNewIncident")}
          </Button>
        </HStack>
      </HStack>

      {/* Table */}
      <Box className="rounded-lg border border-gray-200 dark:border-white/20 overflow-hidden bg-white dark:bg-[#232522]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/20 bg-gray-100 dark:bg-[#181a18]">
              <th className={`px-4 py-3 text-sm font-600 ${labelColor}`}>{t("tickets.colIncident")}</th>
              <th className={`px-4 py-3 text-sm font-600 ${labelColor}`}>{t("tickets.colStartedAt")}</th>
              <th className={`px-4 py-3 text-sm font-600 ${labelColor}`}>{t("tickets.colLength")}</th>
              <th className={`px-4 py-3 text-sm font-600 ${labelColor}`}>{t("tickets.colOnCall")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredTableRows.map((row) => {
              if (row.kind === "ticket") {
                const x = row.ticket;
                const badge = statusBadgeLabel(x.status, t);
                return (
                  <tr
                    key={row.key}
                    id={`incident-${x.id}`}
                    role="link"
                    tabIndex={0}
                    className="border-b border-gray-100 dark:border-white/10 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 scroll-mt-24 cursor-pointer"
                    onClick={() => router.push(`/tickets/${x.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/tickets/${x.id}`);
                      }
                    }}
                  >
                    <td className="px-4 py-3">
                      <HStack spacing={3} align="flex-start">
                        <Box className="shrink-0 mt-0.5 text-gray-500 dark:text-gray-400">
                          <IoBugOutline size={20} />
                        </Box>
                        <Box>
                          <HStack spacing={2} align="center" className="flex-wrap">
                            <Text fontWeight={600} className={textColor}>
                              {x.title}
                            </Text>
                            {(x.attachmentCount ?? 0) > 0 ? (
                              <span
                                className="inline-flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400"
                                title={t("tickets.attachmentsHeading")}
                              >
                                <IoAttachOutline size={16} aria-hidden />
                                {x.attachmentCount}
                              </span>
                            ) : null}
                          </HStack>
                          <Text fontSize="sm" className={labelColor}>
                            {x.text?.slice(0, 60)}
                            {(x.text?.length ?? 0) > 60 ? "…" : ""}
                          </Text>
                          {badge && (
                            <span
                              className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                                (x.status || "").toLowerCase().includes("resolved")
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                  : (x.status || "").toLowerCase().includes("updated")
                                    ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                                    : "bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200"
                              }`}
                            >
                              {badge}
                            </span>
                          )}
                        </Box>
                      </HStack>
                    </td>
                    <td className={`px-4 py-3 text-sm ${labelColor}`}>{formatStartedAt(x.createdAt)}</td>
                    <td className={`px-4 py-3 text-sm ${labelColor}`}>—</td>
                    <td className="px-4 py-3">
                      <HStack spacing={2} align="center">
                        <Box className="w-6 h-6 rounded-full bg-blue-200 dark:bg-blue-900/50 shrink-0" />
                        <Text fontSize="sm" className={textColor}>
                          {onCallLabel(x.fromUser ?? "")}
                        </Text>
                      </HStack>
                    </td>
                  </tr>
                );
              }
              const r = row.report;
              const pseudoStatus = r.status ? "Resolved" : "New";
              const badge = statusBadgeLabel(pseudoStatus, t);
              return (
                <tr
                  key={row.key}
                  id={`incident-${r.id}`}
                  role="link"
                  tabIndex={0}
                  className="border-b border-gray-100 dark:border-white/10 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 scroll-mt-24 cursor-pointer"
                  onClick={() => router.push("/report")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push("/report");
                    }
                  }}
                >
                  <td className="px-4 py-3">
                    <HStack spacing={3} align="flex-start">
                      <Box className="shrink-0 mt-0.5 text-gray-500 dark:text-gray-400">
                        <IoBugOutline size={20} />
                      </Box>
                      <Box>
                        <Text fontSize="xs" fontWeight={600} className={`${labelColor} uppercase tracking-wide mb-0.5`}>
                          {t("tickets.sourceReport")}
                        </Text>
                        <Text fontWeight={600} className={textColor}>
                          {r.subject}
                        </Text>
                        <Text fontSize="sm" className={labelColor}>
                          {r.description?.slice(0, 60)}
                          {(r.description?.length ?? 0) > 60 ? "…" : ""}
                        </Text>
                        <Text fontSize="xs" className={`${labelColor} mt-0.5 font-mono`}>
                          {r.id}
                        </Text>
                        {badge && (
                          <span
                            className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                              r.status
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                : "bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-200"
                            }`}
                          >
                            {badge}
                          </span>
                        )}
                      </Box>
                    </HStack>
                  </td>
                  <td className={`px-4 py-3 text-sm ${labelColor}`}>{formatStartedAt(r.createdAt)}</td>
                  <td className={`px-4 py-3 text-sm ${labelColor}`}>—</td>
                  <td className="px-4 py-3">
                    <HStack spacing={2} align="center">
                      <Box className="w-6 h-6 rounded-full bg-emerald-200 dark:bg-emerald-900/40 shrink-0" />
                      <Text fontSize="sm" className={textColor}>
                        {onCallLabel(r.fromUser ?? "")}
                      </Text>
                    </HStack>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Box>

      {filteredTableRows.length === 0 && (
        <Text className={`mt-4 ${labelColor}`}>{t("tickets.noIncidents")}</Text>
      )}

      {/* Inline answers: only for assignees (end-user / team), not GSOC/manager viewing the full catalog */}
      {showInlineReply &&
        ticketRows
        .filter((x) => x.answer === "" && (expandedId === x.id || ticketRows.length <= 5))
        .map((x) => (
          <motion.div
            key={x.id}
            id={`incident-${x.id}-reply`}
            className="mt-6 p-4 rounded-lg bg-white dark:bg-[#232522] border border-gray-200 dark:border-white/20 scroll-mt-24"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Text fontWeight={600} className={`mb-2 ${textColor}`}>
              {x.title}
            </Text>
            <Text fontSize="sm" className={`mb-4 ${labelColor}`}>
              {x.text}
            </Text>
            {x.type === "Activity Verification" ? (
              <HStack spacing={3} className="flex-wrap items-center">
                {VERIFICATION_OPTIONS.map(({ value, labelKey }) => (
                  <Button
                    key={value}
                    size="sm"
                    variant="outline"
                    className={`h-9 ${idTicket === x.id && answer === value ? "border-brand-primary text-brand-primary" : ""}`}
                    onClick={() => {
                      setAnswer(value);
                      setIdTicket(x.id);
                    }}
                  >
                    {t(labelKey)}
                  </Button>
                ))}
                <Button
                  className="h-9 bg-[#1F6A5C] hover:bg-[#267E6D] text-white"
                  size="sm"
                  disabled={idTicket !== x.id || !answer}
                  onClick={sendAnswer}
                >
                  {t("tickets.sendReply")}
                </Button>
              </HStack>
            ) : (
              <HStack spacing={3} className="flex-wrap items-center">
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-9 ${idTicket === x.id && answer === "Acknowledged" ? "border-brand-primary text-brand-primary" : ""}`}
                  onClick={() => {
                    setAnswer("Acknowledged");
                    setIdTicket(x.id);
                  }}
                >
                  {t("tickets.answerAcknowledged")}
                </Button>
                <Button
                  className="h-9 bg-[#1F6A5C] hover:bg-[#267E6D] text-white"
                  size="sm"
                  disabled={idTicket !== x.id || !answer}
                  onClick={sendAnswer}
                >
                  {t("tickets.sendReply")}
                </Button>
              </HStack>
            )}
          </motion.div>
        ))}
    </div>
  );
}
