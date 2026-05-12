import type { ReactNode } from "react";
import { FaUser, FaUserTie, FaHeadset, FaBalanceScale, FaKey, FaBug, FaUserCog } from "react-icons/fa";

export const ROLE_DISPLAY: Record<string, string> = {
  "End-User": "User",
  "Security Manager": "Management",
  GSOC: "GSOC",
  GRC: "GRC",
  IAM: "IAM",
  Pentesting: "Pentesting",
  Admin: "Admin",
};

export const ROLE_COLORS: Record<string, string> = {
  "End-User": "#0ea5e9",
  "Security Manager": "#059669",
  GSOC: "#7c3aed",
  GRC: "#d97706",
  IAM: "#0891b2",
  Pentesting: "#dc2626",
  Admin: "#5b7c9a",
};

const ROLE_ICONS: Record<string, ReactNode> = {
  "End-User": <FaUser size={18} />,
  "Security Manager": <FaUserTie size={18} />,
  GSOC: <FaHeadset size={18} />,
  GRC: <FaBalanceScale size={18} />,
  IAM: <FaKey size={18} />,
  Pentesting: <FaBug size={18} />,
  Admin: <FaUserCog size={18} />,
};

export function getRoleIcon(role: string): ReactNode {
  return ROLE_ICONS[role] ?? <FaUser size={18} />;
}

export function getRoleColor(role: string): string {
  return ROLE_COLORS[role] ?? "#64748b";
}
