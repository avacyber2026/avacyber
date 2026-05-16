"use client";

import { Suspense } from "react";
import style from "@/styles/Tickets.module.css";
import { Stack, VStack, Divider, Text } from "@/ui";
import { motion } from "framer-motion";
import { SideMenu, TicketsSimple } from "@/Components";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

function TicketsLoadingFallback() {
  const { t } = useLanguage();
  return <div className="flex items-center justify-center min-h-screen">{t("common.loading")}</div>;
}

function TicketsPageContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isAuthenticated, isLoading } = useAuth();
  if (!isLoading && !isAuthenticated) {
    router.push("/");
    return null;
  }

  return (
    <>
      <main>
        <VStack className="w-full min-h-screen">
          <SideMenu />
          <Stack
            className={`${style.main} bg-[#F4F3F4] dark:bg-[#1C1E1C] p-6`}
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Divider className="my-4 border-[#1F6A5C]/20 dark:border-white/20" />
            <div className={style.container}>
              <TicketsSimple />
            </div>
          </Stack>
        </VStack>
      </main>
    </>
  );
}

export default function TicketsPage() {
  return (
    <Suspense fallback={<TicketsLoadingFallback />}>
      <TicketsPageContent />
    </Suspense>
  );
}
