"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { FaUserCog, FaChartLine, FaBook, FaPhone, FaBell, FaUser } from "react-icons/fa";
import { IoGitPullRequestSharp } from "react-icons/io5";
import { MdSecurity } from "react-icons/md";
import type { UserStatus } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@/contexts/UserContext";
import { AppSidebar, type SidebarLink } from "./AppSidebar";
import api from "@/lib/axios";
import { useLanguage } from "@/contexts/LanguageContext";

function getBaseLinks(t: (key: string) => string, unreadNotifications = 0): SidebarLink[] {
  return [
    { name: t("sidebar.dashboard"), icon: <FaChartLine />, link: "/dashboard" },
    { name: "Comms", icon: <IoGitPullRequestSharp />, link: "/tickets" },
    { name: t("sidebar.profile"), icon: <FaUser />, link: "/profile" },
    { name: t("sidebar.userGuide"), icon: <FaBook />, link: "/guide" },
    { name: t("sidebar.securityOnCall"), icon: <FaPhone />, link: "/on-call" },
    { name: t("sidebar.notifications"), icon: <FaBell />, link: "/notifications", badge: unreadNotifications },
  ];
}

export function SideMenu() {
  const router = useRouter();
  const { t } = useLanguage();
  const { role: type, user, isAuthenticated, isLoading } = useAuth();
  const { profile } = useUser() ?? { profile: null };
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const links = useMemo(() => {
    if (type === "Admin") return [{ name: t("sidebar.admin"), icon: <FaUserCog />, link: "/admin" }];
    const base = getBaseLinks(t, unreadNotifications);
    if (type !== "End-User") {
      base.splice(1, 0, { name: "SIEM", icon: <MdSecurity size={16} />, link: "/siem" });
    }
    return base;
  }, [type, t, unreadNotifications]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.push("/");
  }, [isAuthenticated, isLoading, router]);

  const fetchUnreadNotifications = () => {
    if (!isAuthenticated) return;
    api.get("/notifications").then((r) => {
      const data = r.data || [];
      const unread = data.filter((n: { readAt?: string | null }) => n.readAt == null || n.readAt === "").length;
      setUnreadNotifications(unread);
    }).catch(() => {});
  };
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnreadNotifications();
  }, [isAuthenticated]);
  useEffect(() => {
    const onRead = () => fetchUnreadNotifications();
    const onNew = () => fetchUnreadNotifications();
    window.addEventListener("notifications-read", onRead);
    window.addEventListener("notifications-new", onNew);
    return () => {
      window.removeEventListener("notifications-read", onRead);
      window.removeEventListener("notifications-new", onNew);
    };
  }, [isAuthenticated]);

  const fn = profile?.firstName?.trim() ?? "";
  const ln = profile?.lastName?.trim() ?? "";
  const hasName = Boolean(fn || ln);
  const userPrimary = hasName
    ? `${fn} ${ln}`.trim()
    : (profile?.email ?? user?.email ?? type ?? "User");

  return (
    <AppSidebar
      logoText="AVA cyber"
      userPrimary={userPrimary}
      userAvatarUrl={profile?.avatarSrc ?? undefined}
      role={type || undefined}
      links={links}
      accentColor="#1F6A5C"
    />
  );
}
