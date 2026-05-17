"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { IoChevronBack, IoChevronForward, IoMenu } from "react-icons/io5";
import { FaCog, FaPlug, FaUser } from "react-icons/fa";
import { MdDarkMode, MdLightMode } from "react-icons/md";

import { Drawer, DrawerBody, DrawerContent } from "@/ui";
import { useColorMode } from "@/contexts/ThemeContext";
import { useSidebarLayout } from "@/contexts/SidebarLayoutContext";
import { useDisclosure } from "@/hooks/useDisclosure";
import { useBreakpointValue } from "@/hooks/useBreakpointValue";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SidebarHoverTooltip } from "./SidebarHoverTooltip";
import { getRoleIcon, ROLE_DISPLAY } from "@/constants/roles";

export interface SidebarLink {
  name: string;
  icon?: React.ReactNode;
  link: string;
  badge?: number;
}

interface AppSidebarProps {
  logoText: string;
  userPrimary: string;
  userAvatarUrl?: string | null;
  role?: string;
  links: SidebarLink[];
  accentColor?: string;
}

const S = {
  bg: "#103E36",
  borderRight: "rgba(63,255,163,0.08)",
  divider: "#2D3139",
  mint: "#3FFFA3",
  mintBg: "rgba(63,255,163,0.08)",
  textPrimary: "#F4F3F4",
  textMuted: "rgba(244,243,244,0.50)",
  hoverBg: "#2D3139",
  controlMuted: "rgba(244,243,244,0.40)",
};

function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <img
      src="/logo-dark.png"
      alt="SOChub"
      className="rounded-[7px] shrink-0 select-none"
      style={{ width: size, height: size, objectFit: "cover" }}
      draggable={false}
    />
  );
}

function SidebarContent({
  userPrimary,
  userAvatarUrl,
  role,
  links,
  pathname,
  colorMode,
  toggleColorMode,
  roleLabel,
  onLinkClick,
  t,
  collapsed,
  toggleCollapsed,
  mode,
}: Omit<AppSidebarProps, "logoText" | "accentColor"> & {
  pathname: string | null;
  colorMode: "light" | "dark";
  toggleColorMode: () => void;
  roleLabel: string | null;
  onLinkClick?: () => void;
  t: (key: string) => string;
  collapsed: boolean;
  toggleCollapsed: () => void;
  mode: "desktop" | "drawer";
}) {
  const path = pathname ?? "";
  const isAdmin = path.startsWith("/admin");
  const settingsActive = path === "/settings" || path.startsWith("/settings/");
  const showLabels = mode === "drawer" || !collapsed;

  return (
    <>
      {/* Logo + collapse */}
      <div
        className={`shrink-0 h-14 flex items-center ${showLabels ? "px-4 justify-between" : "justify-center"}`}
        style={{ borderBottom: `1px solid ${S.divider}` }}
      >
        {showLabels ? (
          <>
            <div className="flex items-center gap-2.5">
              <LogoMark size={30} />
              <span className="font-semibold text-[15px] tracking-tight" style={{ color: S.textPrimary }}>
                SOChub
              </span>
            </div>
            {mode === "desktop" && (
              <button
                type="button"
                onClick={toggleCollapsed}
                className="p-1.5 rounded-md transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                style={{ color: S.controlMuted }}
              >
                <IoChevronBack size={15} />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <LogoMark size={28} />
            <SidebarHoverTooltip label="Expand sidebar" enabled>
              <button
                type="button"
                onClick={toggleCollapsed}
                className="p-1.5 rounded-md transition-colors hover:bg-[rgba(255,255,255,0.10)]"
                style={{ color: S.mint }}
              >
                <IoChevronForward size={14} />
              </button>
            </SidebarHoverTooltip>
          </div>
        )}
      </div>

      {/* Nav */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden app-sidebar-nav-scroll px-2 py-3"
        style={{ display: "flex", flexDirection: "column", gap: 1 }}
      >
        {links.map((item, i) => {
          const isActive =
            item.link === "/tickets"
              ? path === "/tickets" || path.startsWith("/tickets/")
              : item.link === "/profile"
              ? path === "/profile" || path === "/settings" || path.startsWith("/settings/")
              : path === item.link;

          return (
            <SidebarHoverTooltip key={i} label={item.name} enabled={!showLabels}>
              <Link href={item.link} className="block w-full" onClick={onLinkClick}>
                <motion.div
                  className={`relative flex items-center cursor-pointer rounded-lg w-full transition-colors ${
                    showLabels ? "gap-3 px-3 py-[7px]" : "justify-center px-0 py-[9px]"
                  } ${
                    isActive
                      ? "text-[#3FFFA3] bg-[rgba(63,255,163,0.08)]"
                      : "text-[rgba(244,243,244,0.50)] hover:text-[rgba(244,243,244,0.88)] hover:bg-[#2D3139]"
                  }`}
                  whileTap={{ scale: 0.97 }}
                >
                  {isActive && showLabels && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-[18px] rounded-r-full"
                      style={{ background: S.mint }}
                    />
                  )}
                  <span className="shrink-0 flex items-center justify-center w-[18px] h-[18px] text-[15px]">
                    {item.icon}
                  </span>
                  {showLabels && (
                    <span className="text-[13px] font-medium flex-1 truncate leading-none">{item.name}</span>
                  )}
                  {typeof item.badge === "number" && item.badge > 0 && (
                    <span
                      className={`${showLabels ? "ml-auto" : "absolute -top-0.5 -right-0.5"} min-w-[17px] h-[17px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none`}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </motion.div>
              </Link>
            </SidebarHoverTooltip>
          );
        })}

        {/* Integrations */}
        {!isAdmin && (
          <div
            className={showLabels ? "mt-4 pt-3" : "mt-3"}
            style={showLabels ? { borderTop: `1px solid ${S.divider}` } : undefined}
          >
            {showLabels && (
              <span
                className="block px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "rgba(244,243,244,0.28)" }}
              >
                {t("sidebar.servicesSection")}
              </span>
            )}
            <SidebarHoverTooltip label={t("sidebar.integrations")} enabled={!showLabels}>
              <Link href="/integrations" onClick={onLinkClick} className="block w-full">
                <motion.div
                  className={`flex items-center cursor-pointer rounded-lg transition-colors ${
                    showLabels ? "gap-3 px-3 py-[7px]" : "justify-center px-0 py-[9px]"
                  } text-[rgba(244,243,244,0.50)] hover:text-[rgba(244,243,244,0.88)] hover:bg-[#2D3139]`}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="shrink-0 flex items-center justify-center w-[18px] h-[18px]">
                    <FaPlug size={13} />
                  </span>
                  {showLabels && (
                    <span className="text-[13px] font-medium truncate leading-none">
                      {t("sidebar.integrations")}
                    </span>
                  )}
                </motion.div>
              </Link>
            </SidebarHoverTooltip>
          </div>
        )}
      </div>

      {/* User + controls */}
      <div className="shrink-0 px-2 py-3" style={{ borderTop: `1px solid ${S.divider}` }}>
        {showLabels ? (
          <>
            <div className="flex items-center gap-2.5 px-2 py-1.5 mb-2 rounded-lg">
              {userAvatarUrl ? (
                <img src={userAvatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
              ) : (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-[11px]"
                  style={{ background: "linear-gradient(135deg, #50BFA0, #1F6A5C)" }}
                >
                  {role ? getRoleIcon(role) : <FaUser size={11} />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate leading-tight" style={{ color: S.textPrimary }}>
                  {userPrimary}
                </div>
                {roleLabel && (
                  <div className="text-[11px] truncate leading-tight" style={{ color: S.mint, opacity: 0.72 }}>
                    {roleLabel}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-0.5 px-1">
              <LanguageSwitcher placement="top" forSidebar compact={false} />
              <Link href="/settings" onClick={onLinkClick}>
                <button
                  type="button"
                  className="p-1.5 rounded-md transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                  style={{ color: settingsActive ? S.mint : S.controlMuted }}
                >
                  <FaCog size={14} />
                </button>
              </Link>
              <button
                type="button"
                onClick={toggleColorMode}
                className="p-1.5 rounded-md transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                style={{ color: S.controlMuted }}
              >
                {colorMode === "dark" ? <MdLightMode size={16} /> : <MdDarkMode size={16} />}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <SidebarHoverTooltip label={userPrimary} enabled>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] mb-0.5"
                style={{ background: "linear-gradient(135deg, #50BFA0, #1F6A5C)" }}
              >
                {userAvatarUrl ? (
                  <img src={userAvatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                ) : role ? (
                  getRoleIcon(role)
                ) : (
                  <FaUser size={11} />
                )}
              </div>
            </SidebarHoverTooltip>
            <SidebarHoverTooltip label={t("settings.language")} enabled>
              <div>
                <LanguageSwitcher placement="top" forSidebar compact />
              </div>
            </SidebarHoverTooltip>
            <SidebarHoverTooltip label={t("sidebar.settings")} enabled>
              <Link href="/settings" onClick={onLinkClick}>
                <button
                  type="button"
                  className="p-1.5 rounded-md"
                  style={{ color: settingsActive ? S.mint : S.controlMuted }}
                >
                  <FaCog size={14} />
                </button>
              </Link>
            </SidebarHoverTooltip>
            <SidebarHoverTooltip
              label={colorMode === "dark" ? t("sidebar.lightTheme") : t("sidebar.darkTheme")}
              enabled
            >
              <button
                type="button"
                onClick={toggleColorMode}
                className="p-1.5 rounded-md"
                style={{ color: S.controlMuted }}
              >
                {colorMode === "dark" ? <MdLightMode size={16} /> : <MdDarkMode size={16} />}
              </button>
            </SidebarHoverTooltip>
          </div>
        )}
      </div>
    </>
  );
}

export function AppSidebar({
  logoText,
  userPrimary,
  userAvatarUrl,
  role,
  links,
  accentColor = "#1F6A5C",
}: AppSidebarProps) {
  const pathname = usePathname();
  const { colorMode, toggleColorMode } = useColorMode();
  const { collapsed, toggleCollapsed, railWidth } = useSidebarLayout();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const btnRef = useRef<HTMLButtonElement>(null);
  const isMobile = useBreakpointValue({ base: true, md: false });
  const { t } = useLanguage();

  const roleLabel = role ? (ROLE_DISPLAY[role] ?? role) : null;

  const contentProps = {
    userPrimary,
    userAvatarUrl,
    role,
    links,
    pathname,
    colorMode,
    toggleColorMode,
    roleLabel,
    onLinkClick: isMobile ? onClose : undefined,
    t,
    collapsed,
    toggleCollapsed,
  };

  if (isMobile) {
    return (
      <>
        <div
          className="fixed top-0 left-0 right-0 h-14 z-40 flex items-center justify-between px-4"
          style={{ background: S.bg, borderBottom: `1px solid ${S.divider}` }}
        >
          <div className="flex items-center gap-2.5">
            <LogoMark size={28} />
            <span className="font-semibold text-[15px] tracking-tight" style={{ color: S.textPrimary }}>
              SOChub
            </span>
          </div>
          <button
            ref={btnRef}
            type="button"
            onClick={onOpen}
            className="p-2 rounded-md transition-colors hover:bg-[rgba(255,255,255,0.06)]"
            style={{ color: S.controlMuted }}
          >
            <IoMenu size={20} />
          </button>
        </div>

        <Drawer
          isOpen={isOpen}
          placement="left"
          onClose={onClose}
          finalFocusRef={btnRef as React.RefObject<HTMLElement>}
        >
          <DrawerContent
            className="!bg-transparent shadow-none border-0 h-full !max-w-[240px]"
          >
            <DrawerBody p={0} display="flex" flexDir="column" className="!p-0 flex-1 min-h-0">
              <div className="h-full flex flex-col" style={{ background: S.bg }}>
                <SidebarContent {...contentProps} mode="drawer" />
              </div>
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <div
      className="fixed left-0 top-0 z-30 h-screen pointer-events-none transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{ width: railWidth }}
    >
      <div
        className="h-full flex flex-col pointer-events-auto"
        style={{ background: S.bg, borderRight: `1px solid ${S.borderRight}` }}
      >
        <SidebarContent {...contentProps} mode="desktop" />
      </div>
    </div>
  );
}
