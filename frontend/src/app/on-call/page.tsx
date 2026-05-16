"use client";

import { useEffect, useState } from "react";
import { VStack, Box, Text, Button, Divider } from "@/ui";
import { SideMenu } from "@/Components";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import style from "@/styles/Report.module.css";
import { useLanguage } from "@/contexts/LanguageContext";
import api from "@/lib/axios";

export default function OnCallPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isAuthenticated, isLoading } = useAuth();
  const [phone, setPhone] = useState("+1234567890");

  useEffect(() => {
    if (!isAuthenticated && !isLoading) router.push("/");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    api.get("/settings/on-call-phone").then((r) => setPhone(r.data.phone || "+1234567890")).catch(() => {});
  }, []);

  if (!isAuthenticated && !isLoading) return null;

  return (
    <>
      <SideMenu />
      <VStack className="w-full min-h-screen items-stretch">
        <Box className={`${style.main} bg-[#F4F3F4] dark:bg-[#1C1E1C] p-6`} as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Text className="text-2xl font-bold mb-4 text-[#103E36] dark:text-[#F4F3F4]">{t("onCall.title")}</Text>
          <Divider className="mb-6 border-[#1F6A5C]/20 dark:border-white/20" />
          <Box className="p-6 rounded-lg bg-white dark:bg-[#1E2128] border border-[#1F6A5C]/20 dark:border-white/20 max-w-[560px] mb-6">
            <Text className="mb-5 text-[#103E36] dark:text-[#F4F3F4]/65 leading-relaxed">
              {t("onCall.desc")}
            </Text>
            <Button as="a" href={`tel:${phone.replace(/\s/g, "")}`} target="_blank" rel="noopener" size="lg" className="bg-brand-primary text-white hover:bg-brand-primaryDark">
              {t("onCall.callButton")}
            </Button>
            <Text className="mt-4 text-sm text-[#1F6A5C]/70 dark:text-[#1F6A5C]/60">
              {t("onCall.phoneNote")}
            </Text>
          </Box>
          <Box className="p-6 rounded-lg bg-white dark:bg-[#1E2128] border border-[#1F6A5C]/20 dark:border-white/20 max-w-[560px]">
            <Text className="font-semibold mb-2 text-[#103E36] dark:text-[#F4F3F4]">{t("onCall.schedulesTitle")}</Text>
            <Text className="text-sm text-[#1F6A5C] dark:text-[#1F6A5C]/60">{t("onCall.schedulesDesc")}</Text>
          </Box>
        </Box>
      </VStack>
    </>
  );
}
