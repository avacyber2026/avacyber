"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VStack, Box, Text, Divider } from "@/ui";
import { SideMenu } from "@/Components";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import style from "@/styles/Report.module.css";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorMode } from "@/contexts/ThemeContext";
import api from "@/lib/axios";

type ArticleListItem = {
  id: number;
  title: string;
  excerpt: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function GuidePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { colorMode } = useColorMode();
  const { isAuthenticated, isLoading } = useAuth();
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) router.push("/");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setLoadingList(true);
    setLoadError(false);
    api
      .get<ArticleListItem[]>("/guide-articles")
      .then((r) => {
        if (!cancelled) setArticles(r.data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (!isAuthenticated && !isLoading) return null;

  const textColor = colorMode === "dark" ? "text-[#F4F3F4]" : "text-[#103E36]";
  const labelColor = colorMode === "dark" ? "text-[#1F6A5C]/60" : "text-[#1F6A5C]";
  const cardClass =
    "block rounded-xl p-5 border border-[#1F6A5C]/20 dark:border-white/15 bg-white dark:bg-[#1B2620] transition-shadow hover:shadow-md dark:hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.25)]";

  return (
    <>
      <SideMenu />
      <VStack className="w-full min-h-screen items-stretch">
        <Box className={`${style.main} bg-[#F4F3F4] dark:bg-[#131C18] p-6`} as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Text className={`text-2xl font-bold mb-2 ${textColor}`}>{t("guide.title")}</Text>
          <Text className={`text-sm mb-6 max-w-2xl ${labelColor}`}>{t("guide.intro")}</Text>
          <Divider className="mb-6 border-[#1F6A5C]/20 dark:border-white/20" />

          {loadError && (
            <Text className="text-red-600 dark:text-red-400 mb-4">{t("guide.loadError")}</Text>
          )}

          {loadingList ? (
            <Text className={labelColor}>{t("common.loading")}</Text>
          ) : articles.length === 0 ? (
            <Text className={labelColor}>{t("guide.noArticles")}</Text>
          ) : (
            <div className="grid gap-4 max-w-3xl">
              {articles.map((a) => (
                <Link key={a.id} href={`/guide/${a.id}`} className={cardClass}>
                  <Text className={`text-lg font-semibold mb-2 ${textColor}`}>{a.title}</Text>
                  {a.excerpt ? (
                    <Text className={`text-sm line-clamp-3 mb-3 ${labelColor}`}>{a.excerpt}</Text>
                  ) : null}
                  <Text className="text-sm font-medium text-[#1F6A5C] dark:text-[#50BFA0]">{t("guide.readMore")} →</Text>
                  <Text className={`text-xs mt-2 ${labelColor}`}>
                    {t("admin.guideUpdated")}: {new Date(a.updatedAt).toLocaleString()}
                  </Text>
                </Link>
              ))}
            </div>
          )}
        </Box>
      </VStack>
    </>
  );
}
