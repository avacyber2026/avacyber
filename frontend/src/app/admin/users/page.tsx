"use client";

import style from "@/styles/Report.module.css";
import {
  Stack,
  VStack,
  Divider,
  Text,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  SimpleGrid,
  Select,
  HStack,
  Input,
  Avatar,
} from "@/ui";
import { useToast } from "@/hooks/useToast";
import { useDisclosure } from "@/hooks/useDisclosure";
import { motion } from "framer-motion";
import { AdminSidebar, UserProfileCard } from "@/Components";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import adminApi from "@/lib/adminApi";
import { useLanguage } from "@/contexts/LanguageContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3020";
const getAvatarSrc = (avatarUrl: string | null | undefined) =>
  avatarUrl ? (avatarUrl.startsWith("http") ? avatarUrl : `${API_URL}${avatarUrl}`) : undefined;

const APP_ROLES = ["End-User", "Security Manager", "GSOC", "GRC", "IAM", "Pentesting"] as const;

interface AdminUser {
  id: number;
  email: string;
  role: string;
  approved: boolean;
  rejection_comment: string | null;
  created_at: string;
  firstName?: string | null;
  lastName?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  avatarUrl?: string | null;
  managerEmail?: string | null;
}

type UserTab = "all" | "rejected" | "accepted" | "waiting";

function filterUsers(users: AdminUser[], tab: UserTab): AdminUser[] {
  switch (tab) {
    case "rejected":
      return users.filter((u) => !u.approved && u.rejection_comment != null && u.rejection_comment !== "");
    case "accepted":
      return users.filter((u) => u.approved);
    case "waiting":
      return users.filter((u) => !u.approved && (u.rejection_comment == null || u.rejection_comment === ""));
    default:
      return users;
  }
}

function UserGrid({
  users,
  loading,
  onApprove,
  onReject,
  onDelete,
  onEditProfile,
  onRoleChange,
  t,
}: {
  users: AdminUser[];
  loading: boolean;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onDelete: (id: number) => void;
  onEditProfile: (u: AdminUser) => void;
  onRoleChange: (id: number, role: string) => void;
  t: (key: string) => string;
}) {
  if (loading) return <Text className="py-4">{t("common.loading")}</Text>;
  if (users.length === 0) return <Text className="py-4 text-[#1F6A5C]/70">{t("admin.noUsersInCategory")}</Text>;
  return (
    <SimpleGrid columns={3} spacing={4} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
      {users.map((u) => (
        <UserProfileCard
          key={u.id}
          email={u.email}
          role={u.role}
          approved={u.approved}
          rejectionComment={u.rejection_comment}
          firstName={u.firstName}
          lastName={u.lastName}
          jobTitle={u.jobTitle}
          department={u.department}
          onApprove={() => onApprove(u.id)}
          onReject={() => onReject(u.id)}
          onDelete={() => onDelete(u.id)}
          onEditProfile={() => onEditProfile(u)}
          onRoleChange={(role: string) => onRoleChange(u.id, role)}
          editableRole
          roleOptions={[...APP_ROLES]}
          t={t}
        />
      ))}
    </SimpleGrid>
  );
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const { isOpen: isEditUserOpen, onOpen: onEditUserOpen, onClose: onEditUserClose } = useDisclosure();
  const [editUserDraft, setEditUserDraft] = useState<{
    id: number;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    jobTitle: string;
    department: string;
    avatarUrl: string;
    managerEmail: string;
  } | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.replace("/admin/auth");
      return;
    }
    setIsAdmin(true);
  }, [router]);

  useEffect(() => {
    if (!isAdmin) return;
    adminApi
      .get("/admin/users")
      .then((r) => setUsers(r.data))
      .catch(() => toast({ title: t("admin.errorLoadingUsers"), status: "error", duration: 4000 }))
      .finally(() => setLoading(false));
  }, [isAdmin, toast, t]);

  async function handleApprove(id: number) {
    try {
      await adminApi.patch(`/admin/users/${id}/approve`);
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, approved: true, rejection_comment: null } : u)));
      toast({ title: t("admin.userApproved"), status: "success", duration: 3000 });
    } catch {
      toast({ title: t("admin.failedApprove"), status: "error", duration: 4000 });
    }
  }

  function openRejectModal(id: number) {
    setRejectingId(id);
    setRejectComment("");
    onOpen();
  }

  async function handleReject() {
    if (rejectingId == null) return;
    try {
      await adminApi.patch(`/admin/users/${rejectingId}/reject`, { comment: rejectComment || undefined });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === rejectingId ? { ...u, approved: false, rejection_comment: rejectComment || null } : u
        )
      );
      toast({ title: t("admin.userRejected"), status: "info", duration: 3000 });
      onClose();
      setRejectingId(null);
    } catch {
      toast({ title: t("admin.failedReject"), status: "error", duration: 4000 });
    }
  }

  function filterByRole(list: AdminUser[]): AdminUser[] {
    if (roleFilter === "all") return list;
    return list.filter((u) => u.role === roleFilter);
  }

  async function handleRoleChange(id: number, role: string) {
    try {
      await adminApi.patch(`/admin/users/${id}`, { role });
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)));
      toast({ title: t("admin.roleUpdated"), status: "success", duration: 3000 });
    } catch {
      toast({ title: t("admin.failedUpdateRole"), status: "error", duration: 4000 });
    }
  }

  function openEditUser(u: AdminUser) {
    setEditUserDraft({
      id: u.id,
      email: u.email,
      role: u.role,
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      jobTitle: u.jobTitle ?? "",
      department: u.department ?? "",
      avatarUrl: u.avatarUrl ?? "",
      managerEmail: u.managerEmail ?? "",
    });
    onEditUserOpen();
  }

  async function saveEditUser() {
    if (!editUserDraft) return;
    setSavingUser(true);
    try {
      const { data } = await adminApi.patch<AdminUser>(`/admin/users/${editUserDraft.id}`, {
        email: editUserDraft.email.trim(),
        role: editUserDraft.role,
        firstName: editUserDraft.firstName,
        lastName: editUserDraft.lastName,
        jobTitle: editUserDraft.jobTitle,
        department: editUserDraft.department,
        avatarUrl: editUserDraft.avatarUrl,
        managerEmail: editUserDraft.managerEmail.trim() || null,
      });
      setUsers((prev) => prev.map((x) => (x.id === data.id ? { ...x, ...data } : x)));
      toast({ title: t("admin.userSaved"), status: "success", duration: 3000 });
      onEditUserClose();
      setEditUserDraft(null);
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { error?: string } } };
      if (ax.response?.status === 409 || ax.response?.data?.error === "Email already in use") {
        toast({ title: t("admin.emailInUse"), status: "error", duration: 4000 });
      } else {
        toast({ title: t("admin.userSaveError"), status: "error", duration: 4000 });
      }
    } finally {
      setSavingUser(false);
    }
  }

  function mergeUserFromServer(data: AdminUser) {
    setUsers((prev) => prev.map((x) => (x.id === data.id ? { ...x, ...data } : x)));
    setEditUserDraft((d) =>
      d && d.id === data.id
        ? {
            ...d,
            email: data.email,
            avatarUrl: data.avatarUrl ?? "",
          }
        : d
    );
  }

  async function handleAdminAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !editUserDraft) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const { data } = await adminApi.post<AdminUser>(`/admin/users/${editUserDraft.id}/avatar`, fd);
      mergeUserFromServer(data);
      toast({ title: t("profile.avatarUpdated"), status: "success", duration: 3000 });
    } catch {
      toast({ title: t("admin.userSaveError"), status: "error", duration: 4000 });
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleAdminAvatarRemove() {
    if (!editUserDraft) return;
    setAvatarUploading(true);
    try {
      const { data } = await adminApi.delete<AdminUser>(`/admin/users/${editUserDraft.id}/avatar`);
      mergeUserFromServer(data);
      toast({ title: t("profile.avatarRemoved"), status: "success", duration: 3000 });
    } catch {
      toast({ title: t("admin.userSaveError"), status: "error", duration: 4000 });
    } finally {
      setAvatarUploading(false);
    }
  }

  function openDeleteModal(id: number) {
    setDeletingId(id);
    onDeleteOpen();
  }

  async function handleDelete() {
    if (deletingId == null) return;
    try {
      await adminApi.delete(`/admin/users/${deletingId}`);
      setUsers((prev) => prev.filter((u) => u.id !== deletingId));
      toast({ title: t("admin.userDeleted"), status: "success", duration: 3000 });
      onDeleteClose();
      setDeletingId(null);
    } catch {
      toast({ title: t("admin.failedDeleteUser"), status: "error", duration: 4000 });
    }
  }

  const roleFilterOptions = useMemo(
    () => [
      { value: "all", label: t("admin.allRoles") },
      ...APP_ROLES.map((r) => ({ value: r, label: r })),
    ],
    [t]
  );

  if (isAdmin === null) return null;
  if (!isAdmin) return null;

  const filteredAll = filterByRole(filterUsers(users, "all"));
  const filteredRejected = filterByRole(filterUsers(users, "rejected"));
  const filteredAccepted = filterByRole(filterUsers(users, "accepted"));
  const filteredWaiting = filterByRole(filterUsers(users, "waiting"));

  return (
    <>
      <VStack className="w-full min-h-screen items-stretch">
        <AdminSidebar />
        <Stack className={`${style.main} bg-[#F4F3F4] dark:bg-[#1C1E1C]`} as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <HStack className="justify-between flex-wrap gap-2 mb-4">
            <Text className="text-2xl font-semibold text-[#103E36] dark:text-[#F4F3F4]">
              {t("admin.users")}
            </Text>
            <Select
              className="w-full sm:w-[200px] h-8 text-sm"
              size="sm"
              value={roleFilter}
              onChange={setRoleFilter}
              options={roleFilterOptions}
            />
          </HStack>
          <Divider className="border-[#1F6A5C]/20 dark:border-white/20 mb-4" />
          <Tabs variant="enclosed" defaultIndex={0}>
            <TabList>
              <Tab>{t("admin.all")} ({filteredAll.length})</Tab>
              <Tab>{t("admin.rejected")} ({filteredRejected.length})</Tab>
              <Tab>{t("admin.accepted")} ({filteredAccepted.length})</Tab>
              <Tab>{t("admin.waiting")} ({filteredWaiting.length})</Tab>
            </TabList>
            <TabPanels>
              <TabPanel index={0}>
                <UserGrid users={filteredAll} loading={loading} onApprove={handleApprove} onReject={openRejectModal} onDelete={openDeleteModal} onEditProfile={openEditUser} onRoleChange={handleRoleChange} t={t} />
              </TabPanel>
              <TabPanel index={1}>
                <UserGrid users={filteredRejected} loading={loading} onApprove={handleApprove} onReject={openRejectModal} onDelete={openDeleteModal} onEditProfile={openEditUser} onRoleChange={handleRoleChange} t={t} />
              </TabPanel>
              <TabPanel index={2}>
                <UserGrid users={filteredAccepted} loading={loading} onApprove={handleApprove} onReject={openRejectModal} onDelete={openDeleteModal} onEditProfile={openEditUser} onRoleChange={handleRoleChange} t={t} />
              </TabPanel>
              <TabPanel index={3}>
                <UserGrid users={filteredWaiting} loading={loading} onApprove={handleApprove} onReject={openRejectModal} onDelete={openDeleteModal} onEditProfile={openEditUser} onRoleChange={handleRoleChange} t={t} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Stack>
      </VStack>

      <Modal isOpen={isEditUserOpen} onClose={() => { onEditUserClose(); setEditUserDraft(null); }} size="lg">
        <ModalContent className="dark:bg-[#103E36] dark:text-[#F4F3F4] max-h-[90vh] overflow-y-auto">
          <ModalHeader onClose={() => { onEditUserClose(); setEditUserDraft(null); }}>{t("admin.editUser")}</ModalHeader>
          <ModalBody className="space-y-3">
            <Text className="text-sm text-[#1F6A5C] dark:text-[#1F6A5C]/60">{t("admin.editUserHint")}</Text>
            {editUserDraft ? (
              <>
                <div>
                  <Text className="text-xs font-semibold mb-1 text-[#1F6A5C] dark:text-[#1F6A5C]/60">{t("auth.email")}</Text>
                  <Input
                    value={editUserDraft.email}
                    onChange={(e) => setEditUserDraft((d) => (d ? { ...d, email: e.target.value } : d))}
                    className="w-full"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Text className="text-xs font-semibold mb-1 text-[#1F6A5C] dark:text-[#1F6A5C]/60">{t("auth.firstName")}</Text>
                    <Input
                      value={editUserDraft.firstName}
                      onChange={(e) => setEditUserDraft((d) => (d ? { ...d, firstName: e.target.value } : d))}
                    />
                  </div>
                  <div>
                    <Text className="text-xs font-semibold mb-1 text-[#1F6A5C] dark:text-[#1F6A5C]/60">{t("auth.lastName")}</Text>
                    <Input
                      value={editUserDraft.lastName}
                      onChange={(e) => setEditUserDraft((d) => (d ? { ...d, lastName: e.target.value } : d))}
                    />
                  </div>
                </div>
                <div>
                  <Text className="text-xs font-semibold mb-1 text-[#1F6A5C] dark:text-[#1F6A5C]/60">{t("profile.jobTitle")}</Text>
                  <Input
                    value={editUserDraft.jobTitle}
                    onChange={(e) => setEditUserDraft((d) => (d ? { ...d, jobTitle: e.target.value } : d))}
                  />
                </div>
                <div>
                  <Text className="text-xs font-semibold mb-1 text-[#1F6A5C] dark:text-[#1F6A5C]/60">{t("profile.department")}</Text>
                  <Input
                    value={editUserDraft.department}
                    onChange={(e) => setEditUserDraft((d) => (d ? { ...d, department: e.target.value } : d))}
                  />
                </div>
                <div>
                  <Text className="text-xs font-semibold mb-1 text-[#1F6A5C] dark:text-[#1F6A5C]/60">{t("admin.managerEmail")}</Text>
                  <Input
                    type="email"
                    value={editUserDraft.managerEmail}
                    onChange={(e) => setEditUserDraft((d) => (d ? { ...d, managerEmail: e.target.value } : d))}
                    placeholder="manager@company.com"
                    className="w-full"
                  />
                  <Text className="text-xs text-[#1F6A5C]/70 dark:text-[#1F6A5C]/60 mt-1">{t("admin.managerEmailHint")}</Text>
                </div>
                <div>
                  <Text className="text-xs font-semibold mb-2 text-[#1F6A5C] dark:text-[#1F6A5C]/60">{t("profile.avatarUrl")}</Text>
                  <HStack className="items-start gap-3 flex-wrap">
                    <Avatar
                      size="lg"
                      name={
                        [editUserDraft.firstName, editUserDraft.lastName].filter(Boolean).join(" ").trim() ||
                        editUserDraft.email
                      }
                      src={getAvatarSrc(editUserDraft.avatarUrl || null)}
                      bg="brand.primary"
                      color="white"
                      className="shrink-0"
                    />
                    <VStack align="stretch" spacing={2} className="min-w-0 flex-1">
                      <HStack spacing={2} className="flex-wrap">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleAdminAvatarUpload}
                          disabled={avatarUploading}
                          style={{ display: "none" }}
                          id="admin-user-avatar-upload"
                        />
                        <Button
                          as="label"
                          htmlFor="admin-user-avatar-upload"
                          size="sm"
                          className="cursor-pointer bg-[#1F6A5C] hover:bg-[#267E6D] text-white"
                          isLoading={avatarUploading}
                        >
                          {t("profile.uploadAvatar")}
                        </Button>
                        {editUserDraft.avatarUrl ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={handleAdminAvatarRemove}
                            isLoading={avatarUploading}
                          >
                            {t("profile.removeAvatar")}
                          </Button>
                        ) : null}
                      </HStack>
                      <Text className="text-xs text-[#1F6A5C]/70 dark:text-[#1F6A5C]/60">{t("admin.avatarUrlOrUploadHint")}</Text>
                      <Input
                        value={editUserDraft.avatarUrl}
                        onChange={(e) => setEditUserDraft((d) => (d ? { ...d, avatarUrl: e.target.value } : d))}
                        placeholder="https://… или /uploads/…"
                        className="w-full"
                      />
                    </VStack>
                  </HStack>
                </div>
                <div>
                  <Text className="text-xs font-semibold mb-1 text-[#1F6A5C] dark:text-[#1F6A5C]/60">{t("admin.allRoles")}</Text>
                  <Select
                    value={editUserDraft.role}
                    onChange={(role) => setEditUserDraft((d) => (d ? { ...d, role } : d))}
                    options={APP_ROLES.map((r) => ({ value: r, label: r }))}
                    className="w-full"
                  />
                </div>
              </>
            ) : null}
          </ModalBody>
          <ModalFooter className="gap-2">
            <Button variant="ghost" onClick={() => { onEditUserClose(); setEditUserDraft(null); }}>
              {t("profile.cancel")}
            </Button>
            <Button className="bg-brand-primary text-white" onClick={saveEditUser} isLoading={savingUser}>
              {t("profile.save")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader onClose={onClose}>{t("admin.rejectUser")}</ModalHeader>
          <ModalBody>
            <Text className="mb-2">{t("admin.rejectReason")}</Text>
            <Textarea
              placeholder={t("admin.rejectPlaceholder")}
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={3}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" className="mr-3" onClick={onClose}>
              {t("profile.cancel")}
            </Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleReject}>
              {t("admin.reject")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalContent>
          <ModalHeader onClose={onDeleteClose}>{t("admin.removeUser")}</ModalHeader>
          <ModalBody>
            <Text className="mb-2">
              {t("admin.removeUserQuestion")} <strong>{deletingId != null ? users.find((u) => u.id === deletingId)?.email ?? "?" : ""}</strong>?
            </Text>
            <Text className="text-[#1F6A5C] dark:text-[#1F6A5C]/60">
              {t("admin.removeUserWarning")}
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" className="mr-3" onClick={onDeleteClose}>
              {t("profile.cancel")}
            </Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleDelete}>
              {t("admin.confirmDeletion")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
