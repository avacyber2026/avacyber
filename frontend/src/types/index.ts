export interface TicketTimelineEntry {
  id: number;
  authorEmail: string;
  authorName?: string;
  body: string;
  createdAt: string;
}

export interface TicketRecipient {
  userEmail: string;
  acknowledgedAt?: string | null;
  replyText?: string | null;
  createdAt?: string;
}

export interface Ticket {
  id: number;
  title: string;
  text: string;
  status: string;
  priority: string;
  fromUser: string;
  type: string;
  answer: string;
  answerType?: string | null;
  answerComment?: string | null;
  /** Present for Management/GSOC: who created the request */
  createdBy?: string;
  /** Present when API joins users on created_by (GSOC / Management list) */
  createdByRole?: string | null;
  /** Present for Management/GSOC: recipient (user or team) */
  assignedTo?: string;
  /** Present for Management/GSOC: ISO date string */
  createdAt?: string;
  /** SIEM alert / correlation ID (Activity Verification, optional) */
  siemAlertId?: string | null;
  attachmentCount?: number;
  attachments?: ReportAttachment[];
  recipients?: TicketRecipient[];
  recipientCount?: number;
  acknowledgedCount?: number;
}

export interface ReportAttachment {
  id: number;
  originalName: string;
  url: string;
}

export type PipelineStatus =
  | "new"
  | "pending_siem"
  | "siem_linked"
  | "ai_pending"
  | "awaiting_user_info"
  | "ready_gsoc"
  | "in_progress"
  | "resolved";

export interface ReportItem {
  id: string;
  subject: string;
  description: string;
  fromUser: string;
  /** Display as "Firstname L." for privacy */
  reporterDisplay?: string;
  status: boolean;
  answerUser: string;
  priority?: string;
  comment?: string;
  createdAt?: string;
  updatedAt?: string;
  attachments?: ReportAttachment[];
  pipelineStatus?: PipelineStatus;
  reporterEmail?: string;
  hostname?: string;
  /** ISO — when the security event happened (optional if clear in description) */
  incidentAt?: string;
  resolvedAt?: string;
  /** End-user only: hints when pipeline awaits more info */
  supplementHints?: string[];
  slaAckDeadline?: string;
  slaAckAt?: string;
  slaBreached?: boolean;
  siemIncidentId?: string;
  siemIncidentUrl?: string;
  siemAssignee?: string;
  aiResult?: Record<string, unknown>;
  aiCategory?: string;
  aiIsSufficient?: boolean;
}

export type UserStatus =
  | "End-User"
  | "Security Manager"
  | "GSOC"
  | "GRC"
  | "IAM"
  | "Pentesting"
  | "Admin";

/** Roles that can create requests (GSOC, Management) */
export const CREATOR_ROLES: UserStatus[] = ["Security Manager", "GSOC"];

/** Team roles that receive requests and can answer */
export const TEAM_ROLES: UserStatus[] = ["GRC", "IAM", "Pentesting"];

/** Map role to team identifier for assigned_to */
export const ROLE_TO_TEAM: Record<string, string> = {
  GRC: "GRC",
  IAM: "IAM",
  Pentesting: "Pentesting",
};
