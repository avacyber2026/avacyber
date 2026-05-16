"use client";

import { useEffect, useState, useMemo } from "react";
import { Button, Divider, Select } from "@/ui";
import { useToast } from "@/hooks/useToast";
import { motion } from "framer-motion";
import style from "@/styles/Report.module.css";
import { IoPersonCircleOutline } from "react-icons/io5";
import { FiPaperclip } from "react-icons/fi";
import api from "@/lib/axios";
import { useAuth } from "@/hooks/useAuth";
import type { ReportItem, Ticket } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { ReportSupplementForm } from "./ReportSupplementForm";

const getReports = () => api.get("/reports").then((r) => r.data);
const getTickets = () => api.get("/tickets").then((r) => r.data);
const createReportReq = (subject: string, description: string, priority?: string) =>
  api.post("/reports", { subject, description, priority: priority || "Medium" }).then((r) => r.data);

function ticketShortId(id: number): string {
  return "r" + id.toString(36);
}

function initialsFromEmail(email: string): string {
  const part = (email || "").split("@")[0] || "";
  const segments = part.split(/[._-]/).filter(Boolean);
  if (segments.length >= 2) return (segments[0].charAt(0) + segments[1].charAt(0)).toUpperCase();
  return part.slice(0, 2).toUpperCase() || "?";
}

function formatTimelineTimestamp(createdAt: string | undefined): string {
  if (!createdAt) return "—";
  const d = new Date(createdAt);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function displayNameFromEmail(email: string): string {
  const part = (email || "").split("@")[0] || "";
  const [name, ...rest] = part.split(/[._-]/);
  const first = (name || part).charAt(0).toUpperCase() + (name || part).slice(1);
  const last = rest.length ? rest[0].charAt(0).toUpperCase() + "." : "";
  return last ? `${first} ${last}` : first;
}

export function ReportSimple() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [timelineComment, setTimelineComment] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [fetching, setFetching] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [searchDb, setSearchDb] = useState("");

  useEffect(() => {
    getReports().then(setReports).catch(() => toast({ title: t("report.errorLoading"), status: "error", duration: 4000 })).finally(() => setFetching(false));
  }, [toast, t]);

  useEffect(() => {
    getTickets()
      .then((raw: Ticket[] | (Ticket & { created_at?: string })[]) => {
        const list = Array.isArray(raw) ? raw : [];
        setTickets(
          list.map((t) => ({
            ...t,
            createdAt: t.createdAt ?? (t as Ticket & { created_at?: string }).created_at ?? undefined,
          })) as Ticket[]
        );
      })
      .catch(() => toast({ title: "Error loading tickets", status: "error", duration: 4000 }))
      .finally(() => setTimelineLoading(false));
  }, [toast]);

  async function createReport() {
    if (subject.length === 0 || description.length === 0) {
      toast({ title: "Error", description: t("report.dataIncorrect"), status: "error", duration: 4000 });
      return;
    }
    setLoading(true);
    try {
      const created = await createReportReq(subject, description, priority);
      setReports((prev) => [created, ...prev]);
      setSubject("");
      setDescription("");
      toast({ title: "Success", description: t("report.successCreated"), status: "success", duration: 4000 });
    } catch {
      toast({ title: "Error", description: t("report.failedCreateReport"), status: "error", duration: 4000 });
    } finally {
      setLoading(false);
    }
  }

  const searchDbLower = searchDb.trim().toLowerCase();
  const similarReports = searchDbLower
    ? reports.filter(
        (r) =>
          (r.subject && r.subject.toLowerCase().includes(searchDbLower)) ||
          (String(r.description || "").toLowerCase().includes(searchDbLower))
      ).slice(0, 8)
    : [];

  const reportSimplePriorityOptions = useMemo(
    () => [
      { value: "Low", label: t("report.priorityLow") },
      { value: "Medium", label: t("report.priorityMedium") },
      { value: "High", label: t("report.priorityHigh") },
    ],
    [t]
  );

  return (
    <div className={style.container}>
      <div className={style.createReportBlock}>
        <p className={style.subtitle}>{t("report.searchIncidentDb")}</p>
        <input
          placeholder={t("report.searchSimilar")}
          value={searchDb}
          onChange={(e) => setSearchDb(e.target.value)}
          className={style.input}
        />
        {similarReports.length > 0 && (
          <div className={style.historyBlock} style={{ marginTop: 8 }}>
            {similarReports.map((r) => (
              <div key={r.id} className={style.similarReportItem}>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{r.subject}</p>
                <p style={{ fontSize: 12, color: "#666" }}>{String(r.description || "").slice(0, 100)}…</p>
                {r.pipelineStatus && (
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${r.pipelineStatus === 'resolved' ? 'bg-green-100 text-green-700' : r.pipelineStatus === 'awaiting_user_info' ? 'bg-amber-100 text-amber-700' : 'bg-[#F4F3F4] text-[#1F6A5C]'}`}>
                    {r.pipelineStatus}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Reports awaiting supplemental info */}
        {reports.filter((r) => r.pipelineStatus === 'awaiting_user_info').map((r) => (
          <ReportSupplementForm key={r.id} report={r} onSupplemented={() => getReports().then(setReports)} />
        ))}
      </div>
      <div className={style.createReportBlock}>
        <p className={style.subtitle}>{t("report.create")}</p>
        <input
          placeholder={t("report.subject")}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={style.input}
        />
        <textarea
          placeholder={t("report.description")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className={style.textarea}
        />
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 14, marginRight: 8 }}>{t("report.priority")}</label>
          <Select
            value={priority}
            onChange={(v) => setPriority(v as "Low" | "Medium" | "High")}
            options={reportSimplePriorityOptions}
            className="w-[120px]"
          />
        </div>
        <Button
          as={motion.button}
          isLoading={loading}
          className={`${style.buttonCreate} rounded-lg h-[50px] bg-brand-primary text-white hover:bg-brand-primaryDark`}
          onClick={createReport}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {t("report.save")}
        </Button>
      </div>
      <div className={style.createReportBlock}>
        <p className={style.subtitle}>{t("report.timeline")}</p>
        {timelineLoading ? (
          <div>{t("common.loading")}</div>
        ) : (
          <div className={style.timelineWrap}>
            {/* Comment / post-mortem row (reference: avatar + input + paperclip + Post) */}
            <div className={style.timelineCommentRow}>
              <span className={style.timelineAvatar} aria-hidden>
                {user?.email ? initialsFromEmail(user.email) : "?"}
              </span>
              <input
                type="text"
                placeholder={t("report.timelineCommentPlaceholder")}
                value={timelineComment}
                onChange={(e) => setTimelineComment(e.target.value)}
                className={style.timelineCommentInput}
              />
              <FiPaperclip className="shrink-0 text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45" size={20} aria-hidden />
              <button type="button" className={style.timelinePostBtn}>
                {t("report.post")}
              </button>
            </div>
            {tickets.length === 0 ? (
              <p className={style.timelineEmpty}>{t("report.timelineEmpty")}</p>
            ) : (
              tickets.map((x, i) => {
                const isResolved = x.status === "Resolved";
                const name = x.fromUser ? displayNameFromEmail(x.fromUser) : "—";
                return (
                  <motion.div
                    key={x.id}
                    className={style.timelineItem}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ x: 4 }}
                  >
                    <span className={style.timelineAvatar} aria-hidden>
                      {x.fromUser ? initialsFromEmail(x.fromUser) : ticketShortId(x.id).slice(0, 2)}
                    </span>
                    <div style={{ marginLeft: 0 }}>
                      <div className={style.timelineEntryHead}>
                        <span className={style.timelineEntryName}>{name}</span>
                        <span className={style.timelineEntryTime}>{formatTimelineTimestamp(x.createdAt)}</span>
                      </div>
                      <div className={style.historyBlock}>
                        <div className={style.textBlock}>
                          <p style={{ fontWeight: 600, margin: 0 }}>{x.title}</p>
                          <p className={style.timelineTextPreview}>{String(x.text || "").slice(0, 120)}{(x.text || "").length > 120 ? "…" : ""}</p>
                        </div>
                        <Divider className="border-[#1F6A5C]/20 dark:border-white/20" />
                        <div className={style.line}>
                          <p><b>{t("report.statusLabel")}</b></p>
                          <p>{isResolved ? t("report.resolved") : t("report.inWork")}</p>
                          {isResolved && x.fromUser && (
                            <div className={style.infoBlockUser}>
                              <IoPersonCircleOutline style={{ width: "20px", height: "20px" }} />
                              <p>{x.fromUser}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
