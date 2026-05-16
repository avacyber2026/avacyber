"use client";

import { useEffect } from "react";
import { VStack, Box, Text, Button, Divider } from "@/ui";
import { SideMenu } from "@/Components";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import style from "@/styles/Report.module.css";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorMode } from "@/contexts/ThemeContext";
import { FaPhone } from "react-icons/fa";

export default function HelpPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { colorMode } = useColorMode();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) router.push("/");
  }, [isAuthenticated, isLoading, router]);

  if (!isAuthenticated && !isLoading) return null;

  const textColor = colorMode === "dark" ? "text-[#F4F3F4]" : "text-[#103E36]";
  const labelColor = colorMode === "dark" ? "text-[#1F6A5C]/60" : "text-[#1F6A5C]";

  return (
    <>
      <SideMenu />
      <VStack className="w-full min-h-screen items-stretch">
        <Box className={`${style.main} bg-[#F4F3F4] dark:bg-[#131C18] p-6`} as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Text className={`text-2xl font-bold mb-4 ${textColor}`}>{t("help.title")}</Text>
          <Divider className="mb-6 border-[#1F6A5C]/20 dark:border-white/20" />

          <Box className="p-6 rounded-lg bg-white dark:bg-[#1B2620] border border-[#1F6A5C]/20 dark:border-white/20 mb-6 max-w-[700px]">
            <Text className={`mb-4 ${textColor}`}>{t("help.content")}</Text>
            <Button
              as={Link}
              href="/on-call"
              size="sm"
              leftIcon={<FaPhone size={14} />}
              className="bg-brand-primary text-white hover:bg-brand-primaryDark"
            >
              {t("help.onCallLink")}
            </Button>
          </Box>

          <Box className="p-6 rounded-lg bg-white dark:bg-[#1B2620] border border-[#1F6A5C]/20 dark:border-white/20 max-w-[700px]">
            <Text fontWeight={600} className={`mb-4 ${textColor}`}>{t("help.faqTitle")}</Text>
            <VStack align="stretch" spacing={4}>
              <Box>
                <Text fontWeight={600} className={`text-sm ${textColor}`}>{t("help.faq1Q")}</Text>
                <Text fontSize="sm" className={`mt-1 ${labelColor}`}>{t("help.faq1A")}</Text>
              </Box>
              <Box>
                <Text fontWeight={600} className={`text-sm ${textColor}`}>{t("help.faq2Q")}</Text>
                <Text fontSize="sm" className={`mt-1 ${labelColor}`}>{t("help.faq2A")}</Text>
              </Box>
              <Box>
                <Text fontWeight={600} className={`text-sm ${textColor}`}>{t("help.faq3Q")}</Text>
                <Text fontSize="sm" className={`mt-1 ${labelColor}`}>{t("help.faq3A")}</Text>
              </Box>
            </VStack>
          </Box>
        </Box>
      </VStack>
    </>
  );
}
