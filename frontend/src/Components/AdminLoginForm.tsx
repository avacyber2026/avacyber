"use client";

import { useToast } from "@/hooks/useToast";
import { Box, VStack, Button, Input, Text } from "@/ui";
import { useState } from "react";
import Link from "next/link";
import PasswordInput from "./PasswordInput";
import adminApi from "@/lib/adminApi";
import { setAdminAuthCookie } from "@/lib/authCookies";
import styles from "@/styles/Auth.module.css";
import { useLanguage } from "@/contexts/LanguageContext";

const inputStyles = "w-full h-[52px] !rounded-[18px] border border-gray-200 bg-white text-[15px] placeholder-gray-400 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 focus:outline-none";

interface AdminLoginFormProps {
  onSuccess: () => void;
}

export function AdminLoginForm({ onSuccess }: AdminLoginFormProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast({ title: t("admin.enterUserPass"), status: "warning", duration: 3000 });
      return;
    }
    setLoading(true);
    try {
      const { data } = await adminApi.post("/auth/admin-login", { username: username.trim(), password });
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("status");
        localStorage.removeItem("user");
        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("adminUser", JSON.stringify(data.user));
        setAdminAuthCookie(data.token);
      }
      toast({ title: t("admin.signedIn"), status: "success", duration: 2000 });
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? t("admin.loginFailed");
      toast({ title: msg, status: "error", duration: 4000 });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="authPageRoot min-h-screen">
      <main className={styles.root}>
        <div className={styles.bg} aria-hidden />
        <div className={styles.orb + " " + styles.orb1} aria-hidden />
        <div className={styles.orb + " " + styles.orb2} aria-hidden />
        <div className={styles.orb + " " + styles.orb3} aria-hidden />

        <Box className={styles.card} as="form" onSubmit={handleSubmit}>
          <Text className={styles.title}>AVA-CYBER</Text>
          <Text className={styles.subtitle} fontWeight={600} style={{ color: "#5b7c9a" }}>
            {t("admin.panel")}
          </Text>

          <VStack as="div" className={styles.form} align="stretch" spacing={4}>
            <div className={styles.fieldGroup}>
              <Input
                placeholder={t("admin.username")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputStyles}
              />
            </div>
            <div className={styles.fieldGroup}>
              <PasswordInput
                placeholder={t("admin.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputStyles}
              />
            </div>
            <Button
              type="submit"
              className="w-full min-w-0 h-[52px] !rounded-[18px] bg-brand-primary text-white text-[15px] font-semibold"
              isLoading={loading}
            >
              {t("admin.signIn")}
            </Button>
          </VStack>
        </Box>
      </main>

      <Box
        className="authPageFooter fixed bottom-0 left-0 right-0 py-3 px-4 bg-white/90 border-t border-gray-200 text-center text-sm text-gray-600 z-[5]"
      >
        {t("admin.adminOnlyNote")}{" "}
        <Link href="/" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "underline" }}>
          {t("admin.mainPageLink")}
        </Link>
        .
      </Box>
    </div>
  );
}
