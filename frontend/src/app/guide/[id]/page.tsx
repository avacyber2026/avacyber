"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { VStack, Box, Text, Divider, Button } from "@/ui";
import { SideMenu } from "@/Components";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import style from "@/styles/Report.module.css";
import { useLanguage } from "@/contexts/LanguageContext";
import { useColorMode } from "@/contexts/ThemeContext";
import api from "@/lib/axios";
import { sanitizeGuideHtml } from "@/lib/sanitizeGuideHtml";
import contentStyles from "@/styles/GuideContent.module.css";

type Article = {
  id: number;
  title: string;
  bodyHtml: string;
  createdAt: string;
  updatedAt: string;
};

export default function GuideArticlePage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const { colorMode } = useColorMode();
  const { isAuthenticated, isLoading } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [safeHtml, setSafeHtml] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const idParam = params?.id;
  const id = typeof idParam === "string" ? Number.parseInt(idParam, 10) : NaN;

  useEffect(() => {
    if (!isAuthenticated && !isLoading) router.push("/");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || !Number.isFinite(id) || id < 1) {
      if (isAuthenticated && (!Number.isFinite(id) || id < 1)) {
        setLoading(false);
        setNotFound(true);
      }
      return;
    }
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    api
      .get<Article>(`/guide-articles/${id}`)
      .then((r) => {
        if (!cancelled) {
          setArticle(r.data);
          setSafeHtml(sanitizeGuideHtml(r.data.bodyHtml));
        }
      })
      .catch((err) => {
        if (!cancelled && err?.response?.status === 404) setNotFound(true);
        else if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, id]);

  if (!isAuthenticated && !isLoading) return null;

  const textColor = colorMode === "dark" ? "text-[#F4F3F4]" : "text-[#103E36]";
  const labelColor = colorMode === "dark" ? "text-[#1F6A5C]/60" : "text-[#1F6A5C]";

  return (
    <>
      <SideMenu />
      <VStack className="w-full min-h-screen items-stretch">
        <Box className={`${style.main} bg-[#F4F3F4] dark:bg-[#131C18] p-6`} as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Button as={Link} href="/guide" variant="ghost" size="sm" className="mb-4 -ml-2 text-[#1F6A5C] dark:text-[#50BFA0]">
            {t("guide.backToList")}
          </Button>

          {loading ? (
            <Text className={labelColor}>{t("common.loading")}</Text>
          ) : notFound || !article ? (
            <Text className={labelColor}>{t("guide.articleNotFound")}</Text>
          ) : (
            <>
              <Text className={`text-2xl font-bold mb-2 ${textColor}`}>{article.title}</Text>
              <Text className={`text-xs mb-6 ${labelColor}`}>
                {t("admin.guideUpdated")}: {new Date(article.updatedAt).toLocaleString()}
              </Text>
              <Divider className="mb-6 border-[#1F6A5C]/20 dark:border-white/20" />
              {safeHtml ? (
                <Box
                  className={`${contentStyles.articleBody} max-w-3xl ${textColor}`}
                  dangerouslySetInnerHTML={{ __html: safeHtml }}
                />
              ) : (
                <Text className={`${labelColor} text-sm italic`}>—</Text>
              )}
            </>
          )}
        </Box>
      </VStack>
    </>
  );
}
