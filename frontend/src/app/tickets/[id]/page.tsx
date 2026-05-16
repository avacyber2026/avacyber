"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import style from "@/styles/Tickets.module.css";
import { Stack, VStack, Text, Box, Divider, HStack } from "@/ui";
import { motion } from "framer-motion";
import { SideMenu, IncidentTimeline, BackToIncidentsLink } from "@/Components";
import { StructuredAnswerPanel } from "@/Components/StructuredAnswerPanel";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUser } from "@/contexts/UserContext";
import api from "@/lib/axios";
import type { Ticket } from "@/types";
import { CREATOR_ROLES } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3020";

function statusLabel(status: string, t: (k: string) => string): string | null {
  const s = (status || "").toLowerCase();
  if (s.includes("resolved")) return t("tickets.statusResolved");
  if (s.includes("updated")) return t("tickets.statusUpdated");
  if (s === "new" || s.startsWith("new ")) return t("tickets.statusNew");
  return null;
}

function IncidentDetailInner() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { isAuthenticated, isLoading: authLoading, role } = useAuth();
  const { profile } = useUser() ?? { profile: null };
  const rawId = params?.id;
  const idNum = typeof rawId === "string" ? Number(rawId) : NaN;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const composerName =
    profile?.displayName || [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim() || profile?.email || "User";

  const statusBadgeText = useMemo(
    () => (ticket ? statusLabel(ticket.status, t) : null),
    [ticket, t]
  );

  const fetchTicket = useCallback(() => {
    if (!Number.isInteger(idNum) || idNum < 1) {
      setLoadError("bad id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    api
      .get(`/tickets/${idNum}`)
      .then((r) => setTicket(r.data as Ticket))
      .catch((err) => {
        setTicket(null);
        if (err?.response?.status === 403 || err?.response?.status === 404) {
          setLoadError("missing");
        } else {
          setLoadError("error");
        }
      })
      .finally(() => setLoading(false));
  }, [idNum]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
      return;
    }
    if (isAuthenticated) fetchTicket();
  }, [isAuthenticated, authLoading, fetchTicket, router]);

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {t("common.loading")}
      </div>
    );
  }

  if (!Number.isInteger(idNum) || idNum < 1 || loadError === "missing") {
    router.replace("/tickets");
    return null;
  }

  return (
    <VStack className="w-full min-h-screen">
      <SideMenu />
      <Stack
        className={`${style.main} bg-[#F4F3F4] dark:bg-[#1C1E1C] p-6`}
        as={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <BackToIncidentsLink />
        </div>

        {loading ? (
          <Text>{t("common.loading")}</Text>
        ) : loadError === "error" ? (
          <Text className="text-red-600">{t("tickets.detailLoadError")}</Text>
        ) : ticket ? (
          <div className="max-w-4xl">
            <HStack className="flex-wrap gap-2 mb-3" spacing={2}>
              {statusBadgeText ? (
                <span className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[#1F6A5C]/20 dark:border-white/15 bg-white/80 dark:bg-white/5 text-[#103E36] dark:text-[#F4F3F4]/80">
                  {statusBadgeText}
                </span>
              ) : null}
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                {ticket.priority}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[#1F6A5C]/20 dark:border-white/15 text-[#1F6A5C] dark:text-[#F4F3F4]/45">
                {ticket.type}
              </span>
              <span className="text-xs font-mono text-[#1F6A5C]/70">#{ticket.id}</span>
              {ticket.siemAlertId ? (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono border border-cyan-500/25 bg-cyan-500/10 text-cyan-900 dark:text-cyan-200 max-w-full truncate"
                  title={`${t("tickets.siemAlertId")}: ${ticket.siemAlertId}`}
                >
                  <span className="font-sans font-medium shrink-0">{t("tickets.siemAlertIdChip")}</span>
                  <span className="truncate">{ticket.siemAlertId}</span>
                </span>
              ) : null}
            </HStack>
            <Text fontSize="2xl" fontWeight={700} className="text-[#1C1E1C] dark:text-[#F4F3F4] mb-4">
              {ticket.title}
            </Text>
            <Box className="rounded-xl border border-[#1F6A5C]/20 dark:border-white/15 bg-white dark:bg-[#1E2128] p-5 mb-2">
              <Text fontSize="sm" fontWeight={600} className="text-[#1F6A5C]/70 dark:text-[#F4F3F4]/45 mb-2">
                {t("tickets.detailDescription")}
              </Text>
              <Text fontSize="sm" className="text-[#103E36] dark:text-[#F4F3F4]/80 whitespace-pre-wrap">
                {ticket.text}
              </Text>
              {ticket.attachments && ticket.attachments.length > 0 ? (
                <>
                  <Divider className="my-4 border-[#1F6A5C]/20 dark:border-white/10" />
                  <Text fontSize="sm" fontWeight={600} className="text-[#1F6A5C]/70 dark:text-[#F4F3F4]/45 mb-2">
                    {t("tickets.attachmentsHeading")}
                  </Text>
                  <ul className="space-y-2">
                    {ticket.attachments.map((a) => (
                      <li key={a.id}>
                        <a
                          href={a.url.startsWith("http") ? a.url : `${API_URL}${a.url}`}
                          className="text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/55 underline hover:opacity-90 break-all"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {a.originalName}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {ticket.answer ? (
                <>
                  <Divider className="my-4 border-[#1F6A5C]/20 dark:border-white/10" />
                  <Text fontSize="sm" fontWeight={600} className="text-[#1F6A5C]/70 dark:text-[#F4F3F4]/45 mb-2">
                    {t("tickets.detailResponse")}
                  </Text>
                  <Text fontSize="sm" className="text-[#103E36] dark:text-[#F4F3F4]/80 whitespace-pre-wrap">
                    {ticket.answer}
                  </Text>
                </>
              ) : null}
              {(ticket.createdBy || ticket.assignedTo) && (
                <Text fontSize="xs" className="text-[#1F6A5C]/70 mt-4">
                  {ticket.createdBy && (
                    <>
                      {t("tickets.detailCreatedBy")}: {ticket.createdBy}
                    </>
                  )}
                  {ticket.createdBy && ticket.assignedTo ? " · " : null}
                  {ticket.assignedTo && (
                    <>
                      {t("tickets.detailAssignedTo")}: {ticket.assignedTo}
                    </>
                  )}
                </Text>
              )}
            </Box>

            {role && !CREATOR_ROLES.includes(role) && (
              <StructuredAnswerPanel ticket={ticket} onAnswered={fetchTicket} />
            )}

            {role && CREATOR_ROLES.includes(role) && ticket.recipients && ticket.recipients.length > 0 && (
              <Box className="rounded-xl border border-[#1F6A5C]/20 dark:border-white/15 bg-white dark:bg-[#1E2128] p-5 mt-4">
                <Text fontSize="sm" fontWeight={600} className="text-[#1F6A5C]/70 dark:text-[#F4F3F4]/45 mb-3">
                  {t("tickets.recipientsList")}
                </Text>
                <div className="space-y-2">
                  {ticket.recipients.map((rec) => (
                    <div key={rec.userEmail} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-[#F4F3F4]/50 dark:bg-white/5">
                      <span className="text-[#103E36] dark:text-[#F4F3F4]/80">{rec.userEmail}</span>
                      <div className="flex items-center gap-2">
                        {rec.acknowledgedAt ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                            {t("tickets.acknowledged")}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#F4F3F4] dark:bg-white/10 text-[#1F6A5C]/70 dark:text-[#F4F3F4]/45">
                            {t("tickets.pending")}
                          </span>
                        )}
                        {rec.replyText && (
                          <span className="text-xs text-[#1F6A5C]/70 dark:text-[#F4F3F4]/45 max-w-[200px] truncate" title={rec.replyText}>
                            {rec.replyText}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Box>
            )}

            <IncidentTimeline ticketId={idNum} composerName={composerName} />
          </div>
        ) : null}
      </Stack>
    </VStack>
  );
}

function DetailLoading() {
  const { t } = useLanguage();
  return <div className="flex items-center justify-center min-h-screen">{t("common.loading")}</div>;
}

export default function IncidentDetailPage() {
  return (
    <Suspense fallback={<DetailLoading />}>
      <IncidentDetailInner />
    </Suspense>
  );
}
