"use client";

import { useEffect, useState, useCallback } from "react";
import { Input, Box, Text, VStack, Badge, HStack, Drawer, DrawerContent } from "@/ui";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { FiSearch, FiX } from "react-icons/fi";
import api from "@/lib/axios";

interface SearchResult {
  type: "report" | "ticket";
  id: string;
  title: string;
  subtitle?: string;
  link: string;
}

/** Sidebar: no box border/bg on the field — blends with glass panel */
export function GlobalSearchBar({ embedded = false }: { embedded?: boolean }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const search = useCallback(
    (q: string) => {
      const trimmed = q.trim().toLowerCase();
      if (!trimmed) {
        setResults([]);
        return;
      }
      setLoading(true);
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
            .slice(0, 8)
            .map((r: { id: string; subject: string; description?: string }) => ({
              type: "report" as const,
              id: r.id,
              title: r.subject,
              subtitle: r.description ? String(r.description).slice(0, 80) + "…" : undefined,
              link: "/report",
            }));
          const ticketResults: SearchResult[] = tickets
            .filter(
              (tkt: { id?: number; title?: string; text?: string; fromUser?: string }) =>
                (tkt.title && String(tkt.title).toLowerCase().includes(trimmed)) ||
                (tkt.text && String(tkt.text).toLowerCase().includes(trimmed)) ||
                (tkt.id && String(tkt.id).includes(trimmed)) ||
                (tkt.fromUser && tkt.fromUser.toLowerCase().includes(trimmed))
            )
            .slice(0, 8)
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
    },
    []
  );

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim() && !isOpen) {
      setIsOpen(true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
  };

  const handleNavigate = (link: string) => {
    handleClose();
    router.push(link);
  };

  const fieldClass = embedded
    ? "w-full pl-8 pr-2 py-2 text-sm rounded-lg bg-transparent border-0 text-slate-800 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-0 focus:border-0 shadow-none"
    : "w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-gray-200 dark:border-white/15 bg-white dark:bg-[#232522] text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary";

  return (
    <>
      <div className="w-full relative">
        <FiSearch
          size={embedded ? 16 : 14}
          className={`absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none ${embedded ? "text-slate-500 dark:text-gray-400" : "text-gray-400"}`}
        />
        <input
          type="text"
          className={fieldClass}
          placeholder={t("common.searchPlaceholder")}
          value={query}
          onChange={handleChange}
          onFocus={() => { if (query.trim()) setIsOpen(true); }}
        />
      </div>

      <Drawer isOpen={isOpen} onClose={handleClose} placement="right">
        <DrawerContent maxW="380px" className="shadow-xl">
          <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-white/10">
            <FiSearch size={18} className="text-gray-400 shrink-0" />
            <Input
              size="sm"
              className="flex-1"
              placeholder={t("common.searchPlaceholder")}
              value={query}
              onChange={handleChange}
              autoFocus
            />
            <button onClick={handleClose} className="p-1 rounded-md cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10">
              <FiX size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <Text className="text-sm text-gray-500">{t("common.loading")}</Text>
            ) : results.length > 0 ? (
              <VStack align="stretch" spacing={2}>
                {results.map((r) => (
                  <Box
                    key={`${r.type}-${r.id}`}
                    as="button"
                    onClick={() => handleNavigate(r.link)}
                    className="p-3 rounded-lg cursor-pointer bg-gray-50 dark:bg-white/5 border border-transparent hover:border-brand-primary hover:bg-brand-primary/5 dark:hover:bg-brand-primary/10 text-left w-full transition-colors"
                  >
                    <HStack justify="between" className="mb-1">
                      <Text className="font-medium text-sm">{r.title}</Text>
                      <Badge colorScheme={r.type === "report" ? "green" : "blue"} size="sm">
                        {r.type === "report" ? "Report" : "Ticket"}
                      </Badge>
                    </HStack>
                    {r.subtitle && <Text className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{r.subtitle}</Text>}
                    <Text className="text-xs text-gray-400 mt-1">ID: {r.id}</Text>
                  </Box>
                ))}
              </VStack>
            ) : query.trim() ? (
              <Text className="text-sm text-gray-500">{t("common.noResults")}</Text>
            ) : (
              <Text className="text-sm text-gray-500">{t("common.enterQuery")}</Text>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
