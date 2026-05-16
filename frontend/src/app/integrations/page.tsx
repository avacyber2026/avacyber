"use client";

import { useEffect } from "react";
import { VStack, Box, Text, Badge, Divider } from "@/ui";
import { SideMenu } from "@/Components";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import style from "@/styles/Report.module.css";
import { useLanguage } from "@/contexts/LanguageContext";

const SIEM_LIST = ["Splunk", "Azure Sentinel", "Elastic", "Google Chronicle", "Rapid7"];

export default function IntegrationsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) router.push("/");
  }, [isAuthenticated, isLoading, router]);

  if (!isAuthenticated && !isLoading) return null;

  return (
    <>
      <SideMenu />
      <VStack className="w-full min-h-screen items-stretch">
        <Box className={`${style.main} bg-[#F4F3F4] dark:bg-[#1C1E1C] p-6`} as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Text className="text-2xl font-bold mb-4 text-[#103E36] dark:text-[#F4F3F4]">{t("integrations.title")}</Text>
          <Divider className="mb-6 border-[#1F6A5C]/20 dark:border-white/20" />
          <Box className="p-6 rounded-lg bg-white dark:bg-[#103E36] border border-[#1F6A5C]/20 dark:border-white/20 mb-6">
            <Text className="font-semibold mb-3">{t("integrations.siemSystems")}</Text>
            <Text className="text-sm text-[#1F6A5C] dark:text-[#1F6A5C]/60 mb-4">{t("integrations.siemDesc")}</Text>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {SIEM_LIST.map((name) => (
                <Box key={name} className="p-3 rounded-md bg-[#F4F3F4]/50 dark:bg-white/10">
                  <Text className="font-medium">{name}</Text>
                  <Badge size="sm" colorScheme="gray">{t("dashboard.comingSoon")}</Badge>
                </Box>
              ))}
            </div>
          </Box>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Box className="p-6 rounded-lg bg-white dark:bg-[#103E36] border border-[#1F6A5C]/20 dark:border-white/20">
              <Text className="font-semibold mb-2 text-[#103E36] dark:text-[#F4F3F4]">{t("integrations.createFromEmails")}</Text>
              <Text className="text-sm text-[#1F6A5C] dark:text-[#1F6A5C]/60 mb-3">{t("integrations.createFromEmailsDesc")}</Text>
              <Badge size="sm" colorScheme="gray">{t("dashboard.comingSoon")}</Badge>
            </Box>
            <Box className="p-6 rounded-lg bg-white dark:bg-[#103E36] border border-[#1F6A5C]/20 dark:border-white/20">
              <Text className="font-semibold mb-2 text-[#103E36] dark:text-[#F4F3F4]">{t("integrations.createFromCalls")}</Text>
              <Text className="text-sm text-[#1F6A5C] dark:text-[#1F6A5C]/60 mb-3">{t("integrations.createFromCallsDesc")}</Text>
              <Badge size="sm" colorScheme="gray">{t("dashboard.comingSoon")}</Badge>
            </Box>
          </div>
        </Box>
      </VStack>
    </>
  );
}
