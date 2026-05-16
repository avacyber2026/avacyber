"use client";

import { Button, Menu, MenuButton, MenuList, MenuItem, Icon } from "@/ui";
import { IoGlobeOutline } from "react-icons/io5";
import { useLanguage } from "@/contexts/LanguageContext";

type LanguageSwitcherProps = {
  placement?: "bottom" | "top";
  variant?: "default" | "auth";
  /** Glass / sidebar row */
  forSidebar?: boolean;
  /** Icon only (collapsed sidebar) */
  compact?: boolean;
};

export function LanguageSwitcher({
  placement = "top",
  variant = "default",
  forSidebar = false,
  compact = false,
}: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLanguage();
  const isAuth = variant === "auth";
  const label =
    locale === "cs"
      ? t("language.cs")
      : locale === "fr"
        ? t("language.fr")
        : locale === "es"
          ? t("language.es")
          : locale === "de"
            ? t("language.de")
            : t("language.en");

  const globe = (
    <Icon
      as={IoGlobeOutline}
      boxSize={compact ? 5 : 4}
      className={forSidebar && !isAuth ? "text-slate-600 dark:text-gray-200" : undefined}
    />
  );

  const sidebarBtnClass = compact
    ? "h-9 w-9 min-w-0 gap-0 justify-center rounded-md border border-slate-200/90 bg-white/95 text-slate-800 shadow-sm hover:bg-white dark:border-[#192420] dark:bg-[#192420] dark:text-gray-100 dark:hover:bg-[#353835] dark:hover:border-[#3d413d]"
    : "h-9 min-h-9 px-3 gap-2 rounded-md border border-slate-200/90 bg-white/95 text-slate-800 shadow-sm hover:bg-white dark:border-[#192420] dark:bg-[#192420] dark:text-gray-100 dark:hover:bg-[#353835] dark:hover:border-[#3d413d]";

  const sidebarListClass =
    "bg-white text-slate-800 border border-slate-200 shadow-xl ring-1 ring-black/5 rounded-md dark:bg-[#1B2620] dark:text-gray-100 dark:border-[#192420] dark:ring-white/5 z-[200]";

  const itemSidebar = "text-slate-800 hover:bg-slate-100 dark:text-gray-100 dark:hover:bg-[#192420]";

  const defaultBtn =
    "text-gray-700 dark:text-gray-300 hover:bg-brand-primary/10 dark:hover:bg-brand-primary/20 hover:text-brand-primary";

  return (
    <Menu>
      {isAuth ? (
        <MenuButton as={Button} size="sm" variant="solid" leftIcon={globe} className="bg-[#1F6A5C] text-white hover:bg-[#1F6A5C]">
          {label}
        </MenuButton>
      ) : forSidebar ? (
        <MenuButton
          as="button"
          type="button"
          bare
          leftIcon={globe}
          aria-label={compact ? t("settings.language") : undefined}
          className={sidebarBtnClass}
        >
          {!compact && label}
        </MenuButton>
      ) : (
        <MenuButton as={Button} size="sm" variant="ghost" leftIcon={globe} className={defaultBtn}>
          {label}
        </MenuButton>
      )}
      <MenuList
        placement={isAuth ? "bottom" : placement}
        align={isAuth ? "end" : "start"}
        className={
          isAuth
            ? "bg-[#1F6A5C] text-white border border-white/20 shadow-xl"
            : forSidebar
              ? sidebarListClass
              : ""
        }
      >
        <MenuItem
          onClick={() => setLocale("en")}
          className={isAuth ? "bg-[#1F6A5C] text-white hover:bg-[#1F6A5C]/90" : forSidebar ? itemSidebar : ""}
        >
          English
        </MenuItem>
        <MenuItem
          onClick={() => setLocale("cs")}
          className={isAuth ? "bg-[#1F6A5C] text-white hover:bg-[#1F6A5C]/90" : forSidebar ? itemSidebar : ""}
        >
          Czech
        </MenuItem>
        <MenuItem
          onClick={() => setLocale("fr")}
          className={isAuth ? "bg-[#1F6A5C] text-white hover:bg-[#1F6A5C]/90" : forSidebar ? itemSidebar : ""}
        >
          French
        </MenuItem>
        <MenuItem
          onClick={() => setLocale("es")}
          className={isAuth ? "bg-[#1F6A5C] text-white hover:bg-[#1F6A5C]/90" : forSidebar ? itemSidebar : ""}
        >
          Spanish
        </MenuItem>
        <MenuItem
          onClick={() => setLocale("de")}
          className={isAuth ? "bg-[#1F6A5C] text-white hover:bg-[#1F6A5C]/90" : forSidebar ? itemSidebar : ""}
        >
          German
        </MenuItem>
      </MenuList>
    </Menu>
  );
}
