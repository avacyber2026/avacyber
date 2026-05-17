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
  MdCheck,
  MdClose,
  MdAutoAwesome,
  MdRefresh,
  MdOutlineShield,
} from "react-icons/md";
import { IoCheckmarkCircle, IoWarning, IoCloseCircle, IoChevronDown } from "react-icons/io5";
import { FaUserShield } from "react-icons/fa";

// ── Types ─────────────────────────────────────────────────────────────────────

interface QaFinding {
  category: string;
  passed: boolean;
  detail: string;
}

interface QaReview {
  id: number;
  alert_id: number;
  action_id: number | null;
  analyst_email: string;
  analyst_name: string | null;
  ai_verdict: "pass" | "flag" | "fail";
  ai_score: number | null;
  ai_findings: QaFinding[];
  ai_summary: string | null;
  manager_decision: "approved" | "overridden" | null;
  manager_email: string | null;
  manager_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  // joined
  rule_name: string;
  severity: string;
  source_ip: string | null;
  username: string | null;
  hostname: string | null;
  alert_description: string | null;
  resolution_type: string | null;
  analyst_notes: string | null;
  time_to_action_minutes: number | null;
  action_at: string | null;
}

interface Scorecard {
  analyst_email: string;
  analyst_name: string | null;
  total_reviews: number;
  pass_count: number;
  flag_count: number;
  fail_count: number;
  avg_score: number | null;
  avg_time_min: number | null;
  approved_count: number;
  overridden_count: number;
}

interface QaStats {
  total: number;
  pending: number;
  verdictBreakdown: Record<string, number>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const glass = "rounded-xl border border-white/20 dark:border-white/10 bg-white/20 dark:bg-[#1E2128]";

const VERDICT_STYLE: Record<string, string> = {
  pass: "text-[#3FFFA3] bg-[#3FFFA3]/10 border-[#3FFFA3]/25",
  flag: "text-amber-400 bg-amber-400/10 border-amber-400/25",
  fail: "text-red-400 bg-red-400/10 border-red-400/25",
};

const VERDICT_ICON: Record<string, React.ReactNode> = {
  pass: <IoCheckmarkCircle size={14} />,
  flag: <IoWarning size={14} />,
  fail: <IoCloseCircle size={14} />,
};

const SEV_COLOR: Record<string, string> = {
  critical: "text-red-500 bg-red-500/10 border-red-500/30",
  high:     "text-orange-400 bg-orange-400/10 border-orange-400/30",
  medium:   "text-amber-400 bg-amber-400/10 border-amber-400/30",
  low:      "text-teal-400 bg-teal-400/10 border-teal-400/30",
  info:     "text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 bg-[#50BFA0]/40 border-[#1F6A5C]/35",
};

function SevBadge({ severity }: { severity: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${SEV_COLOR[severity] ?? SEV_COLOR.info}`}>
      {severity}
    </span>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wide ${VERDICT_STYLE[verdict] ?? VERDICT_STYLE.pass}`}>
      {VERDICT_ICON[verdict]}
      {verdict}
    </span>
  );
}

function ScoreRing({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45">—</span>;
  const color = score >= 85 ? "text-emerald-400 ring-emerald-500/30"
              : score >= 65 ? "text-amber-400 ring-amber-400/30"
              : "text-red-400 ring-red-500/30";
  return (
    <span className={`inline-flex items-center justify-center w-11 h-11 rounded-full ring-2 text-sm font-bold tabular-nums ${color}`}>
      {score}
    </span>
  );
}

function formatRelative(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function resolutionLabel(r: string | null) {
  if (!r) return "—";
  return r === "true_positive" ? "True Positive"
       : r === "false_positive" ? "False Positive"
       : r === "benign" ? "Benign"
       : r;
}

type PageTab = "queue" | "scorecards";

// ── Main ─────────────────────────────────────────────────────────────────────

export default function QaPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { colorMode } = useColorMode();
  const isDark = colorMode === "dark";

  const [tab, setTab] = useState<PageTab>("queue");
  const [reviews, setReviews] = useState<QaReview[]>([]);
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [stats, setStats] = useState<QaStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [verdictFilter, setVerdictFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Expanded cards
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggleExpand = (id: number) => setExpanded(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s;
  });

  // Manager decision modal
  const [decisionModal, setDecisionModal] = useState<{ reviewId: number; type: "approve" | "override" } | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) router.push("/");
  }, [isAuthenticated, isLoading, router]);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (verdictFilter !== "all") params.verdict = verdictFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const [reviewsRes, scorecardsRes, statsRes] = await Promise.all([
        api.get("/qa/queue", { params }),
        api.get("/qa/scorecards"),
        api.get("/qa/stats"),
      ]);
      setReviews(reviewsRes.data ?? []);
      setScorecards(scorecardsRes.data ?? []);
      setStats(statsRes.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, verdictFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function submitDecision() {
    if (!decisionModal) return;
    setSubmitting(true);
    try {
      const endpoint = decisionModal.type === "approve" ? "approve" : "override";
      await api.put(`/qa/reviews/${decisionModal.reviewId}/${endpoint}`, { notes: decisionNotes });
      toast.success(decisionModal.type === "approve" ? "Review approved" : "Review overridden");
      setReviews(prev => prev.map(r =>
        r.id === decisionModal.reviewId
          ? { ...r, manager_decision: decisionModal.type === "approve" ? "approved" : "overridden", manager_notes: decisionNotes }
          : r
      ));
      setDecisionModal(null);
      setDecisionNotes("");
    } catch {
      toast.error("Failed to submit decision");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAuthenticated && !isLoading) return null;

  const pendingCount = reviews.filter(r => r.manager_decision === null).length;

  return (
    <>
      <SideMenu />
      <div className="min-h-screen bg-[#C8D5D1] dark:bg-[#1C1E1C]" style={{ paddingLeft: "var(--app-sidebar-width, 308px)" }}>
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 lg:px-8 py-6 pb-16">

          {/* ── Header ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1F6A5C] to-[#50BFA0] flex items-center justify-center text-white shadow-lg shadow-[#1F6A5C]/30">
                <FaUserShield size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-[#1C1E1C] dark:text-white leading-tight">AI QA</h1>
                <p className="text-sm text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45">Analyst Quality Assurance</p>
              </div>
              {stats && stats.pending > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-400 text-xs font-bold">
                  {stats.pending} pending review
                </span>
              )}
            </div>
            <button onClick={fetchData}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-white/20 dark:border-white/10 bg-white/20 dark:bg-[#1E2128] text-[#103E36] dark:text-[#F4F3F4]/80 hover:bg-white/30 dark:hover:bg-[#1E2128]/70 transition-colors">
              <MdRefresh size={16} /> Refresh
            </button>
          </motion.div>

          {/* ── Stat cards ── */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total Reviewed", value: stats.total, color: "from-[#103E36] to-[#1F6A5C]" },
                { label: "Pass", value: stats.verdictBreakdown.pass ?? 0, color: "from-emerald-700 to-emerald-500" },
                { label: "Flag", value: stats.verdictBreakdown.flag ?? 0, color: "from-amber-700 to-amber-500" },
                { label: "Fail", value: stats.verdictBreakdown.fail ?? 0, color: "from-red-700 to-red-500" },
              ].map((c, i) => (
                <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className={`${glass} p-5`}>
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${c.color} flex items-center justify-center text-white shadow-md mb-3`}>
                    <FaUserShield size={16} />
                  </div>
                  <div className="text-3xl font-light tabular-nums text-[#1C1E1C] dark:text-white mb-0.5">{c.value}</div>
                  <div className="text-sm font-semibold text-[#1F6A5C] dark:text-[#F4F3F4]/60">{c.label}</div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── Tabs ── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className={`${glass} p-1 mb-6 flex gap-1`}>
            {(["queue", "scorecards"] as PageTab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                  tab === t
                    ? "bg-gradient-to-r from-[#1F6A5C] to-[#50BFA0] text-white shadow-md shadow-[#1F6A5C]/20"
                    : "text-[#1F6A5C] dark:text-[#F4F3F4]/60 hover:bg-white/60 dark:hover:bg-white/[0.06]"
                }`}>
                {t === "queue" ? (
                  <><IoWarning size={15} /> QA Queue {pendingCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400 text-xs font-bold">{pendingCount}</span>}</>
                ) : (
                  <><MdOutlineShield size={15} /> Analyst Scorecards</>
                )}
              </button>
            ))}
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

              {/* ────────── QA QUEUE ────────── */}
              {tab === "queue" && (
                <div className={`${glass} p-5`}>
                  {/* Filters */}
                  <div className="flex items-center gap-3 mb-5 flex-wrap">
                    <h2 className="font-bold text-[#1C1E1C] dark:text-white text-lg flex-1">QA Queue</h2>
                    {/* Verdict filter */}
                    <div className="flex gap-1.5 flex-wrap">
                      {(["all", "fail", "flag", "pass"] as const).map(v => (
                        <button key={v} onClick={() => setVerdictFilter(v)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${
                            verdictFilter === v
                              ? v === "all" ? "bg-gradient-to-r from-[#1F6A5C] to-[#50BFA0] text-white"
                                : v === "fail" ? "bg-red-500/15 border border-red-500/30 text-red-400"
                                : v === "flag" ? "bg-amber-400/15 border border-amber-400/30 text-amber-400"
                                : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-500"
                              : "border border-white/20 dark:border-white/10 bg-white/20 dark:bg-[#1E2128]/40 text-[#1C1E1C]/60 dark:text-[#F4F3F4]/55"
                          }`}>
                          {v}
                        </button>
                      ))}
                    </div>
                    {/* Status filter */}
                    <div className="flex gap-1.5">
                      {(["all", "pending", "reviewed"] as const).map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                            statusFilter === s
                              ? "bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white"
                              : "border border-white/20 dark:border-white/10 bg-white/20 dark:bg-[#1E2128]/40 text-[#1C1E1C]/60 dark:text-[#F4F3F4]/55"
                          }`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loading ? (
                    <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl bg-[#50BFA0]/15 dark:bg-[#1E2128]/60 animate-pulse" />)}</div>
                  ) : reviews.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45">
                      <IoCheckmarkCircle size={48} className="mb-3 opacity-30" />
                      <div className="font-semibold text-[#1F6A5C] dark:text-[#F4F3F4]/60 mb-1">No reviews found</div>
                      <div className="text-sm">Analyst actions will generate QA reviews automatically when alerts are resolved.</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reviews.map(r => (
                        <div key={r.id} className={`rounded-xl border transition-colors ${
                          r.ai_verdict === "fail" ? "border-red-500/20 bg-red-500/3 dark:bg-red-500/5"
                          : r.ai_verdict === "flag" ? "border-amber-400/20 bg-amber-400/3 dark:bg-amber-400/5"
                          : "border-white/20 dark:border-white/10 bg-white/20 dark:bg-[#1E2128]/40"
                        }`}>
                          {/* Review header */}
                          <div className="flex items-start gap-4 px-4 py-4">
                            <ScoreRing score={r.ai_score} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-bold text-[#1C1E1C] dark:text-white">{r.rule_name}</span>
                                <SevBadge severity={r.severity} />
                                <VerdictBadge verdict={r.ai_verdict} />
                                {r.manager_decision && (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${
                                    r.manager_decision === "approved"
                                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-500"
                                      : "bg-orange-400/10 border-orange-400/25 text-orange-400"
                                  }`}>
                                    {r.manager_decision === "approved" ? <MdCheck size={12} /> : <MdClose size={12} />}
                                    {r.manager_decision}
                                  </span>
                                )}
                              </div>
                              {r.ai_summary && (
                                <p className="text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/60 mb-1.5">{r.ai_summary}</p>
                              )}
                              <div className="flex flex-wrap gap-3 text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/55">
                                <span className="font-semibold text-[#103E36] dark:text-[#F4F3F4]/80">{r.analyst_name ?? r.analyst_email}</span>
                                <span className="text-[#F4F3F4]/45 dark:text-[#F4F3F4]/45">·</span>
                                <span>{resolutionLabel(r.resolution_type)}</span>
                                {r.time_to_action_minutes !== null && <span>{r.time_to_action_minutes} min response</span>}
                                <span>{formatRelative(r.created_at)}</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                              {!r.manager_decision && (
                                <>
                                  <button onClick={() => { setDecisionModal({ reviewId: r.id, type: "approve" }); setDecisionNotes(""); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 hover:bg-emerald-500/20 transition-colors whitespace-nowrap">
                                    <MdCheck size={13} /> Approve
                                  </button>
                                  <button onClick={() => { setDecisionModal({ reviewId: r.id, type: "override" }); setDecisionNotes(""); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-400/10 border border-orange-400/25 text-orange-400 hover:bg-orange-400/20 transition-colors whitespace-nowrap">
                                    <MdClose size={13} /> Override
                                  </button>
                                </>
                              )}
                              <button onClick={() => toggleExpand(r.id)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 hover:bg-[#F4F3F4] dark:hover:bg-white/[0.06] transition-colors whitespace-nowrap">
                                <IoChevronDown size={13} className={`transition-transform ${expanded.has(r.id) ? "rotate-180" : ""}`} />
                                Details
                              </button>
                            </div>
                          </div>

                          {/* Expanded findings */}
                          <AnimatePresence>
                            {expanded.has(r.id) && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden">
                                <div className="px-4 pb-4 space-y-4 border-t border-[#1F6A5C]/12 dark:border-white/8 pt-4">

                                  {/* Findings checklist */}
                                  {Array.isArray(r.ai_findings) && r.ai_findings.length > 0 && (
                                    <div>
                                      <div className="text-xs font-bold uppercase tracking-wider text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 mb-2">AI Findings</div>
                                      <div className="space-y-2">
                                        {r.ai_findings.map((f, i) => (
                                          <div key={i} className={`flex gap-3 rounded-lg px-3 py-2.5 border text-sm ${
                                            f.passed
                                              ? "border-emerald-500/15 bg-emerald-500/5"
                                              : "border-red-500/15 bg-red-500/5"
                                          }`}>
                                            <span className={`shrink-0 mt-0.5 ${f.passed ? "text-emerald-500" : "text-red-400"}`}>
                                              {f.passed ? <IoCheckmarkCircle size={16} /> : <IoCloseCircle size={16} />}
                                            </span>
                                            <div>
                                              <span className="font-semibold text-[#103E36] dark:text-[#F4F3F4]/80 mr-2">{f.category}</span>
                                              <span className="text-[#1C1E1C]/60 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45">{f.detail}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Analyst action details */}
                                  <div className="grid grid-cols-2 gap-3">
                                    {r.analyst_notes && (
                                      <div className="col-span-2 rounded-lg bg-[#F4F3F4]/50 dark:bg-[#1c1e1c] border border-[#1F6A5C]/12 dark:border-white/8 px-4 py-3">
                                        <div className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 mb-1">Analyst Notes</div>
                                        <div className="text-sm text-[#103E36] dark:text-[#F4F3F4]/80">{r.analyst_notes}</div>
                                      </div>
                                    )}
                                    {r.source_ip && (
                                      <div className="rounded-lg bg-[#F4F3F4]/50 dark:bg-[#1c1e1c] border border-[#1F6A5C]/12 dark:border-white/8 px-4 py-3">
                                        <div className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 mb-1">Source IP</div>
                                        <div className="text-sm font-mono text-[#103E36] dark:text-[#F4F3F4]/80">{r.source_ip}</div>
                                      </div>
                                    )}
                                    {r.username && (
                                      <div className="rounded-lg bg-[#F4F3F4]/50 dark:bg-[#1c1e1c] border border-[#1F6A5C]/12 dark:border-white/8 px-4 py-3">
                                        <div className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 mb-1">Username</div>
                                        <div className="text-sm font-semibold text-[#103E36] dark:text-[#F4F3F4]/80">{r.username}</div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Manager decision notes */}
                                  {r.manager_decision && r.manager_notes && (
                                    <div className={`rounded-lg px-4 py-3 border text-sm ${
                                      r.manager_decision === "approved"
                                        ? "bg-emerald-500/5 border-emerald-500/20"
                                        : "bg-orange-400/5 border-orange-400/20"
                                    }`}>
                                      <div className="text-xs font-bold uppercase tracking-wider text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 mb-1">
                                        Manager {r.manager_decision === "approved" ? "Approval" : "Override"} Note
                                      </div>
                                      <div className="text-[#103E36] dark:text-[#F4F3F4]/80">{r.manager_notes}</div>
                                      <div className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 mt-1">{r.manager_email}</div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ────────── SCORECARDS ────────── */}
              {tab === "scorecards" && (
                <div className={`${glass} p-5`}>
                  <h2 className="font-bold text-[#1C1E1C] dark:text-white text-lg mb-5">Analyst Scorecards</h2>
                  {loading ? (
                    <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-[#50BFA0]/15 dark:bg-[#1E2128]/60 animate-pulse" />)}</div>
                  ) : scorecards.length === 0 ? (
                    <div className="flex flex-col items-center py-16 text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45">
                      <MdOutlineShield size={48} className="mb-3 opacity-30" />
                      <div className="font-semibold">No scorecards yet</div>
                      <div className="text-sm">Scorecards populate once analysts resolve alerts.</div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs font-bold uppercase tracking-wider text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45 border-b border-white/40 dark:border-white/8">
                            <th className="pb-3 pr-6">Analyst</th>
                            <th className="pb-3 pr-6">Avg Score</th>
                            <th className="pb-3 pr-6">Total</th>
                            <th className="pb-3 pr-4 text-emerald-500">Pass</th>
                            <th className="pb-3 pr-4 text-amber-400">Flag</th>
                            <th className="pb-3 pr-6 text-red-400">Fail</th>
                            <th className="pb-3 pr-6">Avg Response</th>
                            <th className="pb-3">Pass Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/30 dark:divide-[#103E36]/60">
                          {scorecards.map((s, i) => {
                            const total = parseInt(String(s.total_reviews));
                            const pass = parseInt(String(s.pass_count));
                            const passRate = total > 0 ? Math.round((pass / total) * 100) : 0;
                            const score = s.avg_score ? parseInt(String(s.avg_score)) : null;
                            const scoreColor = !score ? "text-[#F4F3F4]/45 dark:text-[#F4F3F4]/45"
                              : score >= 85 ? "text-emerald-400"
                              : score >= 65 ? "text-amber-400"
                              : "text-red-400";

                            return (
                              <tr key={s.analyst_email} className="hover:bg-white/20 dark:hover:bg-white/[0.06]/30 transition-colors">
                                <td className="py-3.5 pr-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1F6A5C] to-[#50BFA0] flex items-center justify-center text-white text-xs font-bold shrink-0">
                                      {(s.analyst_name ?? s.analyst_email).charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-[#1C1E1C] dark:text-white">{s.analyst_name ?? s.analyst_email}</div>
                                      <div className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45">{s.analyst_email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className={`py-3.5 pr-6 text-2xl font-light tabular-nums ${scoreColor}`}>
                                  {score ?? "—"}
                                </td>
                                <td className="py-3.5 pr-6 font-semibold text-[#103E36] dark:text-[#F4F3F4]/80 tabular-nums">{total}</td>
                                <td className="py-3.5 pr-4 text-emerald-500 font-semibold tabular-nums">{s.pass_count}</td>
                                <td className="py-3.5 pr-4 text-amber-400 font-semibold tabular-nums">{s.flag_count}</td>
                                <td className="py-3.5 pr-6 text-red-400 font-semibold tabular-nums">{s.fail_count}</td>
                                <td className="py-3.5 pr-6 text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45 tabular-nums">
                                  {s.avg_time_min ? `${s.avg_time_min} min` : "—"}
                                </td>
                                <td className="py-3.5">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 rounded-full bg-[#50BFA0]/15 dark:bg-[#1E2128] overflow-hidden w-24">
                                      <div className={`h-full rounded-full transition-all ${
                                        passRate >= 80 ? "bg-emerald-500"
                                        : passRate >= 60 ? "bg-amber-400"
                                        : "bg-red-400"
                                      }`} style={{ width: `${passRate}%` }} />
                                    </div>
                                    <span className={`text-xs font-bold tabular-nums ${
                                      passRate >= 80 ? "text-emerald-500"
                                      : passRate >= 60 ? "text-amber-400"
                                      : "text-red-400"
                                    }`}>{passRate}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Manager Decision Modal ── */}
      <AnimatePresence>
        {decisionModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDecisionModal(null)}
              className="fixed inset-0 bg-black/50 z-40" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white dark:bg-[#1a1c1a] rounded-2xl shadow-2xl border border-white/20 dark:border-white/8 p-6">
                <h3 className="font-bold text-[#1C1E1C] dark:text-white text-lg mb-1">
                  {decisionModal.type === "approve" ? "Approve QA Review" : "Override QA Review"}
                </h3>
                <p className="text-sm text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45 mb-4">
                  {decisionModal.type === "approve"
                    ? "Confirm AI findings are accurate and the case is closed."
                    : "Override AI findings — provide your reasoning below."}
                </p>
                <textarea
                  value={decisionNotes}
                  onChange={e => setDecisionNotes(e.target.value)}
                  placeholder={decisionModal.type === "approve" ? "Optional note for the analyst…" : "Explain your override decision…"}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm border border-white/60 dark:border-white/8 bg-[#F4F3F4]/50 dark:bg-[#1c1e1c] text-[#103E36] dark:text-[#F4F3F4]/80 placeholder:text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/40 resize-none mb-4"
                />
                <div className="flex gap-2">
                  <button onClick={submitDecision} disabled={submitting}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                      decisionModal.type === "approve"
                        ? "bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white"
                        : "bg-orange-500 hover:bg-orange-600 text-white"
                    }`}>
                    {submitting ? "Submitting…" : decisionModal.type === "approve" ? "Approve" : "Override"}
                  </button>
                  <button onClick={() => setDecisionModal(null)}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-white/60 dark:border-white/8 text-[#1F6A5C] dark:text-[#F4F3F4]/60">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
