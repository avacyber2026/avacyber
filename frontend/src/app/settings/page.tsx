"use client";

import { useEffect, useState } from "react";
import {
  VStack,
  Box,
  Text,
  Button,
  HStack,
  SimpleGrid,
  FormControl,
  FormLabel,
  Input,
  Avatar,
  Divider,
} from "@/ui";
import { useColorMode } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/useToast";
import { SideMenu, LanguageSwitcher, HolidayDateTimeFields } from "@/Components";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import style from "@/styles/Report.module.css";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSignOut } from "@/hooks/useSignOut";
import api from "@/lib/axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3020";
const getAvatarSrc = (avatarUrl: string | null) =>
  avatarUrl ? (avatarUrl.startsWith("http") ? avatarUrl : `${API_URL}${avatarUrl}`) : undefined;

/** Нормализуем значение с сервера в локальный `YYYY-MM-DDTHH:mm` для сравнения и PATCH. */
function toLocalDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${mo}-${day}T${h}:${min}`;
  }
  const m = String(iso).match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  return m ? `${m[1]}T${m[2]}` : String(iso).trim();
}

function splitDateTimeCombined(combined: string): { date: string; time: string } {
  if (!combined) return { date: "", time: "" };
  const [datePart, rest] = combined.split("T");
  return { date: datePart || "", time: (rest || "").slice(0, 5) };
}

interface ProfileData {
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  jobTitle: string;
  department: string;
  avatarUrl: string | null;
  holidayMode?: boolean;
  holidayUntil?: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const signOut = useSignOut();
  const { toast } = useToast();
  const { t, locale } = useLanguage();
  const { colorMode, toggleColorMode } = useColorMode();
  const { isAuthenticated, isLoading, user } = useAuth() as ReturnType<typeof useAuth> & {
    user: { email?: string } | null;
  };
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [form, setForm] = useState({ firstName: "", lastName: "", jobTitle: "", department: "" });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);
  const [holidayEnabled, setHolidayEnabled] = useState(false);
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayTime, setHolidayTime] = useState("");
  const [holidayCommitted, setHolidayCommitted] = useState("");

  const holidayUntilCombined =
    holidayDate.trim() !== "" ? `${holidayDate.trim()}T${(holidayTime.trim() || "00:00").slice(0, 5)}` : "";

  const isDirty =
    profile != null &&
    (form.firstName !== (profile.firstName ?? "") ||
      form.lastName !== (profile.lastName ?? "") ||
      form.jobTitle !== (profile.jobTitle ?? "") ||
      form.department !== (profile.department ?? ""));

  useEffect(() => {
    if (!isAuthenticated && !isLoading) router.push("/");
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api
      .get("/profile")
      .then((r) => {
        const d = r.data;
        setProfile(d);
        setHolidayEnabled(Boolean(d.holidayMode));
        const hu = d.holidayUntil ?? "";
        const norm = hu ? toLocalDatetimeLocalValue(hu) : "";
        const parts = splitDateTimeCombined(norm);
        setHolidayDate(parts.date);
        setHolidayTime(parts.time);
        setHolidayCommitted(norm);
        // Инициализируем форму один раз из профиля
        setForm((prev) => {
          if (formInitialized) return prev;
          return {
            firstName: d.firstName ?? "",
            lastName: d.lastName ?? "",
            jobTitle: d.jobTitle ?? "",
            department: d.department ?? "",
          };
        });
        setFormInitialized(true);
      })
      .catch((err: { response?: { status?: number } }) => {
        if (err?.response?.status === 404) {
          const email = user?.email ?? "";
          setProfile({
            email,
            firstName: "",
            lastName: "",
            displayName: email,
            jobTitle: "",
            department: "",
            avatarUrl: null,
            holidayMode: false,
            holidayUntil: null,
          });
          setHolidayEnabled(false);
          setHolidayDate("");
          setHolidayTime("");
          setHolidayCommitted("");
          return;
        }
        toast({ title: "Error loading profile", status: "error" });
      })
      .finally(() => setProfileLoading(false));
  }, [isAuthenticated, toast, user]);

  const handleSave = () => {
    if (!form.firstName.trim()) {
      toast({ title: t("auth.firstNameRequired"), status: "error" });
      return;
    }
    if (!form.lastName.trim()) {
      toast({ title: t("auth.lastNameRequired"), status: "error" });
      return;
    }
    api
      .patch("/profile", form)
      .then((r) => {
        setProfile(r.data);
        toast({ title: "Profile updated", status: "success" });
        window.dispatchEvent(new Event("profile-updated"));
      })
      .catch(() => toast({ title: "Failed to update", status: "error" }));
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("avatar", file);
    setAvatarUploading(true);
    api
      .post("/profile/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => {
        setProfile(r.data);
        toast({ title: t("profile.avatarUpdated"), status: "success" });
        window.dispatchEvent(new Event("profile-avatar-updated"));
      })
      .catch((err) => toast({ title: err.response?.data?.error || "Upload failed", status: "error" }))
      .finally(() => {
        setAvatarUploading(false);
        e.target.value = "";
      });
  };

  const holidayDateDirty =
    holidayEnabled && holidayUntilCombined !== "" && holidayUntilCombined !== holidayCommitted;

  const handleHolidaySave = () => {
    if (!holidayUntilCombined.trim()) {
      toast({ title: t("settings.holidayPickFirst"), status: "warning" });
      return;
    }
    api
      .patch("/profile", { holidayMode: true, holidayUntil: holidayUntilCombined.trim() })
      .then((res) => {
        setProfile(res.data);
        setHolidayCommitted(holidayUntilCombined.trim());
        toast({ title: t("settings.holidaySaved"), status: "success" });
      })
      .catch(() => toast({ title: "Failed to save", status: "error" }));
  };

  const handleAvatarRemove = () => {
    setAvatarUploading(true);
    api
      .delete("/profile/avatar")
      .then((r) => {
        setProfile(r.data);
        toast({ title: t("profile.avatarRemoved"), status: "success" });
        window.dispatchEvent(new Event("profile-avatar-updated"));
      })
      .catch(() => toast({ title: "Failed to remove avatar", status: "error" }))
      .finally(() => setAvatarUploading(false));
  };

  if (!isAuthenticated && !isLoading) return null;

  const textColor = colorMode === "dark" ? "text-[#F4F3F4]" : "text-[#103E36]";
  const labelColor = colorMode === "dark" ? "text-[#1F6A5C]/60" : "text-[#1F6A5C]";

  return (
    <>
      <SideMenu />
      <VStack className="w-full min-h-screen" align="stretch">
        <Box
          className={`${style.main} bg-[#F4F3F4] dark:bg-[#131C18] p-6`}
          as={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Text fontSize="2xl" fontWeight={700} className={`mb-4 ${textColor}`}>
            {t("profile.title")}
          </Text>
          <Divider className="mb-6 border-[#1F6A5C]/20 dark:border-white/20" />

          <VStack align="stretch" spacing={6} className="max-w-[1040px]">
          <Box>
            <SimpleGrid columns={1} spacing={8} className="grid-cols-1 lg:grid-cols-2 lg:gap-x-8 lg:gap-y-8">
              <Box className="lg:pt-1">
                <Text fontWeight={600} className={`mb-1 ${textColor}`}>
                  Basic account information
                </Text>
                <Text fontSize="sm" className={labelColor}>
                  We will use these details for your profile and notifications. You can update your name, job title and
                  department here.
                </Text>
              </Box>

              <Box className="p-6 rounded-lg bg-white dark:bg-[#1B2620] border border-[#1F6A5C]/20 dark:border-white/20 shadow-sm">
                  <Text fontWeight={600} fontSize="lg" className={`mb-4 ${textColor}`}>
                    {t("profile.editProfile")}
                  </Text>
                  {profileLoading ? (
                    <Text className={labelColor}>{t("common.loading")}</Text>
                  ) : (
                    <>
                      <Box className="mb-5">
                        <HStack spacing={0} align="flex-start" style={{ gap: "10px" }} className="items-start">
                          <Avatar
                            size="lg"
                            name={profile?.displayName || profile?.email}
                            src={getAvatarSrc(profile?.avatarUrl ?? null)}
                            bg="brand.primary"
                            color="white"
                            className="shrink-0"
                          />
                          <VStack align="start" spacing={1} className="min-w-0 flex-1 pt-0.5">
                            <Text fontWeight={600} fontSize="lg" className={`${textColor} break-words`}>
                              {profile?.displayName || profile?.email}
                            </Text>
                            <Text fontSize="sm" className={`${labelColor} break-all`}>
                              {profile?.email}
                            </Text>
                          </VStack>
                        </HStack>
                        <HStack className="mt-4" spacing={2}>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleAvatarUpload}
                            disabled={avatarUploading}
                            style={{ display: "none" }}
                            id="avatar-upload"
                          />
                          <Button
                            as="label"
                            htmlFor="avatar-upload"
                            size="sm"
                            className="cursor-pointer bg-[#1F6A5C] hover:bg-[#267E6D] text-white"
                            isLoading={avatarUploading}
                          >
                            {t("profile.uploadAvatar")}
                          </Button>
                          {profile?.avatarUrl && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={handleAvatarRemove}
                              isLoading={avatarUploading}
                            >
                              {t("profile.removeAvatar")}
                            </Button>
                          )}
                        </HStack>
                      </Box>
                      <VStack align="stretch" spacing={4}>
                        <SimpleGrid columns={2} spacing={4} className="grid-cols-1 sm:grid-cols-2">
                          <FormControl>
                            <FormLabel fontSize="sm" className={labelColor}>
                              {t("auth.firstName")} *
                            </FormLabel>
                            <Input
                              required
                              value={form.firstName}
                              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                            />
                          </FormControl>
                          <FormControl>
                            <FormLabel fontSize="sm" className={labelColor}>
                              {t("auth.lastName")} *
                            </FormLabel>
                            <Input
                              required
                              value={form.lastName}
                              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                            />
                          </FormControl>
                        </SimpleGrid>
                        <FormControl>
                          <FormLabel fontSize="sm" className={labelColor}>
                            {t("profile.jobTitle")}
                          </FormLabel>
                          <Input
                            value={form.jobTitle}
                            onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                            placeholder="e.g. Security Analyst"
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel fontSize="sm" className={labelColor}>
                            {t("profile.department")}
                          </FormLabel>
                          <Input
                            value={form.department}
                            onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                            placeholder="e.g. IT Security"
                          />
                        </FormControl>
                        {isDirty && (
                          <Button
                            className="bg-[#1F6A5C] hover:bg-[#267E6D] text-white rounded-lg px-4 w-fit"
                            size="sm"
                            onClick={handleSave}
                          >
                            {t("profile.save")}
                          </Button>
                        )}
                        <Divider className="my-4 border-[#1F6A5C]/20 dark:border-white/20" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 w-fit"
                          onClick={signOut}
                        >
                          {t("sidebar.logOut")}
                        </Button>
                      </VStack>
                    </>
                  )}
              </Box>

              <Box className="lg:pt-1">
                <Text fontWeight={600} className={`mb-1 ${textColor}`}>
                  Holiday mode
                </Text>
                <Text fontSize="sm" className={labelColor}>
                  Suspend alerts and notifications while you are away. An administrator can wire this up to your real
                  schedule later.
                </Text>
              </Box>

              <Box className="p-6 rounded-lg bg-white dark:bg-[#1B2620] border border-[#1F6A5C]/20 dark:border-white/20 shadow-sm">
                  <HStack spacing={3} className="mb-4">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={holidayEnabled}
                      onClick={() => {
                        const next = !holidayEnabled;
                        setHolidayEnabled(next);
                        if (!next) {
                          setHolidayDate("");
                          setHolidayTime("");
                          setHolidayCommitted("");
                          api
                            .patch("/profile", { holidayMode: false, holidayUntil: null })
                            .then((res) => setProfile(res.data))
                            .catch(() => toast({ title: "Failed to update holiday mode", status: "error" }));
                        } else {
                          api
                            .patch("/profile", {
                              holidayMode: true,
                              holidayUntil: holidayUntilCombined.trim() || null,
                            })
                            .then((res) => setProfile(res.data))
                            .catch(() => toast({ title: "Failed to update holiday mode", status: "error" }));
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 ${
                        holidayEnabled ? "bg-brand-primary" : "bg-[#50BFA0]/25 dark:bg-white/20"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition ${
                          holidayEnabled ? "translate-x-5" : "translate-x-0.5"
                        }`}
                        style={{ marginTop: 2 }}
                      />
                    </button>
                    <Text fontWeight={600} className={textColor}>
                      Holiday mode
                    </Text>
                  </HStack>
                  <FormControl>
                    <FormLabel fontSize="sm" className={labelColor}>
                      I am on holiday until
                    </FormLabel>
                    <HolidayDateTimeFields
                      holidayDate={holidayDate}
                      holidayTime={holidayTime}
                      onHolidayDateChange={setHolidayDate}
                      onHolidayTimeChange={setHolidayTime}
                      onEnableHoliday={() => setHolidayEnabled(true)}
                      localeCode={locale}
                      placeholderDate={t("settings.holidayPickDate")}
                      placeholderTime={t("settings.holidayPickTime")}
                      timeListCaption={t("settings.holidayTimeListCaption")}
                      endAdornment={
                        holidayDateDirty ? (
                          <Button
                            type="button"
                            size="sm"
                            className="h-[2.75rem] whitespace-nowrap rounded-md bg-[#1F6A5C] px-4 text-sm font-semibold text-white hover:bg-[#267E6D] sm:shrink-0"
                            onClick={handleHolidaySave}
                          >
                            {t("settings.holidaySave")}
                          </Button>
                        ) : null
                      }
                    />
                  </FormControl>
              </Box>
            </SimpleGrid>
          </Box>
          </VStack>
        </Box>
      </VStack>
    </>
  );
}
