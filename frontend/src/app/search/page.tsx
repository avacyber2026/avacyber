"use client";

import { Suspense, useEffect, useState } from "react";
import { VStack, Box, Text, Input, InputGroup, InputLeftElement, HStack, Badge, Divider } from "@/ui";
import Link from "next/link";
import { SideMenu } from "@/Components";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import { motion } from "framer-motion";
import style from "@/styles/Report.module.css";
import { useLanguage } from "@/contexts/LanguageContext";
import { FiSearch } from "react-icons/fi";

interface SearchResult {
  type: "report" | "ticket";
  id: string;
  title: string;
  subtitle?: string;
  link: string;
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const { isAuthenticated, isLoading } = useAuth();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) router.push("/");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const q = searchParams.get("q") || "";
    setQuery(q);
    if (!q.trim() || !isAuthenticated) {
      setResults([]);
      return;
    }
    setLoading(true);
    const trimmed = q.trim().toLowerCase();
    Promise.all([
      api.get("/reports").catch(() => ({ data: [] })),
      api.get("/tickets").catch(() => ({ data: [] })),
    ])
      .then(([reportsRes, ticketsRes]) => {
        const reports = reportsRes.data || [];
        const tickets = ticketsRes.data || [];
        const reportResults: SearchResult[] = reports
          .filter(
            (r: { id?: string; subject?: string; description?: string; fromUser?: string }) =>
              (r.id && r.id.toLowerCase().includes(trimmed)) ||
              (r.subject && r.subject.toLowerCase().includes(trimmed)) ||
              (r.description && String(r.description || "").toLowerCase().includes(trimmed)) ||
              (r.fromUser && r.fromUser.toLowerCase().includes(trimmed))
          )
          .map((r: { id: string; subject: string; description?: string }) => ({
            type: "report" as const,
            id: r.id,
            title: r.subject,
            subtitle: r.description ? String(r.description).slice(0, 80) + "…" : undefined,
            link: "/report",
          }));
        const ticketResults: SearchResult[] = tickets
          .filter(
            (tkt: { id?: number; title?: string; text?: string; fromUser?: string; createdBy?: string; assignedTo?: string }) =>
              (tkt.title && String(tkt.title).toLowerCase().includes(trimmed)) ||
              (tkt.text && String(tkt.text).toLowerCase().includes(trimmed)) ||
              (tkt.id && String(tkt.id).includes(trimmed)) ||
              (tkt.fromUser && tkt.fromUser.toLowerCase().includes(trimmed)) ||
              (tkt.createdBy && tkt.createdBy.toLowerCase().includes(trimmed)) ||
              (tkt.assignedTo && tkt.assignedTo.toLowerCase().includes(trimmed))
          )
          .map((tkt: { id: number; title: string; text?: string }) => ({
            type: "ticket" as const,
            id: String(tkt.id),
            title: tkt.title || `#${tkt.id}`,
            subtitle: tkt.text ? String(tkt.text).slice(0, 80) + "…" : undefined,
            link: "/tickets",
          }));
        setResults([...reportResults, ...ticketResults]);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [searchParams, isAuthenticated]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  if (!isAuthenticated && !isLoading) return null;

  return (
    <>
      <SideMenu />
      <VStack className="w-full min-h-screen" align="stretch">
        <Box className={`${style.main} bg-[#F4F3F4] dark:bg-[#1C1E1C] p-6`} as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Text fontSize="2xl" fontWeight={700} className="mb-4 text-[#103E36] dark:text-[#F4F3F4]">
            {t("common.searchTitle")}
          </Text>
          <Divider className="mb-6 border-[#1F6A5C]/20 dark:border-white/20" />
          <form onSubmit={handleSearch} className="mb-6">
            <InputGroup size="lg" className="max-w-[400px]">
              <InputLeftElement className="text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 pointer-events-none">
                <FiSearch size={18} />
              </InputLeftElement>
              <Input
                placeholder={t("common.searchPlaceholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 bg-white dark:bg-[#1E2128] border-[#1F6A5C]/20 dark:border-white/20"
              />
            </InputGroup>
          </form>
          {loading ? (
            <Text className="text-[#F4F3F4]/55 dark:text-[#F4F3F4]/55">{t("profile.loading")}</Text>
          ) : results.length > 0 ? (
            <VStack align="stretch" spacing={3}>
              {results.map((r) => (
                <Link key={`${r.type}-${r.id}`} href={r.link}>
                  <Box
                    className="p-4 rounded-lg bg-white dark:bg-[#1E2128] border border-[#1F6A5C]/20 dark:border-white/20 hover:border-brand-primary hover:shadow-sm transition-colors"
                  >
                    <HStack justify="between" className="mb-1">
                      <Text fontWeight={600}>{r.title}</Text>
                      <Badge colorScheme={r.type === "report" ? "green" : "blue"} size="sm">
                        {r.type === "report" ? "Report" : "Ticket"}
                      </Badge>
                    </HStack>
                    {r.subtitle && <Text fontSize="sm" className="text-[#1C1E1C]/60 dark:text-[#F4F3F4]/55 line-clamp-2">{r.subtitle}</Text>}
                    <Text fontSize="xs" className="text-[#F4F3F4]/45 dark:text-[#F4F3F4]/45">ID: {r.id}</Text>
                  </Box>
                </Link>
              ))}
            </VStack>
          ) : query.trim() ? (
            <Text className="text-[#F4F3F4]/55 dark:text-[#F4F3F4]/55">{t("common.noResults")}</Text>
          ) : (
            <Text className="text-[#F4F3F4]/55 dark:text-[#F4F3F4]/55">{t("common.enterQuery")}</Text>
          )}
        </Box>
      </VStack>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <>
        <SideMenu />
        <VStack className="w-full min-h-screen justify-center"><Text className="text-[#F4F3F4]/55 dark:text-[#F4F3F4]/55">...</Text></VStack>
      </>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
