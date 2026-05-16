"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { VStack, Text } from "@/ui";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AdminPage() {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.replace("/admin/auth");
    } else {
      router.replace("/admin/requests");
    }
  }, [router]);

  return (
    <VStack className="w-full min-h-screen justify-center items-center bg-[#F4F3F4] dark:bg-[#131C18]">
      <Text className="text-gray-500">{t("common.loading")}</Text>
    </VStack>
  );
}
