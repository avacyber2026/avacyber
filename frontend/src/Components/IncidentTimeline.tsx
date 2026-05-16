"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { IoAttachOutline } from "react-icons/io5";
import { Button, Box, Text, Textarea, HStack } from "@/ui";
import { useToast } from "@/hooks/useToast";
import { useLanguage } from "@/contexts/LanguageContext";
import api from "@/lib/axios";
import type { TicketTimelineEntry } from "@/types";

marked.setOptions({ gfm: true, breaks: true });

const TIMELINE_MAX_FILE_BYTES = 15 * 1024 * 1024;

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

function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) {
    const a = p[0]?.[0];
    const b = p[1]?.[0];
    if (a && b) return (a + b).toUpperCase();
  }
  const s = p[0] || "?";
  return s.slice(0, 2).toUpperCase();
}

function formatWhen(iso: string | undefined, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const loc =
    locale === "de"
      ? "de-DE"
      : locale === "fr"
        ? "fr-FR"
        : locale === "es"
          ? "es-ES"
          : locale === "cs"
            ? "cs-CZ"
            : "en-US";
  try {
    return d.toLocaleString(loc, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return d.toISOString();
  }
}

function MarkdownBody({ source }: { source: string }) {
  const html = useMemo(() => {
    try {
      return marked.parse(source) as string;
    } catch {
      return source.replace(/</g, "&lt;");
    }
  }, [source]);

  return (
    <div
      className={[
        "incident-md text-sm text-[#103E36] dark:text-[#F4F3F4]/80 leading-relaxed",
        "[&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-[#1C1E1C] [&_h1]:dark:text-white [&_h1]:mb-3 [&_h1]:mt-1",
        "[&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-[#1C1E1C] [&_h2]:dark:text-white [&_h2]:mb-2 [&_h2]:mt-4",
        "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-[#1C1E1C] [&_h3]:dark:text-white [&_h3]:mb-2",
        "[&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2",
        "[&_li]:mb-1 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-[#50BFA0]/15 [&_code]:dark:bg-black/40 [&_code]:text-[#0d4f42] [&_code]:dark:text-[#F4F3F4]/55 [&_code]:font-mono [&_code]:text-[13px]",
        "[&_pre]:bg-[#F4F3F4] [&_pre]:dark:bg-black/35 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-3 [&_pre]:border [&_pre]:border-[#1F6A5C]/20 [&_pre]:dark:border-white/10",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
        "[&_a]:text-[#1F6A5C] [&_a]:dark:text-[#F4F3F4]/55 [&_a]:underline [&_strong]:text-[#1C1E1C] [&_strong]:dark:text-white",
      ].join(" ")}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export interface IncidentTimelineProps {
  ticketId: number;
  composerName: string;
}

export function IncidentTimeline({ ticketId, composerName }: IncidentTimelineProps) {
  const { t, locale } = useLanguage();
  const { toast } = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const [entries, setEntries] = useState<TicketTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/tickets/${ticketId}/timeline`)
      .then((r) => {
        if (!cancelled) setEntries(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => {
        if (!cancelled) {
          setEntries([]);
          toastRef.current({ title: t("tickets.incidentThreadLoadError"), status: "error", duration: 4000 });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticketId, t]);

  async function post() {
    const body = draft.trim();
    if (!body && pendingFiles.length === 0) return;
    setPosting(true);
    try {
      let data: TicketTimelineEntry;
      if (pendingFiles.length > 0) {
        const fd = new FormData();
        fd.append("body", body);
        for (const f of pendingFiles) {
          fd.append("files", f);
        }
        const res = await api.post(`/tickets/${ticketId}/timeline`, fd);
        data = res.data as TicketTimelineEntry;
      } else {
        const res = await api.post(`/tickets/${ticketId}/timeline`, { body });
        data = res.data as TicketTimelineEntry;
      }
      setEntries((prev) => [...prev, data]);
      setDraft("");
      setPendingFiles([]);
      toast({ title: t("tickets.incidentThreadPosted"), status: "success", duration: 3000 });
    } catch {
      toast({ title: t("tickets.incidentThreadPostError"), status: "error", duration: 4000 });
    } finally {
      setPosting(false);
    }
  }

  function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list?.length) return;
    const picked = Array.from(list).filter((f) => {
      if (f.size > TIMELINE_MAX_FILE_BYTES) {
        toast({
          title: `${f.name}: ${t("tickets.incidentThreadFileTooLarge")}`,
          status: "warning",
          duration: 4000,
        });
        return false;
      }
      return true;
    });
    setPendingFiles((prev) => mergeUniqueFiles(prev, picked));
    e.target.value = "";
  }

  const composerInitials = initialsFromName(composerName);

  return (
    <Box className="mt-10">
      <Text fontSize="lg" fontWeight={700} className="text-[#1C1E1C] dark:text-white mb-4">
        {t("tickets.incidentThreadTitle")}
      </Text>

      <HStack spacing={3} align="flex-start" className="flex-wrap mb-10">
        <div
          className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br from-[#50BFA0] to-[#1F6A5C]"
          aria-hidden
        >
          {composerInitials}
        </div>
        <Box className="flex-1 min-w-[200px] relative">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={onFilePick}
          />
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("tickets.incidentThreadPlaceholder")}
            rows={3}
            className="w-full rounded-xl border border-[#1F6A5C]/20 dark:border-white/15 bg-white dark:bg-[#1C1E1C] text-[#1C1E1C] dark:text-[#F4F3F4] placeholder:text-[#1C1E1C]/60 dark:text-[#F4F3F4]/55 pr-11 py-3 resize-y min-h-[88px]"
          />
          <button
            type="button"
            className="absolute right-3 top-3 p-1 rounded-md text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45 hover:text-[#103E36] dark:hover:text-[#F4F3F4]/80 hover:bg-[#F4F3F4] dark:hover:bg-white/5 cursor-pointer"
            aria-label={t("tickets.incidentThreadAttach")}
            title={t("tickets.incidentThreadAttach")}
            onClick={() => fileInputRef.current?.click()}
          >
            <IoAttachOutline size={22} />
          </button>
          {pendingFiles.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2 text-xs">
              {pendingFiles.map((f, i) => (
                <li
                  key={`${fileDedupeKey(f)}-${i}`}
                  className="inline-flex items-center gap-1 max-w-full rounded-md border border-[#1F6A5C]/20 dark:border-white/15 bg-[#F4F3F4]/50 dark:bg-white/5 px-2 py-1"
                >
                  <span className="truncate text-[#103E36] dark:text-[#F4F3F4]/80" title={f.name}>
                    {f.name}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 hover:text-red-600 dark:hover:text-red-400"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Box>
        <Button
          type="button"
          onClick={post}
          isLoading={posting}
          disabled={!draft.trim() && pendingFiles.length === 0}
          className="h-10 px-5 rounded-lg bg-[#103E36] dark:bg-[#1E2128] hover:bg-[#103E36] dark:hover:bg-[#353835] text-white border border-[#1F6A5C] dark:border-white/10"
        >
          {t("tickets.incidentThreadPost")}
        </Button>
      </HStack>

      {loading ? (
        <Text className="text-[#1C1E1C]/60 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45 text-sm">{t("common.loading")}</Text>
      ) : entries.length === 0 ? (
        <Text className="text-[#1C1E1C]/60 dark:text-[#F4F3F4]/55 text-sm">{t("tickets.incidentThreadEmpty")}</Text>
      ) : (
        <div className="relative">
          <div className="absolute left-[19px] top-8 bottom-8 w-px bg-[#50BFA0]/25 dark:bg-white/[0.06]" aria-hidden />
          <ul className="space-y-8 relative">
            {entries.map((e) => {
              const label = e.authorName || e.authorEmail || "?";
              const ini = initialsFromName(label);
              return (
                <li key={e.id} className="flex gap-4">
                  <div className="relative z-[1] shrink-0 w-10 flex justify-center">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-amber-600 to-orange-700 ring-4 ring-[#F4F3F4] dark:ring-[#1C1E1C]">
                      {ini}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <HStack justify="space-between" align="flex-start" className="gap-2 mb-2">
                      <Text fontWeight={600} className="text-[#1C1E1C] dark:text-white text-sm truncate">
                        {label}
                      </Text>
                      <Text fontSize="xs" className="text-[#1C1E1C]/60 dark:text-[#F4F3F4]/55 shrink-0 whitespace-nowrap">
                        {formatWhen(e.createdAt, locale)}
                      </Text>
                    </HStack>
                    <div className="rounded-xl border border-[#1F6A5C]/20 dark:border-white/10 bg-[#F4F3F4]/50 dark:bg-[#1E2128] px-4 py-4 shadow-inner">
                      <MarkdownBody source={e.body} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Box>
  );
}
