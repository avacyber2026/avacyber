"use client";

import style from "@/styles/Report.module.css";
import { motion } from "framer-motion";
import { Stack, VStack, Divider, Button } from "@/ui";
import { ReportPremium, ReportSimple, SideMenu } from "@/Components";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ReportPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [data, setData] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const status = localStorage.getItem("status");
      if (status) {
        setData(status);
      } else {
        router.push("/");
      }
    }
  }, [router]);

  return (
    <main>
        <VStack className="w-full min-h-screen">
        <SideMenu />
        <Stack className={`${style.main} bg-[#F4F3F4] dark:bg-[#1C1E1C]`} as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-4">
            <p className={style.title}>{data === "End-User" ? t("report.title") : t("report.reportedTitle")}</p>
            <Button as={Link} href="/tickets/new" size="sm" className="bg-green-600 hover:bg-green-700 text-white">{t("report.createNewIncident")}</Button>
          </div>
          <Divider className="mb-5 border-gray-200 dark:border-white/20" />
          <div className={style.container}>
            {!data ? (
              <div>{t("common.loading")}</div>
            ) : data === "End-User" ? (
              <ReportSimple />
            ) : (
              <ReportPremium />
            )}
          </div>
        </Stack>
      </VStack>
    </main>
  );
}
