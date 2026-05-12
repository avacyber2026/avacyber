"use client";

import { useRole } from "./useRole";
import { CREATOR_ROLES, TEAM_ROLES } from "@/types";

export type Permission =
  | "tickets:read"
  | "tickets:create"
  | "tickets:answer"
  | "reports:read"
  | "reports:create"
  | "reports:export"
  | "admin:access"
  | "admin:users"
  | "admin:requests";

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  "End-User": ["tickets:read", "tickets:answer", "reports:read", "reports:create"],
  "Security Manager": ["tickets:read", "tickets:create", "tickets:answer", "reports:read", "reports:export", "admin:access"],
  GSOC: ["tickets:read", "tickets:create", "tickets:answer", "reports:read"],
  GRC: ["tickets:read", "tickets:answer", "reports:read"],
  IAM: ["tickets:read", "tickets:answer", "reports:read"],
  Pentesting: ["tickets:read", "tickets:answer", "reports:read"],
  Admin: ["admin:access", "admin:users", "admin:requests"],
};

/**
 * Returns whether the current user has the given permission.
 * Admin panel uses separate auth (adminToken), so admin:access is only for app roles that see admin link.
 */
export function usePermission(permission: Permission): boolean {
  const role = useRole();
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

export function useCanCreateTickets(): boolean {
  const role = useRole();
  return role !== null && CREATOR_ROLES.includes(role);
}

export function useCanAnswerTickets(): boolean {
  const role = useRole();
  return role !== null && (role === "End-User" || TEAM_ROLES.includes(role));
}
