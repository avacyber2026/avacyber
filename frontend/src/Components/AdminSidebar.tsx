"use client";

import { useEffect, useState } from "react";
import { FaUsers, FaBook } from "react-icons/fa";
import { IoGitPullRequestSharp } from "react-icons/io5";
import { IoSettingsOutline } from "react-icons/io5";
import { AppSidebar, type SidebarLink } from "./AppSidebar";
import { useLanguage } from "@/contexts/LanguageContext";

export function AdminSidebar() {
  const { t } = useLanguage();
  const adminLinks: SidebarLink[] = [
    { name: t("admin.requests"), icon: <IoGitPullRequestSharp />, link: "/admin/requests" },
    { name: t("admin.users"), icon: <FaUsers />, link: "/admin/users" },
    { name: t("admin.userGuide"), icon: <FaBook />, link: "/admin/guide" },
    { name: t("admin.settings"), icon: <IoSettingsOutline />, link: "/admin/settings" },
  ];
  const [username, setUsername] = useState("Admin");
  useEffect(() => {
    try {
      const u = localStorage.getItem("adminUser");
      if (u) setUsername(JSON.parse(u).username ?? "Admin");
    } catch {
      setUsername("Admin");
    }
  }, []);

  return (
    <AppSidebar
      logoText="AVA Cyber"
      userPrimary={username}
      role="Admin"
      links={adminLinks}
      accentColor="#1F6A5C"
    />
  );
}
