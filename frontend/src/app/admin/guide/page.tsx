"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  Badge,
  Table,
  TableContainer,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@/ui";
import { useToast } from "@/hooks/useToast";
import { useDisclosure } from "@/hooks/useDisclosure";
import { AdminSidebar } from "@/Components";
import adminApi from "@/lib/adminApi";
import { useLanguage } from "@/contexts/LanguageContext";
import style from "@/styles/Report.module.css";
import { motion } from "framer-motion";
import { GuideRichTextEditor, type GuideEditorHandle } from "@/Components/GuideRichTextEditor";

type Article = {
  id: number;
  title: string;
  bodyHtml: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

function escAttr(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function AdminGuidePage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const [editing, setEditing] = useState<Article | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftPublished, setDraftPublished] = useState(false);

  const editorRef = useRef<GuideEditorHandle>(null);
  const deleteIdRef = useRef<number | null>(null);
  const { isOpen: isDelOpen, onOpen: onDelOpen, onClose: onDelClose } = useDisclosure();
  const cancelDelRef = useRef<HTMLButtonElement>(null);
  const [deleting, setDeleting] = useState(false);

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

  async function load() {
    setLoading(true);
    try {
      const { data } = await adminApi.get<Article[]>("/admin/guide-articles");
      setArticles(data);
    } catch {
      toast({ title: t("admin.guideLoadError"), status: "error", duration: 4000 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin]);

  function openNew() {
    setEditing(null);
    setDraftTitle("");
    setDraftBody("<p></p>");
    setDraftPublished(false);
    onEditOpen();
  }

  function openEdit(a: Article) {
    setEditing(a);
    setDraftTitle(a.title);
    setDraftBody(a.bodyHtml || "<p></p>");
    setDraftPublished(a.published);
    onEditOpen();
  }

  function insertIntegrationBlock() {
    /* blockquote parses reliably in TipTap; arbitrary divs are stripped by the schema */
    const html = `<blockquote><p><strong>${escAttr(t("integrations.title"))}</strong></p><p><a href="/integrations">${escAttr(t("sidebar.integrations"))} →</a></p></blockquote>`;
    editorRef.current?.insertHtml(html);
  }

  async function saveArticle() {
    const title = draftTitle.trim();
    if (!title) {
      toast({ title: t("admin.guideTitleRequired"), status: "warning", duration: 3000 });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { data } = await adminApi.patch<Article>(`/admin/guide-articles/${editing.id}`, {
          title,
          bodyHtml: draftBody,
          published: draftPublished,
        });
        setArticles((prev) => prev.map((x) => (x.id === data.id ? data : x)));
        toast({ title: t("admin.guideSaved"), status: "success", duration: 2500 });
      } else {
        const { data } = await adminApi.post<Article>("/admin/guide-articles", {
          title,
          bodyHtml: draftBody,
          published: draftPublished,
        });
        setArticles((prev) => [data, ...prev]);
        toast({ title: t("admin.guideCreated"), status: "success", duration: 2500 });
      }
      onEditClose();
    } catch {
      toast({ title: t("admin.guideSaveError"), status: "error", duration: 4000 });
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(a: Article) {
    try {
      const { data } = await adminApi.patch<Article>(`/admin/guide-articles/${a.id}`, {
        published: !a.published,
      });
      setArticles((prev) => prev.map((x) => (x.id === data.id ? data : x)));
      toast({
        title: data.published ? t("admin.guideNowPublished") : t("admin.guideNowDraft"),
        status: "success",
        duration: 2500,
      });
    } catch {
      toast({ title: t("admin.guideSaveError"), status: "error", duration: 4000 });
    }
  }

  function confirmDelete(id: number) {
    deleteIdRef.current = id;
    onDelOpen();
  }

  async function doDelete() {
    const id = deleteIdRef.current;
    if (id == null) return;
    setDeleting(true);
    try {
      await adminApi.delete(`/admin/guide-articles/${id}`);
      setArticles((prev) => prev.filter((x) => x.id !== id));
      toast({ title: t("admin.guideDeleted"), status: "success", duration: 2500 });
      onDelClose();
    } catch {
      toast({ title: t("admin.guideDeleteError"), status: "error", duration: 4000 });
    } finally {
      setDeleting(false);
      deleteIdRef.current = null;
    }
  }

  if (isAdmin === false) return null;

  return (
    <>
      <AdminSidebar />
      <VStack className="w-full min-h-screen items-stretch">
        <Box
          className={`${style.main} bg-[#F4F3F4] dark:bg-[#1C1E1C] p-6`}
          as={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <HStack justify="space-between" align="start" spacing={4} className="mb-6 flex-wrap">
            <div>
              <Text className="text-2xl font-bold text-[#103E36] dark:text-[#F4F3F4]">{t("admin.userGuide")}</Text>
              <Text className="text-sm text-[#1F6A5C] dark:text-[#1F6A5C]/60 mt-1 max-w-xl">{t("admin.guideManageHint")}</Text>
            </div>
            <Button className="bg-brand-primary text-white hover:bg-brand-primaryDark" onClick={openNew}>
              {t("admin.guideNewArticle")}
            </Button>
          </HStack>

          <div className="rounded-xl border border-[#1F6A5C]/20 dark:border-white/15 bg-white dark:bg-[#1E2128] overflow-hidden">
            {loading ? (
              <Text className="p-8 text-[#1F6A5C]/70">{t("common.loading")}</Text>
            ) : articles.length === 0 ? (
              <Text className="p-8 text-[#1F6A5C]/70">{t("admin.guideEmptyList")}</Text>
            ) : (
              <TableContainer>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>{t("admin.guideTitle")}</Th>
                      <Th>{t("admin.status")}</Th>
                      <Th>{t("admin.guideUpdated")}</Th>
                      <Th className="!text-right whitespace-nowrap w-[1%]">{t("admin.actions")}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {articles.map((a) => (
                      <Tr key={a.id}>
                        <Td className="font-semibold max-w-[280px]">
                          {a.title}
                        </Td>
                        <Td>
                          <Badge colorScheme={a.published ? "green" : "gray"}>
                            {a.published ? t("admin.guideStatusPublished") : t("admin.guideStatusDraft")}
                          </Badge>
                        </Td>
                        <Td className="text-sm text-[#1F6A5C] dark:text-[#1F6A5C]/60 whitespace-nowrap">
                          {new Date(a.updatedAt).toLocaleString()}
                        </Td>
                        <Td className="!text-right whitespace-nowrap align-middle">
                          <HStack spacing={2} justify="flex-end" className="flex-nowrap">
                            <Button size="sm" variant="outline" onClick={() => togglePublished(a)}>
                              {a.published ? t("admin.guideUnpublish") : t("admin.guidePublish")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                              onClick={() => confirmDelete(a.id)}
                            >
                              {t("admin.guideDelete")}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openEdit(a)}>
                              {t("admin.guideEdit")}
                            </Button>
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </div>
        </Box>
      </VStack>

      <Modal isOpen={isEditOpen} onClose={onEditClose} size="xl">
        <ModalOverlay />
        <ModalContent className="dark:bg-[#1E2128] dark:text-[#F4F3F4] max-h-[90vh] w-[min(100vw-2rem,56rem)] max-w-[56rem]">
          <ModalHeader onClose={onEditClose}>{editing ? t("admin.guideEditArticle") : t("admin.guideNewArticle")}</ModalHeader>
          <ModalBody className="space-y-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
            <div>
              <Text className="text-sm font-medium mb-1.5">{t("admin.guideTitle")}</Text>
              <Input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} placeholder={t("admin.guideTitle")} />
            </div>
            <div>
              <HStack justify="space-between" align="center" spacing={2} className="flex-wrap mb-1.5">
                <Text className="text-sm font-medium">{t("admin.guideBody")}</Text>
                <Button size="sm" variant="outline" onClick={insertIntegrationBlock}>
                  {t("admin.guideInsertIntegration")}
                </Button>
              </HStack>
              <GuideRichTextEditor ref={editorRef} value={draftBody} onChange={setDraftBody} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={draftPublished}
                onChange={(e) => setDraftPublished(e.target.checked)}
                className="rounded border-[#1F6A5C]/25"
              />
              {t("admin.guidePublishedLabel")}
            </label>
          </ModalBody>
          <ModalFooter className="gap-2">
            <Button variant="ghost" onClick={onEditClose}>
              {t("profile.cancel")}
            </Button>
            <Button className="bg-brand-primary text-white" onClick={saveArticle} isLoading={saving}>
              {t("profile.save")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <AlertDialog isOpen={isDelOpen} leastDestructiveRef={cancelDelRef as React.RefObject<HTMLElement>} onClose={onDelClose}>
        <AlertDialogOverlay />
        <AlertDialogContent className="dark:bg-[#1E2128]">
          <AlertDialogHeader>{t("admin.guideDelete")}</AlertDialogHeader>
          <AlertDialogBody>{t("admin.guideDeleteConfirm")}</AlertDialogBody>
          <AlertDialogFooter className="gap-2">
            <Button ref={cancelDelRef} onClick={onDelClose}>
              {t("profile.cancel")}
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={doDelete}
              isLoading={deleting}
            >
              {t("admin.guideDelete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
