"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { VStack, Box, Text, Input, Textarea, Button, Select } from "@/ui";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/axios";
import { useLanguage } from "@/contexts/LanguageContext";
import { EndUserCombobox } from "./EndUserCombobox";
import { EndUserMultiCombobox } from "./EndUserMultiCombobox";
import type { EndUserOption } from "@/lib/endUserDisplay";
import { normalizeEndUsersResponse } from "@/lib/endUserDisplay";
import {
  IoPeopleOutline,
  IoDocumentAttachOutline,
  IoInformationCircleOutline,
  IoCloseCircleOutline,
} from "react-icons/io5";

const inputClass =
  "w-full rounded-lg border border-[#1F6A5C]/20 dark:border-white/20 bg-white dark:bg-[#1E2128] text-[#103E36] dark:text-white placeholder-[#1F6A5C]/50 dark:placeholder-[#1F6A5C]/50 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors";
const textareaClass = inputClass + " min-h-[120px] p-3 resize-y";
const labelClass = "text-sm font-semibold text-[#103E36] dark:text-[#F4F3F4]/65 mb-1 block";

const RECIPIENT_VALUES = ["User", "GRC", "IAM", "Pentesting"] as const;
type RecipientValue = (typeof RECIPIENT_VALUES)[number];

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

export interface SocIncidentCreateFormProps {
  onSuccess?: () => void;
}

export function SocIncidentCreateForm({ onSuccess }: SocIncidentCreateFormProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [recipientTo, setRecipientTo] = useState<RecipientValue | "">("");
  const [assigneeUser, setAssigneeUser] = useState("");
  const [assigneeUsers, setAssigneeUsers] = useState<string[]>([]);
  const [incidentType, setIncidentType] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [siemAlertId, setSiemAlertId] = useState("");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">("Medium");
  const [loading, setLoading] = useState(false);
  const [endUsers, setEndUsers] = useState<EndUserOption[]>([]);
  const [endUsersLoading, setEndUsersLoading] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyCall, setNotifyCall] = useState(false);
  const [notifySms, setNotifySms] = useState(false);
  const [notifyPush, setNotifyPush] = useState(false);
  const [notifyCritical, setNotifyCritical] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEndUsersLoading(true);
    api
      .get("/users/end-users")
      .then((r) => setEndUsers(normalizeEndUsersResponse(r.data)))
      .catch(() => setEndUsers([]))
      .finally(() => setEndUsersLoading(false));
  }, []);

  useEffect(() => {
    setIncidentType("");
    setSiemAlertId("");
    if (recipientTo !== "User") {
      setAssigneeUser("");
      setAssigneeUsers([]);
    }
  }, [recipientTo]);

  function typesForRecipient(r: RecipientValue | ""): string[] {
    if (r === "User") return ["Security Announcement", "Activity Verification"];
    if (r === "GRC" || r === "IAM" || r === "Pentesting") {
      return ["Security Announcement", "Communication Channel"];
    }
    return [];
  }

  const isMultiRecipient = recipientTo === "User" && incidentType === "Security Announcement";

  const createTicket = () => {
    if (!recipientTo || !incidentType || !subject.trim() || !description.trim()) {
      toast({ title: t("tickets.socMissingFields"), status: "error" });
      return;
    }
    if (recipientTo === "User" && isMultiRecipient && assigneeUsers.length === 0) {
      toast({ title: t("tickets.socPickUser"), status: "error" });
      return;
    }
    if (recipientTo === "User" && !isMultiRecipient && !assigneeUser.trim()) {
      toast({ title: t("tickets.socPickUser"), status: "error" });
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.append("toWhom", recipientTo);
    if (recipientTo === "User") {
      if (isMultiRecipient) {
        for (const em of assigneeUsers) fd.append("users", em);
      } else {
        fd.append("user", assigneeUser.trim());
      }
    }
    fd.append("type", incidentType);
    fd.append("subject", subject.trim());
    fd.append("description", description.trim());
    fd.append("priority", priority);
    if (incidentType === "Activity Verification" && siemAlertId.trim()) {
      fd.append("siemAlertId", siemAlertId.trim().slice(0, 255));
    }
    for (const f of attachedFiles) {
      fd.append("files", f);
    }
    api
      .post("/tickets", fd)
      .then(() => {
        toast({ title: t("tickets.socCreated"), status: "success" });
        setSubject("");
        setDescription("");
        setAttachedFiles([]);
        setIncidentType("");
        setRecipientTo("");
        setAssigneeUser("");
        setAssigneeUsers([]);
        setSiemAlertId("");
        onSuccess?.();
      })
      .catch(() => toast({ title: t("tickets.socCreateFailed"), status: "error" }))
      .finally(() => setLoading(false));
  };

  const email = user?.email ?? "";
  const typeOptions = typesForRecipient(recipientTo);

  const recipientOptions = useMemo(
    () => [
      { value: "", label: t("tickets.socAssignPlaceholder") },
      ...RECIPIENT_VALUES.map((r) => ({
        value: r,
        label: r === "User" ? t("tickets.socRecipientUser") : r,
      })),
    ],
    [t]
  );

  const incidentTypeOptions = useMemo(
    () => [
      { value: "", label: t("tickets.socTypePlaceholder") },
      ...typeOptions.map((ty) => ({ value: ty, label: ty })),
    ],
    [t, typeOptions]
  );

  const socPriorityOptions = useMemo(
    () => [
      { value: "Low", label: t("report.priorityLow") },
      { value: "Medium", label: t("report.priorityMedium") },
      { value: "High", label: t("report.priorityHigh") },
    ],
    [t]
  );

  return (
    <Box className="grid grid-cols-1 lg:grid-cols-[1fr,1.2fr] gap-x-8 lg:gap-x-12 gap-y-10 max-w-5xl items-start">
      <Text fontSize="sm" className="text-[#1F6A5C]/70 dark:text-[#F4F3F4]/45 lg:col-span-2 -mb-4">
        {t("report.requiredLegend")}
      </Text>

      <Box className="text-[#1F6A5C] dark:text-[#F4F3F4]/45 text-sm lg:pt-1">
        <Text fontWeight={600} className="text-[#103E36] dark:text-[#F4F3F4] mb-1">
          {t("report.whatsGoingOn")}
        </Text>
        <Text fontSize="sm">{t("report.whatsGoingOnDesc")}</Text>
      </Box>
      <VStack align="stretch" spacing={4} className="bg-white dark:bg-[#1E2128] rounded-xl border border-[#1F6A5C]/20 dark:border-white/20 p-6">
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
                : "border-[#1F6A5C]/20 dark:border-white/20 hover:border-[#1F6A5C]/25 dark:hover:border-white/30"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
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
            <IoDocumentAttachOutline className="mx-auto text-[#1F6A5C]/60 dark:text-[#F4F3F4]/55 mb-2" size={28} />
            <Text fontSize="sm" className="text-[#1F6A5C]/70 dark:text-[#F4F3F4]/45 mb-2">
              {t("report.dragDropFiles")}
            </Text>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-[#1F6A5C]/25 dark:border-white/20"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
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
              <VStack align="stretch" spacing={2} className="mt-4 text-left border-t border-[#1F6A5C]/20 dark:border-white/15 pt-4">
                <Text fontSize="xs" fontWeight={600} className="text-[#1F6A5C] dark:text-[#F4F3F4]/45 uppercase tracking-wide">
                  {t("report.selectedFiles")}
                </Text>
                <ul className="space-y-2 min-w-0 max-w-full">
                  {attachedFiles.map((file, index) => (
                    <li
                      key={`${fileDedupeKey(file)}-${index}`}
                      className="flex flex-col gap-2 rounded-lg bg-[#F4F3F4]/50 dark:bg-white/5 px-3 py-2 text-sm text-[#103E36] dark:text-[#F4F3F4]/80 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                    >
                      <div className="flex min-w-0 w-full flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
                        <span
                          className="min-w-0 flex-1 text-left break-words [overflow-wrap:anywhere] text-[#103E36] dark:text-[#F4F3F4]/80"
                          title={file.name}
                        >
                          {file.name}
                        </span>
                        <span className="shrink-0 text-[#1F6A5C]/70 dark:text-[#F4F3F4]/45 tabular-nums text-xs sm:text-sm">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 self-end p-0.5 rounded text-[#1F6A5C]/70 hover:text-red-600 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-brand-primary sm:self-center"
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

      <Box className="text-[#1F6A5C] dark:text-[#F4F3F4]/45 text-sm items-start">
        <Text fontWeight={600} className="text-[#103E36] dark:text-[#F4F3F4] mb-1">
          {t("tickets.socRoutingTitle")}
        </Text>
        <Text fontSize="sm">{t("tickets.socRoutingDesc")}</Text>
      </Box>
      <VStack align="stretch" spacing={4} className="bg-white dark:bg-[#1E2128] rounded-xl border border-[#1F6A5C]/20 dark:border-white/20 p-6">
        <Box>
          <label className={labelClass}>{t("tickets.socAssignTo")} *</label>
          <Box className="flex items-center gap-2 rounded-lg border border-[#1F6A5C]/20 dark:border-white/20 bg-white dark:bg-[#1E2128] px-3 py-2">
            <IoPeopleOutline className="text-[#1F6A5C]/70 dark:text-[#F4F3F4]/45 shrink-0" size={20} />
            <Select
              value={recipientTo}
              onChange={(v) => setRecipientTo(v as RecipientValue | "")}
              options={recipientOptions}
              size="sm"
              className="flex-1 min-w-0 !border-0 !shadow-none !bg-transparent hover:!border-transparent hover:!shadow-none dark:!bg-transparent"
            />
          </Box>
        </Box>
        {recipientTo === "User" && isMultiRecipient ? (
          <Box>
            <label className={labelClass}>{t("tickets.socEndUserEmail")} *</label>
            <EndUserMultiCombobox
              value={assigneeUsers}
              onChange={setAssigneeUsers}
              users={endUsers}
              loading={endUsersLoading}
              placeholder={t("tickets.socPickUserPlaceholder")}
              searchPlaceholder={t("tickets.socEndUserSearchPlaceholder")}
              emptyListMessage={t("tickets.socEndUserEmpty")}
              noMatchMessage={t("tickets.socEndUserNoMatch")}
              className="w-full"
            />
          </Box>
        ) : recipientTo === "User" ? (
          <Box>
            <label className={labelClass}>{t("tickets.socEndUserEmail")} *</label>
            <EndUserCombobox
              value={assigneeUser}
              onChange={setAssigneeUser}
              users={endUsers}
              loading={endUsersLoading}
              placeholder={t("tickets.socPickUserPlaceholder")}
              searchPlaceholder={t("tickets.socEndUserSearchPlaceholder")}
              emptyListMessage={t("tickets.socEndUserEmpty")}
              noMatchMessage={t("tickets.socEndUserNoMatch")}
              className="w-full"
            />
          </Box>
        ) : null}
        <Box>
          <label className={labelClass}>{t("tickets.socIncidentType")} *</label>
          <Select
            value={incidentType}
            onChange={setIncidentType}
            disabled={!recipientTo}
            options={incidentTypeOptions}
            className="w-full opacity-100 disabled:opacity-50"
          />
        </Box>
        {recipientTo === "User" && incidentType === "Activity Verification" ? (
          <Box>
            <label className={labelClass}>{t("tickets.siemAlertId")}</label>
            <Input
              placeholder={t("tickets.siemAlertIdPlaceholder")}
              value={siemAlertId}
              onChange={(e) => setSiemAlertId(e.target.value)}
              className={inputClass}
              maxLength={255}
            />
            <Text fontSize="xs" className="text-[#1F6A5C]/70 dark:text-[#F4F3F4]/45 mt-1">
              {t("tickets.siemAlertIdHint")}
            </Text>
          </Box>
        ) : null}
      </VStack>

      <Box className="text-[#1F6A5C] dark:text-[#F4F3F4]/45 text-sm items-start">
        <Text fontWeight={600} className="text-[#103E36] dark:text-[#F4F3F4] mb-1">
          {t("report.whoToNotify")}
        </Text>
        <Text fontSize="sm">{t("tickets.socPriorityDesc")}</Text>
      </Box>
      <Box className="bg-white dark:bg-[#1E2128] rounded-xl border border-[#1F6A5C]/20 dark:border-white/20 p-6">
        <label className={labelClass}>{t("admin.priority")}</label>
        <Box className="flex items-center gap-2 rounded-lg border border-[#1F6A5C]/20 dark:border-white/20 bg-white dark:bg-[#1E2128] px-3 py-2 mt-1">
          <IoPeopleOutline className="text-[#1F6A5C]/70 dark:text-[#F4F3F4]/45 shrink-0" size={20} />
          <Select
            value={priority}
            onChange={(v) => setPriority(v as "Low" | "Medium" | "High")}
            options={socPriorityOptions}
            size="sm"
            className="flex-1 min-w-0 !border-0 !shadow-none !bg-transparent hover:!border-transparent hover:!shadow-none dark:!bg-transparent"
          />
        </Box>
      </Box>

      <Box className="text-[#1F6A5C] dark:text-[#F4F3F4]/45 text-sm items-start">
        <Text fontWeight={600} className="text-[#103E36] dark:text-[#F4F3F4] mb-1">
          {t("tickets.socCreatorTitle")}
        </Text>
        <Text fontSize="sm">{t("tickets.socCreatorDesc")}</Text>
      </Box>
      <Box className="bg-white dark:bg-[#1E2128] rounded-xl border border-[#1F6A5C]/20 dark:border-white/20 p-6">
        <label className={labelClass}>{t("report.yourEmail")}</label>
        <Input value={email} readOnly className={inputClass + " opacity-90"} />
      </Box>

      <Box className="text-[#1F6A5C] dark:text-[#F4F3F4]/45 text-sm items-start">
        <Text fontWeight={600} className="text-[#103E36] dark:text-[#F4F3F4] mb-1">
          {t("report.notificationChannels")}
        </Text>
        <Text fontSize="sm">{t("report.notificationChannelsDesc")}</Text>
      </Box>
      <VStack align="stretch" spacing={4} className="bg-white dark:bg-[#1E2128] rounded-xl border border-[#1F6A5C]/20 dark:border-white/20 p-6">
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
              <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-[#103E36] dark:text-[#F4F3F4]/65">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => set(e.target.checked)}
                  className="rounded border-[#1F6A5C]/25 dark:border-white/30 text-brand-primary focus:ring-brand-primary"
                />
                <span>{label}</span>
                {key === "critical" && (
                  <IoInformationCircleOutline className="text-[#1F6A5C]/60" size={16} title={t("report.noOnCallNote")} />
                )}
              </label>
            ))}
          </VStack>
          <Text fontSize="xs" className="text-[#1F6A5C]/70 dark:text-[#F4F3F4]/45 mt-2">
            {t("report.noOnCallNote")}
          </Text>
        </Box>
        <Button
          className="w-full h-12 rounded-lg bg-[#1F6A5C] hover:bg-[#267E6D] text-white font-semibold"
          onClick={createTicket}
          isLoading={loading}
        >
          {t("tickets.createNewIncident")}
        </Button>
      </VStack>
    </Box>
  );
}
