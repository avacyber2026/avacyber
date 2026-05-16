"use client";

import Link from "next/link";
import { IoChevronBack } from "react-icons/io5";
import { Button } from "@/ui";
import { useLanguage } from "@/contexts/LanguageContext";

export function BackToIncidentsLink() {
  const { t } = useLanguage();

  return (
    <Button
      as={Link}
      href="/tickets"
      variant="ghost"
      size="sm"
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 h-auto min-h-9 bg-[#F4F3F4]/95 dark:bg-white/[0.08] hover:bg-[#50BFA0]/15 dark:hover:bg-white/[0.12] text-[#103E36] dark:text-[#F4F3F4] border border-[#1F6A5C]/20 dark:border-white/10 shadow-sm"
    >
      <IoChevronBack className="shrink-0 -ml-0.5 text-lg opacity-90" aria-hidden />
      {t("report.backToIncidents")}
    </Button>
  );
}
