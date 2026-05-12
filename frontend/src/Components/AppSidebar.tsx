"use client";

import {
  Text,
  VStack,
  HStack,
  Box,
  IconButton,
  Avatar,
  Drawer,
  DrawerBody,
  DrawerContent,
} from "@/ui";
import { useColorMode } from "@/contexts/ThemeContext";
import { useSidebarLayout } from "@/contexts/SidebarLayoutContext";
import { useDisclosure } from "@/hooks/useDisclosure";
import { useBreakpointValue } from "@/hooks/useBreakpointValue";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { FaCog } from "react-icons/fa";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import { IoMenu } from "react-icons/io5";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { FaUser, FaPlug, FaPlus } from "react-icons/fa";
import { getRoleIcon, getRoleColor, ROLE_DISPLAY } from "@/constants/roles";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SidebarHoverTooltip } from "./SidebarHoverTooltip";

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

/** Тёмная тема: поверхность #232522 на фоне страницы #1C1E1C */
/** Как карточки настроек: rounded-lg (UI kit) */
const glassPanel =
  "flex flex-col min-h-0 h-full w-full rounded-lg border border-white/75 dark:border-[#2c2f2c] bg-white/50 dark:bg-[#232522] shadow-[0_10px_44px_-14px_rgba(31,106,92,0.18)] dark:shadow-[0_12px_36px_-8px_rgba(0,0,0,0.55)] overflow-hidden";

function SidebarContent({
  userPrimary,
  userAvatarUrl,
  role,
  links,
  accentColor = "#1F6A5C",
  pathname,
  colorMode,
  toggleColorMode,
  roleLabel,
  roleColor,
  onLinkClick,
  t,
  collapsed,
  toggleCollapsed,
  mode,
}: Omit<AppSidebarProps, "logoText"> & {
  pathname: string | null;
  colorMode: "light" | "dark";
  toggleColorMode: () => void;
  roleLabel: string | null;
  roleColor: string | undefined;
  onLinkClick?: () => void;
  t?: (key: string) => string;
  collapsed: boolean;
  toggleCollapsed: () => void;
  mode: "desktop" | "drawer";
}) {
  const tFn = t ?? ((k: string) => k);
  const path = pathname ?? "";
  const isAdmin = path.startsWith("/admin");
  const settingsActive = path === "/settings" || path.startsWith("/settings/");
  const showLabels = mode === "drawer" || !collapsed;

  return (
    <>
      {/* Profile */}
      <Box className={`shrink-0 border-b border-white/50 dark:border-[#2c2f2c] ${showLabels ? "px-4 py-3" : "px-2 py-3"}`}>
        {showLabels ? (
          <HStack spacing={3} align="center">
            {userAvatarUrl ? (
              <Avatar size="md" name={userPrimary} src={userAvatarUrl} bg="brand.primary" color="white" className="shrink-0 ring-2 ring-[#50BFA0]/40" />
            ) : (
              <Box
                className="w-10 h-10 rounded-full bg-gradient-to-br from-[#50BFA0] to-[#1F6A5C] flex items-center justify-center shrink-0 ring-2 ring-white/60"
                style={{ color: roleColor ?? undefined }}
              >
                {role ? getRoleIcon(role) : <FaUser size={18} className="text-white" />}
              </Box>
            )}
            <VStack align="start" spacing={0} className="flex-1 min-w-0">
              <Text fontSize="sm" fontWeight={700} noOfLines={1} className="text-slate-800 dark:text-white w-full">
                {userPrimary}
              </Text>
              {roleLabel != null ? (
                <Text fontSize="xs" fontWeight={600} noOfLines={1} style={{ color: roleColor ?? accentColor }}>
                  {roleLabel}
                </Text>
              ) : null}
            </VStack>
            {mode === "desktop" && (
              <IconButton
                aria-label={tFn("sidebar.collapse")}
                title={tFn("sidebar.collapse")}
                icon={<IoChevronBack size={20} />}
                variant="ghost"
                onClick={toggleCollapsed}
                className="shrink-0 rounded-md text-slate-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-[#2c2f2c]"
              />
            )}
          </HStack>
        ) : (
          <VStack spacing={2} align="center" className="w-full">
            {userAvatarUrl ? (
              <Avatar size="sm" name={userPrimary} src={userAvatarUrl} bg="brand.primary" color="white" className="ring-2 ring-[#50BFA0]/40" />
            ) : (
              <Box className="w-9 h-9 rounded-full bg-gradient-to-br from-[#50BFA0] to-[#1F6A5C] flex items-center justify-center text-white">
                {role ? getRoleIcon(role) : <FaUser size={14} />}
              </Box>
            )}
            <SidebarHoverTooltip label={tFn("sidebar.expand")} enabled={!showLabels}>
              <IconButton
                aria-label={tFn("sidebar.expand")}
                icon={<IoChevronForward size={18} />}
                variant="ghost"
                onClick={toggleCollapsed}
                className="rounded-md text-slate-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-[#2c2f2c]"
              />
            </SidebarHoverTooltip>
          </VStack>
        )}
      </Box>

      <VStack
        align="stretch"
        spacing={0}
        style={{ gap: "5px" }}
        className="app-sidebar-nav-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-2"
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
              <Link href={item.link} className="w-full min-w-0" onClick={onLinkClick}>
              <motion.div
                className={`flex items-center justify-center gap-2.5 rounded-lg cursor-pointer transition-all w-full ${
                  showLabels ? "px-3 py-2.5" : "px-0 py-2.5 justify-center"
                } ${
                  isActive
                    ? "bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white shadow-md shadow-emerald-900/15 font-semibold"
                    : `text-slate-700 dark:text-gray-200 font-medium hover:bg-white/65 dark:hover:bg-[#2c2f2c] ${!showLabels ? "" : ""}`
                }`}
                whileHover={{ x: showLabels ? 2 : 0 }}
                whileTap={{ scale: 0.98 }}
              >
                <Box className={`relative inline-flex shrink-0 ${isActive ? "text-white" : ""}`} style={!isActive ? { color: accentColor } : undefined}>
                  {item.icon}
                  {typeof item.badge === "number" && item.badge > 0 && (
                    <Box className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none border border-white/90 dark:border-[#1C1E1C]">
                      {item.badge > 99 ? "99+" : item.badge}
                    </Box>
                  )}
                </Box>
                {showLabels && (
                  <Text fontSize="sm" className="flex-1 text-left truncate">
                    {item.name}
                  </Text>
                )}
              </motion.div>
            </Link>
            </SidebarHoverTooltip>
          );
        })}

        {!isAdmin && showLabels && (
          <>
            <Text className="px-2 mt-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1">
              {tFn("sidebar.servicesSection")}
            </Text>
            <Box className="rounded-lg border border-white/70 dark:border-[#2c2f2c] bg-white/55 dark:bg-[#1C1E1C] p-3 space-y-2 dark:shadow-inner">
              <Link
                href="/integrations"
                onClick={onLinkClick}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-700 dark:text-gray-200 hover:bg-white/80 dark:hover:bg-[#2c2f2c] transition-colors"
              >
                <span className="w-8 h-8 rounded-lg bg-[#1F6A5C]/12 dark:bg-[#50BFA0]/15 flex items-center justify-center text-[#1F6A5C]">
                  <FaPlug size={14} />
                </span>
                <span className="font-medium truncate">{tFn("sidebar.integrations")}</span>
              </Link>
              <Link
                href="/integrations"
                onClick={onLinkClick}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-[#1F6A5C] dark:text-[#50BFA0] font-semibold hover:underline"
              >
                <FaPlus size={12} className="shrink-0" />
                {tFn("sidebar.addIntegration")}
              </Link>
            </Box>
          </>
        )}

        {!isAdmin && !showLabels && (
          <SidebarHoverTooltip label={tFn("sidebar.integrations")} enabled>
            <Link
              href="/integrations"
              onClick={onLinkClick}
              className="flex justify-center py-2"
              aria-label={tFn("sidebar.integrations")}
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/60 dark:border-[#2c2f2c] bg-white/45 dark:bg-[#2c2f2c] text-[#1F6A5C] hover:bg-white/70 dark:hover:bg-[#353835]">
                <FaPlug size={16} />
              </span>
            </Link>
          </SidebarHoverTooltip>
        )}
      </VStack>

      {/* Quick settings */}
      <Box className="shrink-0 border-t border-white/50 dark:border-[#2c2f2c] px-2 py-2">
        {showLabels ? (
          <>
            <Text className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
              {tFn("sidebar.quickSettings")}
            </Text>
            <HStack spacing={0} style={{ gap: "5px" }} className="flex-wrap justify-start px-1 items-center">
              <div
                className={
                  showLabels
                    ? "shrink-0 flex items-center self-center h-9"
                    : "flex justify-center items-center w-full h-9"
                }
              >
                <SidebarHoverTooltip label={tFn("settings.language")} enabled={!showLabels}>
                  <span className="inline-flex">
                    <LanguageSwitcher placement="top" forSidebar compact={!showLabels} />
                  </span>
                </SidebarHoverTooltip>
              </div>
              <SidebarHoverTooltip label={tFn("sidebar.settings")} enabled={!showLabels}>
                <Link href="/settings" onClick={onLinkClick}>
                  <IconButton
                    aria-label={tFn("sidebar.settings")}
                    icon={<FaCog size={15} />}
                    variant="ghost"
                    className={
                      settingsActive
                        ? "rounded-md bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white shadow-md shadow-emerald-900/15 hover:opacity-95"
                        : "rounded-md text-slate-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-[#2c2f2c]"
                    }
                  />
                </Link>
              </SidebarHoverTooltip>
              <SidebarHoverTooltip
                label={colorMode === "dark" ? tFn("sidebar.lightTheme") : tFn("sidebar.darkTheme")}
                enabled={!showLabels}
              >
                <IconButton
                  aria-label={colorMode === "dark" ? tFn("sidebar.lightTheme") : tFn("sidebar.darkTheme")}
                  icon={colorMode === "dark" ? <MdLightMode size={18} /> : <MdDarkMode size={18} />}
                  variant="ghost"
                  onClick={toggleColorMode}
                  className="rounded-md text-slate-600 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-[#2c2f2c]"
                />
              </SidebarHoverTooltip>
            </HStack>
          </>
        ) : (
          <VStack spacing={0} align="center" className="py-1" style={{ gap: "5px" }}>
            <SidebarHoverTooltip label={tFn("settings.language")} enabled>
              <div className="flex justify-center items-center w-full h-9">
                <LanguageSwitcher placement="top" forSidebar compact />
              </div>
            </SidebarHoverTooltip>
            <SidebarHoverTooltip label={tFn("sidebar.settings")} enabled>
              <Link href="/settings" onClick={onLinkClick}>
                <IconButton
                  aria-label={tFn("sidebar.settings")}
                  icon={<FaCog size={15} />}
                  variant="ghost"
                  className={
                    settingsActive
                      ? "rounded-md bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white shadow-md shadow-emerald-900/15 hover:opacity-95"
                      : "rounded-md"
                  }
                />
              </Link>
            </SidebarHoverTooltip>
            <SidebarHoverTooltip
              label={colorMode === "dark" ? tFn("sidebar.lightTheme") : tFn("sidebar.darkTheme")}
              enabled
            >
              <IconButton
                aria-label={colorMode === "dark" ? tFn("sidebar.lightTheme") : tFn("sidebar.darkTheme")}
                icon={colorMode === "dark" ? <MdLightMode size={18} /> : <MdDarkMode size={18} />}
                variant="ghost"
                onClick={toggleColorMode}
                className="rounded-md"
              />
            </SidebarHoverTooltip>
          </VStack>
        )}
      </Box>

      {/* CTA: новый инцидент → /tickets/new; подсказка → список /tickets */}
      {!isAdmin && (
        <Box className="shrink-0 px-2 pb-3 pt-1">
          <div
            className={`rounded-lg border border-white/80 dark:border-[#2c2f2c] bg-white/60 dark:bg-[#2c2f2c] text-center shadow-sm dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${showLabels ? "p-4" : "p-3"}`}
          >
            <div className="flex flex-col items-center gap-2 w-full">
              <SidebarHoverTooltip label={tFn("sidebar.newIncidentCta")} enabled={!showLabels}>
                <Link
                  href="/tickets/new"
                  onClick={onLinkClick}
                  className="inline-flex flex-col items-center gap-2 w-full"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#103E36] to-[#1F6A5C] text-white shadow-lg shadow-emerald-900/25 hover:scale-105 transition-transform">
                    <FaPlus size={20} />
                  </span>
                  {showLabels && (
                    <Text fontSize="sm" fontWeight={700} className="text-slate-800 dark:text-white">
                      {tFn("sidebar.newIncidentCta")}
                    </Text>
                  )}
                </Link>
              </SidebarHoverTooltip>
              {showLabels && (
                <Link
                  href="/tickets"
                  onClick={onLinkClick}
                  className="text-xs text-slate-500 dark:text-gray-400 underline-offset-2 hover:underline font-medium"
                >
                  {tFn("sidebar.newIncidentHint")}
                </Link>
              )}
            </div>
          </div>
        </Box>
      )}
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

  const roleLabel = role ? (ROLE_DISPLAY[role] ?? role) : null;
  const roleColor = role ? getRoleColor(role) : undefined;

  const { t } = useLanguage();
  const contentProps = {
    userPrimary,
    userAvatarUrl,
    role,
    links,
    accentColor,
    pathname,
    colorMode,
    toggleColorMode,
    roleLabel,
    roleColor,
    onLinkClick: isMobile ? onClose : undefined,
    t,
    collapsed,
    toggleCollapsed,
  };

  const drawerGlass = `${glassPanel} max-h-[calc(100dvh-24px)]`;

  if (isMobile) {
    return (
      <>
        <Box className="fixed top-0 left-0 right-0 h-14 z-40 flex items-center justify-between px-4 border-b border-white/60 dark:border-[#2c2f2c] bg-white/55 dark:bg-[#232522] backdrop-blur-xl dark:backdrop-blur-none">
          <Text fontSize="lg" fontWeight={700} letterSpacing="tight" style={{ color: accentColor }}>
            {logoText}
          </Text>
          <IconButton
            ref={btnRef}
            aria-label="Open menu"
            icon={<IoMenu size={22} />}
            variant="ghost"
            className="rounded-md text-slate-700 dark:text-gray-200 hover:bg-white/60 dark:hover:bg-white/10"
            onClick={onOpen}
          />
        </Box>
        <Drawer isOpen={isOpen} placement="left" onClose={onClose} finalFocusRef={btnRef as React.RefObject<HTMLElement>}>
          <DrawerContent className="!bg-transparent shadow-none border-0 h-full w-full max-w-[min(100vw-20px,320px)] pl-2.5 py-3">
            <DrawerBody p={0} display="flex" flexDir="column" overflowY="auto" className="flex-1 min-h-0 app-sidebar-nav-scroll pt-1">
              <div className={`${drawerGlass} min-h-0`}>
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
      className="fixed left-0 top-0 z-30 h-screen py-3 pl-3 pr-2 pointer-events-none transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{ width: railWidth }}
    >
      <div className={`${glassPanel} pointer-events-auto`}>
        <SidebarContent {...contentProps} mode="desktop" />
      </div>
    </div>
  );
}
