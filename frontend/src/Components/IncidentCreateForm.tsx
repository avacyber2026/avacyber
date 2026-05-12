"use client";

import { useState, useRef } from "react";
import { VStack, Box, Text, Input, Textarea, Button, Select } from "@/ui";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/axios";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  IoPeopleOutline,
  IoDocumentAttachOutline,
  IoInformationCircleOutline,
  IoCloseCircleOutline,
} from "react-icons/io5";

const inputClass =
  "w-full rounded-lg border border-gray-200 dark:border-white/20 bg-white dark:bg-[#2c2f2c] text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors";
const textareaClass = inputClass + " min-h-[120px] p-3 resize-y";
const labelClass = "text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 block";

function fileDedupeKey(f: File) {
  return `${f.name}-${f.size}-${f.lastModified}`;
}

function mergeUniqueFiles(existing: File[], incoming: File[]) {
  const keys = new Set(existing.map(fileDedupeKey));
  const next = [...existing];
  for (const f of incoming) {
    const k = fileDedupeKey(f);
    if (!keys.has(k)) {
      keys.add(k);
      next.push(f);
    }
  }
  return next;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface IncidentCreateFormProps {
  onSuccess?: () => void;
}

export function IncidentCreateForm({ onSuccess }: IncidentCreateFormProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  const [reporterEmail, setReporterEmail] = useState("");
  const [hostname, setHostname] = useState("");
  const [incidentAt, setIncidentAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyCall, setNotifyCall] = useState(false);
  const [notifySms, setNotifySms] = useState(false);
  const [notifyPush, setNotifyPush] = useState(false);
  const [notifyCritical, setNotifyCritical] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createReport = () => {
    if (!subject.trim() || !description.trim()) {
      toast({ title: t("report.subjectDescRequired"), status: "error" });
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.append("subject", subject.trim());
    fd.append("description", description.trim());
    fd.append("priority", priority);
    if (reporterEmail.trim()) fd.append("reporter_email", reporterEmail.trim());
    if (hostname.trim()) fd.append("hostname", hostname.trim());
    if (incidentAt.trim()) {
      const d = new Date(incidentAt);
      if (!Number.isNaN(d.getTime())) fd.append("incident_at", d.toISOString());
    }
    for (const f of attachedFiles) {
      fd.append("files", f);
    }
    api
      .post("/reports", fd)
      .then(() => {
        toast({ title: t("report.reportCreated"), status: "success" });
        setSubject("");
        setDescription("");
        setReporterEmail("");
        setHostname("");
        setIncidentAt("");
        setAttachedFiles([]);
        onSuccess?.();
      })
      .catch(() => toast({ title: t("report.failedToCreate"), status: "error" }))
      .finally(() => setLoading(false));
  };

  const email = user?.email ?? "";

  return (
    <Box className="grid grid-cols-1 lg:grid-cols-[1fr,1.2fr] gap-x-8 lg:gap-x-12 gap-y-10 max-w-5xl items-start">
      <Text fontSize="sm" className="text-gray-500 dark:text-gray-400 lg:col-span-2 -mb-4">
        {t("report.requiredLegend")}
      </Text>
      {/* Row 1: What's going on — Brief, In-depth, Attach */}
      <Box className="text-gray-600 dark:text-gray-400 text-sm lg:pt-1">
        <Text fontWeight={600} className="text-gray-800 dark:text-gray-100 mb-1">
          {t("report.whatsGoingOn")}
        </Text>
        <Text fontSize="sm">{t("report.whatsGoingOnDesc")}</Text>
      </Box>
      <VStack align="stretch" spacing={4} className="bg-white dark:bg-[#232522] rounded-xl border border-gray-200 dark:border-white/20 p-6">
        <Box>
          <label className={labelClass}>{t("report.briefDescription")} *</label>
          <Input
            placeholder={t("report.briefDescriptionPlaceholder")}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={inputClass}
          />
        </Box>
        <Box>
          <label className={labelClass}>{t("report.inDepthDescription")} *</label>
          <Textarea
            placeholder={t("report.description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={textareaClass}
          />
        </Box>
        <Box>
          <label className={labelClass}>{t("report.attachFiles")}</label>
          <Box
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors min-w-0 max-w-full ${
              dragOver
                ? "border-brand-primary bg-brand-primary/5 dark:bg-brand-primary/10"
                : "border-gray-200 dark:border-white/20 hover:border-gray-300 dark:hover:border-white/30"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const list = e.dataTransfer.files;
              if (list?.length) {
                setAttachedFiles((prev) => mergeUniqueFiles(prev, Array.from(list)));
              }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <IoDocumentAttachOutline className="mx-auto text-gray-400 dark:text-gray-500 mb-2" size={28} />
            <Text fontSize="sm" className="text-gray-500 dark:text-gray-400 mb-2">
              {t("report.dragDropFiles")}
            </Text>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-gray-300 dark:border-white/20"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              {t("report.chooseFiles")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                const list = e.target.files;
                const inputEl = e.target;
                if (list?.length) {
                  setAttachedFiles((prev) => mergeUniqueFiles(prev, Array.from(list)));
                }
                requestAnimationFrame(() => {
                  inputEl.value = "";
                });
              }}
            />
            {attachedFiles.length > 0 && (
              <VStack align="stretch" spacing={2} className="mt-4 text-left border-t border-gray-200 dark:border-white/15 pt-4">
                <Text fontSize="xs" fontWeight={600} className="text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  {t("report.selectedFiles")}
                </Text>
                <ul className="space-y-2 min-w-0 max-w-full">
                  {attachedFiles.map((file, index) => (
                    <li
                      key={`${fileDedupeKey(file)}-${index}`}
                      className="flex flex-col gap-2 rounded-lg bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                    >
                      <div className="flex min-w-0 w-full flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
                        <span
                          className="min-w-0 flex-1 text-left break-words [overflow-wrap:anywhere] text-gray-800 dark:text-gray-200"
                          title={file.name}
                        >
                          {file.name}
                        </span>
                        <span className="shrink-0 text-gray-500 dark:text-gray-400 tabular-nums text-xs sm:text-sm">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 self-end p-0.5 rounded text-gray-500 hover:text-red-600 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-brand-primary sm:self-center"
                        aria-label={t("report.removeFile")}
                        onClick={(e) => {
                          e.stopPropagation();
                          setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
                        }}
                      >
                        <IoCloseCircleOutline size={22} />
                      </button>
                    </li>
                  ))}
                </ul>
              </VStack>
            )}
          </Box>
        </Box>
      </VStack>

      {/* Row 2: Your contact details — Your e-mail, reporter email, hostname */}
      <Box className="text-gray-600 dark:text-gray-400 text-sm items-start">
        <Text fontWeight={600} className="text-gray-800 dark:text-gray-100 mb-1">
          {t("report.yourContactDetails")}
        </Text>
        <Text fontSize="sm">{t("report.yourContactDetailsDesc")}</Text>
      </Box>
      <VStack align="stretch" spacing={4} className="bg-white dark:bg-[#232522] rounded-xl border border-gray-200 dark:border-white/20 p-6">
        <Box>
          <label className={labelClass}>{t("report.yourEmail")}</label>
          <Input value={email} readOnly className={inputClass + " opacity-90"} />
        </Box>
        <Box>
          <label className={labelClass}>{t("report.reporterEmail")}</label>
          <Input
            placeholder={t("report.reporterEmailPlaceholder")}
            value={reporterEmail}
            onChange={(e) => setReporterEmail(e.target.value)}
            className={inputClass}
            type="email"
          />
        </Box>
        <Box>
          <label className={labelClass}>{t("report.hostname")}</label>
          <Input
            placeholder={t("report.hostnamePlaceholder")}
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            className={inputClass}
          />
        </Box>
        <Box>
          <label className={labelClass}>{t("report.incidentTime")}</label>
          <Input
            type="datetime-local"
            value={incidentAt}
            onChange={(e) => setIncidentAt(e.target.value)}
            className={inputClass}
          />
          <Text fontSize="xs" className="text-gray-500 dark:text-gray-400 mt-1">
            {t("report.incidentTimeHint")}
          </Text>
        </Box>
      </VStack>

      {/* Row 3: Who should we notify — Report to */}
      <Box className="text-gray-600 dark:text-gray-400 text-sm items-start">
        <Text fontWeight={600} className="text-gray-800 dark:text-gray-100 mb-1">
          {t("report.whoToNotify")}
        </Text>
        <Text fontSize="sm">{t("report.whoToNotifyDesc")}</Text>
      </Box>
      <Box className="bg-white dark:bg-[#232522] rounded-xl border border-gray-200 dark:border-white/20 p-6">
        <label className={labelClass}>{t("report.reportTo")}</label>
        <Box className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-white/20 bg-white dark:bg-[#2c2f2c] px-3 py-2">
          <IoPeopleOutline className="text-gray-500 dark:text-gray-400 shrink-0" size={20} />
          <Select
            value={priority}
            onChange={(v) => setPriority(v as "Low" | "Medium" | "High" | "Critical")}
            size="sm"
            options={[
              { value: "Low", label: `${t("report.reportToTeam")} — ${t("report.priorityLow")}` },
              { value: "Medium", label: `${t("report.reportToTeam")} — ${t("report.priorityMedium")}` },
              { value: "High", label: `${t("report.reportToTeam")} — ${t("report.priorityHigh")}` },
              { value: "Critical", label: `${t("report.reportToTeam")} — ${t("report.priorityCritical")}` },
            ]}
            className="flex-1 min-w-0 !border-0 !shadow-none !bg-transparent hover:!border-transparent hover:!shadow-none dark:!bg-transparent"
          />
        </Box>
      </Box>

      {/* Row 4: Notification channels — Notify via + button */}
      <Box className="text-gray-600 dark:text-gray-400 text-sm items-start">
        <Text fontWeight={600} className="text-gray-800 dark:text-gray-100 mb-1">
          {t("report.notificationChannels")}
        </Text>
        <Text fontSize="sm">{t("report.notificationChannelsDesc")}</Text>
      </Box>
      <VStack align="stretch" spacing={4} className="bg-white dark:bg-[#232522] rounded-xl border border-gray-200 dark:border-white/20 p-6">
        <Box>
          <label className={labelClass}>{t("report.notifyVia")}</label>
          <VStack align="stretch" spacing={2} className="mt-2">
            {[
              { key: "call", label: t("report.notifyCall"), checked: notifyCall, set: setNotifyCall },
              { key: "sms", label: t("report.notifySms"), checked: notifySms, set: setNotifySms },
              { key: "email", label: t("report.notifyEmail"), checked: notifyEmail, set: setNotifyEmail },
              { key: "push", label: t("report.notifyPush"), checked: notifyPush, set: setNotifyPush },
              { key: "critical", label: t("report.notifyCriticalAlert"), checked: notifyCritical, set: setNotifyCritical },
            ].map(({ key, label, checked, set }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => set(e.target.checked)}
                  className="rounded border-gray-300 dark:border-white/30 text-brand-primary focus:ring-brand-primary"
                />
                <span>{label}</span>
                {key === "critical" && (
                  <IoInformationCircleOutline className="text-gray-400" size={16} title={t("report.noOnCallNote")} />
                )}
              </label>
            ))}
          </VStack>
          <Text fontSize="xs" className="text-gray-500 dark:text-gray-400 mt-2">
            {t("report.noOnCallNote")}
          </Text>
        </Box>
        <Button
          className="w-full h-12 rounded-lg bg-[#1F6A5C] hover:bg-[#267E6D] text-white font-semibold"
          onClick={createReport}
          isLoading={loading}
        >
          {t("report.createNewIncident")}
        </Button>
      </VStack>
    </Box>
  );
}
