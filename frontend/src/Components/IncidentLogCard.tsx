"use client";

import { motion } from "framer-motion";
import { Text, HStack, Box, Divider } from "@/ui";
import type { Ticket } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";
import { IoPersonCircleOutline } from "react-icons/io5";

function formatIncidentWhen(iso?: string) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function priorityStyles(p: string): string {
  const u = (p || "").toLowerCase();
  if (u === "critical" || u === "high") return "bg-red-500/10 text-red-800 dark:text-red-200 border-red-500/25";
  if (u === "medium") return "bg-amber-500/10 text-amber-900 dark:text-amber-200 border-amber-500/25";
  return "bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 border-emerald-500/25";
}

function statusStyles(s: string): string {
  const u = (s || "").toLowerCase();
  if (u.includes("resolved")) return "bg-emerald-500/12 text-emerald-800 dark:text-emerald-200 border-emerald-500/25";
  if (u.includes("updated")) return "bg-violet-500/12 text-violet-800 dark:text-violet-200 border-violet-500/25";
  if (u.includes("new")) return "bg-sky-500/12 text-sky-800 dark:text-sky-200 border-sky-500/25";
  if (u.includes("active")) return "bg-amber-500/12 text-amber-900 dark:text-amber-200 border-amber-500/25";
  return "bg-gray-500/10 text-gray-800 dark:text-gray-200 border-gray-500/20";
}

export interface IncidentLogCardProps {
  ticket: Ticket;
  index?: number;
  /** Маршрут «создал → назначен» для GSOC / Management */
  showRouting?: boolean;
  /** Если не передан — ниже идёт стандартный блок ответа (как в журнале GSOC) */
  children?: React.ReactNode;
  answerHeading?: string;
  emptyAnswerText?: string;
}

export function IncidentLogCard({
  ticket: x,
  index = 0,
  showRouting = false,
  children,
  answerHeading = "Answer",
  emptyAnswerText = "No response yet",
}: IncidentLogCardProps) {
  const { t } = useLanguage();
  const when = formatIncidentWhen(x.createdAt);

  const defaultFooter = (
    <>
      <Text fontSize="xs" fontWeight={600} className="uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
        {answerHeading}
      </Text>
      {x.answer === "" ? (
        <Text fontSize="sm" className="text-gray-400 dark:text-gray-500 italic">
          {emptyAnswerText}
        </Text>
      ) : (
        <Text fontSize="sm" className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
          {x.answer}
        </Text>
      )}
    </>
  );

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      className="w-full rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-[#232522] shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
    >
      <div className="p-5 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <HStack spacing={3} align="flex-start" className="min-w-0 flex-1">
            <Box className="shrink-0 w-10 h-10 rounded-full bg-[#1F6A5C]/12 dark:bg-[#50BFA0]/15 flex items-center justify-center text-[#1F6A5C] dark:text-[#50BFA0]">
              <IoPersonCircleOutline className="w-6 h-6" aria-hidden />
            </Box>
            <div className="min-w-0 flex-1">
              <Text fontSize="sm" fontWeight={600} className="text-gray-600 dark:text-gray-300 break-all sm:break-words" title={x.fromUser}>
                {x.fromUser}
              </Text>
              {showRouting && (x.createdBy || x.assignedTo) && (
                <Text fontSize="xs" className="text-gray-500 dark:text-gray-500 mt-1 leading-relaxed">
                  {x.createdBy && (
                    <>
                      <span className="text-gray-500 dark:text-gray-400">Created by </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{x.createdBy}</span>
                    </>
                  )}
                  {x.createdBy && x.assignedTo && <span className="mx-1 text-gray-400">·</span>}
                  {x.assignedTo && (
                    <>
                      <span className="text-gray-500 dark:text-gray-400">Assigned to </span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{x.assignedTo}</span>
                    </>
                  )}
                </Text>
              )}
              {when && (
                <Text fontSize="xs" className="text-gray-400 dark:text-gray-500 mt-1">
                  {when}
                </Text>
              )}
            </div>
          </HStack>
          <HStack spacing={2} className="flex-wrap shrink-0 lg:justify-end">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${priorityStyles(x.priority)}`}
            >
              {x.priority}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${statusStyles(x.status)}`}
            >
              {x.status}
            </span>
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 max-w-[220px] truncate"
              title={x.type}
            >
              {x.type}
            </span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-white/20">
              #{x.id}
            </span>
            {x.siemAlertId ? (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono border border-cyan-500/25 bg-cyan-500/10 text-cyan-900 dark:text-cyan-200 max-w-[min(100%,280px)] truncate"
                title={`${t("tickets.siemAlertId")}: ${x.siemAlertId}`}
              >
                <span className="font-sans font-medium shrink-0">{t("tickets.siemAlertIdChip")}</span>
                {x.siemAlertId}
              </span>
            ) : null}
          </HStack>
        </div>

        <div>
          <Text fontSize="lg" fontWeight={700} className="text-gray-900 dark:text-gray-100 mb-2 leading-snug">
            {x.title}
          </Text>
          <Text fontSize="sm" className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {x.text}
          </Text>
        </div>

        <Divider className="border-gray-200 dark:border-white/10 opacity-80" />

        {children ?? defaultFooter}
      </div>
    </motion.article>
  );
}
