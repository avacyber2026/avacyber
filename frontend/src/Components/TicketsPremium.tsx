"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import style from "@/styles/Tickets.module.css";
import { IoChevronDown } from "react-icons/io5";
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Divider,
  Box,
  Input,
  Select,
  Text,
  SimpleGrid,
  Wrap,
  WrapItem,
  HStack,
  VStack,
  Progress,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from "@/ui";
import { useToast } from "@/hooks/useToast";
import { motion } from "framer-motion";
import { ButtonDownloadExcel } from "./DownloadExcel";
import { IncidentLogCard } from "./IncidentLogCard";
import { EndUserCombobox } from "./EndUserCombobox";
import api from "@/lib/axios";
import type { EndUserOption } from "@/lib/endUserDisplay";
import { normalizeEndUsersResponse } from "@/lib/endUserDisplay";
import { useRole } from "@/hooks/useRole";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Ticket } from "@/types";

const RECIPIENT_TEAMS = ["GRC", "Pentesting", "IAM"] as const;
type RecipientTo = "User" | (typeof RECIPIENT_TEAMS)[number];

function getRecipient(t: Ticket): string {
  return t.assignedTo ?? t.fromUser;
}

function isTeamRecipient(r: string): boolean {
  return RECIPIENT_TEAMS.includes(r as (typeof RECIPIENT_TEAMS)[number]);
}

const getTickets = () => api.get("/tickets").then((r) => r.data);
const createTicketReq = (data: {
  toWhom: string;
  user?: string;
  type: string;
  subject: string;
  description: string;
  priority: string;
  siemAlertId?: string;
}) => api.post("/tickets", data).then((r) => r.data);
const getEndUsers = () => api.get("/users/end-users").then((r) => r.data);

export interface TicketsPremiumProps {
  /** When true, render only the Incident Log content (no New Incident / Incident Log tabs). Used when embedded in /tickets page. */
  onlyLog?: boolean;
}

export function TicketsPremium({ onlyLog = false }: TicketsPremiumProps = {}) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useLanguage();
  const role = useRole();
  const status = role ?? "";
  const [loading, setLoading] = useState(false);
  const [recipientTo, setRecipientTo] = useState<RecipientTo | "">("");
  const [type, setType] = useState("");
  const [user, setUser] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");
  const [siemAlertId, setSiemAlertId] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [endUsers, setEndUsers] = useState<EndUserOption[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterPreset, setFilterPreset] = useState<"none" | "today" | "7d" | "30d">("none");
  const [filterSender, setFilterSender] = useState("");
  const [filterRecipient, setFilterRecipient] = useState("");
  const [incidentPage, setIncidentPage] = useState(1);
  const [analyticsDateFrom, setAnalyticsDateFrom] = useState("");
  const [analyticsDateTo, setAnalyticsDateTo] = useState("");
  const [analyticsStatus, setAnalyticsStatus] = useState("");

  const INCIDENTS_PER_PAGE = 10;

  const stats = useMemo(() => {
    const byRecipient: Record<string, number> = { User: 0, GRC: 0, IAM: 0, Pentesting: 0 };
    tickets.forEach((t) => {
      const r = getRecipient(t);
      if (isTeamRecipient(r)) byRecipient[r] = (byRecipient[r] ?? 0) + 1;
      else byRecipient.User = (byRecipient.User ?? 0) + 1;
    });
    return byRecipient;
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    let from = filterDateFrom ? new Date(filterDateFrom).setHours(0, 0, 0, 0) : 0;
    let to = filterDateTo ? new Date(filterDateTo).setHours(23, 59, 59, 999) : 0;
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
      const created = t.createdAt ? new Date(t.createdAt).getTime() : 0;
      if (from && created < from) return false;
      if (to && created > to) return false;
      if (filterSender && (t.createdBy ?? "") !== filterSender) return false;
      if (filterRecipient && getRecipient(t) !== filterRecipient) return false;
      return true;
    });
  }, [tickets, filterDateFrom, filterDateTo, filterPreset, filterSender, filterRecipient]);

  const totalIncidents = filteredTickets.length;
  const totalPages = Math.max(1, Math.ceil(totalIncidents / INCIDENTS_PER_PAGE));
  const paginatedTickets = useMemo(() => {
    const page = Math.min(incidentPage, totalPages);
    const start = (page - 1) * INCIDENTS_PER_PAGE;
    return filteredTickets.slice(start, start + INCIDENTS_PER_PAGE);
  }, [filteredTickets, incidentPage, totalPages]);

  useEffect(() => {
    setIncidentPage(1);
  }, [filterDateFrom, filterDateTo, filterPreset, filterSender, filterRecipient]);

  const uniqueSenders = useMemo(
    () => [...new Set(tickets.map((t) => t.createdBy).filter((x): x is string => Boolean(x)))].sort(),
    [tickets]
  );
  const uniqueRecipients = useMemo(
    () => [...new Set(tickets.map(getRecipient).filter((x): x is string => Boolean(x)))].sort(),
    [tickets]
  );

  const filterPresetOptions = useMemo(
    () => [
      { value: "none", label: t("report.none") },
      { value: "today", label: t("report.today") },
      { value: "7d", label: t("report.last7days") },
      { value: "30d", label: t("report.last30days") },
    ],
    [t]
  );

  const filterSenderOptions = useMemo(
    () => [
      { value: "", label: "Created By" },
      ...uniqueSenders.map((s) => ({
        value: s,
        label: s.length > 28 ? `${s.slice(0, 28)}…` : s,
      })),
    ],
    [uniqueSenders]
  );

  const filterRecipientOptions = useMemo(
    () => [
      { value: "", label: "Assigned To" },
      ...uniqueRecipients.map((r) => ({
        value: r,
        label: r.length > 28 ? `${r.slice(0, 28)}…` : r,
      })),
    ],
    [uniqueRecipients]
  );

  const analyticsStatusOptions = useMemo(
    () => [
      { value: "", label: "All statuses" },
      { value: "New", label: "New" },
      { value: "Active", label: "Active" },
      { value: "Resolved", label: "Resolved" },
    ],
    []
  );

  const analyticsFilteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const created = t.createdAt ? new Date(t.createdAt).getTime() : 0;
      if (analyticsDateFrom && created < new Date(analyticsDateFrom).setHours(0, 0, 0, 0)) return false;
      if (analyticsDateTo && created > new Date(analyticsDateTo).setHours(23, 59, 59, 999)) return false;
      if (analyticsStatus && t.status !== analyticsStatus) return false;
      return true;
    });
  }, [tickets, analyticsDateFrom, analyticsDateTo, analyticsStatus]);

  const analyticsStats = useMemo(() => {
    const byRecipient: Record<string, number> = { User: 0, GRC: 0, IAM: 0, Pentesting: 0 };
    analyticsFilteredTickets.forEach((t) => {
      const r = getRecipient(t);
      if (isTeamRecipient(r)) byRecipient[r] = (byRecipient[r] ?? 0) + 1;
      else byRecipient.User = (byRecipient.User ?? 0) + 1;
    });
    return byRecipient;
  }, [analyticsFilteredTickets]);

  const analyticsByStatus = useMemo(() => {
    const byStatus: Record<string, number> = {};
    analyticsFilteredTickets.forEach((t) => {
      byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
    });
    return byStatus;
  }, [analyticsFilteredTickets]);

  const analyticsTotal = analyticsFilteredTickets.length;
  const analyticsMaxTeam = Math.max(1, ...Object.values(analyticsStats));

  useEffect(() => {
    Promise.all([getTickets(), getEndUsers()])
      .then(([raw, u]) => {
        const list = Array.isArray(raw) ? raw : [];
        setTickets(
          list.map((row: Record<string, unknown>) => {
            const created = row.createdAt ?? row.created_at;
            return { ...row, createdAt: created } as Ticket;
          })
        );
        setEndUsers(normalizeEndUsersResponse(u));
      })
      .catch(() => toast({ title: "Error loading data", status: "error", duration: 4000 }))
      .finally(() => setFetching(false));
  }, [toast]);

  function getAssignedTo(): string {
    if (recipientTo === "User") return user;
    if (recipientTo && RECIPIENT_TEAMS.includes(recipientTo as (typeof RECIPIENT_TEAMS)[number])) return recipientTo;
    return "";
  }

  async function createTicket() {
    const assignedTo = getAssignedTo();
    if (!type || !recipientTo || !assignedTo || !subject || !description || !priority) {
      toast({ title: "Error.", description: "The data is entered incorrectly", status: "error", duration: 4000 });
      return;
    }
    setLoading(true);
    try {
      const payload: Parameters<typeof createTicketReq>[0] = {
        toWhom: recipientTo,
        ...(recipientTo === "User" ? { user: assignedTo } : {}),
        type,
        subject,
        description,
        priority,
      };
      if (type === "Activity Verification" && siemAlertId.trim()) {
        payload.siemAlertId = siemAlertId.trim().slice(0, 255);
      }
      const created = await createTicketReq(payload);
      setTickets((prev) => [created as Ticket, ...prev]);
      setUser("");
      setRecipientTo("");
      setSubject("");
      setDescription("");
      setPriority("");
      setType("");
      setSiemAlertId("");
      toast({ title: "Success.", description: "The application has been created.", status: "success", duration: 4000 });
    } catch {
      toast({ title: "Error.", description: "Failed to create incident.", status: "error", duration: 4000 });
    } finally {
      setLoading(false);
    }
  }

  const showStatsTab = status === "Security Manager";

  const incidentLogContent = (
    <>
      {(status === "Security Manager" || status === "GSOC") && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <Box className="mb-4 p-4 bg-white dark:bg-[#1E2128] rounded-lg border border-[#1F6A5C]/20 dark:border-white/20 overflow-x-hidden">
          <Text fontSize="sm" fontWeight={600} className="mb-3">{t("report.filters")}</Text>
          <Wrap spacing={3}>
            <WrapItem>
              <Text as="span" fontSize="sm" className="mr-2 self-center text-[#1F6A5C] dark:text-[#F4F3F4]/45 shrink-0">{t("report.presets")}</Text>
              <Select
                size="sm"
                className="w-full sm:w-[130px] min-w-0"
                value={filterPreset}
                onChange={(v) => setFilterPreset(v as "none" | "today" | "7d" | "30d")}
                options={filterPresetOptions}
              />
            </WrapItem>
            <WrapItem>
              <Text as="span" fontSize="sm" className="mr-2 self-center text-[#1F6A5C] dark:text-[#F4F3F4]/45 shrink-0">{t("admin.createdFrom")}</Text>
              <Input
                type="date"
                size="sm"
                className="w-full sm:w-[140px] min-w-0"
                value={filterDateFrom}
                onChange={(e) => { setFilterDateFrom(e.target.value); setFilterPreset("none"); }}
              />
            </WrapItem>
            <WrapItem>
              <Text as="span" fontSize="sm" className="mr-2 self-center text-[#1F6A5C] dark:text-[#F4F3F4]/45 shrink-0">{t("admin.createdTo")}</Text>
              <Input
                type="date"
                size="sm"
                className="w-full sm:w-[140px] min-w-0"
                value={filterDateTo}
                onChange={(e) => { setFilterDateTo(e.target.value); setFilterPreset("none"); }}
              />
            </WrapItem>
            <WrapItem>
              <Select
                size="sm"
                className="w-full sm:w-[180px] min-w-0"
                value={filterSender}
                onChange={setFilterSender}
                options={filterSenderOptions}
              />
            </WrapItem>
            <WrapItem>
              <Select
                size="sm"
                className="w-full sm:w-[180px] min-w-0"
                value={filterRecipient}
                onChange={setFilterRecipient}
                options={filterRecipientOptions}
              />
            </WrapItem>
            <WrapItem>
              <Button
                as={motion.button}
                size="sm"
                variant="outline"
                onClick={() => {
                  setFilterDateFrom("");
                  setFilterDateTo("");
                  setFilterPreset("none");
                  setFilterSender("");
                  setFilterRecipient("");
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Reset Filters
              </Button>
            </WrapItem>
          </Wrap>
          {totalIncidents > 0 && (
            <Text fontSize="xs" className="text-[#1F6A5C]/70 dark:text-[#F4F3F4]/45 mt-2">
              Showing {(incidentPage - 1) * INCIDENTS_PER_PAGE + 1}–{Math.min(incidentPage * INCIDENTS_PER_PAGE, totalIncidents)} of {totalIncidents} incident{totalIncidents !== 1 ? "s" : ""}
            </Text>
          )}
        </Box>
        </motion.div>
      )}

      <div className="w-full max-w-full flex flex-col gap-4">
        <HStack className="w-full justify-between items-center flex-wrap gap-3" align="center">
          <Text fontSize="xl" fontWeight={600} className="text-[#1C1E1C] dark:text-[#F4F3F4]">
            Incidents Log
          </Text>
          {status === "Security Manager" && (
            <ButtonDownloadExcel data={filteredTickets} label="Export Incidents" />
          )}
        </HStack>
        {fetching ? (
          <Text className="py-4">Loading...</Text>
        ) : totalIncidents === 0 ? (
          <Text className="py-4 text-[#1F6A5C]/70 dark:text-[#F4F3F4]/45">No incidents found.</Text>
        ) : (
          <>
          {paginatedTickets.map((x, idx) => (
            <IncidentLogCard
              key={x.id}
              ticket={x}
              index={idx}
              showRouting={status === "Security Manager" || status === "GSOC"}
              emptyAnswerText="The user did not give an answer"
            />
          ))}
          {totalPages > 1 && (
          <HStack className="mt-6 gap-2 flex-wrap">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={incidentPage === p ? "solid" : "outline"}
                className={incidentPage === p ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                onClick={() => setIncidentPage(p)}
              >
                {p}
              </Button>
            ))}
          </HStack>
          )}
          </>
        )}
      </div>
    </>
  );

  if (onlyLog) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {incidentLogContent}
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
    <Tabs variant="enclosed">
      <TabList className="border-b border-[#1F6A5C]/20 dark:border-white/20 mb-4">
        <Tab className="font-semibold">New Incident</Tab>
        <Tab className="font-semibold">Incident Log ({filteredTickets.length})</Tab>
        {showStatsTab && <Tab className="font-semibold">Analytics</Tab>}
      </TabList>

      <TabPanels>
        <TabPanel index={0}>
          <div className={style.createTicketBlock}>
            <p className={style.subtitle}>Create Incident</p>
            <Menu>
              <MenuButton className={style.userSelect}>
                <div className={style.userSelectButton}>
                  <p className={style.userSelectText}>
                    {recipientTo !== "" ? recipientTo : "Assigned To"}
                  </p>
                  <IoChevronDown style={{ width: "15px", height: "15px" }} />
                </div>
              </MenuButton>
              <MenuList>
                <MenuItem onClick={() => { setRecipientTo("User"); setUser(""); setType(""); setSiemAlertId(""); }}>
                  User
                </MenuItem>
                {RECIPIENT_TEAMS.map((team) => (
                  <MenuItem
                    key={team}
                    onClick={() => { setRecipientTo(team); setUser(""); setType(""); setSiemAlertId(""); }}
                  >
                    {team}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
            <Menu>
              <MenuButton className={style.userSelect}>
                <div className={style.userSelectButton}>
                  <p className={style.userSelectText}>
                    {type !== "" ? type : "Incident Type"}
                  </p>
                  <IoChevronDown style={{ width: "15px", height: "15px" }} />
                </div>
              </MenuButton>
              <MenuList>
                <MenuItem onClick={() => { setType("Security Announcement"); setSiemAlertId(""); }}>
                  Security Announcement
                </MenuItem>
                {recipientTo === "User" ? (
                  <MenuItem onClick={() => setType("Activity Verification")}>
                    Activity Verification
                  </MenuItem>
                ) : recipientTo ? (
                  <MenuItem onClick={() => { setType("Communication Channel"); setSiemAlertId(""); }}>
                    Communication Channel
                  </MenuItem>
                ) : null}
              </MenuList>
            </Menu>
            {recipientTo === "User" && (
              <div className={style.userSelect}>
                <EndUserCombobox
                  value={user}
                  onChange={setUser}
                  users={endUsers}
                  loading={fetching}
                  placeholder={t("tickets.socPickUserPlaceholder")}
                  searchPlaceholder={t("tickets.socEndUserSearchPlaceholder")}
                  emptyListMessage={t("tickets.socEndUserEmpty")}
                  noMatchMessage={t("tickets.socEndUserNoMatch")}
                  className="w-full !min-h-0 !rounded-2xl !border-0 !shadow-none !bg-transparent dark:!bg-transparent"
                />
              </div>
            )}
            <input
              placeholder="Title"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={style.input}
            />
            <textarea
              placeholder="Details"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className={style.textarea}
            />
            {recipientTo === "User" && type === "Activity Verification" ? (
              <>
                <Text fontSize="sm" fontWeight={600} className="mb-2 text-left text-[#103E36] dark:text-[#F4F3F4]/65">
                  {t("tickets.siemAlertId")}
                </Text>
                <input
                  placeholder={t("tickets.siemAlertIdPlaceholder")}
                  value={siemAlertId}
                  onChange={(e) => setSiemAlertId(e.target.value)}
                  className={style.input}
                  maxLength={255}
                  autoComplete="off"
                />
                <Text fontSize="xs" className="text-[#1F6A5C]/70 dark:text-[#F4F3F4]/45 mb-1 text-left">
                  {t("tickets.siemAlertIdHint")}
                </Text>
              </>
            ) : null}
            <Text fontSize="sm" fontWeight={600} className="mb-2 text-left text-[#103E36] dark:text-[#F4F3F4]/65">Priority</Text>
            <div className={style.line}>
              {["High", "Medium", "Low"].map((x, i) => (
                <div
                  key={i}
                  className={style.priorityBlock}
                  onClick={() => setPriority(x)}
                >
                  {x === priority ? (
                    <div className={style.completeCircle}>
                      <div className={style.completeCircleEnter} />
                    </div>
                  ) : (
                    <div className={style.emptyCircle} />
                  )}
                  <p>{x}</p>
                </div>
              ))}
            </div>
            <Button
              as={motion.button}
              isLoading={loading}
              className={`${style.buttonCreate} rounded-[20px] h-[50px] bg-brand-primary text-white hover:bg-brand-primaryDark`}
              onClick={createTicket}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Create Incident
            </Button>
          </div>
        </TabPanel>

        <TabPanel index={1}>
          {incidentLogContent}
        </TabPanel>

        {showStatsTab && (
          <TabPanel index={2}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <Box className="py-4">
              <Box className="mb-6 p-4 bg-white dark:bg-[#1E2128] rounded-lg border border-[#1F6A5C]/20 dark:border-white/20">
                <Text fontSize="sm" fontWeight={600} className="mb-3">Filters</Text>
                <Wrap spacing={4}>
                  <WrapItem>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="xs" className="text-[#1F6A5C]/70">Time range: from</Text>
                      <Input
                        type="date"
                        size="sm"
                        className="w-[160px]"
                        value={analyticsDateFrom}
                        onChange={(e) => setAnalyticsDateFrom(e.target.value)}
                      />
                    </VStack>
                  </WrapItem>
                  <WrapItem>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="xs" className="text-[#1F6A5C]/70">Time range: to</Text>
                      <Input
                        type="date"
                        size="sm"
                        className="w-[160px]"
                        value={analyticsDateTo}
                        onChange={(e) => setAnalyticsDateTo(e.target.value)}
                      />
                    </VStack>
                  </WrapItem>
                  <WrapItem>
                    <VStack align="start" spacing={1}>
                      <Text fontSize="xs" className="text-[#1F6A5C]/70">Status</Text>
                      <Select
                        size="sm"
                        className="w-[160px]"
                        value={analyticsStatus}
                        onChange={setAnalyticsStatus}
                        options={analyticsStatusOptions}
                      />
                    </VStack>
                  </WrapItem>
                  <WrapItem className="self-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAnalyticsDateFrom("");
                        setAnalyticsDateTo("");
                        setAnalyticsStatus("");
                      }}
                    >
                      Reset filters
                    </Button>
                  </WrapItem>
                </Wrap>
                <Text fontSize="xs" className="text-[#1F6A5C]/70 mt-2">
                  {analyticsDateFrom || analyticsDateTo ? `Date: ${analyticsDateFrom || "…"} – ${analyticsDateTo || "…"}` : "Date: all time"}
                  {analyticsStatus ? ` · Status: ${analyticsStatus}` : " · Status: all"}
                </Text>
              </Box>

              <Text className={`${style.subtitle} mb-4`}>Incidents by team</Text>
              <SimpleGrid columns={4} spacing={4} className="mb-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                {(["User", "GRC", "IAM", "Pentesting"] as const).map((label, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    whileHover={{ y: -2 }}
                  >
                    <Box
                      className="p-4 bg-white dark:bg-[#1E2128] rounded-lg border border-[#1F6A5C]/20 dark:border-white/20 shadow-sm hover:shadow-md"
                    >
                      <Text fontSize="sm" className="text-[#1F6A5C]/70 dark:text-[#F4F3F4]/45 mb-1">{label}</Text>
                      <Text fontSize="2xl" fontWeight={700} className="mb-2">{analyticsStats[label]}</Text>
                      <Progress
                        value={analyticsMaxTeam ? (analyticsStats[label] / analyticsMaxTeam) * 100 : 0}
                        size="sm"
                        colorScheme="green"
                        borderRadius="full"
                      />
                    </Box>
                  </motion.div>
                ))}
              </SimpleGrid>

              <Text className={`${style.subtitle} text-xl mb-3`}>By status</Text>
              <Box className="p-4 bg-white dark:bg-[#1E2128] rounded-lg border border-[#1F6A5C]/20 dark:border-white/20">
                {["New", "Active", "Resolved"].map((status) => {
                  const count = analyticsByStatus[status] ?? 0;
                  const pct = analyticsTotal ? (count / analyticsTotal) * 100 : 0;
                  return (
                    <Box key={status} className="mb-3">
                      <div className="flex justify-between mb-1">
                        <Text fontSize="sm" fontWeight={500}>{status}</Text>
                        <Text fontSize="sm" className="text-[#1F6A5C]/70">{count}</Text>
                      </div>
                      <Progress value={pct} size="sm" colorScheme="green" borderRadius="full" />
                    </Box>
                  );
                })}
                {analyticsTotal === 0 && (
                  <Text fontSize="sm" className="text-[#1F6A5C]/70">No incidents in the selected period.</Text>
                )}
              </Box>
            </Box>
            </motion.div>
          </TabPanel>
        )}
      </TabPanels>
    </Tabs>
    </motion.div>
  );
}
