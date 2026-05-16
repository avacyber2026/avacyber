"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  VStack,
  Box,
  Text,
  Input,
  Button,
  Divider,
  FormControl,
  FormLabel,
} from "@/ui";
import { AdminSidebar } from "@/Components";
import { useToast } from "@/hooks/useToast";
import { useLanguage } from "@/contexts/LanguageContext";
import adminApi from "@/lib/adminApi";
import { clearAdminAuthCookie } from "@/lib/authCookies";
import { motion } from "framer-motion";
import style from "@/styles/Report.module.css";

export default function AdminSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [onCallPhone, setOnCallPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("adminToken");
    if (!token) {
      setIsAdmin(false);
      router.replace("/admin/auth");
      return;
    }
    setIsAdmin(true);
  }, [router]);

  useEffect(() => {
    if (!isAdmin) return;
    adminApi
      .get("/admin/settings")
      .then((r) => {
        setOnCallPhone(r.data.onCallPhone || "+1234567890");
      })
      .catch(() => {
        setOnCallPhone("+1234567890");
      })
      .finally(() => setLoading(false));
  }, [isAdmin]);

  function handleAdminLogout() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    clearAdminAuthCookie();
    router.push("/admin/auth");
  }

  function handleSave() {
    setSaving(true);
    adminApi
      .put("/admin/settings", { onCallPhone: onCallPhone.trim() || "+1234567890" })
      .then((r) => {
        setOnCallPhone(r.data.onCallPhone);
        toast({ title: t("admin.settingsSaved"), status: "success", duration: 3000 });
      })
      .catch(() => {
        toast({ title: t("admin.failedSaveSettings"), status: "error", duration: 4000 });
      })
      .finally(() => setSaving(false));
  }

  if (isAdmin === null) {
    return (
      <VStack className="w-full min-h-screen justify-center items-center bg-[#F4F3F4] dark:bg-[#131C18]">
        <Text className="text-gray-500">{t("common.loading")}</Text>
      </VStack>
    );
  }
  if (!isAdmin) {
    return (
      <VStack className="w-full min-h-screen justify-center items-center bg-[#F4F3F4] dark:bg-[#131C18]">
        <Text className="text-gray-500">{t("admin.redirectingLogin")}</Text>
      </VStack>
    );
  }

  return (
    <VStack className="w-full min-h-screen items-stretch">
      <AdminSidebar />
      <Box className={`${style.main} bg-[#F4F3F4] dark:bg-[#131C18] p-6 overflow-x-hidden`} as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Text className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
          {t("admin.settings")}
        </Text>
        <Divider className="border-gray-200 dark:border-white/20 mb-6" />

        {loading ? (
          <Text className="text-gray-500">{t("common.loading")}</Text>
        ) : (
          <Box className="w-full max-w-[480px] p-6 rounded-lg bg-white dark:bg-[#1B2620] border border-gray-200 dark:border-white/20">
            <FormControl className="mb-4">
              <FormLabel className="text-gray-700 dark:text-gray-300">
                {t("admin.onCallPhone")}
              </FormLabel>
              <Text fontSize="sm" className="text-gray-500 dark:text-gray-400 mb-2">
                {t("admin.onCallPhoneDesc")}
              </Text>
              <Input
                value={onCallPhone}
                onChange={(e) => setOnCallPhone(e.target.value)}
                placeholder={t("admin.onCallPhonePlaceholder")}
                className="h-[48px] rounded-lg"
              />
            </FormControl>
            <Button
              onClick={handleSave}
              isLoading={saving}
              className="bg-brand-primary text-white hover:bg-brand-primaryDark"
            >
              {t("profile.save")}
            </Button>
            <Divider className="my-4 border-gray-200 dark:border-white/20" />
            <Button variant="ghost" className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" onClick={handleAdminLogout}>
              {t("sidebar.logOut")}
            </Button>
          </Box>
        )}
      </Box>
    </VStack>
  );
}
