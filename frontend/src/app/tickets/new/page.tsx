"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import style from "@/styles/Tickets.module.css";
import { Stack, VStack, Text } from "@/ui";
import { motion } from "framer-motion";
import { SideMenu, IncidentCreateForm, SocIncidentCreateForm, BackToIncidentsLink } from "@/Components";
import { useAuth } from "@/hooks/useAuth";
import { CREATOR_ROLES } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";

function TicketsNewLoadingFallback() {
  const { t } = useLanguage();
  return <div className="flex items-center justify-center min-h-screen">{t("common.loading")}</div>;
}

function NewIncidentContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isAuthenticated, isLoading, role } = useAuth();
  const useSocForm = role != null && CREATOR_ROLES.includes(role);

  if (!isLoading && !isAuthenticated) {
    router.push("/");
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
          <Text fontSize="2xl" fontWeight={700} className="text-gray-800 dark:text-gray-100">
            {t("tickets.newIncident")}
          </Text>
        </div>
        <div className={style.container}>
          {useSocForm ? (
            <SocIncidentCreateForm onSuccess={() => router.push("/tickets")} />
          ) : (
            <IncidentCreateForm onSuccess={() => router.push("/tickets")} />
          )}
        </div>
      </Stack>
    </VStack>
  );
}

export default function NewIncidentPage() {
  return (
    <Suspense fallback={<TicketsNewLoadingFallback />}>
      <NewIncidentContent />
    </Suspense>
  );
}
