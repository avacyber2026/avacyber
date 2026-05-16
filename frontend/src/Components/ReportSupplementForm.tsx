"use client";

import { useState } from "react";
import { Box, Text, Button, Input, Textarea, VStack } from "@/ui";
import { useToast } from "@/hooks/useToast";
import { useLanguage } from "@/contexts/LanguageContext";
import api from "@/lib/axios";
import type { ReportItem } from "@/types";

interface ReportSupplementFormProps {
  report: ReportItem;
  onSupplemented: () => void;
}

export function ReportSupplementForm({ report, onSupplemented }: ReportSupplementFormProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [reporterEmail, setReporterEmail] = useState(report.reporterEmail || "");
  const [hostname, setHostname] = useState(report.hostname || "");
  const incidentIso = report.incidentAt
    ? new Date(report.incidentAt).toISOString().slice(0, 16)
    : "";
  const [incidentAt, setIncidentAt] = useState(incidentIso);
  const [loading, setLoading] = useState(false);

  if (report.pipelineStatus !== "awaiting_user_info") return null;

  const missingFields: string[] =
    report.supplementHints ||
    (report.aiResult as { missing_fields?: string[] } | undefined)?.missing_fields ||
    [];

  async function submit() {
    if (!description.trim() && !reporterEmail.trim() && !hostname.trim() && !incidentAt.trim()) {
      toast({ title: t("report.supplementRequired"), status: "error" });
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, string | undefined> = {
        description: description.trim() || undefined,
        reporter_email: reporterEmail.trim() || undefined,
        hostname: hostname.trim() || undefined,
      };
      if (incidentAt.trim()) {
        const d = new Date(incidentAt);
        if (!Number.isNaN(d.getTime())) payload.incident_at = d.toISOString();
      }
      await api.patch(`/reports/${report.id}/supplement`, payload);
      toast({ title: t("report.supplementSuccess"), status: "success" });
      onSupplemented();
    } catch {
      toast({ title: t("report.supplementFailed"), status: "error" });
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full rounded-lg border border-[#1F6A5C]/20 dark:border-white/20 bg-white dark:bg-[#103E36] text-[#103E36] dark:text-white placeholder-[#1F6A5C]/50 dark:placeholder-[#1F6A5C]/50 focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm";
  const labelClass = "text-sm font-semibold text-[#103E36] dark:text-[#F4F3F4]/65 mb-1 block";

  return (
    <Box className="rounded-xl border-2 border-amber-500/40 bg-amber-50 dark:bg-amber-900/10 p-5 mt-4">
      <Text fontSize="sm" fontWeight={700} className="text-amber-800 dark:text-amber-200 mb-2">
        {t("report.additionalInfoNeeded")}
      </Text>

      {missingFields.length > 0 && (
        <Box className="mb-3">
          <Text fontSize="xs" className="text-amber-700 dark:text-amber-300 mb-1">
            {t("report.missingFields")}:
          </Text>
          <ul className="list-disc pl-5 text-xs text-amber-700 dark:text-amber-300 space-y-0.5">
            {missingFields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
        </Box>
      )}

      <VStack align="stretch" spacing={3}>
        <Box>
          <label className={labelClass}>{t("report.additionalDescription")}</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("report.additionalDescriptionPlaceholder")}
            rows={3}
            className={inputClass + " min-h-[80px] p-3 resize-y"}
          />
        </Box>
        <Box>
          <label className={labelClass}>{t("report.reporterEmail")}</label>
          <Input
            value={reporterEmail}
            onChange={(e) => setReporterEmail(e.target.value)}
            placeholder={t("report.reporterEmailPlaceholder")}
            type="email"
            className={inputClass + " px-3 py-2"}
          />
        </Box>
        <Box>
          <label className={labelClass}>{t("report.hostname")}</label>
          <Input
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            placeholder={t("report.hostnamePlaceholder")}
            className={inputClass + " px-3 py-2"}
          />
        </Box>
        <Box>
          <label className={labelClass}>{t("report.incidentTime")}</label>
          <Input
            type="datetime-local"
            value={incidentAt}
            onChange={(e) => setIncidentAt(e.target.value)}
            className={inputClass + " px-3 py-2"}
          />
          <Text fontSize="xs" className="text-amber-700/90 dark:text-amber-300/90 mt-1">
            {t("report.incidentTimeHint")}
          </Text>
        </Box>
        <Button
          onClick={submit}
          isLoading={loading}
          className="w-full h-10 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm"
        >
          {t("report.submitSupplement")}
        </Button>
      </VStack>
    </Box>
  );
}
