"use client";

import { useEffect, useState, useMemo } from "react";
import style from "@/styles/Report.module.css";
import { IoPersonCircleOutline } from "react-icons/io5";
import { FaThLarge, FaList } from "react-icons/fa";
import {
  Button,
  Box,
  Text,
  Input,
  Textarea,
  Select,
  Wrap,
  WrapItem,
  VStack,
  HStack,
  Icon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
} from "@/ui";
import { useToast } from "@/hooks/useToast";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import type { ReportItem } from "@/types";
import type { UserStatus } from "@/types";
import { CREATOR_ROLES } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";

const getReports = () => api.get("/reports").then((r) => r.data);
const resolveReport = (id: string, comment?: string) =>
  api.patch(`/reports/${id}/resolve`, comment != null ? { comment } : undefined).then((r) => r.data);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3020";

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }).replace(",", " ");
}

const filterInputClass = "text-sm border border-[#1F6A5C]/20 dark:border-white/20 rounded focus:ring-2 focus:ring-brand-primary focus:border-brand-primary";

export function ReportPremium() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<UserStatus | "">("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterPreset, setFilterPreset] = useState<"none" | "today" | "7d" | "30d">("none");
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "resolved">("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterPipeline, setFilterPipeline] = useState("all");
  const [filterSlaBreached, setFilterSlaBreached] = useState(false);
  const [searchId, setSearchId] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [resolveComments, setResolveComments] = useState<Record<string, string>>({});
  const [exportDateFrom, setExportDateFrom] = useState("");
  const [exportDateTo, setExportDateTo] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!localStorage.getItem("status")) {
        router.push("/");
      } else {
        setStatus(localStorage.getItem("status") as UserStatus);
      }
    }
  }, [router]);

  useEffect(() => {
    getReports().then(setReports).catch(() => toast({ title: t("report.errorLoading"), status: "error", duration: 4000 })).finally(() => setLoading(false));
  }, [toast, t]);

  const filteredReports = useMemo(() => {
    let from = filterDateFrom ? new Date(filterDateFrom).setHours(0, 0, 0, 0) : 0;
    let to = filterDateTo ? new Date(filterDateTo).setHours(23, 59, 59, 999) : 0;
    if (filterPreset === "today") {
      const d = new Date();
      from = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
    } else if (filterPreset === "7d") {
      to = Date.now();
      from = to - 7 * 24 * 60 * 60 * 1000;
    } else if (filterPreset === "30d") {
      to = Date.now();
      from = to - 30 * 24 * 60 * 60 * 1000;
    }
    return reports.filter((x) => {
      if (searchId && !x.id.toLowerCase().includes(searchId.trim().toLowerCase())) return false;
      if (filterStatus === "resolved" && !x.status) return false;
      if (filterStatus === "open" && x.status) return false;
      if (filterPriority !== "all" && (x.priority || "Medium") !== filterPriority) return false;
      if (filterPipeline !== "all" && (x.pipelineStatus || "new") !== filterPipeline) return false;
      if (filterSlaBreached && !x.slaBreached) return false;
      const created = x.createdAt ? new Date(x.createdAt).getTime() : 0;
      if (from && created < from) return false;
      if (to && created > to) return false;
      return true;
    });
  }, [reports, searchId, filterStatus, filterPriority, filterPipeline, filterSlaBreached, filterDateFrom, filterDateTo, filterPreset]);

  const reportFilterPresetOptions = useMemo(
    () => [
      { value: "none", label: t("report.none") },
      { value: "today", label: t("report.today") },
      { value: "7d", label: t("report.last7days") },
      { value: "30d", label: t("report.last30days") },
    ],
    [t]
  );

  const reportFilterStatusOptions = useMemo(
    () => [
      { value: "all", label: t("report.allStatuses") },
      { value: "open", label: t("report.open") },
      { value: "resolved", label: t("report.resolved") },
    ],
    [t]
  );

  const reportFilterPriorityOptions = useMemo(
    () => [
      { value: "all", label: t("report.allPriorities") },
      { value: "Low", label: t("report.priorityLow") },
      { value: "Medium", label: t("report.priorityMedium") },
      { value: "High", label: t("report.priorityHigh") },
      { value: "Critical", label: t("report.priorityCritical") },
    ],
    [t]
  );

  const pipelineStatusOptions = useMemo(
    () => [
      { value: "all", label: t("report.allStatuses") },
      { value: "new", label: "New" },
      { value: "pending_siem", label: "Pending SIEM" },
      { value: "siem_linked", label: "SIEM Linked" },
      { value: "ai_pending", label: "AI Pending" },
      { value: "awaiting_user_info", label: "Awaiting Info" },
      { value: "ready_gsoc", label: "Ready for GSOC" },
      { value: "in_progress", label: "In Progress" },
      { value: "resolved", label: t("report.resolved") },
    ],
    [t]
  );

  async function sendAnswer(id: string, comment: string) {
    const trimmed = (comment || "").trim();
    if (!trimmed) {
      toast({ title: t("report.commentRequired"), status: "error", duration: 4000 });
      return;
    }
    try {
      const updated = await resolveReport(id, trimmed);
      setReports((prev) =>
        prev.map((x) => (x.id === id ? { ...x, ...updated } : x))
      );
      setResolveComments((prev) => ({ ...prev, [id]: "" }));
    } catch {
      toast({ title: "Error", description: t("report.failedToResolve"), status: "error", duration: 4000 });
    }
  }

  if (loading) return <div className={style.reportPremium}>{t("common.loading")}</div>;

  return (
    <div className={style.reportPremium}>
      {status === "Security Manager" && (
        <Box className="mb-4 p-4 bg-white dark:bg-[#1E2128] rounded-lg border border-[#1F6A5C]/20 dark:border-white/20">
          <div className="flex flex-wrap items-center gap-3">
            <Text fontSize="sm" fontWeight={600}>{t("report.exportXlsx")}</Text>
            <Input
              type="date"
              size="sm"
              className={`w-[150px] ${filterInputClass}`}
              value={exportDateFrom}
              onChange={(e) => setExportDateFrom(e.target.value)}
              placeholder="From"
            />
            <Input
              type="date"
              size="sm"
              className={`w-[150px] ${filterInputClass}`}
              value={exportDateTo}
              onChange={(e) => setExportDateTo(e.target.value)}
              placeholder="To"
            />
            <Button
              size="sm"
              isLoading={exporting}
              className="bg-[#1F6A5C] hover:bg-[#267E6D] text-white"
              onClick={async () => {
                setExporting(true);
                try {
                  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
                  const params = new URLSearchParams();
                  if (exportDateFrom) params.set("date_from", exportDateFrom);
                  if (exportDateTo) params.set("date_to", exportDateTo);
                  const resp = await fetch(`${API_URL}/export/xlsx?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (!resp.ok) throw new Error('Export failed');
                  const blob = await resp.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `incident-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast({ title: t("report.exportSuccess"), status: "success" });
                } catch {
                  toast({ title: t("report.exportFailed"), status: "error" });
                } finally {
                  setExporting(false);
                }
              }}
            >
              {t("report.downloadXlsx")}
            </Button>
          </div>
        </Box>
      )}

      <Box className="mb-4 p-4 bg-white dark:bg-[#1E2128] rounded-lg border border-[#1F6A5C]/20 dark:border-white/20 overflow-x-hidden">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-4">
          <Text fontSize="sm" fontWeight={600}>{t("report.filters")}</Text>
          <HStack spacing={2}>
            <Button
              size="sm"
              variant={viewMode === "cards" ? "solid" : "outline"}
              leftIcon={<Icon as={FaThLarge} boxSize={4} />}
              onClick={() => setViewMode("cards")}
              className={viewMode === "cards" ? "bg-brand-primary text-white hover:bg-brand-primaryDark" : ""}
            >
              {t("report.viewCards")}
            </Button>
            <Button
              size="sm"
              variant={viewMode === "table" ? "solid" : "outline"}
              leftIcon={<Icon as={FaList} boxSize={4} />}
              onClick={() => setViewMode("table")}
              className={viewMode === "table" ? "bg-brand-primary text-white hover:bg-brand-primaryDark" : ""}
            >
              {t("report.viewTable")}
            </Button>
          </HStack>
        </div>
        <Wrap spacing={4}>
          <WrapItem>
            <HStack spacing={2} align="center">
              <Text as="span" fontSize="sm" className="text-[#1F6A5C] dark:text-[#F4F3F4]/45 whitespace-nowrap">{t("report.presets")}</Text>
              <Select
                size="sm"
                className={`w-[130px] ${filterInputClass}`}
                value={filterPreset}
                onChange={(v) => setFilterPreset(v as "none" | "today" | "7d" | "30d")}
                options={reportFilterPresetOptions}
              />
            </HStack>
          </WrapItem>
          <WrapItem>
            <HStack spacing={2} align="center">
              <Text as="span" fontSize="sm" className="text-[#1F6A5C] dark:text-[#F4F3F4]/45 whitespace-nowrap">{t("report.dateFrom")}</Text>
              <Input type="date" size="sm" className={`w-[140px] ${filterInputClass}`} value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setFilterPreset("none"); }} />
            </HStack>
          </WrapItem>
          <WrapItem>
            <HStack spacing={2} align="center">
              <Text as="span" fontSize="sm" className="text-[#1F6A5C] dark:text-[#F4F3F4]/45 whitespace-nowrap">{t("report.dateTo")}</Text>
              <Input type="date" size="sm" className={`w-[140px] ${filterInputClass}`} value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setFilterPreset("none"); }} />
            </HStack>
          </WrapItem>
          <WrapItem>
            <Select
              size="sm"
              className={`w-[120px] ${filterInputClass}`}
              value={filterStatus}
              onChange={(v) => setFilterStatus(v as "all" | "open" | "resolved")}
              options={reportFilterStatusOptions}
            />
          </WrapItem>
          <WrapItem>
            <Select
              size="sm"
              className={`w-[120px] ${filterInputClass}`}
              value={filterPriority}
              onChange={setFilterPriority}
              options={reportFilterPriorityOptions}
            />
          </WrapItem>
          <WrapItem>
            <Input
              size="sm"
              className={`w-[160px] ${filterInputClass}`}
              placeholder={t("report.searchReportId")}
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
          </WrapItem>
          <WrapItem>
            <Select
              size="sm"
              className={`w-[140px] ${filterInputClass}`}
              value={filterPipeline}
              onChange={setFilterPipeline}
              options={pipelineStatusOptions}
            />
          </WrapItem>
          <WrapItem>
            <label className="flex items-center gap-2 text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/45 cursor-pointer">
              <input type="checkbox" checked={filterSlaBreached} onChange={(e) => setFilterSlaBreached(e.target.checked)} className="rounded border-[#1F6A5C]/25 dark:border-white/30 text-red-500 focus:ring-red-500" />
              SLA Breached
            </label>
          </WrapItem>
          <WrapItem>
            <Button size="sm" variant="outline" onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); setFilterPreset("none"); setFilterStatus("all"); setFilterPriority("all"); setFilterPipeline("all"); setFilterSlaBreached(false); setSearchId(""); }} className="hover:bg-[#F4F3F4]/50 dark:hover:bg-white/10">
              {t("report.resetFilters")}
            </Button>
          </WrapItem>
        </Wrap>
      </Box>

      {viewMode === "table" ? (
        <TableContainer className="bg-white dark:bg-[#1E2128] rounded-lg border border-[#1F6A5C]/20 dark:border-white/20 overflow-x-auto">
          <Table>
            <Thead>
              <Tr>
                <Th>{t("report.reportId")}</Th>
                <Th>{t("report.reportedBy")}</Th>
                <Th>{t("report.titleLabel")}</Th>
                <Th>{t("report.statusLabel")}</Th>
                <Th>{t("report.priority")}</Th>
                <Th>{t("report.submitted")}</Th>
                <Th>—</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredReports.map((x) => (
                <Tr
                  key={x.id}
                  className={`hover:bg-black/5 dark:hover:bg-white/5 ${x.slaBreached ? "bg-red-50 dark:bg-red-950/30" : ""}`}
                >
                  <Td>{x.id}</Td>
                  <Td>{x.reporterDisplay || x.fromUser}</Td>
                  <Td className="max-w-[200px]"><span className="line-clamp-2">{x.subject}</span></Td>
                  <Td>{x.status ? t("report.resolved") : t("report.open")}</Td>
                  <Td>{x.priority === "Low" ? t("report.priorityLow") : x.priority === "High" ? t("report.priorityHigh") : t("report.priorityMedium")}</Td>
                  <Td>{formatDate(x.createdAt)}</Td>
                  <Td>
                    {!x.status && status !== "" && CREATOR_ROLES.includes(status as UserStatus) && (
                      <VStack align="stretch" spacing={2} className="min-w-[200px]">
                        <Textarea
                          placeholder={t("report.commentPlaceholder")}
                          value={resolveComments[x.id] ?? ""}
                          onChange={(e) => setResolveComments((prev) => ({ ...prev, [x.id]: e.target.value }))}
                          rows={2}
                          className="text-sm border border-[#1F6A5C]/20 dark:border-white/20 rounded focus:ring-2 focus:ring-brand-primary bg-white dark:bg-[#1E2128] text-[#103E36] dark:text-white resize-y"
                        />
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => sendAnswer(x.id, resolveComments[x.id] ?? "")}>
                          {t("report.markResolved")}
                        </Button>
                      </VStack>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      ) : (
      <>
      {filteredReports.map((x, i) => (
        <motion.div
          key={x.id}
          className={`${style.simpleTicketBlock} ${x.slaBreached ? "ring-2 ring-red-600 dark:ring-red-500 rounded-xl" : ""}`}
          style={{ opacity: x.status ? 0.85 : 1 }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          whileHover={{ x: 4 }}
        >
          <div className="flex justify-between items-center flex-wrap gap-2 mb-2">
            <div className={style.infoBlockUser}>
              <IoPersonCircleOutline style={{ width: "20px", height: "20px" }} />
              <p>{t("report.reportedBy")} {x.reporterDisplay || x.fromUser}</p>
            </div>
            <p className={style.parametrsId}>{t("report.reportId")} {x.id}</p>
          </div>
          <div className={style.textBlock}>
            <p><b>{t("report.titleLabel")}</b> {x.subject}</p>
            <p><b>{t("report.details")}</b> {x.description}</p>
            {x.attachments && x.attachments.length > 0 ? (
              <div className="mt-3">
                <p><b>{t("report.attachedFiles")}</b></p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  {x.attachments.map((a) => {
                    const base = String(api.defaults.baseURL ?? "").replace(/\/$/, "");
                    const href = `${base}${a.url}`;
                    return (
                      <li key={a.id}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#1F6A5C] dark:text-[#F4F3F4]/55 underline underline-offset-2"
                        >
                          {a.originalName}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
          <VStack align="stretch" spacing={1} className="text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/45 mt-3">
            <div className="flex flex-wrap gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${x.pipelineStatus === 'resolved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : x.pipelineStatus === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : x.pipelineStatus === 'ready_gsoc' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'bg-[#F4F3F4] dark:bg-white/10 text-[#1F6A5C] dark:text-[#F4F3F4]/45'}`}>
                {x.pipelineStatus || 'new'}
              </span>
              {x.slaBreached && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                  SLA BREACHED
                </span>
              )}
              {x.siemIncidentId && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300">
                  SIEM: {x.siemIncidentId}
                </span>
              )}
              {x.aiCategory && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                  AI: {x.aiCategory}
                </span>
              )}
            </div>
            <p><b>{t("report.statusLabel")}</b> {x.status ? t("report.resolved") : t("report.open")}</p>
            <p><b>{t("report.priority")}</b> {x.priority === "Low" ? t("report.priorityLow") : x.priority === "High" ? t("report.priorityHigh") : x.priority === "Critical" ? t("report.priorityCritical") : t("report.priorityMedium")}</p>
            <p><b>{t("report.submitted")}</b> {formatDate(x.createdAt)}</p>
            <p><b>{t("report.lastUpdated")}</b> {formatDate(x.updatedAt)}</p>
            {x.slaAckDeadline && <p><b>SLA Deadline:</b> {formatDate(x.slaAckDeadline)}</p>}
            {x.slaAckAt && <p><b>SLA Acknowledged:</b> {formatDate(x.slaAckAt)}</p>}
            {x.hostname && <p><b>Hostname:</b> {x.hostname}</p>}
            {x.incidentAt && <p><b>Incident time:</b> {formatDate(x.incidentAt)}</p>}
            {x.reporterEmail && <p><b>Reporter Email:</b> {x.reporterEmail}</p>}
            {x.comment && <p><b>{t("report.comment")}</b> {x.comment}</p>}
          </VStack>
          {!x.status ? (
            <>
              {status !== "" && CREATOR_ROLES.includes(status as UserStatus) && x.pipelineStatus === 'ready_gsoc' && (
                <Box className="mt-3">
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    onClick={async () => {
                      try {
                        await api.patch(`/reports/${x.id}/status`, { pipelineStatus: 'in_progress' });
                        const fresh = await getReports();
                        setReports(fresh);
                        toast({ title: "Taken in progress", status: "success" });
                      } catch { toast({ title: "Error", status: "error" }); }
                    }}
                  >
                    Take In Progress
                  </Button>
                </Box>
              )}
              {status !== "" && CREATOR_ROLES.includes(status as UserStatus) && (
                <VStack align="stretch" spacing={3} style={{ marginTop: 16 }} className="pt-4 border-t border-[#1F6A5C]/20 dark:border-white/20">
                  <Text fontSize="sm" fontWeight={600} className="text-[#103E36] dark:text-[#F4F3F4]/65">{t("report.comment")}</Text>
                  <Textarea
                    placeholder={t("report.commentPlaceholder")}
                    value={resolveComments[x.id] ?? ""}
                    onChange={(e) => setResolveComments((prev) => ({ ...prev, [x.id]: e.target.value }))}
                    rows={3}
                    className="w-full text-sm border border-[#1F6A5C]/20 dark:border-white/20 rounded-lg focus:ring-2 focus:ring-brand-primary bg-white dark:bg-[#1E2128] text-[#103E36] dark:text-white resize-y p-3"
                  />
                  <Button
                    as={motion.button}
                    className={`${style.buttonCreateAnswer} rounded-lg h-[50px] bg-brand-primary text-white hover:bg-brand-primaryDark`}
                    onClick={() => sendAnswer(x.id, resolveComments[x.id] ?? "")}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {t("report.markResolved")}
                  </Button>
                </VStack>
              )}
            </>
          ) : (
            <div style={{ marginTop: 8 }}>
              <p><b>{t("report.resolvedBy")} {x.answerUser}</b></p>
              {x.comment && <p><b>{t("report.comment")}</b> {x.comment}</p>}
            </div>
          )}
        </motion.div>
      ))}
      </>
      )}
    </div>
  );
}
