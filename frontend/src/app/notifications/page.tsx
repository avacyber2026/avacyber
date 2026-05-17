"use client";

import { useEffect, useState } from "react";
import { VStack, Box, Text, Button, Divider } from "@/ui";
import { SideMenu } from "@/Components";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/axios";
import { motion } from "framer-motion";
import style from "@/styles/Report.module.css";
import { useLanguage } from "@/contexts/LanguageContext";

interface Notif {
  id: number;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  ticketId?: number | null;
  reportId?: string | null;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isAuthenticated, isLoading } = useAuth();
  const [list, setList] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) router.push("/");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get("/notifications").then((r) => setList(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [isAuthenticated]);

  const markAllRead = () => {
    api.post("/notifications/read-all").then(() => {
      setList((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("notifications-read"));
    });
  };

  if (!isAuthenticated && !isLoading) return null;

  return (
    <>
      <SideMenu />
      <VStack className="w-full min-h-screen items-stretch">
        <Box className={`${style.main} bg-[#F4F3F4] dark:bg-[#1C1E1C] p-6`} as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Text className="text-2xl font-bold mb-4 text-[#1C1E1C] dark:text-white">{t("notifications.title")}</Text>
          <Divider className="mb-6 border-[#1F6A5C]/20 dark:border-white/20" />
          {loading ? (
            <Text>{t("common.loading")}</Text>
          ) : (
            <>
              {list.some((n) => !n.readAt) && <Button size="sm" className="mb-4" onClick={markAllRead}>{t("notifications.markAllRead")}</Button>}
              <VStack align="stretch" spacing={3}>
                {list.length === 0 ? (
                  <Text className="text-[#F4F3F4]/55 dark:text-[#F4F3F4]/55">{t("notifications.noNotifications")}</Text>
                ) : (
                  list.map((n) => (
                    <Box key={n.id} className={`p-4 rounded-lg bg-white dark:bg-[#1E2128] border border-[#1F6A5C]/20 dark:border-white/20 ${n.readAt ? "opacity-85" : ""}`}>
                      <Text className="font-semibold">{n.title}</Text>
                      <Text className="text-sm text-[#1C1E1C]/75 dark:text-[#F4F3F4]/75">{n.body}</Text>
                      <Text className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 mt-1">{new Date(n.createdAt).toLocaleString()}</Text>
                      {(n.ticketId != null && Number.isFinite(Number(n.ticketId))) || n.reportId ? (
                        <div className="mt-2 flex flex-wrap gap-3">
                          {n.ticketId != null && Number.isFinite(Number(n.ticketId)) ? (
                            <Link
                              href={`/tickets/${n.ticketId}`}
                              className="text-sm font-medium text-[#50BFA0] hover:underline"
                            >
                              {t("notifications.openTicket")} →
                            </Link>
                          ) : null}
                          {n.reportId ? (
                            <Link
                              href="/report"
                              className="text-sm font-medium text-[#3FFFA3] hover:underline"
                            >
                              {t("notifications.openReport")} →
                            </Link>
                          ) : null}
                        </div>
                      ) : null}
                    </Box>
                  ))
                )}
              </VStack>
            </>
          )}
        </Box>
      </VStack>
    </>
  );
}
