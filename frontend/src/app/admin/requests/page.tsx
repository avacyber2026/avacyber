"use client";

import style from "@/styles/Report.module.css";
import {
  Stack,
  VStack,
  Divider,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Badge,
  HStack,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Button,
  Flex,
  IconButton,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
} from "@/ui";
import { useToast } from "@/hooks/useToast";
import { useDisclosure } from "@/hooks/useDisclosure";
import { motion } from "framer-motion";
import { AdminSidebar } from "@/Components";
import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import adminApi from "@/lib/adminApi";
import { useLanguage } from "@/contexts/LanguageContext";
import { FiSearch, FiTrash2, FiEdit2 } from "react-icons/fi";

interface AdminTicket {
  id: number;
  title: string;
  text: string;
  status: string;
  priority: string;
  created_by: string;
  assigned_to: string;
  type: string;
  answer: string;
  created_at: string;
  siem_alert_id?: string | null;
}

const INCIDENT_STATUSES = ["New", "Active", "Resolved"] as const;
const INCIDENT_PRIORITIES = ["Low", "Medium", "High"] as const;
const INCIDENT_TYPES = [
  "Security Announcement",
  "Activity Verification",
  "Communication Channel",
] as const;

export default function AdminRequestsPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [createdByFilter, setCreatedByFilter] = useState<string>("all");
  const [assignedToFilter, setAssignedToFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterPreset, setFilterPreset] = useState<"none" | "today" | "7d" | "30d">("none");
  const [incidentPage, setIncidentPage] = useState(1);
  const [deleteTicketId, setDeleteTicketId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const INCIDENTS_PER_PAGE = 10;
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const [savingIncident, setSavingIncident] = useState(false);
  const [incidentDraft, setIncidentDraft] = useState<{
    id: number;
    title: string;
    text: string;
    status: string;
    priority: string;
    created_by: string;
    assigned_to: string;
    type: string;
    answer: string;
    siem_alert_id: string;
  } | null>(null);

  function openDeleteConfirm(ticketId: number) {
    setDeleteTicketId(ticketId);
    onDeleteOpen();
  }
  function closeDeleteConfirm() {
    setDeleteTicketId(null);
    onDeleteClose();
  }
  function openEditIncident(ticket: AdminTicket) {
    setIncidentDraft({
      id: ticket.id,
      title: ticket.title,
      text: ticket.text ?? "",
      status: ticket.status,
      priority: ticket.priority,
      created_by: ticket.created_by ?? "",
      assigned_to: ticket.assigned_to ?? "",
      type: ticket.type,
      answer: ticket.answer ?? "",
      siem_alert_id: ticket.siem_alert_id ?? "",
    });
    onEditOpen();
  }

  async function saveIncident() {
    if (!incidentDraft) return;
    if (!incidentDraft.title.trim()) {
      toast({ title: t("admin.incidentTitleRequired"), status: "warning", duration: 3000 });
      return;
    }
    setSavingIncident(true);
    try {
      const { data } = await adminApi.patch<AdminTicket>(`/admin/tickets/${incidentDraft.id}`, {
        title: incidentDraft.title.trim(),
        text: incidentDraft.text,
        status: incidentDraft.status,
        priority: incidentDraft.priority,
        created_by: incidentDraft.created_by.trim(),
        assigned_to: incidentDraft.assigned_to.trim(),
        type: incidentDraft.type,
        answer: incidentDraft.answer,
        siem_alert_id: incidentDraft.siem_alert_id.trim() || null,
      });
      setTickets((prev) => prev.map((x) => (x.id === data.id ? data : x)));
      toast({ title: t("admin.incidentSaved"), status: "success", duration: 3000 });
      onEditClose();
      setIncidentDraft(null);
    } catch {
      toast({ title: t("admin.incidentSaveError"), status: "error", duration: 4000 });
    } finally {
      setSavingIncident(false);
    }
  }

  async function confirmDeleteRequest() {
    if (deleteTicketId == null) return;
    setDeleting(true);
    try {
      await adminApi.delete(`/admin/tickets/${deleteTicketId}`);
      setTickets((prev) => prev.filter((t) => t.id !== deleteTicketId));
      toast({ title: t("admin.requestDeleted"), status: "success", duration: 3000 });
      closeDeleteConfirm();
    } catch {
      toast({ title: t("admin.failedDeleteRequest"), status: "error", duration: 4000 });
    } finally {
      setDeleting(false);
    }
  }

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
      .get("/admin/tickets")
      .then((r) => setTickets(r.data))
      .catch(() => toast({ title: t("admin.errorLoadingRequests"), status: "error", duration: 4000 }))
      .finally(() => setLoading(false));
  }, [isAdmin, toast]);

  const filteredTickets = useMemo(() => {
    let from = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0) : 0;
    let to = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : 0;
    if (filterPreset === "today") {
      const d = new Date();
      from = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
    } else if (filterPreset === "7d") {
      to = Date.now();
      from = to - 7 * 24 * 60 * 60 * 1000;
    } else if (filterPreset === "30d") {
      to = Date.now();
      from = to - 30 * 24 * 60 * 60 * 1000;
    }
    return tickets.filter((t) => {
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchText = t.text.toLowerCase().includes(q);
        const matchCreated = t.created_by.toLowerCase().includes(q);
        const matchAssigned = t.assigned_to.toLowerCase().includes(q);
        const matchId = String(t.id) === q || String(t.id).includes(q);
        if (!matchTitle && !matchText && !matchCreated && !matchAssigned && !matchId) return false;
      }
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (createdByFilter !== "all" && t.created_by !== createdByFilter) return false;
      if (assignedToFilter !== "all" && t.assigned_to !== assignedToFilter) return false;
      const created = t.created_at ? new Date(t.created_at).getTime() : 0;
      if (from && created < from) return false;
      if (to && created > to) return false;
      return true;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter, typeFilter, createdByFilter, assignedToFilter, dateFrom, dateTo, filterPreset]);

  const totalIncidents = filteredTickets.length;
  const totalPages = Math.max(1, Math.ceil(totalIncidents / INCIDENTS_PER_PAGE));
  const paginatedTickets = useMemo(() => {
    const page = Math.min(incidentPage, totalPages);
    const start = (page - 1) * INCIDENTS_PER_PAGE;
    return filteredTickets.slice(start, start + INCIDENTS_PER_PAGE);
  }, [filteredTickets, incidentPage, totalPages]);

  useEffect(() => {
    setIncidentPage(1);
  }, [searchQuery, statusFilter, priorityFilter, typeFilter, createdByFilter, assignedToFilter, dateFrom, dateTo, filterPreset]);

  const uniqueStatuses = useMemo(() => [...new Set(tickets.map((t) => t.status).filter(Boolean))].sort(), [tickets]);
  const uniquePriorities = useMemo(() => [...new Set(tickets.map((t) => t.priority).filter(Boolean))].sort(), [tickets]);
  const uniqueTypes = useMemo(() => [...new Set(tickets.map((t) => t.type).filter(Boolean))].sort(), [tickets]);
  const uniqueCreatedBy = useMemo(() => [...new Set(tickets.map((t) => t.created_by).filter(Boolean))].sort(), [tickets]);
  const uniqueAssignedTo = useMemo(() => [...new Set(tickets.map((t) => t.assigned_to).filter(Boolean))].sort(), [tickets]);

  const adminFilterPresetOptions = useMemo(
    () => [
      { value: "none", label: t("report.none") },
      { value: "today", label: t("report.today") },
      { value: "7d", label: t("report.last7days") },
      { value: "30d", label: t("report.last30days") },
    ],
    [t]
  );

  const statusFilterOptions = useMemo(
    () => [
      { value: "all", label: t("admin.allStatuses") },
      ...uniqueStatuses.map((s) => ({ value: s, label: s })),
    ],
    [t, uniqueStatuses]
  );

  const priorityFilterOptions = useMemo(
    () => [
      { value: "all", label: t("admin.allPriorities") },
      ...uniquePriorities.map((p) => ({ value: p, label: p })),
    ],
    [t, uniquePriorities]
  );

  const typeFilterOptions = useMemo(
    () => [
      { value: "all", label: t("admin.allTypes") },
      ...uniqueTypes.map((ty) => ({ value: ty, label: ty })),
    ],
    [t, uniqueTypes]
  );

  const createdByFilterOptions = useMemo(
    () => [
      { value: "all", label: t("admin.allReporters") },
      ...uniqueCreatedBy.map((e) => ({
        value: e,
        label: e.length > 24 ? `${e.slice(0, 24)}…` : e,
      })),
    ],
    [t, uniqueCreatedBy]
  );

  const assignedToFilterOptions = useMemo(
    () => [
      { value: "all", label: t("admin.allAssignees") },
      ...uniqueAssignedTo.map((e) => ({
        value: e,
        label: e.length > 24 ? `${e.slice(0, 24)}…` : e,
      })),
    ],
    [t, uniqueAssignedTo]
  );

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setTypeFilter("all");
    setCreatedByFilter("all");
    setAssignedToFilter("all");
    setDateFrom("");
    setDateTo("");
    setFilterPreset("none");
    setIncidentPage(1);
  }

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== "all" ||
    priorityFilter !== "all" ||
    typeFilter !== "all" ||
    createdByFilter !== "all" ||
    assignedToFilter !== "all" ||
    dateFrom !== "" ||
    dateTo !== "" ||
    filterPreset !== "none";

  if (isAdmin === null) {
    return (
      <VStack className="w-full min-h-screen justify-center items-center bg-[#F4F3F4] dark:bg-[#1C1E1C]">
        <Text className="text-[#F4F3F4]/55 dark:text-[#F4F3F4]/55">{t("common.loading")}</Text>
      </VStack>
    );
  }
  if (!isAdmin) {
    return (
      <VStack className="w-full min-h-screen justify-center items-center bg-[#F4F3F4] dark:bg-[#1C1E1C]">
        <Text className="text-[#F4F3F4]/55 dark:text-[#F4F3F4]/55">{t("admin.redirectingLogin")}</Text>
      </VStack>
    );
  }

  return (
    <VStack className="w-full min-h-screen items-stretch">
      <AdminSidebar />
      <Stack className={`${style.main} bg-[#F4F3F4] dark:bg-[#1C1E1C] overflow-x-hidden`} as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Text className="text-2xl font-semibold mb-4 text-[#103E36] dark:text-[#F4F3F4]">
          {t("admin.incidentLists")}
        </Text>
        <Divider className="border-[#1F6A5C]/20 dark:border-white/20 mb-4" />

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
        <VStack align="stretch" spacing={4} className="mb-4 p-4 bg-white dark:bg-[#1E2128] rounded-lg border border-[#1F6A5C]/20 dark:border-white/20 overflow-x-hidden">
          <Text className="text-sm font-semibold text-[#103E36] dark:text-[#F4F3F4]/80">
            {t("report.filters")}
          </Text>
          <Flex direction="row" align="center" wrap="wrap" className="flex-col md:flex-row gap-3 flex-wrap items-stretch md:items-center">
            <InputGroup size="sm" className="w-full md:w-[220px] shrink-0">
              <InputLeftElement>
                <FiSearch className="text-[#F4F3F4]/55 dark:text-[#F4F3F4]/55" size={16} />
              </InputLeftElement>
              <Input
                placeholder={t("admin.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </InputGroup>
            <Select
              size="sm"
              className="w-full md:w-[130px] min-w-[120px]"
              value={statusFilter}
              onChange={setStatusFilter}
              options={statusFilterOptions}
            />
            <Select
              size="sm"
              className="w-full md:w-[130px] min-w-[120px]"
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={priorityFilterOptions}
            />
            <Select
              size="sm"
              className="w-full md:w-[130px] min-w-[120px]"
              value={typeFilter}
              onChange={setTypeFilter}
              options={typeFilterOptions}
            />
            <Select
              size="sm"
              className="w-full md:w-[140px] min-w-[120px]"
              value={createdByFilter}
              onChange={setCreatedByFilter}
              options={createdByFilterOptions}
            />
            <Select
              size="sm"
              className="w-full md:w-[140px] min-w-[120px]"
              value={assignedToFilter}
              onChange={setAssignedToFilter}
              options={assignedToFilterOptions}
            />
            {hasActiveFilters && (
              <Button as={motion.button} size="sm" variant="outline" onClick={clearFilters} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                {t("report.resetFilters")}
              </Button>
            )}
          </Flex>
          <Flex direction="row" align="center" className="flex-col sm:flex-row gap-3 flex-wrap items-stretch sm:items-center">
            <Flex align="center" gap={2} className="w-full sm:w-auto">
              <Text as="span" className="text-sm whitespace-nowrap text-[#1F6A5C] dark:text-[#F4F3F4]/45 shrink-0">{t("report.presets")}</Text>
              <Select
                size="sm"
                className="w-full sm:w-[130px] min-w-0"
                value={filterPreset}
                onChange={(v) => setFilterPreset(v as "none" | "today" | "7d" | "30d")}
                options={adminFilterPresetOptions}
              />
            </Flex>
            <Flex align="center" gap={2} className="w-full sm:w-auto">
              <Text as="span" className="text-sm whitespace-nowrap w-[90px] shrink-0 text-[#1F6A5C] dark:text-[#F4F3F4]/45">{t("admin.createdFrom")}</Text>
              <Input type="date" size="sm" className="w-full sm:w-[150px] min-w-0" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setFilterPreset("none"); }} />
            </Flex>
            <Flex align="center" gap={2} className="w-full sm:w-auto">
              <Text as="span" className="text-sm whitespace-nowrap w-[90px] shrink-0 text-[#1F6A5C] dark:text-[#F4F3F4]/45">{t("admin.createdTo")}</Text>
              <Input type="date" size="sm" className="w-full sm:w-[150px] min-w-0" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setFilterPreset("none"); }} />
            </Flex>
          </Flex>
          {totalIncidents > 0 && (
            <Flex className="w-full justify-between items-center text-xs text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45">
              <span>
                {t("admin.showingIncidents")
                .replace("{from}", String((incidentPage - 1) * INCIDENTS_PER_PAGE + 1))
                .replace("{to}", String(Math.min(incidentPage * INCIDENTS_PER_PAGE, totalIncidents)))
                .replace("{total}", String(totalIncidents))}
              </span>
            </Flex>
          )}
        </VStack>
        </motion.div>

        {loading ? (
          <Text className="py-4">{t("common.loading")}</Text>
        ) : totalIncidents === 0 ? (
          <Text className="py-4 text-[#1C1E1C]/60 dark:text-[#F4F3F4]/55">
            {t("admin.noIncidentsFound")}
          </Text>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <TableContainer className="whitespace-normal overflow-x-auto max-w-full bg-white dark:bg-[#1E2128] rounded-lg border border-[#1F6A5C]/20 dark:border-white/20">
            <Table>
              <Thead>
                <Tr>
                  <Th>{t("admin.id")}</Th>
                  <Th>{t("admin.title")}</Th>
                  <Th>{t("admin.createdBy")}</Th>
                  <Th>{t("admin.assignedTo")}</Th>
                  <Th>{t("admin.type")}</Th>
                  <Th>{t("admin.status")}</Th>
                  <Th>{t("admin.priority")}</Th>
                  <Th>{t("admin.created")}</Th>
                  <Th>{t("admin.actions")}</Th>
                </Tr>
              </Thead>
              <Tbody>
                {paginatedTickets.map((ticket) => (
                  <Tr key={ticket.id} className="hover:bg-black/5 dark:hover:bg-white/5">
                    <Td>{ticket.id}</Td>
                    <Td className="max-w-[200px]">
                      <Text noOfLines={2}>{ticket.title}</Text>
                    </Td>
                    <Td>
                      <Text noOfLines={1} fontSize="xs">
                        {ticket.created_by}
                      </Text>
                    </Td>
                    <Td>
                      <Text noOfLines={1} fontSize="xs">
                        {ticket.assigned_to}
                      </Text>
                    </Td>
                    <Td>{ticket.type}</Td>
                    <Td>
                      <Badge colorScheme={ticket.status === "Resolved" ? "green" : "yellow"} size="sm">
                        {ticket.status}
                      </Badge>
                    </Td>
                    <Td>{ticket.priority}</Td>
                    <Td className="text-xs">{ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : ""}</Td>
                    <Td>
                      <HStack spacing={1} justify="flex-end" className="flex-nowrap">
                        <IconButton
                          aria-label={t("admin.editIncident")}
                          icon={<FiEdit2 />}
                          size="sm"
                          variant="ghost"
                          className="text-brand-primary hover:bg-brand-primary/10"
                          onClick={() => openEditIncident(ticket)}
                        />
                        <IconButton
                          aria-label={t("admin.deleteRequest")}
                          icon={<FiTrash2 />}
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => openDeleteConfirm(ticket.id)}
                        />
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
          {totalPages > 1 && (
          <HStack className="mt-4 gap-2 flex-wrap">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={incidentPage === p ? "solid" : "outline"}
                className={incidentPage === p ? "bg-brand-primary text-white" : ""}
                onClick={() => setIncidentPage(p)}
              >
                {p}
              </Button>
            ))}
          </HStack>
          )}
          </motion.div>
        )}

        <Modal
          isOpen={isEditOpen}
          onClose={() => {
            onEditClose();
            setIncidentDraft(null);
          }}
          size="xl"
        >
          <ModalContent className="dark:bg-[#1E2128] dark:text-[#F4F3F4] max-h-[92vh] w-full min-w-0 overflow-y-auto">
            <ModalHeader
              onClose={() => {
                onEditClose();
                setIncidentDraft(null);
              }}
            >
              {t("admin.editIncident")}
            </ModalHeader>
            <ModalBody className="space-y-3">
              <Text className="text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/45">{t("admin.editIncidentHint")}</Text>
              {incidentDraft ? (
                <>
                  <div>
                    <Text className="text-xs font-semibold mb-1">{t("admin.title")}</Text>
                    <Input
                      value={incidentDraft.title}
                      onChange={(e) =>
                        setIncidentDraft((d) => (d ? { ...d, title: e.target.value } : d))
                      }
                    />
                  </div>
                  <div>
                    <Text className="text-xs font-semibold mb-1">{t("admin.incidentDescription")}</Text>
                    <Textarea
                      rows={5}
                      value={incidentDraft.text}
                      onChange={(e) =>
                        setIncidentDraft((d) => (d ? { ...d, text: e.target.value } : d))
                      }
                      className="w-full rounded-lg border border-[#1F6A5C]/20 dark:border-white/20 bg-white dark:bg-[#1E2128] px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Text className="text-xs font-semibold mb-1">{t("admin.createdBy")}</Text>
                      <Input
                        value={incidentDraft.created_by}
                        onChange={(e) =>
                          setIncidentDraft((d) => (d ? { ...d, created_by: e.target.value } : d))
                      }
                        placeholder="email@…"
                      />
                    </div>
                    <div>
                      <Text className="text-xs font-semibold mb-1">{t("admin.assignedTo")}</Text>
                      <Input
                        value={incidentDraft.assigned_to}
                        onChange={(e) =>
                          setIncidentDraft((d) => (d ? { ...d, assigned_to: e.target.value } : d))
                      }
                        placeholder="email or GRC / IAM / Pentesting"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Text className="text-xs font-semibold mb-1">{t("admin.status")}</Text>
                      <Select
                        value={incidentDraft.status}
                        onChange={(v) =>
                          setIncidentDraft((d) => (d ? { ...d, status: v } : d))
                        }
                        options={INCIDENT_STATUSES.map((s) => ({ value: s, label: s }))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Text className="text-xs font-semibold mb-1">{t("admin.priority")}</Text>
                      <Select
                        value={incidentDraft.priority}
                        onChange={(v) =>
                          setIncidentDraft((d) => (d ? { ...d, priority: v } : d))
                        }
                        options={INCIDENT_PRIORITIES.map((p) => ({ value: p, label: p }))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Text className="text-xs font-semibold mb-1">{t("admin.type")}</Text>
                      <Select
                        value={incidentDraft.type}
                        onChange={(v) =>
                          setIncidentDraft((d) => (d ? { ...d, type: v } : d))
                        }
                        options={INCIDENT_TYPES.map((ty) => ({ value: ty, label: ty }))}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <Text className="text-xs font-semibold mb-1">{t("admin.incidentResponse")}</Text>
                    <Textarea
                      rows={3}
                      value={incidentDraft.answer}
                      onChange={(e) =>
                        setIncidentDraft((d) => (d ? { ...d, answer: e.target.value } : d))
                      }
                      className="w-full rounded-lg border border-[#1F6A5C]/20 dark:border-white/20 bg-white dark:bg-[#1E2128] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <Text className="text-xs font-semibold mb-1">{t("admin.siemAlertIdAdmin")}</Text>
                    <Input
                      value={incidentDraft.siem_alert_id}
                      onChange={(e) =>
                        setIncidentDraft((d) => (d ? { ...d, siem_alert_id: e.target.value } : d))
                      }
                      placeholder="—"
                    />
                  </div>
                </>
              ) : null}
            </ModalBody>
            <ModalFooter className="gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  onEditClose();
                  setIncidentDraft(null);
                }}
              >
                {t("profile.cancel")}
              </Button>
              <Button className="bg-brand-primary text-white" onClick={saveIncident} isLoading={savingIncident}>
                {t("profile.save")}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <AlertDialog
          isOpen={isDeleteOpen}
          leastDestructiveRef={cancelRef as React.RefObject<HTMLElement>}
          onClose={closeDeleteConfirm}
        >
          <AlertDialogHeader>{t("admin.deleteRequest")}</AlertDialogHeader>
          <AlertDialogBody>
            {t("admin.deleteRequestConfirm")}
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={closeDeleteConfirm}>
              {t("profile.cancel")}
            </Button>
            <Button className="bg-red-600 text-white hover:bg-red-700 ml-3" onClick={confirmDeleteRequest} isLoading={deleting}>
              {t("admin.remove")}
            </Button>
          </AlertDialogFooter>
        </AlertDialog>
      </Stack>
    </VStack>
  );
}
