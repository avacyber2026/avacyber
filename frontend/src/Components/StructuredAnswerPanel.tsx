"use client";

import { useState } from "react";
import { Box, Text, Button, Textarea } from "@/ui";
import { useToast } from "@/hooks/useToast";
import { useLanguage } from "@/contexts/LanguageContext";
import api from "@/lib/axios";
import type { Ticket } from "@/types";

interface StructuredAnswerPanelProps {
  ticket: Ticket;
  onAnswered: () => void;
}

const VERIFICATION_OPTIONS = ["Aware", "Not Aware", "Description is not clear"] as const;

export function StructuredAnswerPanel({ ticket, onAnswered }: StructuredAnswerPanelProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [selectedOption, setSelectedOption] = useState<string>("");

  const isAnnouncement = ticket.type === "Security Announcement";
  const isVerification = ticket.type === "Activity Verification";
  const alreadyAnswered = ticket.status === "Resolved" || !!ticket.answerType || !!ticket.answer;

  if (alreadyAnswered || (!isAnnouncement && !isVerification)) return null;

  async function submitAnswer() {
    setLoading(true);
    try {
      if (isAnnouncement) {
        await api.patch(`/tickets/${ticket.id}/structured-answer`, {
          answerType: "Acknowledged",
          comment: comment.trim() || undefined,
        });
        toast({ title: t("tickets.acknowledged"), status: "success" });
      } else if (isVerification) {
        if (!selectedOption) {
          toast({ title: t("tickets.selectOption"), status: "error" });
          setLoading(false);
          return;
        }
        await api.patch(`/tickets/${ticket.id}/structured-answer`, {
          answerType: selectedOption,
          comment: comment.trim() || undefined,
        });
        toast({ title: t("tickets.answerSubmitted"), status: "success" });
      }
      onAnswered();
    } catch {
      toast({ title: t("tickets.answerFailed"), status: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box className="rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-[#232522] p-5 mt-4">
      <Text fontSize="sm" fontWeight={600} className="text-gray-700 dark:text-gray-300 mb-3">
        {isAnnouncement ? t("tickets.acknowledgePrompt") : t("tickets.verificationPrompt")}
      </Text>

      {isVerification && (
        <div className="space-y-2 mb-4">
          {VERIFICATION_OPTIONS.map((opt) => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer text-sm text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              <input
                type="radio"
                name="verification-answer"
                value={opt}
                checked={selectedOption === opt}
                onChange={() => setSelectedOption(opt)}
                className="text-brand-primary focus:ring-brand-primary"
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}

      <div className="mb-4">
        <Text fontSize="xs" className="text-gray-500 dark:text-gray-400 mb-1">
          {t("tickets.optionalComment")}
        </Text>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("tickets.commentPlaceholder")}
          rows={2}
          className="w-full rounded-lg border border-gray-200 dark:border-white/20 bg-white dark:bg-[#2c2f2c] text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm p-3 resize-y"
        />
      </div>

      <Button
        onClick={submitAnswer}
        isLoading={loading}
        disabled={isVerification && !selectedOption}
        className="w-full h-10 rounded-lg bg-[#1F6A5C] hover:bg-[#267E6D] text-white font-semibold text-sm"
      >
        {isAnnouncement ? t("tickets.acknowledge") : t("tickets.submitAnswer")}
      </Button>
    </Box>
  );
}
