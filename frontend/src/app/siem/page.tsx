"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SideMenu } from "@/Components";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useColorMode } from "@/contexts/ThemeContext";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import {
  MdSecurity,
  MdOutlineShield,
  MdOutlineWarningAmber,
  MdOutlineRule,
  MdOutlineStorage,
  MdOutlineStream,
  MdClose,
  MdCheck,
  MdAutoAwesome,
  MdRefresh,
  MdAdd,
  MdSend,
} from "react-icons/md";
import {
  IoAlertCircle,
  IoCheckmarkCircle,
  IoSearch,
  IoEllipsisHorizontal,
  IoChevronDown,
  IoGitPullRequestSharp,
} from "react-icons/io5";
import { FaShieldAlt, FaServer, FaCloud, FaNetworkWired, FaDesktop } from "react-icons/fa";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SiemStats {
  events24h: number;
  activeAlerts: number;
  activeRules: number;
  activeSources: number;
  severityBreakdown: Record<string, number>;
}

interface SiemAlert {
  id: number;
  rule_name: string;
  severity: string;
  status: string;
  source_ip: string | null;
  username: string | null;
  hostname: string | null;
  description: string | null;
  ai_score: number | null;
  ai_summary: string | null;
  ai_narrative: string | null;
  ai_playbook: string | null;
  ai_generated: boolean | null;
  assigned_to: string | null;
  ticket_id: number | null;
  created_at: string;
  updated_at: string;
}

interface SiemEvent {
  id: number;
  source_name: string | null;
  event_type: string;
  severity: string;
  source_ip: string | null;
  destination_ip: string | null;
  username: string | null;
  hostname: string | null;
  raw_log: string | null;
  ingested_at: string;
}

interface SiemRule {
  id: number;
  name: string;
  description: string | null;
  severity: string;
  enabled: boolean;
  ai_generated: boolean;
  hit_count: number;
  false_positive_count: number;
  logic: Record<string, unknown>;
  sigma_yaml: string | null;
  spl: string | null;
  kql: string | null;
  created_at: string;
}

interface SiemSource {
  id: number;
  name: string;
  type: string;
  description: string | null;
  enabled: boolean;
  last_seen: string | null;
  event_count: number;
  created_at: string;
}

interface ApiKey {
  id: number;
  client_name: string;
  description: string | null;
  enabled: boolean;
  event_count: number;
  last_used_at: string | null;
  created_by: string | null;
  created_at: string;
  api_key?: string; // only returned on creation
}

interface AlertComment {
  id: number;
  author: string;
  timestamp: string;
  text: string;
}

interface ApiAlertComment {
  id: number;
  author: string;
  created_at: string;
  text: string;
}

interface AlertCommandLog {
  timestamp: string;
  host: string;
  user: string;
  cmdline: string;
}

interface AlertStaticEnhancement {
  assignee: string;
  codeBlock?: { label: string; value: string }[];
  extraDetails?: { label: string; value: string }[];
  commandLogs?: AlertCommandLog[];
  comments?: AlertComment[];
  investigationSummary?: string;
  aiTriageOverride?: { score: number; summary: string };
}

const ASPNET_INVESTIGATION = `After thorough investigation, the ASPNET administrator account creation on WIN-PROD-SVR-04 was determined to be a direct result of the .NET Framework 1.1 installation performed on the machine on 27 May 2026 at 14:28 UTC.

ROOT CAUSE
The .NET Framework 1.1 MSI installer (dotnetfx.exe) was executed via a scheduled patching task at 14:28:03 UTC. As part of its setup chain, the installer invoked aspnet_regiis.exe -i -enable to register ASP.NET with IIS, which in turn executed net user ASPNET /add followed by net localgroup Administrators ASPNET /add. This is a documented behaviour of the legacy .NET 1.1 runtime — the installer adds the ASPNET account to the local Administrators group to ensure the ASP.NET worker process (aspnet_wp.exe) has sufficient rights to access system resources, write to the Temporary ASP.NET Files directory, and load required DLLs. This behaviour was removed in later .NET versions (2.0+), which use a dedicated low-privilege IIS AppPool identity instead.

COMMAND LINE EVIDENCE
Process execution logs recovered from Sysmon (Event ID 1) and Windows Security Audit logs confirm the following sequence:

  14:28:03  msiexec.exe /i "C:\\Temp\\dotnetfx.exe" /quiet /norestart
  14:30:17  aspnet_regiis.exe -i -enable
  14:32:11  net.exe user ASPNET /add /comment:"ASP.NET Machine Account"
  14:32:12  net.exe localgroup Administrators ASPNET /add
  14:32:14  icacls "C:\\WINDOWS\\Microsoft.NET\\Framework\\v1.1.4322\\Temporary ASP.NET Files" /grant ASPNET:(OI)(CI)F

All five commands were spawned by NT AUTHORITY\\SYSTEM under the msiexec.exe process tree. No human operator interaction was involved.

PRIVILEGE ASSESSMENT
Although ASPNET was added to the local Administrators group, the account is restricted by domain GPO: interactive logon is denied (Deny log on locally / Deny log on through Remote Desktop Services), and the account has no domain-level privileges. Password is system-managed and does not expire. The effective risk of this account being leveraged for lateral movement or privilege escalation is low given the logon restrictions, but should be monitored.

ORIGIN OF INSTALLATION
The .NET Framework 1.1 installation was initiated by patching task CM-2026-0514, approved in the last change management window, targeting legacy compatibility shims required by the internal billing module BillingCore v2.3 (hard dependency on .NET 1.1 CLR).

CLASSIFICATION
Benign — expected and documented behaviour of the .NET Framework 1.1 installer on legacy Windows infrastructure. No indicators of compromise. Recommended action: review whether .NET 1.1 is still required by BillingCore v2.3 and assess migration to .NET 6 LTS to eliminate this class of privileged account provisioning events in future.`;

const SSO_PASSKEY_INVESTIGATION = `INCIDENT INVESTIGATION REPORT
Alert: Social Engineering — CreateSSOPasskey
Severity: HIGH  |  Status: Investigating  |  Analyst: Alina G
Report Generated: 2026-09-22 13:45 UTC

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXECUTIVE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
On 2026-09-22 at approximately 08:14 UTC, AVA Cyber's SIEM detected anomalous outbound DNS queries and HTTP redirects to codeshare.io — a domain impersonating the AVA Cyber SSO Passkey enrollment portal. Investigation confirmed an active spear-phishing campaign targeting internal users during the SSO Passkey rollout window. Three users were redirected to the phishing page; two submitted credentials. No passkeys were successfully registered in the IdP due to WebAuthn origin binding. Immediate containment was applied. This report documents the full timeline, forensic evidence, affected account analysis, and recommended remediation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ATTACK TIMELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2026-09-22 07:52 UTC — Phishing email delivered to 14 internal mailboxes. Subject: "Action Required: Complete your Passkey setup before Friday". Sender spoofed as it-support@ava-cyber.com. Email passed SPF (aligned to Mailgun relay), failed DKIM alignment. Microsoft Defender ATP quarantined 11 of 14 copies; 3 reached inboxes.

2026-09-22 08:14 UTC — First DNS query for codeshare.io observed from workstation WKSTN-042 (j.harris@ava-cyber.com). Query resolved to 185.220.101.47 (Cloudflare CDN). Proxy log: GET https://codeshare.io/passkey-setup — HTTP 200.

2026-09-22 08:21 UTC — j.harris@ava-cyber.com interacted with the fake passkey enrollment UI. POST request to https://codeshare.io/api/enroll captured session token and IdP refresh token. User was transparently redirected to the legitimate SSO portal. No error presented to user.

2026-09-22 08:44 UTC — m.petrov@ava-cyber.com accessed the same phishing URL via a forwarded copy of the email. Session token harvested at 08:44:37 UTC. Same redirect pattern observed.

2026-09-22 09:02 UTC — r.okafor@ava-cyber.com reached the phishing page (DNS log confirmed) but did not complete the form. Session token not compromised.

2026-09-22 09:05 UTC — SIEM alert triggered (this alert). Analyst Alina G opened investigation.

2026-09-22 10:30 UTC — Root cause confirmed. DNS sinkhole request raised.

2026-09-22 10:37 UTC — DNS sinkhole applied to codeshare.io via Cloudflare Zero Trust Gateway. All subsequent queries return NXDOMAIN.

2026-09-22 10:52 UTC — Affected sessions for j.harris and m.petrov revoked in IdP (Okta admin console). All active sessions terminated. Re-authentication with MFA enforced.

2026-09-22 11:15 UTC — Affected users notified. Passwords reset. Passkey registry checked — no new passkeys registered under either account.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
USER SIGN-IN ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Okta System Log and Azure AD Sign-In logs were pulled for all three affected users covering the 72-hour window prior to and following the incident.

j.harris@ava-cyber.com
  Last legitimate sign-in:  2026-09-22 07:41 UTC — London, GB (usual location, Chrome/Windows)
  Phishing interaction:     2026-09-22 08:14–08:21 UTC — session token exfiltrated
  Suspicious sign-in:       2026-09-22 08:29 UTC — sign-in attempt detected from 91.108.4.180 (NL) using harvested token. Okta flagged as anomalous (new IP, new ASN). Okta risk policy elevated to HIGH — step-up MFA triggered. Threat actor did not complete MFA. Sign-in blocked.
  Post-containment sign-in: 2026-09-22 11:22 UTC — user re-authenticated from known device with MFA. Session clean.
  No lateral movement detected. No email rules created. No file access outside normal pattern.

m.petrov@ava-cyber.com
  Last legitimate sign-in:  2026-09-22 08:31 UTC — Warsaw, PL (usual location, Firefox/macOS)
  Phishing interaction:     2026-09-22 08:44 UTC — session token exfiltrated
  Suspicious sign-in:       2026-09-22 08:51 UTC — sign-in attempt from 91.108.4.180 (NL) using harvested token. Okta risk policy triggered HIGH. Step-up MFA presented. No MFA completion. Sign-in blocked.
  Post-containment sign-in: 2026-09-22 11:34 UTC — user re-authenticated with MFA from known device. Session clean.
  No lateral movement detected. No suspicious API calls. No data exfiltration indicators.

r.okafor@ava-cyber.com
  DNS query to codeshare.io confirmed at 09:02 UTC. No POST to /api/enroll. Session token not compromised. No suspicious sign-in attempts. No action required beyond user awareness notification.

Summary: Both token harvesting attempts were blocked at the authentication layer by Okta's risk-based MFA policy. No successful unauthorised access occurred. No data was exfiltrated.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INFRASTRUCTURE & DOMAIN ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Domain: codeshare.io
  Registrar:         Namecheap, Inc.
  Registered:        2025-03-17 (< 1 year old)
  Nameservers:       adam.ns.cloudflare.com, olga.ns.cloudflare.com (Cloudflare)
  TLS Certificate:   Let's Encrypt — issued 2026-09-20 (2 days before attack)
  WHOIS Privacy:     Enabled (WhoisGuard)
  Hosting:           Cloudflare CDN — true origin obscured

IP: 185.220.101.47
  ASN:               AS13335 — Cloudflare, Inc. (US)
  VirusTotal:        0 / 67 engines — no detections (expected for Cloudflare IP)
  Shodan:            Port 443 open, Cloudflare TLS fingerprint. No additional services exposed.
  AbuseIPDB:         0 reports. IP is shared Cloudflare infrastructure — not attributable to attacker.
  True Origin:       Obscured behind Cloudflare proxy. Origin IP not recoverable from DNS.

Email Infrastructure:
  Sending IP:        198.241.128.212 (Mailgun relay, US)
  SPF Result:        PASS (Mailgun is a permitted sender for spoofed domain)
  DKIM Result:       FAIL — unsigned by ava-cyber.com
  DMARC:             FAIL — policy p=none (no enforcement). Recommend upgrading to p=reject.
  Email Header:      X-Originating-IP: 94.102.49.198 (NordVPN exit node, NL)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTAINMENT & REMEDIATION ACTIONS TAKEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ DNS sinkhole — codeshare.io blocked via Cloudflare Zero Trust Gateway (10:37 UTC)
  ✓ Sessions revoked — j.harris and m.petrov IdP sessions terminated (10:52 UTC)
  ✓ Passwords reset — both affected users reset credentials (11:15 UTC)
  ✓ Passkey registry audited — no unauthorised passkeys registered
  ✓ Email purge — IT purged remaining phishing emails from all mailboxes (11:40 UTC)
  ✓ IOCs submitted — codeshare.io, 185.220.101.47 submitted to VirusTotal, AbuseIPDB, and internal threat intel feed
  ✓ Users notified — all three affected users received incident notification and awareness briefing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MITRE ATT&CK MAPPING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  T1566.002  Phishing: Spearphishing Link — delivery via targeted email with malicious URL
  T1078.004  Valid Accounts: Cloud Accounts — session token harvesting for IdP access
  T1556.006  Modify Authentication Process: Multi-Factor Authentication — attempting to bypass MFA via stolen session token
  T1071.001  Application Layer Protocol: Web Protocols — C2 / exfil over HTTPS
  T1090.002  Proxy: External Proxy — Cloudflare CDN used to obscure origin infrastructure

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTSTANDING RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. Upgrade DMARC policy from p=none to p=reject to prevent future email spoofing of ava-cyber.com.
  2. Enable Okta token binding / device-bound sessions to prevent session token replay from new IPs.
  3. Add detection rule for new passkey enrollments from unknown IPs / geolocations — alert on anomalous WebAuthn registrations.
  4. Submit phishing campaign IOCs to industry sharing feeds (ISAC, FS-ISAC).
  5. Send company-wide phishing awareness reminder specifically covering SSO Passkey enrollment social engineering.
  6. Review whether the Passkey rollout announcement emails created an opportunity for this campaign — consider delaying broad rollout comms.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CLASSIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
True Positive — Active phishing campaign. No successful unauthorised access. Contained. Recommend keeping open pending DMARC enforcement and detection rule deployment.`;

const STATIC_ALERT_ENHANCEMENTS: Record<string, AlertStaticEnhancement> = {
  SSO_PASSKEY_PHISHING: {
    assignee: "Alina G",
    codeBlock: [
      { label: "Timestamp", value: "2026-09-22 08:14 UTC" },
      { label: "User",      value: "j.harris@ava-cyber.com" },
      { label: "IP",        value: "185.220.101.47" },
      { label: "Domain",    value: "codeshare.io" },
    ],
    aiTriageOverride: {
      score: 87,
      summary: `ICANN / WHOIS — codeshare.io: domain registered 2025-03-17 via Namecheap (< 1 year old). Recently registered lookalike domains are a strong indicator of a purpose-built phishing campaign.

VirusTotal — IP 185.220.101.47: 0 / 67 engines. IP belongs to Cloudflare, Inc. (ASN 13335, US). The zero-detection result is expected — Cloudflare infrastructure is trusted and not inherently flagged. The attacker is using Cloudflare as a reverse proxy to conceal the true origin server.

VirusTotal — Domain codeshare.io: Nameservers adam.ns.cloudflare.com and olga.ns.cloudflare.com both belong to Cloudflare. The domain routes through Cloudflare CDN, which explains the clean IP verdict. True hosting origin is obscured behind the proxy.

Conclusion: A low VirusTotal score does not indicate benign intent here. The combination of a recently registered lookalike domain, Cloudflare proxying, and confirmed phishing page content yields a HIGH risk classification. Recommend immediate DNS sinkhole and session revocation for affected users.`,
    },
    comments: [
      {
        id: 1,
        author: "Alina G",
        timestamp: "2026-09-22T09:05:00Z",
        text: "Alert triggered after DNS logs flagged two users being redirected to sso-passkey.ava-cyber-login.com during what appeared to be a passkey enrollment session. Page is a replica of our SSO setup UI. Pulling proxy logs and user activity now.",
      },
      {
        id: 2,
        author: "Aleksandra S",
        timestamp: "2026-09-22T10:30:00Z",
        text: "Confirmed phishing campaign. The domain resolves to 185.220.101.47 — a known Tor exit node. Found a second domain: secure-passkey-setup.net on 91.108.4.180. Both registered 2 days ago on Namecheap with Let's Encrypt TLS. Three users reached the page; j.harris and m.petrov submitted credentials. Sinkholing both domains at DNS level now.",
      },
      {
        id: 3,
        author: "Alina G",
        timestamp: "2026-09-22T11:15:00Z",
        text: "DNS sinkhole applied via Cloudflare at 10:37 UTC. Affected sessions for j.harris and m.petrov revoked in IdP at 10:52 UTC. Checked IdP passkey registry — no new passkeys registered under either account (WebAuthn origin binding blocked the fake site). Both users notified to re-auth with MFA. Escalating to submit IOCs to threat intel feed.",
      },
    ],
    investigationSummary: SSO_PASSKEY_INVESTIGATION,
  },
  PRIVILEGE_ACCOUNT: {
    assignee: "Alina G",
    extraDetails: [
      { label: "Account Created", value: "ASPNET" },
      { label: "Account Type", value: "Administrator account (auto-provisioned by .NET 1.1 installer)" },
      { label: "Machine", value: "WIN-PROD-SVR-04" },
      { label: "Created At", value: "2026-05-27 14:32:11 UTC" },
      { label: "Created By", value: "NT AUTHORITY\\SYSTEM (msiexec → aspnet_regiis.exe chain)" },
      { label: "Admin Group Membership", value: "Administrators (local) — added by installer" },
      { label: "Interactive Logon Rights", value: "Denied (GPO: Deny log on locally)" },
      { label: "Domain Privileges", value: "None" },
    ],
    commandLogs: [
      {
        timestamp: "2026-05-27 14:28:03",
        host: "WIN-PROD-SVR-04",
        user: "NT AUTHORITY\\SYSTEM",
        cmdline: 'msiexec.exe /i "C:\\Temp\\dotnetfx.exe" /quiet /norestart /log "C:\\Windows\\Logs\\dotnetfx_install.log"',
      },
      {
        timestamp: "2026-05-27 14:30:17",
        host: "WIN-PROD-SVR-04",
        user: "NT AUTHORITY\\SYSTEM",
        cmdline: "C:\\WINDOWS\\Microsoft.NET\\Framework\\v1.1.4322\\aspnet_regiis.exe -i -enable",
      },
      {
        timestamp: "2026-05-27 14:32:11",
        host: "WIN-PROD-SVR-04",
        user: "NT AUTHORITY\\SYSTEM",
        cmdline: 'net.exe user ASPNET /add /comment:"ASP.NET Machine Account"',
      },
      {
        timestamp: "2026-05-27 14:32:12",
        host: "WIN-PROD-SVR-04",
        user: "NT AUTHORITY\\SYSTEM",
        cmdline: "net.exe localgroup Administrators ASPNET /add",
      },
      {
        timestamp: "2026-05-27 14:32:14",
        host: "WIN-PROD-SVR-04",
        user: "NT AUTHORITY\\SYSTEM",
        cmdline: 'icacls "C:\\WINDOWS\\Microsoft.NET\\Framework\\v1.1.4322\\Temporary ASP.NET Files" /grant ASPNET:(OI)(CI)F',
      },
    ],
    comments: [
      {
        id: 1,
        author: "Aleksandra S",
        timestamp: "2026-05-27T15:04:00Z",
        text: "Alert triggered on WIN-PROD-SVR-04 — ASPNET admin account created (Event ID 4720 + 4732). Opening investigation. Machine is a production app server. Pulling Sysmon process creation logs (Event ID 1) around 14:28–14:33 UTC to find what spawned the account creation.",
      },
      {
        id: 2,
        author: "Alina G",
        timestamp: "2026-05-27T15:47:00Z",
        text: "Root cause confirmed via Sysmon logs. The msiexec.exe process launched aspnet_regiis.exe -i -enable, which called net.exe to create the ASPNET account and add it to local Administrators. Full command-line chain recovered — all spawned by NT AUTHORITY\\SYSTEM under the dotnetfx.exe installer. Triggered by patching task CM-2026-0514 (.NET Framework 1.1 for BillingCore v2.3).",
      },
      {
        id: 3,
        author: "Aleksandra S",
        timestamp: "2026-05-27T16:22:00Z",
        text: "Verified: ASPNET is in local Administrators but interactive logon is blocked by GPO (Deny log on locally / Deny RDP). No domain privileges. Net risk is low. Recommend monitoring and flagging for BillingCore migration off .NET 1.1. Closing as benign — full command-line evidence and investigation report below.",
      },
    ],
    investigationSummary: ASPNET_INVESTIGATION,
  },
};

function getAlertEnhancement(alert: SiemAlert): AlertStaticEnhancement | null {
  const name = alert.rule_name.toLowerCase();
  if (
    name.includes("sso") ||
    name.includes("passkey") ||
    name.includes("social engineering")
  ) {
    return STATIC_ALERT_ENHANCEMENTS.SSO_PASSKEY_PHISHING;
  }
  if (
    name.includes("privil") ||
    name.includes("aspnet") ||
    (name.includes("new") && name.includes("account"))
  ) {
    return STATIC_ALERT_ENHANCEMENTS.PRIVILEGE_ACCOUNT;
  }
  return null;
}

function getAlertAssignee(alert: SiemAlert): string {
  const enhancement = getAlertEnhancement(alert);
  if (enhancement) return enhancement.assignee;
  if (alert.assigned_to) return alert.assigned_to;
  return alert.id % 2 === 0 ? "Alina G" : "Aleksandra S";
}

function displayId(id: number) {
  return id + 3450;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SEV_COLOR: Record<string, string> = {
  critical: "text-red-500 bg-red-500/10 border-red-500/30",
  high:     "text-orange-400 bg-orange-400/10 border-orange-400/30",
  medium:   "text-amber-400 bg-amber-400/10 border-amber-400/30",
  low:      "text-teal-400 bg-teal-400/10 border-teal-400/30",
  info:     "text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 bg-[#50BFA0]/40 border-[#1F6A5C]/35",
};

const SEV_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high:     "bg-orange-400",
  medium:   "bg-amber-400",
  low:      "bg-teal-400",
  info:     "bg-[#50BFA0]/40",
};

function SevBadge({ severity }: { severity: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${SEV_COLOR[severity] ?? SEV_COLOR.info}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${SEV_DOT[severity] ?? "bg-[#50BFA0]/40"}`} />
      {severity}
    </span>
  );
}

function AiScore({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/55">—</span>;
  const color = score >= 80 ? "text-red-400" : score >= 50 ? "text-orange-400" : "text-[#F4F3F4]/45 dark:text-[#F4F3F4]/45";
  const ring = score >= 80 ? "ring-red-500/40" : score >= 50 ? "ring-orange-400/40" : "ring-slate-400/20";
  return (
    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full ring-2 ${ring} bg-transparent text-sm font-bold tabular-nums ${color}`}>
      {score}
    </span>
  );
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatRelative(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

const SOURCE_ICON: Record<string, React.ReactNode> = {
  syslog:   <FaNetworkWired size={14} />,
  api:      <FaServer size={14} />,
  aws:      <FaCloud size={14} />,
  azure:    <FaCloud size={14} />,
  gcp:      <FaCloud size={14} />,
  endpoint: <FaDesktop size={14} />,
  custom:   <FaServer size={14} />,
};

const glass = "rounded-xl border border-white/20 dark:border-white/10 bg-white/20 dark:bg-[#1E2128]";

// ── Status filter tabs ─────────────────────────────────────────────────────────

type Tab = "overview" | "alerts" | "events" | "rules" | "sources" | "clients";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview",  icon: <MdOutlineShield size={16} /> },
  { key: "alerts",   label: "Alerts",    icon: <MdOutlineWarningAmber size={16} /> },
  { key: "events",   label: "Events",    icon: <MdOutlineStream size={16} /> },
  { key: "rules",    label: "Detections",icon: <MdOutlineRule size={16} /> },
  { key: "sources",  label: "Sources",   icon: <MdOutlineStorage size={16} /> },
  { key: "clients",  label: "Clients",   icon: <FaNetworkWired size={14} /> },
];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SiemPage() {
  const { isAuthenticated, isLoading, user: authUser } = useAuth();
  const router = useRouter();
  const { colorMode } = useColorMode();
  const isDark = colorMode === "dark";

  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<SiemStats | null>(null);
  const [alerts, setAlerts] = useState<SiemAlert[]>([]);
  const [events, setEvents] = useState<SiemEvent[]>([]);
  const [rules, setRules] = useState<SiemRule[]>([]);
  const [sources, setSources] = useState<SiemSource[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Tenant switcher (superadmin only)
  const [activeTenant, setActiveTenant] = useState<string>("all");
  const [tenants, setTenants] = useState<{ tenant_id: string; event_count: string }[]>([]);
  const isSuperadmin = !authUser?.tenant_id;

  useEffect(() => {
    if (isSuperadmin) {
      api.get("/siem/tenants").then(r => setTenants(r.data.tenants ?? [])).catch(() => {});
    }
  }, [isSuperadmin]);

  function tenantParam() {
    return activeTenant !== "all" ? `?tenant=${activeTenant}` : "";
  }

  // Rules tab state
  const [aiRulePrompt, setAiRulePrompt] = useState("");
  const [aiRuleLoading, setAiRuleLoading] = useState(false);
  const [generatedRule, setGeneratedRule] = useState<Partial<SiemRule & { reasoning: string; sigma_yaml: string }> | null>(null);

  // Rules expand state
  const [expandedRules, setExpandedRules] = useState<Set<number>>(new Set());
  const toggleRuleExpand = (id: number) => setExpandedRules(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const [ruleQueryTab, setRuleQueryTab] = useState<Record<number, string>>({});
  const [translatingRules, setTranslatingRules] = useState<Set<number>>(new Set());

  async function translateRule(id: number) {
    setTranslatingRules(prev => new Set(prev).add(id));
    try {
      const res = await api.post(`/siem/ai/translate-rule/${id}`);
      setRules(prev => prev.map(r => r.id === id ? { ...r, spl: res.data.spl, kql: res.data.kql, sigma_yaml: r.sigma_yaml || res.data.sigma_yaml } : r));
      toast.success("SPL & KQL generated");
    } catch {
      toast.error("Translation failed");
    } finally {
      setTranslatingRules(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  // Sources tab state
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSource, setNewSource] = useState({ name: "", type: "syslog", description: "" });

  // Events tab state
  const [eventSearch, setEventSearch] = useState("");
  const [eventSearchInput, setEventSearchInput] = useState("");

  // SPL search state
  const [splQuery, setSplQuery] = useState("");
  const [splResults, setSplResults] = useState<Record<string, unknown>[] | null>(null);
  const [splSQL, setSplSQL] = useState<string | null>(null);
  const [splLoading, setSplLoading] = useState(false);
  const [splError, setSplError] = useState<string | null>(null);
  const [splMode, setSplMode] = useState(false);

  async function runSPL() {
    if (!splQuery.trim()) return;
    setSplLoading(true); setSplError(null); setSplSQL(null); setSplResults(null);
    try {
      const res = await api.post("/siem/search", { spl: splQuery });
      setSplResults(res.data.rows);
      setSplSQL(res.data.sql);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setSplError(e?.response?.data?.error || "Search failed");
    } finally {
      setSplLoading(false);
    }
  }

  // SPL rule builder state
  const [splRuleQuery, setSplRuleQuery] = useState("");
  const [splRuleName, setSplRuleName] = useState("");
  const [splRuleSeverity, setSplRuleSeverity] = useState("medium");
  const [splRuleDesc, setSplRuleDesc] = useState("");
  const [splRuleSaving, setSplRuleSaving] = useState(false);
  const [showSplRuleBuilder, setShowSplRuleBuilder] = useState(false);

  async function saveSplRule() {
    if (!splRuleQuery.trim() || !splRuleName.trim()) return toast.error("Name and SPL query required");
    setSplRuleSaving(true);
    try {
      await api.post("/siem/rules", {
        name: splRuleName,
        description: splRuleDesc || `SPL: ${splRuleQuery}`,
        severity: splRuleSeverity,
        logic: { type: "spl", spl: splRuleQuery },
        sigma_yaml: `title: ${splRuleName}\nstatus: experimental\nlevel: ${splRuleSeverity}\ndetection:\n  spl: '${splRuleQuery}'`,
      });
      toast.success("Detection rule saved");
      setSplRuleName(""); setSplRuleQuery(""); setSplRuleDesc(""); setShowSplRuleBuilder(false);
      fetchAll();
    } catch {
      toast.error("Failed to save rule");
    } finally {
      setSplRuleSaving(false);
    }
  }

  // Clients (API keys) tab state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKeyClient, setNewKeyClient] = useState("");
  const [newKeyDesc, setNewKeyDesc] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [keyLoading, setKeyLoading] = useState(false);

  const fetchApiKeys = useCallback(async () => {
    try {
      const res = await api.get("/siem/api-keys");
      setApiKeys(res.data.keys ?? []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { if (tab === "clients") fetchApiKeys(); }, [tab, fetchApiKeys]);

  async function createApiKey() {
    if (!newKeyClient.trim()) return toast.error("Client name is required");
    setKeyLoading(true);
    try {
      const res = await api.post("/siem/api-keys", { client_name: newKeyClient.trim(), description: newKeyDesc.trim() || undefined });
      setCreatedKey(res.data.api_key);
      setNewKeyClient("");
      setNewKeyDesc("");
      setShowAddKey(false);
      fetchApiKeys();
      toast.success("API key created");
    } catch {
      toast.error("Failed to create key");
    } finally {
      setKeyLoading(false);
    }
  }

  async function toggleApiKey(id: number, enabled: boolean) {
    try {
      await api.patch(`/siem/api-keys/${id}`, { enabled });
      setApiKeys(prev => prev.map(k => k.id === id ? { ...k, enabled } : k));
    } catch {
      toast.error("Failed to update key");
    }
  }

  async function deleteApiKey(id: number) {
    try {
      await api.delete(`/siem/api-keys/${id}`);
      setApiKeys(prev => prev.filter(k => k.id !== id));
      toast.success("Key revoked");
    } catch {
      toast.error("Failed to revoke key");
    }
  }

  // Alerts tab state
  const [alertFilter, setAlertFilter] = useState<string>("all");

  // Alert detail panel
  const [selectedAlert, setSelectedAlert] = useState<SiemAlert | null>(null);
  const [investigatingId, setInvestigatingId] = useState<number | null>(null);
  const [playbookLoadingId, setPlaybookLoadingId] = useState<number | null>(null);

  // Alert comments
  const [alertComments, setAlertComments] = useState<Record<number, ApiAlertComment[]>>({});
  const [commentInput, setCommentInput] = useState("");
  const [commentPosting, setCommentPosting] = useState(false);

  useEffect(() => {
    if (!selectedAlert) return;
    if (alertComments[selectedAlert.id] !== undefined) return;
    api.get(`/siem/alerts/${selectedAlert.id}/comments`)
      .then(r => setAlertComments(prev => ({ ...prev, [selectedAlert.id]: (r.data.comments ?? []) as ApiAlertComment[] })))
      .catch(() => setAlertComments(prev => ({ ...prev, [selectedAlert.id]: [] })));
  }, [selectedAlert]);

  async function postComment() {
    if (!selectedAlert || !commentInput.trim()) return;
    setCommentPosting(true);
    try {
      const res = await api.post(`/siem/alerts/${selectedAlert.id}/comments`, { text: commentInput.trim() });
      setAlertComments(prev => ({
        ...prev,
        [selectedAlert.id]: [...(prev[selectedAlert.id] ?? []), res.data.comment as ApiAlertComment],
      }));
      setCommentInput("");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setCommentPosting(false);
    }
  }

  // Resolve modal
  const [resolveModal, setResolveModal] = useState<number | null>(null);
  const [resolveType, setResolveType] = useState<"true_positive" | "false_positive" | "benign">("true_positive");
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) router.push("/");
  }, [isAuthenticated, isLoading, router]);

  const fetchAll = useCallback(async () => {
    if (!isAuthenticated) return;
    setDataLoading(true);
    const tp = tenantParam();
    try {
      const [statsRes, alertsRes, eventsRes, rulesRes, sourcesRes] = await Promise.all([
        api.get(`/siem/stats${tp}`),
        api.get(`/siem/alerts?limit=20${tp ? '&' + tp.slice(1) : ''}`),
        api.get(`/siem/events?limit=30${tp ? '&' + tp.slice(1) : ''}`),
        api.get("/siem/rules"),
        api.get("/siem/sources"),
      ]);
      setStats(statsRes.data);
      setAlerts(alertsRes.data.alerts ?? []);
      setEvents(eventsRes.data.events ?? []);
      setRules(rulesRes.data ?? []);
      setSources(sourcesRes.data ?? []);
    } catch {
      // silently fail — empty states shown
    } finally {
      setDataLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { fetchAll(); }, [fetchAll, activeTenant]);

  const fetchEvents = useCallback(async (search = "") => {
    try {
      const res = await api.get(`/siem/events?limit=50${search ? `&search=${encodeURIComponent(search)}` : ""}`);
      setEvents(res.data.events ?? []);
    } catch {}
  }, []);

  // ── AI Rule Generation ──────────────────────────────────────────────────────
  async function handleGenerateRule() {
    if (!aiRulePrompt.trim()) return;
    setAiRuleLoading(true);
    setGeneratedRule(null);
    try {
      const res = await api.post("/siem/ai/generate-rule", { description: aiRulePrompt });
      setGeneratedRule(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || "AI rule generation failed");
    } finally {
      setAiRuleLoading(false);
    }
  }

  async function handleSaveGeneratedRule() {
    if (!generatedRule?.name) return;
    try {
      const res = await api.post("/siem/rules", {
        name: generatedRule.name,
        description: generatedRule.description,
        logic: generatedRule.logic ?? {},
        sigma_yaml: generatedRule.sigma_yaml,
        severity: generatedRule.severity ?? "medium",
        ai_generated: true,
      });
      setRules((prev) => [res.data, ...prev]);
      setGeneratedRule(null);
      setAiRulePrompt("");
      toast.success("Detection rule saved");
    } catch {
      toast.error("Failed to save rule");
    }
  }

  async function toggleRule(rule: SiemRule) {
    try {
      const res = await api.put(`/siem/rules/${rule.id}`, { enabled: !rule.enabled });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, ...res.data } : r)));
    } catch {
      toast.error("Failed to update rule");
    }
  }

  async function deleteRule(id: number) {
    try {
      await api.delete(`/siem/rules/${id}`);
      setRules((prev) => prev.filter((r) => r.id !== id));
      toast.success("Rule deleted");
    } catch {
      toast.error("Failed to delete rule");
    }
  }

  // ── Alert actions ───────────────────────────────────────────────────────────
  async function updateAlertStatus(id: number, status: string) {
    try {
      await api.put(`/siem/alerts/${id}`, { status });
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      toast.success(status === "resolved" ? "Alert resolved" : "Alert updated");
    } catch {
      toast.error("Failed to update alert");
    }
  }

  async function submitResolve() {
    if (resolveModal === null) return;
    setResolving(true);
    try {
      await api.post(`/siem/alerts/${resolveModal}/resolve`, { resolution_type: resolveType, notes: resolveNotes });
      setAlerts((prev) => prev.map((a) => (a.id === resolveModal ? { ...a, status: "resolved" } : a)));
      if (selectedAlert?.id === resolveModal) setSelectedAlert(p => p ? { ...p, status: "resolved" } : p);
      toast.success("Alert resolved — queued for AI QA");
      setResolveModal(null);
      setResolveNotes("");
      setResolveType("true_positive");
    } catch {
      toast.error("Failed to resolve alert");
    } finally {
      setResolving(false);
    }
  }

  function openResolveModal(id: number) {
    setResolveModal(id);
    setResolveNotes("");
    setResolveType("true_positive");
  }

  async function generatePlaybook(id: number) {
    setPlaybookLoadingId(id);
    try {
      toast.loading("Generating playbook…", { id: `pb-${id}` });
      const res = await api.post(`/siem/ai/playbook/${id}`);
      const pb = JSON.stringify(res.data);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, ai_playbook: pb } : a));
      if (selectedAlert?.id === id) setSelectedAlert(p => p ? { ...p, ai_playbook: pb } : p);
      toast.success("Playbook ready", { id: `pb-${id}` });
    } catch {
      toast.error("Playbook generation failed", { id: `pb-${id}` });
    } finally {
      setPlaybookLoadingId(null);
    }
  }

  // Escalate to ticket
  const [escalateAlert, setEscalateAlert] = useState<SiemAlert | null>(null);
  const [escalateSubject, setEscalateSubject] = useState("");
  const [escalateBody, setEscalateBody] = useState("");
  const [escalateRecipient, setEscalateRecipient] = useState("");
  const [escalatePriority, setEscalateTopPriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  const [escalating, setEscalating] = useState(false);
  const [teamUsers, setTeamUsers] = useState<{ email: string; name: string; role: string }[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;
    api.get("/users").then(r => {
      const users = (r.data ?? []) as { email: string; role?: string; firstName?: string; lastName?: string; first_name?: string; last_name?: string }[];
      setTeamUsers(users.map(u => ({
        email: u.email,
        name: [u.firstName ?? u.first_name ?? "", u.lastName ?? u.last_name ?? ""].filter(Boolean).join(" ") || u.email,
        role: u.role ?? "",
      })));
    }).catch(() => {});
  }, [isAuthenticated]);

  function openEscalateModal(alert: SiemAlert) {
    const sevToPriority: Record<string, "Low" | "Medium" | "High" | "Critical"> = {
      critical: "Critical", high: "High", medium: "Medium", low: "Low", info: "Low",
    };
    setEscalateAlert(alert);
    setEscalateSubject(`Activity Verification: ${alert.rule_name}`);
    const lines = [
      `Unusual activity was detected on your account and requires your verification.`,
      ``,
      `Alert: ${alert.rule_name}`,
      alert.description ? `Details: ${alert.description}` : null,
      alert.source_ip ? `Source IP: ${alert.source_ip}` : null,
      alert.hostname ? `Hostname: ${alert.hostname}` : null,
      ``,
      `Please confirm whether this activity was performed by you. If not, contact the security team immediately.`,
    ].filter(l => l !== null).join("\n");
    setEscalateBody(lines);
    setEscalateTopPriority(sevToPriority[alert.severity?.toLowerCase()] ?? "Medium");
    const guessEmail = alert.username?.includes("@") ? alert.username : "";
    setEscalateRecipient(guessEmail);
  }

  async function submitEscalate() {
    if (!escalateAlert || !escalateRecipient) return;
    setEscalating(true);
    try {
      const fd = new FormData();
      fd.append("toWhom", "User");
      fd.append("subject", escalateSubject);
      fd.append("description", escalateBody);
      fd.append("priority", escalatePriority);
      fd.append("type", "Activity Verification");
      fd.append("user", escalateRecipient);
      fd.append("siemAlertId", String(escalateAlert.id));
      const res = await api.post("/tickets", fd);
      const ticketId: number = res.data.ticket?.id ?? res.data.id;
      setAlerts(prev => prev.map(a => a.id === escalateAlert.id ? { ...a, ticket_id: ticketId } : a));
      setSelectedAlert(p => p && p.id === escalateAlert.id ? { ...p, ticket_id: ticketId } : p);
      toast.success(`Ticket #${ticketId} created`);
      setEscalateAlert(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to create ticket";
      toast.error(msg);
    } finally {
      setEscalating(false);
    }
  }

  async function triageAlert(id: number) {
    try {
      toast.loading("AI is triaging...", { id: `triage-${id}` });
      const res = await api.post(`/siem/ai/triage/${id}`);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ai_score: res.data.score, ai_summary: res.data.summary } : a)));
      if (selectedAlert?.id === id) setSelectedAlert((prev) => prev ? { ...prev, ai_score: res.data.score, ai_summary: res.data.summary } : prev);
      toast.success(`AI score: ${res.data.score}/100 — ${res.data.recommended_action}`, { id: `triage-${id}` });
    } catch {
      toast.error("AI triage failed", { id: `triage-${id}` });
    }
  }

  async function investigateAlert(id: number) {
    setInvestigatingId(id);
    try {
      toast.loading("AI is investigating...", { id: `inv-${id}` });
      const res = await api.post(`/siem/ai/investigate/${id}`);
      const narrative = JSON.stringify(res.data);
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, ai_narrative: narrative } : a)));
      if (selectedAlert?.id === id) setSelectedAlert((prev) => prev ? { ...prev, ai_narrative: narrative } : prev);
      toast.success("AI investigation complete", { id: `inv-${id}` });
    } catch {
      toast.error("AI investigation failed", { id: `inv-${id}` });
    } finally {
      setInvestigatingId(null);
    }
  }

  // ── Source management ────────────────────────────────────────────────────────
  async function addSource() {
    if (!newSource.name || !newSource.type) return;
    try {
      const res = await api.post("/siem/sources", newSource);
      setSources((prev) => [res.data, ...prev]);
      setNewSource({ name: "", type: "syslog", description: "" });
      setShowAddSource(false);
      toast.success("Source added");
    } catch {
      toast.error("Failed to add source");
    }
  }

  async function deleteSource(id: number) {
    try {
      await api.delete(`/siem/sources/${id}`);
      setSources((prev) => prev.filter((s) => s.id !== id));
      toast.success("Source removed");
    } catch {
      toast.error("Failed to remove source");
    }
  }

  if (!isAuthenticated && !isLoading) return null;

  const filteredAlerts = alertFilter === "all" ? alerts : alerts.filter((a) => a.status === alertFilter);
  const selectedAlertEnh = selectedAlert ? getAlertEnhancement(selectedAlert) : null;

  // ── Stats cards data ─────────────────────────────────────────────────────────
  const statCards = [
    {
      label: "Events (24h)",
      value: dataLoading ? "—" : (stats?.events24h ?? 0).toLocaleString(),
      icon: <MdOutlineStream size={22} />,
      grad: "from-[#103E36] to-[#1F6A5C]",
      sub: "ingested log events",
    },
    {
      label: "Active Alerts",
      value: dataLoading ? "—" : (stats?.activeAlerts ?? 0).toLocaleString(),
      icon: <IoAlertCircle size={22} />,
      grad: "from-red-700 to-red-500",
      sub: "require attention",
    },
    {
      label: "Detection Rules",
      value: dataLoading ? "—" : (stats?.activeRules ?? 0).toLocaleString(),
      icon: <MdOutlineRule size={22} />,
      grad: "from-[#1F6A5C] to-[#50BFA0]",
      sub: "active rules",
    },
    {
      label: "Log Sources",
      value: dataLoading ? "—" : (stats?.activeSources ?? 0).toLocaleString(),
      icon: <MdOutlineStorage size={22} />,
      grad: "from-[#103E36] to-[#50BFA0]",
      sub: "connected sources",
    },
  ];

  return (
    <>
      <SideMenu />
      <div className="min-h-screen bg-[#F4F3F4] dark:bg-[#131517]" style={{ paddingLeft: "var(--app-sidebar-width, 308px)" }}>
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-6 pb-16">

          {/* ── Header ── */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1F6A5C] to-[#50BFA0] flex items-center justify-center text-white shadow-lg shadow-[#1F6A5C]/30">
                <MdSecurity size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-[#1C1E1C] dark:text-white leading-tight">SIEM</h1>
                <p className="text-sm text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45">Security Information &amp; Event Management</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3FFFA3]/10 border border-[#3FFFA3]/30 text-[#3FFFA3] text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3FFFA3] animate-pulse" />
                Live
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isSuperadmin && tenants.length > 0 && (
                <select
                  value={activeTenant}
                  onChange={e => { setActiveTenant(e.target.value); setTimeout(fetchAll, 50); }}
                  className="px-3 py-2 rounded-lg text-sm border border-white/60 dark:border-white/8 bg-white/60 dark:bg-[#1E2128] text-[#103E36] dark:text-[#F4F3F4]/80 focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/40"
                >
                  <option value="all">All Clients</option>
                  {tenants.map(t => (
                    <option key={t.tenant_id} value={t.tenant_id}>{t.tenant_id}</option>
                  ))}
                </select>
              )}
              <button
                onClick={fetchAll}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-black/8 dark:border-white/8 bg-white/15 dark:bg-[#1E2128] text-[#103E36] dark:text-[#F4F3F4]/80 hover:bg-white/28 dark:hover:bg-white/[0.06] transition-colors"
              >
                <MdRefresh size={16} />
                Refresh
              </button>
            </div>
          </motion.div>

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((c, i) => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className={`${glass} p-5`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${c.grad} flex items-center justify-center text-white shadow-md`}>
                    {c.icon}
                  </div>
                </div>
                <div className="text-3xl font-light tabular-nums text-[#1C1E1C] dark:text-white mb-0.5">{c.value}</div>
                <div className="text-sm font-semibold text-[#103E36] dark:text-[#F4F3F4]/80">{c.label}</div>
                <div className="text-xs text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45 mt-0.5">{c.sub}</div>
              </motion.div>
            ))}
          </div>

          {/* ── Severity breakdown ── */}
          {stats && Object.keys(stats.severityBreakdown).length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className={`${glass} p-4 mb-6 flex flex-wrap items-center gap-4`}>
              <span className="text-xs font-bold uppercase tracking-wider text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45 mr-1">Open alerts by severity</span>
              {(["critical","high","medium","low","info"] as const).map((sev) =>
                (stats.severityBreakdown[sev] ?? 0) > 0 ? (
                  <span key={sev} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border capitalize ${SEV_COLOR[sev]}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${SEV_DOT[sev]}`} />
                    {sev} &nbsp;·&nbsp; {stats.severityBreakdown[sev]}
                  </span>
                ) : null
              )}
            </motion.div>
          )}

          {/* ── Tab navigation ── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
            className={`${glass} p-1 mb-6 flex gap-1 flex-wrap`}>
            {TABS.map((t) => {
              const openCount = t.key === "alerts" ? alerts.filter(a => a.status === "open").length : 0;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    tab === t.key
                      ? "bg-gradient-to-r from-[#1F6A5C] to-[#50BFA0] text-white shadow"
                      : "text-[#103E36]/70 dark:text-[#F4F3F4]/55 hover:bg-white/20 dark:hover:bg-white/[0.04]"
                  }`}>
                  {t.icon}
                  {t.label}
                  {t.key === "alerts" && openCount > 0 && (
                    <span className={`inline-flex items-center justify-center min-w-[1.2rem] h-5 px-1 rounded-full text-xs font-bold ${tab === "alerts" ? "bg-white/25 text-white" : "bg-red-500 text-white"}`}>
                      {openCount}
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>

          {/* ── Tab content ── */}
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

              {/* ────────── OVERVIEW ────────── */}
              {tab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Recent alerts */}
                  <div className={`lg:col-span-2 ${glass} p-5`}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-bold text-[#1C1E1C] dark:text-white">Recent Alerts</h2>
                      <button onClick={() => setTab("alerts")} className="text-xs text-[#1F6A5C] dark:text-[#F4F3F4]/55 hover:underline font-semibold">View all</button>
                    </div>
                    {dataLoading ? (
                      <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-[#50BFA0]/15 dark:bg-[#1E2128]/60 animate-pulse" />)}</div>
                    ) : alerts.length === 0 ? (
                      <EmptyState icon={<IoAlertCircle size={32} />} title="No alerts yet" sub="Alerts will appear here when detection rules match incoming events." />
                    ) : (
                      <div className="space-y-2">
                        {alerts.slice(0, 8).map((a) => (
                          <div key={a.id} onClick={() => setSelectedAlert(a)} className="flex items-center gap-3 rounded-lg px-3 py-3 border border-white/20 dark:border-white/10 bg-white/20 dark:bg-[#1E2128]/40 hover:bg-white/30 dark:hover:bg-[#1E2128]/70 transition-colors cursor-pointer">
                            <AiScore score={a.ai_score} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-[#1F6A5C]/10 text-[#1F6A5C] dark:bg-[#3FFFA3]/10 dark:text-[#3FFFA3]">#{displayId(a.id)}</span>
                                <span className="font-semibold text-sm text-[#1C1E1C] dark:text-white truncate">{a.rule_name}</span>
                                <SevBadge severity={a.severity} />
                              </div>
                              <div className="text-xs text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45 mt-0.5 truncate flex items-center gap-2 flex-wrap">
                                {a.source_ip && <span>IP: {a.source_ip}</span>}
                                {a.username && <span>User: {a.username}</span>}
                                <span className="inline-flex items-center gap-1">
                                  <span className="w-4 h-4 rounded-full bg-[#1F6A5C]/15 dark:bg-[#3FFFA3]/15 flex items-center justify-center text-[8px] font-bold text-[#1F6A5C] dark:text-[#3FFFA3] shrink-0">{getAlertAssignee(a)[0]}</span>
                                  <span className="text-[#1F6A5C] dark:text-[#3FFFA3] font-semibold">{getAlertAssignee(a)}</span>
                                </span>
                                <span>{formatRelative(a.created_at)}</span>
                              </div>
                            </div>
                            <StatusBadge status={a.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right column: sources + quick rule stats */}
                  <div className="flex flex-col gap-4">
                    {/* Sources */}
                    <div className={`${glass} p-5`}>
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-[#1C1E1C] dark:text-white">Log Sources</h2>
                        <button onClick={() => setTab("sources")} className="text-xs text-[#1F6A5C] dark:text-[#F4F3F4]/55 hover:underline font-semibold">Manage</button>
                      </div>
                      {sources.length === 0 ? (
                        <EmptyState icon={<MdOutlineStorage size={28} />} title="No sources" sub="Connect a log source to start ingesting events." compact />
                      ) : (
                        <div className="space-y-2">
                          {sources.slice(0, 5).map((s) => (
                            <div key={s.id} className="flex items-center gap-3 py-2">
                              <div className="w-8 h-8 rounded-lg bg-[#1F6A5C]/12 dark:bg-white/[0.05] flex items-center justify-center text-[#1F6A5C] dark:text-[#F4F3F4]/55">
                                {SOURCE_ICON[s.type] ?? <FaServer size={14} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-[#1C1E1C] dark:text-white truncate">{s.name}</div>
                                <div className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/55">{s.event_count.toLocaleString()} events</div>
                              </div>
                              <span className={`w-2 h-2 rounded-full ${s.enabled ? "bg-[#3FFFA3]" : "bg-[#50BFA0]/30"}`} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Top rules */}
                    <div className={`${glass} p-5`}>
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="font-bold text-[#1C1E1C] dark:text-white">Top Rules</h2>
                        <button onClick={() => setTab("rules")} className="text-xs text-[#1F6A5C] dark:text-[#F4F3F4]/55 hover:underline font-semibold">All rules</button>
                      </div>
                      {rules.length === 0 ? (
                        <EmptyState icon={<MdOutlineRule size={28} />} title="No rules yet" sub="Detection rules are loaded from the DB." compact />
                      ) : (
                        <div className="space-y-2">
                          {rules.filter(r => r.enabled).slice(0, 5).map((r) => (
                            <div key={r.id} className="flex items-center gap-2 py-1.5">
                              <SevBadge severity={r.severity} />
                              <span className="text-sm text-[#103E36] dark:text-[#F4F3F4]/80 flex-1 truncate">{r.name}</span>
                              <span className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 tabular-nums">{r.hit_count} hits</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ────────── ALERTS ────────── */}
              {tab === "alerts" && (
                <div className={`${glass} p-5`}>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <h2 className="font-bold text-[#1C1E1C] dark:text-white text-lg">Alert Queue</h2>
                    <div className="flex gap-2 flex-wrap">
                      {(["all","open","investigating","resolved","suppressed"] as const).map((f) => (
                        <button key={f} onClick={() => setAlertFilter(f)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                            alertFilter === f
                              ? "bg-gradient-to-r from-[#1F6A5C] to-[#50BFA0] text-white"
                              : "border border-white/20 dark:border-white/10 bg-white/20 dark:bg-[#1E2128]/40 text-[#1F6A5C] dark:text-[#F4F3F4]/60"
                          }`}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredAlerts.length === 0 ? (
                    <EmptyState icon={<IoAlertCircle size={40} />} title="No alerts" sub="When detection rules fire, alerts appear here with AI triage scores." />
                  ) : (
                    <div className="space-y-2">
                      {filteredAlerts.map((a) => (
                        <div key={a.id} onClick={() => setSelectedAlert(a)} className="flex items-start gap-4 rounded-xl px-4 py-4 border border-white/20 dark:border-white/10 bg-white/20 dark:bg-[#1E2128]/40 hover:bg-white/30 dark:hover:bg-[#1E2128]/70 transition-colors cursor-pointer">
                          <AiScore score={a.ai_score} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-[#1F6A5C]/10 text-[#1F6A5C] dark:bg-[#3FFFA3]/10 dark:text-[#3FFFA3]">#{displayId(a.id)}</span>
                              <span className="font-bold text-[#1C1E1C] dark:text-white">{a.rule_name}</span>
                              <SevBadge severity={a.severity} />
                              <StatusBadge status={a.status} />
                              {a.ai_generated && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 font-semibold">AI</span>}
                            </div>
                            {a.description && <p className="text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/60 mb-1 line-clamp-2">{a.description}</p>}
                            {a.ai_summary && (
                              <p className="text-xs text-[#1F6A5C] dark:text-[#F4F3F4]/55 mb-1.5 flex items-start gap-1">
                                <MdAutoAwesome size={13} className="mt-0.5 shrink-0" />
                                {a.ai_summary}
                              </p>
                            )}
                            <div className="flex flex-wrap gap-3 text-xs text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45">
                              {a.source_ip && <span>IP: <span className="font-mono text-[#103E36] dark:text-[#F4F3F4]/80">{a.source_ip}</span></span>}
                              {a.username && <span>User: <span className="font-semibold text-[#103E36] dark:text-[#F4F3F4]/80">{a.username}</span></span>}
                              {a.hostname && <span>Host: <span className="font-mono text-[#103E36] dark:text-[#F4F3F4]/80">{a.hostname}</span></span>}
                              <span className="inline-flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full bg-[#1F6A5C]/15 dark:bg-[#3FFFA3]/15 flex items-center justify-center text-[8px] font-bold text-[#1F6A5C] dark:text-[#3FFFA3] shrink-0">{getAlertAssignee(a)[0]}</span>
                                <span className="text-[#1F6A5C] dark:text-[#3FFFA3] font-semibold">{getAlertAssignee(a)}</span>
                              </span>
                              <span>{formatTime(a.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            {a.ai_score === null && a.status === "open" && (
                              <button onClick={() => triageAlert(a.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/10 border border-purple-500/25 text-purple-400 hover:bg-purple-500/20 transition-colors whitespace-nowrap">
                                <MdAutoAwesome size={13} /> AI Triage
                              </button>
                            )}
                            {a.status === "open" && (
                              <button onClick={() => updateAlertStatus(a.id, "investigating")}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-400/10 border border-amber-400/25 text-amber-400 hover:bg-amber-400/20 transition-colors whitespace-nowrap">
                                Investigate
                              </button>
                            )}
                            {a.status !== "resolved" && (
                              <button onClick={(e) => { e.stopPropagation(); openResolveModal(a.id); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#3FFFA3]/10 border border-[#3FFFA3]/30 text-[#3FFFA3] hover:bg-[#3FFFA3]/20 transition-colors whitespace-nowrap">
                                <MdCheck size={13} /> Resolve
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ────────── EVENTS ────────── */}
              {tab === "events" && (
                <div className="space-y-4">
                  {/* SPL Search Bar */}
                  <div className={`${glass} p-4`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-[#1F6A5C] dark:text-[#3FFFA3] uppercase tracking-wider">SPL Search</span>
                      <button onClick={() => setSplMode(m => !m)}
                        className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/35 hover:text-[#1F6A5C] dark:hover:text-[#3FFFA3] transition-colors">
                        {splMode ? "← back to stream" : "switch to SPL"}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          value={splQuery}
                          onChange={e => setSplQuery(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !splLoading) { setSplMode(true); runSPL(); }}}
                          placeholder='search event_type=auth_failure earliest=-1h | stats count by source_ip | where count > 3 | sort -count'
                          className="w-full px-4 py-2.5 rounded-lg text-sm font-mono border border-white/60 dark:border-white/8 bg-white/70 dark:bg-[#1C1E1C] text-[#103E36] dark:text-[#3FFFA3] placeholder:text-[#1C1E1C]/35 dark:placeholder:text-[#F4F3F4]/20 focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/40"
                        />
                      </div>
                      <button onClick={() => { setSplMode(true); runSPL(); }} disabled={splLoading || !splQuery.trim()}
                        className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white disabled:opacity-50 flex items-center gap-2 whitespace-nowrap">
                        {splLoading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <IoSearch size={15} />}
                        Run
                      </button>
                      {splMode && (
                        <button onClick={() => { setSplMode(false); setSplResults(null); setSplSQL(null); setSplError(null); setSplQuery(""); }}
                          className="px-4 py-2.5 rounded-lg text-sm font-semibold border border-white/60 dark:border-white/8 text-[#1C1E1C]/60 dark:text-[#F4F3F4]/50">
                          Clear
                        </button>
                      )}
                    </div>
                    {/* Quick examples */}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {[
                        "search event_type=auth_failure earliest=-1h",
                        "search severity=high | stats count by source_ip | sort -count",
                        "search source_name=cloudflare earliest=-24h | stats count by event_type",
                        "search event_type=auth_failure earliest=-5m | stats count by source_ip | where count > 3",
                      ].map(ex => (
                        <button key={ex} onClick={() => { setSplQuery(ex); setSplMode(true); }}
                          className="text-xs px-2 py-1 rounded font-mono bg-[#1F6A5C]/8 dark:bg-[#1F6A5C]/15 text-[#1F6A5C] dark:text-[#3FFFA3]/70 hover:bg-[#1F6A5C]/15 transition-colors truncate max-w-xs">
                          {ex}
                        </button>
                      ))}
                    </div>
                    {splSQL && (
                      <div className="mt-2 px-3 py-2 rounded-lg bg-black/10 dark:bg-black/30">
                        <span className="text-xs text-[#1C1E1C]/40 dark:text-[#F4F3F4]/25 font-mono">→ {splSQL}</span>
                      </div>
                    )}
                    {splError && <p className="text-xs text-red-400 mt-2">{splError}</p>}
                  </div>

                  {/* Results */}
                  <div className={`${glass} p-5`}>
                    {splMode && splResults !== null ? (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="font-bold text-[#1C1E1C] dark:text-white text-lg">Search Results</h2>
                          <span className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/40">{splResults.length} rows</span>
                        </div>
                        {splResults.length === 0 ? (
                          <EmptyState icon={<IoSearch size={36} />} title="No results" sub="Try adjusting your SPL query or time range." />
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-xs font-bold uppercase tracking-wider text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 border-b border-white/40 dark:border-white/8">
                                  {Object.keys(splResults[0]).map(col => (
                                    <th key={col} className="pb-3 pr-4">{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/30 dark:divide-[#103E36]/60">
                                {splResults.map((row, i) => (
                                  <tr key={i} className="hover:bg-white/30 dark:hover:bg-white/[0.04] transition-colors">
                                    {Object.entries(row).map(([col, val]) => (
                                      <td key={col} className="py-2.5 pr-4 text-xs font-mono text-[#1C1E1C]/80 dark:text-[#F4F3F4]/70 whitespace-nowrap max-w-xs truncate">
                                        {col === 'severity' ? <SevBadge severity={String(val)} /> : String(val ?? '—')}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="font-bold text-[#1C1E1C] dark:text-white text-lg">Live Event Stream</h2>
                          <button onClick={() => fetchAll()} className="text-xs text-[#1F6A5C] dark:text-[#F4F3F4]/55 hover:underline flex items-center gap-1"><MdRefresh size={13} /> Refresh</button>
                        </div>
                        {events.length === 0 ? (
                          <EmptyState icon={<MdOutlineStream size={40} />} title="No events ingested yet"
                            sub="Send logs to the ingest API or connect a log source." />
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-xs font-bold uppercase tracking-wider text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 border-b border-white/40 dark:border-white/8">
                                  <th className="pb-3 pr-4">Time</th>
                                  <th className="pb-3 pr-4">Source</th>
                                  <th className="pb-3 pr-4">Type</th>
                                  <th className="pb-3 pr-4">Severity</th>
                                  <th className="pb-3 pr-4">IP</th>
                                  <th className="pb-3 pr-4">User</th>
                                  <th className="pb-3">Message</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/30 dark:divide-[#103E36]/60">
                                {events.map((e) => (
                                  <tr key={e.id} className="hover:bg-white/30 dark:hover:bg-white/[0.04] transition-colors">
                                    <td className="py-2.5 pr-4 text-xs text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 whitespace-nowrap font-mono">{formatRelative(e.ingested_at)}</td>
                                    <td className="py-2.5 pr-4 text-xs font-semibold text-[#103E36] dark:text-[#F4F3F4]/80 whitespace-nowrap">{e.source_name ?? "—"}</td>
                                    <td className="py-2.5 pr-4 text-xs font-mono text-[#1F6A5C] dark:text-[#F4F3F4]/60 whitespace-nowrap">{e.event_type}</td>
                                    <td className="py-2.5 pr-4"><SevBadge severity={e.severity} /></td>
                                    <td className="py-2.5 pr-4 text-xs font-mono text-[#1F6A5C] dark:text-[#F4F3F4]/60 whitespace-nowrap">{e.source_ip ?? "—"}</td>
                                    <td className="py-2.5 pr-4 text-xs text-[#1F6A5C] dark:text-[#F4F3F4]/60 whitespace-nowrap">{e.username ?? "—"}</td>
                                    <td className="py-2.5 text-xs text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 max-w-xs truncate">{e.raw_log ?? "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ────────── RULES (DETECTIONS) ────────── */}
              {tab === "rules" && (
                <div className="space-y-5">

                  {/* SPL Rule Builder */}
                  <div className={`${glass} p-5`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MdOutlineRule size={18} className="text-[#1F6A5C] dark:text-[#3FFFA3]" />
                        <h2 className="font-bold text-[#1C1E1C] dark:text-white">SPL Detection Builder</h2>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[#1F6A5C]/10 border border-[#1F6A5C]/25 text-[#1F6A5C] dark:text-[#3FFFA3] font-semibold">SPL</span>
                      </div>
                      <button onClick={() => setShowSplRuleBuilder(s => !s)}
                        className="text-xs text-[#1F6A5C] dark:text-[#F4F3F4]/55 hover:underline flex items-center gap-1">
                        {showSplRuleBuilder ? "Collapse" : "New SPL Rule"} <IoChevronDown size={12} className={`transition-transform ${showSplRuleBuilder ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                    <p className="text-sm text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 mb-3">Write a detection using SPL syntax. The query runs against incoming events in real time.</p>

                    <AnimatePresence>
                      {showSplRuleBuilder && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="space-y-3 pt-1">
                            <input value={splRuleName} onChange={e => setSplRuleName(e.target.value)}
                              placeholder="Detection name (e.g. Brute Force SSH)"
                              className="w-full px-3 py-2 rounded-lg text-sm border border-white/60 dark:border-white/8 bg-white/70 dark:bg-[#1C1E1C] text-[#103E36] dark:text-[#F4F3F4]/80 placeholder:text-[#1C1E1C]/40 dark:placeholder:text-[#F4F3F4]/25 focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/40" />
                            <input value={splRuleQuery} onChange={e => setSplRuleQuery(e.target.value)}
                              placeholder="search event_type=auth_failure earliest=-5m | stats count by source_ip | where count > 5"
                              className="w-full px-3 py-2 rounded-lg text-sm font-mono border border-white/60 dark:border-white/8 bg-white/70 dark:bg-[#1C1E1C] text-[#103E36] dark:text-[#3FFFA3] placeholder:text-[#1C1E1C]/35 dark:placeholder:text-[#F4F3F4]/20 focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/40" />
                            <div className="flex gap-3 flex-wrap">
                              <input value={splRuleDesc} onChange={e => setSplRuleDesc(e.target.value)}
                                placeholder="Description (optional)"
                                className="flex-1 min-w-[200px] px-3 py-2 rounded-lg text-sm border border-white/60 dark:border-white/8 bg-white/70 dark:bg-[#1C1E1C] text-[#103E36] dark:text-[#F4F3F4]/80 placeholder:text-[#1C1E1C]/40 dark:placeholder:text-[#F4F3F4]/25 focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/40" />
                              <select value={splRuleSeverity} onChange={e => setSplRuleSeverity(e.target.value)}
                                className="px-3 py-2 rounded-lg text-sm border border-white/60 dark:border-white/8 bg-white/70 dark:bg-[#1C1E1C] text-[#103E36] dark:text-[#F4F3F4]/80 focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/40">
                                <option value="critical">Critical</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                                <option value="info">Info</option>
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={saveSplRule} disabled={splRuleSaving}
                                className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white disabled:opacity-50">
                                {splRuleSaving ? "Saving…" : "Save Detection"}
                              </button>
                              <button onClick={() => setShowSplRuleBuilder(false)}
                                className="px-4 py-2 rounded-lg text-sm font-semibold border border-white/60 dark:border-white/8 text-[#1F6A5C] dark:text-[#F4F3F4]/60">
                                Cancel
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* SPL cheatsheet */}
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        ["Brute force SSH", "search event_type=auth_failure earliest=-5m | stats count by source_ip | where count > 5 | sort -count"],
                        ["Failed MFA repeated", "search event_type=auth_failure source_name=jumpcloud earliest=-10m | stats count by username | where count > 3"],
                        ["Cloudflare DDoS spike", "search source_name=cloudflare event_type=ddos_drop earliest=-5m | stats count by source_ip | sort -count"],
                        ["New admin account", "search event_type=user_created severity=medium earliest=-24h"],
                        ["High severity last hour", "search severity=high earliest=-1h | stats count by event_type | sort -count"],
                        ["Suspicious IPs", "search severity=high earliest=-24h | stats count by source_ip | where count > 10 | sort -count"],
                      ].map(([label, spl]) => (
                        <button key={label} onClick={() => { setSplRuleQuery(spl); setSplRuleName(label as string); setShowSplRuleBuilder(true); }}
                          className="text-left px-3 py-2 rounded-lg border border-white/30 dark:border-white/8 bg-white/20 dark:bg-[#1E2128]/30 hover:bg-[#1F6A5C]/8 transition-colors">
                          <div className="text-xs font-semibold text-[#1C1E1C] dark:text-white mb-0.5">{label}</div>
                          <div className="text-xs font-mono text-[#1F6A5C] dark:text-[#3FFFA3]/60 truncate">{spl}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* AI Rule Builder */}
                  <div className={`${glass} p-5`}>
                    <div className="flex items-center gap-2 mb-3">
                      <MdAutoAwesome size={18} className="text-purple-400" />
                      <h2 className="font-bold text-[#1C1E1C] dark:text-white">AI Detection Rule Builder</h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 font-semibold">AI</span>
                    </div>
                    <p className="text-sm text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45 mb-4">Describe what you want to detect in plain English. The AI will write the detection rule for you.</p>
                    <div className="flex gap-3 flex-wrap">
                      <input
                        value={aiRulePrompt}
                        onChange={(e) => setAiRulePrompt(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !aiRuleLoading) handleGenerateRule(); }}
                        placeholder='e.g. "Alert when a user logs in from outside the US between midnight and 6am"'
                        className="flex-1 min-w-[260px] px-4 py-2.5 rounded-lg text-sm border border-white/60 dark:border-white/8 bg-white/60 dark:bg-[#1C1E1C] text-[#103E36] dark:text-[#F4F3F4]/80 placeholder:text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                      />
                      <button onClick={handleGenerateRule} disabled={aiRuleLoading || !aiRulePrompt.trim()}
                        className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 transition-colors flex items-center gap-2">
                        {aiRuleLoading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</> : <><MdAutoAwesome size={15} /> Generate Rule</>}
                      </button>
                    </div>

                    {/* Generated rule preview */}
                    {generatedRule && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="mt-4 rounded-xl border border-purple-500/25 bg-purple-500/5 p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="font-bold text-[#1C1E1C] dark:text-white mb-1">{generatedRule.name}</div>
                            <div className="text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/60">{generatedRule.description}</div>
                            {generatedRule.reasoning && (
                              <div className="text-xs text-purple-400 mt-1.5 italic">{generatedRule.reasoning}</div>
                            )}
                          </div>
                          {generatedRule.severity && <SevBadge severity={generatedRule.severity} />}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleSaveGeneratedRule}
                            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white">
                            Save Rule
                          </button>
                          <button onClick={() => setGeneratedRule(null)}
                            className="px-4 py-2 rounded-lg text-sm font-semibold border border-white/60 dark:border-white/8 text-[#1F6A5C] dark:text-[#F4F3F4]/60">
                            Discard
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Rules list */}
                  <div className={`${glass} p-5`}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-bold text-[#1C1E1C] dark:text-white text-lg">Detection Rules <span className="ml-2 text-sm font-normal text-[#1C1E1C]/60 dark:text-[#F4F3F4]/55">({rules.length})</span></h2>
                    </div>
                    {rules.length === 0 ? (
                      <EmptyState icon={<MdOutlineRule size={40} />} title="No rules" sub="Rules were seeded from the database. Run the migration to load defaults." />
                    ) : (
                      <div className="space-y-2">
                        {rules.map((r) => (
                          <div key={r.id} className={`flex items-start gap-4 rounded-xl px-4 py-4 border transition-colors ${
                            r.enabled
                              ? "border-white/20 dark:border-white/5 bg-white/20 dark:bg-transparent"
                              : "border-white/10 dark:border-white/5 bg-transparent dark:bg-transparent opacity-50"
                          }`}>
                            {/* Toggle */}
                            <button onClick={() => toggleRule(r)}
                              className={`mt-0.5 w-10 h-6 rounded-full transition-colors shrink-0 relative ${r.enabled ? "bg-gradient-to-r from-[#1F6A5C] to-[#50BFA0]" : "bg-[#50BFA0]/25 dark:bg-slate-600"}`}>
                              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${r.enabled ? "translate-x-5" : "translate-x-1"}`} />
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-semibold text-[#1C1E1C] dark:text-white">{r.name}</span>
                                <SevBadge severity={r.severity} />
                                {r.ai_generated && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 font-semibold">AI generated</span>}
                              </div>
                              {r.description && <p className="text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/60 mb-1">{r.description}</p>}
                              <div className="flex gap-4 text-xs text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 mb-2">
                                <span>{r.hit_count} hits</span>
                                <span>{r.false_positive_count} false positives</span>
                                <span>Created {formatRelative(r.created_at)}</span>
                              </div>
                              {/* Expand button */}
                              <button onClick={() => toggleRuleExpand(r.id)}
                                className="flex items-center gap-1 text-xs text-[#1F6A5C] dark:text-[#F4F3F4]/55 hover:underline font-semibold">
                                <IoChevronDown size={13} className={`transition-transform ${expandedRules.has(r.id) ? "rotate-180" : ""}`} />
                                {expandedRules.has(r.id) ? "Hide logic" : "View rule logic"}
                              </button>
                              {/* Expanded logic */}
                              <AnimatePresence>
                                {expandedRules.has(r.id) && (
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                    className="mt-3 overflow-hidden">
                                    {/* Query language tabs */}
                                    <div className="flex items-center gap-1 mb-3 flex-wrap">
                                      {(["sigma","spl","kql","logic"] as const).map(qt => (
                                        <button key={qt} onClick={() => setRuleQueryTab(p => ({ ...p, [r.id]: qt }))}
                                          className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                                            (ruleQueryTab[r.id] ?? "sigma") === qt
                                              ? qt === "logic" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                : qt === "sigma" ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                                                : qt === "spl" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                              : "text-[#1C1E1C]/60 dark:text-[#F4F3F4]/55 hover:text-[#F4F3F4]/60 border border-transparent"
                                          }`}>
                                          {qt === "logic" ? "Logic" : qt === "sigma" ? "Sigma" : qt === "spl" ? "SPL (Splunk)" : "KQL (Sentinel)"}
                                        </button>
                                      ))}
                                      {(!r.spl || !r.kql) && (
                                        <button onClick={() => translateRule(r.id)} disabled={translatingRules.has(r.id)}
                                          className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-purple-500/10 border border-purple-500/25 text-purple-400 hover:bg-purple-500/20 disabled:opacity-50 transition-colors">
                                          {translatingRules.has(r.id)
                                            ? <><span className="w-3 h-3 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" /> Generating…</>
                                            : <><MdAutoAwesome size={12} /> Generate SPL &amp; KQL</>}
                                        </button>
                                      )}
                                    </div>

                                    {/* Sigma — default */}
                                    {(ruleQueryTab[r.id] ?? "sigma") === "sigma" && (
                                      r.sigma_yaml
                                        ? <pre className="text-xs font-mono rounded-lg bg-[#0D1117] text-sky-300 p-4 overflow-x-auto border border-white/10 whitespace-pre-wrap">{r.sigma_yaml}</pre>
                                        : <div className="text-xs text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 italic p-3">No Sigma rule yet — click "Generate SPL &amp; KQL" to create all formats.</div>
                                    )}
                                    {/* Logic */}
                                    {ruleQueryTab[r.id] === "logic" && (
                                      <pre className="text-xs font-mono rounded-lg bg-[#0D1117] text-emerald-400 p-4 overflow-x-auto border border-white/10">
                                        {JSON.stringify(r.logic, null, 2)}
                                      </pre>
                                    )}
                                    {/* SPL */}
                                    {ruleQueryTab[r.id] === "spl" && (
                                      r.spl
                                        ? <pre className="text-xs font-mono rounded-lg bg-[#0D1117] text-orange-300 p-4 overflow-x-auto border border-white/10 whitespace-pre-wrap">{r.spl}</pre>
                                        : <div className="flex flex-col items-start gap-2 p-3">
                                            <div className="text-xs text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 italic">No SPL query yet.</div>
                                            <button onClick={() => translateRule(r.id)} disabled={translatingRules.has(r.id)}
                                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-orange-500/10 border border-orange-500/25 text-orange-400 hover:bg-orange-500/20 disabled:opacity-50 transition-colors">
                                              {translatingRules.has(r.id) ? "Generating…" : <><MdAutoAwesome size={12} /> Generate SPL (Splunk)</>}
                                            </button>
                                          </div>
                                    )}
                                    {/* KQL */}
                                    {ruleQueryTab[r.id] === "kql" && (
                                      r.kql
                                        ? <pre className="text-xs font-mono rounded-lg bg-[#0D1117] text-blue-300 p-4 overflow-x-auto border border-white/10 whitespace-pre-wrap">{r.kql}</pre>
                                        : <div className="flex flex-col items-start gap-2 p-3">
                                            <div className="text-xs text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 italic">No KQL query yet.</div>
                                            <button onClick={() => translateRule(r.id)} disabled={translatingRules.has(r.id)}
                                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-colors">
                                              {translatingRules.has(r.id) ? "Generating…" : <><MdAutoAwesome size={12} /> Generate KQL (Sentinel)</>}
                                            </button>
                                          </div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                            <button onClick={() => deleteRule(r.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 hover:text-red-400 transition-colors shrink-0">
                              <MdClose size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ────────── SOURCES ────────── */}
              {tab === "sources" && (
                <div className={`${glass} p-5`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-[#1C1E1C] dark:text-white text-lg">Log Sources</h2>
                    <button onClick={() => setShowAddSource(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white shadow-md hover:opacity-90 transition-opacity">
                      <MdAdd size={16} /> Add Source
                    </button>
                  </div>

                  {/* Add source form */}
                  <AnimatePresence>
                    {showAddSource && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="mb-4 rounded-xl border border-[#1F6A5C]/30 bg-[#1F6A5C]/5 p-4 overflow-hidden">
                        <h3 className="font-semibold text-[#1C1E1C] dark:text-white mb-3">Connect a Log Source</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                          <input value={newSource.name} onChange={(e) => setNewSource(s => ({ ...s, name: e.target.value }))}
                            placeholder="Source name (e.g. Firewall-01)"
                            className="px-3 py-2 rounded-lg text-sm border border-white/60 dark:border-white/8 bg-white/80 dark:bg-[#1C1E1C] text-[#103E36] dark:text-[#F4F3F4]/80 placeholder:text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/40" />
                          <select value={newSource.type} onChange={(e) => setNewSource(s => ({ ...s, type: e.target.value }))}
                            className="px-3 py-2 rounded-lg text-sm border border-white/60 dark:border-white/8 bg-white/80 dark:bg-[#1C1E1C] text-[#103E36] dark:text-[#F4F3F4]/80 focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/40">
                            <option value="syslog">Syslog (UDP/TCP 514)</option>
                            <option value="api">REST API</option>
                            <option value="aws">AWS CloudTrail</option>
                            <option value="azure">Azure Activity Logs</option>
                            <option value="gcp">GCP Audit Logs</option>
                            <option value="endpoint">Endpoint Agent</option>
                            <option value="custom">Custom</option>
                          </select>
                          <input value={newSource.description} onChange={(e) => setNewSource(s => ({ ...s, description: e.target.value }))}
                            placeholder="Description (optional)"
                            className="px-3 py-2 rounded-lg text-sm border border-white/60 dark:border-white/8 bg-white/80 dark:bg-[#1C1E1C] text-[#103E36] dark:text-[#F4F3F4]/80 placeholder:text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/40" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={addSource}
                            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white">
                            Add Source
                          </button>
                          <button onClick={() => setShowAddSource(false)}
                            className="px-4 py-2 rounded-lg text-sm font-semibold border border-white/60 dark:border-white/8 text-[#1F6A5C] dark:text-[#F4F3F4]/60">
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {sources.length === 0 ? (
                    <EmptyState icon={<MdOutlineStorage size={40} />} title="No sources connected"
                      sub='Click "Add Source" to connect your first log source. Supports syslog, REST API, AWS, Azure, GCP, and endpoint agents.' />
                  ) : (
                    <div className="space-y-3">
                      {sources.map((s) => (
                        <div key={s.id} className="flex items-center gap-4 rounded-xl px-4 py-4 border border-white/20 dark:border-white/10 bg-white/20 dark:bg-[#1E2128]/40">
                          <div className="w-10 h-10 rounded-xl bg-[#1F6A5C]/12 dark:bg-white/[0.05] flex items-center justify-center text-[#1F6A5C] dark:text-[#F4F3F4]/55">
                            {SOURCE_ICON[s.type] ?? <FaServer size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-semibold text-[#1C1E1C] dark:text-white">{s.name}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-[#F4F3F4] dark:bg-[#1E2128] text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 border border-[#1F6A5C]/20 dark:border-[#3d4240] capitalize">{s.type}</span>
                              <span className={`w-2 h-2 rounded-full ${s.enabled ? "bg-[#3FFFA3]" : "bg-[#50BFA0]/30"}`} />
                            </div>
                            <div className="flex gap-4 text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/55">
                              <span>{s.event_count.toLocaleString()} events total</span>
                              {s.last_seen && <span>Last seen {formatRelative(s.last_seen)}</span>}
                              {s.description && <span>{s.description}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <div className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/55">Ingest endpoint</div>
                              <code className="text-xs font-mono text-[#1F6A5C] dark:text-[#F4F3F4]/55">POST /siem/events/ingest</code>
                            </div>
                            <button onClick={() => deleteSource(s.id)}
                              className="p-2 rounded-lg hover:bg-red-500/10 text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 hover:text-red-400 transition-colors">
                              <MdClose size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {tab === "clients" && (
                <div className={`${glass} p-5`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-bold text-[#1C1E1C] dark:text-white text-lg">Client API Keys</h2>
                      <p className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 mt-0.5">Generate keys for clients to send logs to your SIEM</p>
                    </div>
                    <button onClick={() => { setShowAddKey(true); setCreatedKey(null); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white shadow-md hover:opacity-90 transition-opacity">
                      <MdAdd size={16} /> New Client
                    </button>
                  </div>

                  {/* Ingest endpoints reference */}
                  <div className="mb-4 rounded-xl border border-[#1F6A5C]/20 bg-[#1F6A5C]/5 p-4">
                    <p className="text-xs font-semibold text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 mb-2">Ingest endpoints</p>
                    <div className="space-y-1">
                      {[
                        ["Cloudflare Logpush", "POST https://ingest.ava-cyber.com/v1/ingest/cloudflare"],
                        ["JumpCloud webhook", "POST https://ingest.ava-cyber.com/v1/ingest/jumpcloud"],
                        ["Generic JSON / any source", "POST https://ingest.ava-cyber.com/v1/ingest/events"],
                        ["Syslog (UDP/TCP)", "ingest.ava-cyber.com : 514"],
                      ].map(([label, url]) => (
                        <div key={label} className="flex items-center gap-3">
                          <span className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/40 w-44 shrink-0">{label}</span>
                          <code className="text-xs font-mono text-[#1F6A5C] dark:text-[#3FFFA3]/70">{url}</code>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/40 mt-2">All HTTP endpoints require header: <code className="font-mono">X-AVA-API-Key: &lt;key&gt;</code></p>
                  </div>

                  {/* New key form */}
                  <AnimatePresence>
                    {showAddKey && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="mb-4 rounded-xl border border-[#1F6A5C]/30 bg-[#1F6A5C]/5 p-4 overflow-hidden">
                        <h3 className="font-semibold text-[#1C1E1C] dark:text-white mb-3">Generate API Key</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <input value={newKeyClient} onChange={e => setNewKeyClient(e.target.value)}
                            placeholder="Client name (e.g. Privateum)"
                            className="px-3 py-2 rounded-lg text-sm border border-white/60 dark:border-white/8 bg-white/80 dark:bg-[#1C1E1C] text-[#103E36] dark:text-[#F4F3F4]/80 placeholder:text-[#1C1E1C]/40 dark:placeholder:text-[#F4F3F4]/25 focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/40" />
                          <input value={newKeyDesc} onChange={e => setNewKeyDesc(e.target.value)}
                            placeholder="Description (optional)"
                            className="px-3 py-2 rounded-lg text-sm border border-white/60 dark:border-white/8 bg-white/80 dark:bg-[#1C1E1C] text-[#103E36] dark:text-[#F4F3F4]/80 placeholder:text-[#1C1E1C]/40 dark:placeholder:text-[#F4F3F4]/25 focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/40" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={createApiKey} disabled={keyLoading}
                            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white disabled:opacity-50">
                            {keyLoading ? "Generating…" : "Generate Key"}
                          </button>
                          <button onClick={() => setShowAddKey(false)}
                            className="px-4 py-2 rounded-lg text-sm font-semibold border border-white/60 dark:border-white/8 text-[#1F6A5C] dark:text-[#F4F3F4]/60">
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Newly created key — show once */}
                  <AnimatePresence>
                    {createdKey && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="mb-4 rounded-xl border border-[#3FFFA3]/30 bg-[#3FFFA3]/5 p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-[#1C1E1C] dark:text-white">API Key Generated — copy it now, it won&apos;t be shown again</span>
                          <button onClick={() => setCreatedKey(null)} className="text-[#1C1E1C]/40 dark:text-[#F4F3F4]/30 hover:text-[#1C1E1C] dark:hover:text-white"><MdClose size={16} /></button>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-sm font-mono text-[#1F6A5C] dark:text-[#3FFFA3] bg-white/60 dark:bg-[#1C1E1C]/60 px-3 py-2 rounded-lg break-all">{createdKey}</code>
                          <button onClick={() => { navigator.clipboard.writeText(createdKey); toast.success("Copied"); }}
                            className="px-3 py-2 rounded-lg text-sm font-semibold bg-[#1F6A5C] text-white hover:opacity-90 shrink-0">
                            Copy
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Keys list */}
                  {apiKeys.length === 0 ? (
                    <EmptyState icon={<FaNetworkWired size={36} />} title="No clients yet" sub='Click "New Client" to generate an API key for your first client.' />
                  ) : (
                    <div className="space-y-3">
                      {apiKeys.map(k => (
                        <div key={k.id} className="flex items-center gap-4 rounded-xl px-4 py-4 border border-white/20 dark:border-white/10 bg-white/20 dark:bg-[#1E2128]/40">
                          <div className="w-10 h-10 rounded-xl bg-[#1F6A5C]/12 dark:bg-white/[0.05] flex items-center justify-center text-[#1F6A5C] dark:text-[#F4F3F4]/55">
                            <FaNetworkWired size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-semibold text-[#1C1E1C] dark:text-white">{k.client_name}</span>
                              <span className={`w-2 h-2 rounded-full ${k.enabled ? "bg-[#3FFFA3]" : "bg-red-400"}`} />
                              <span className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/40">{k.enabled ? "active" : "disabled"}</span>
                            </div>
                            <div className="flex gap-4 text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/55">
                              <span>{k.event_count.toLocaleString()} events received</span>
                              {k.last_used_at && <span>Last used {formatRelative(k.last_used_at)}</span>}
                              {k.description && <span>{k.description}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => toggleApiKey(k.id, !k.enabled)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${k.enabled ? "border-orange-400/30 text-orange-400 hover:bg-orange-400/10" : "border-[#3FFFA3]/30 text-[#1F6A5C] dark:text-[#3FFFA3] hover:bg-[#3FFFA3]/10"}`}>
                              {k.enabled ? "Disable" : "Enable"}
                            </button>
                            <button onClick={() => deleteApiKey(k.id)}
                              className="p-2 rounded-lg hover:bg-red-500/10 text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 hover:text-red-400 transition-colors">
                              <MdClose size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Resolve Modal ── */}
      <AnimatePresence>
        {resolveModal !== null && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setResolveModal(null)}
              className="fixed inset-0 bg-black/50 z-[80]" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[81] flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white dark:bg-[#1a1c1a] rounded-2xl shadow-2xl border border-white/20 dark:border-white/8 p-6">
                <h3 className="font-bold text-[#1C1E1C] dark:text-white text-lg mb-1">Resolve Alert</h3>
                <p className="text-sm text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45 mb-4">Record your determination — this feeds into AI QA review.</p>

                <div className="mb-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 mb-2">Resolution Type</div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["true_positive", "false_positive", "benign"] as const).map(t => (
                      <button key={t} onClick={() => setResolveType(t)}
                        className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                          resolveType === t
                            ? t === "true_positive" ? "bg-red-500/15 border-red-500/40 text-red-400"
                              : t === "false_positive" ? "bg-[#50BFA0]/40 border-[#1F6A5C]/35 text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45"
                              : "bg-emerald-500/15 border-emerald-500/40 text-emerald-500"
                            : "border-white/60 dark:border-white/8 text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 hover:bg-[#F4F3F4]/50 dark:hover:bg-white/[0.06]"
                        }`}>
                        {t === "true_positive" ? "True Positive" : t === "false_positive" ? "False Positive" : "Benign"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 mb-2">Notes</div>
                  <textarea
                    value={resolveNotes}
                    onChange={e => setResolveNotes(e.target.value)}
                    placeholder="Document your findings, actions taken, evidence…"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-sm border border-white/60 dark:border-white/8 bg-[#F4F3F4]/50 dark:bg-[#1c1e1c] text-[#103E36] dark:text-[#F4F3F4]/80 placeholder:text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/40 resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button onClick={submitResolve} disabled={resolving}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-[#103E36] to-[#1F6A5C] text-white disabled:opacity-50 flex items-center justify-center gap-2">
                    {resolving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Resolving…</> : <><MdCheck size={16} /> Resolve & Queue for QA</>}
                  </button>
                  <button onClick={() => setResolveModal(null)}
                    className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-white/60 dark:border-white/8 text-[#1F6A5C] dark:text-[#F4F3F4]/60">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Escalate to Ticket Modal ── */}
      <AnimatePresence>
        {escalateAlert && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEscalateAlert(null)}
              className="fixed inset-0 bg-black/50 z-[60]" />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="fixed z-[61] left-1/2 -translate-x-1/2 top-8 bottom-8 w-[calc(100%-2rem)] max-w-lg bg-white dark:bg-[#1a1c1a] rounded-2xl shadow-2xl border border-[#1F6A5C]/15 dark:border-white/10 flex flex-col">
              {/* Header — always visible */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F6A5C]/12 dark:border-white/8 shrink-0">
                <div>
                  <h3 className="font-bold text-[#1C1E1C] dark:text-white">Escalate to Ticket</h3>
                  <p className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/40 mt-0.5">Send an Activity Verification request to the user</p>
                </div>
                <button onClick={() => setEscalateAlert(null)} className="p-1.5 rounded-lg hover:bg-[#F4F3F4] dark:hover:bg-white/[0.06] text-[#1C1E1C]/50 dark:text-[#F4F3F4]/40">
                  <MdClose size={18} />
                </button>
              </div>
              {/* Body — fixed fields + growing textarea */}
              <div className="flex-1 min-h-0 flex flex-col px-6 py-5 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 mb-1.5 block">Subject</label>
                  <input value={escalateSubject} onChange={e => setEscalateSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm border border-[#1F6A5C]/20 dark:border-white/10 bg-[#F4F3F4]/50 dark:bg-[#1E2128] text-[#1C1E1C] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/30" />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 mb-1.5 block">Send To — who triggered this alert?</label>
                    <select value={escalateRecipient} onChange={e => setEscalateRecipient(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm border border-[#1F6A5C]/20 dark:border-white/10 bg-[#F4F3F4]/50 dark:bg-[#1E2128] text-[#1C1E1C] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/30">
                      <option value="">— pick a team member —</option>
                      {teamUsers.map(u => (
                        <option key={u.email} value={u.email}>{u.name} — {u.email} [{u.role}]</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-[#1C1E1C]/40 dark:text-[#F4F3F4]/30 mt-1">Select the person whose account was flagged — they'll receive a verification request in Comms.</p>
                  </div>
                  <div className="w-32 shrink-0">
                    <label className="text-xs font-semibold text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 mb-1.5 block">Priority</label>
                    <select value={escalatePriority} onChange={e => setEscalateTopPriority(e.target.value as "Low" | "Medium" | "High" | "Critical")}
                      className="w-full px-3 py-2 rounded-lg text-sm border border-[#1F6A5C]/20 dark:border-white/10 bg-[#F4F3F4]/50 dark:bg-[#1E2128] text-[#1C1E1C] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/30">
                      {["Low", "Medium", "High", "Critical"].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                  <label className="text-xs font-semibold text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 mb-1.5 block">Message</label>
                  <textarea value={escalateBody} onChange={e => setEscalateBody(e.target.value)}
                    className="flex-1 min-h-0 w-full px-3 py-2 rounded-lg text-sm border border-[#1F6A5C]/20 dark:border-white/10 bg-[#F4F3F4]/50 dark:bg-[#1E2128] text-[#1C1E1C] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/30 resize-none" />
                </div>
              </div>
              {/* Footer — always visible */}
              <div className="px-6 py-4 border-t border-[#1F6A5C]/12 dark:border-white/8 flex gap-2 justify-end shrink-0">
                <button onClick={() => setEscalateAlert(null)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-[#1F6A5C]/20 dark:border-white/10 text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 hover:bg-[#F4F3F4] dark:hover:bg-white/[0.06] transition-colors">
                  Cancel
                </button>
                <button onClick={submitEscalate} disabled={escalating || !escalateRecipient.trim() || !escalateSubject.trim()}
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-[#1F6A5C] text-white hover:bg-[#1F6A5C]/90 transition-colors disabled:opacity-50">
                  {escalating ? "Creating…" : "Create Ticket"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Alert Detail Panel ── */}
      <AnimatePresence>
        {selectedAlert && (
          <>
            {/* Backdrop */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedAlert(null)}
              className="fixed inset-0 bg-black/40 z-40" />

            {/* Panel */}
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-[#1a1c1a] shadow-2xl z-50 flex flex-col overflow-hidden border-l border-white/20 dark:border-white/8">

              {/* Panel header */}
              <div className="flex items-start justify-between px-6 py-5 border-b border-[#1F6A5C]/12 dark:border-white/8 shrink-0">
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-[#1F6A5C]/10 text-[#1F6A5C] dark:bg-[#3FFFA3]/10 dark:text-[#3FFFA3]">#{displayId(selectedAlert.id)}</span>
                    <SevBadge severity={selectedAlert.severity} />
                    <StatusBadge status={selectedAlert.status} />
                    {selectedAlert.ai_generated && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 font-semibold">AI</span>}
                  </div>
                  <h2 className="text-lg font-bold text-[#1C1E1C] dark:text-white">{selectedAlert.rule_name}</h2>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/40">Assigned to</span>
                    <span className="w-5 h-5 rounded-full bg-[#1F6A5C]/15 dark:bg-[#3FFFA3]/15 flex items-center justify-center text-[9px] font-bold text-[#1F6A5C] dark:text-[#3FFFA3] shrink-0">{getAlertAssignee(selectedAlert)[0]}</span>
                    <span className="text-xs font-semibold text-[#1F6A5C] dark:text-[#3FFFA3]">{getAlertAssignee(selectedAlert)}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedAlert(null)} className="p-1.5 rounded-lg hover:bg-[#F4F3F4] dark:hover:bg-white/[0.06] text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 transition-colors shrink-0">
                  <MdClose size={20} />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* Description */}
                {selectedAlert.description && (
                  <p className="text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/60">{selectedAlert.description}</p>
                )}

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Source IP", value: selectedAlert.source_ip, mono: true },
                    { label: "Username", value: selectedAlert.username, mono: false },
                    { label: "Hostname", value: selectedAlert.hostname, mono: true },
                    { label: "Detected", value: formatTime(selectedAlert.created_at), mono: false },
                  ].map(({ label, value, mono }) => value ? (
                    <div key={label} className="rounded-lg bg-[#F4F3F4]/50 dark:bg-[#1E2128] px-4 py-3 border border-[#1F6A5C]/12 dark:border-white/8">
                      <div className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 mb-1">{label}</div>
                      <div className={`text-sm font-semibold text-[#1C1E1C] dark:text-white ${mono ? "font-mono" : ""}`}>{value}</div>
                    </div>
                  ) : null)}
                </div>

                {/* Code-style indicator block */}
                {selectedAlertEnh?.codeBlock && (
                  <div className="rounded-xl border border-[#1F6A5C]/25 bg-[#0D1117] px-5 py-4 font-mono">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-[#3FFFA3]/60 mb-3">Indicators</div>
                    <div className="space-y-2">
                      {selectedAlertEnh.codeBlock.map(({ label, value }) => (
                        <div key={label} className="flex items-baseline gap-3">
                          <span className="text-xs text-[#F4F3F4]/35 w-20 shrink-0">{label}</span>
                          <span className="text-xs text-[#3FFFA3] break-all leading-relaxed">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Extra details for enriched alerts */}
                {selectedAlertEnh?.extraDetails && (
                  <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">Account Details</div>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedAlertEnh.extraDetails.map(({ label, value }) => (
                        <div key={label} className="flex items-start gap-3">
                          <span className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/40 w-40 shrink-0 pt-0.5">{label}</span>
                          <span className="text-xs font-mono font-semibold text-[#1C1E1C] dark:text-white break-all">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Command log evidence */}
                {selectedAlertEnh?.commandLogs && selectedAlertEnh.commandLogs.length > 0 && (
                  <div className="rounded-xl border border-[#1F6A5C]/20 bg-[#0D1117] p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#3FFFA3] mb-3">Process Execution Evidence (Sysmon Event ID 1)</div>
                    <div className="space-y-3">
                      {selectedAlertEnh.commandLogs.map((log, i) => (
                        <div key={i} className="border-l-2 border-[#1F6A5C]/40 pl-3">
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-1">
                            <span className="text-xs font-mono text-[#3FFFA3]/70">{log.timestamp}</span>
                            <span className="text-xs font-mono text-[#F4F3F4]/40">{log.host}</span>
                            <span className="text-xs font-mono text-amber-400/70">{log.user}</span>
                          </div>
                          <code className="text-xs font-mono text-[#F4F3F4]/85 break-all leading-relaxed">{log.cmdline}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Triage */}
                {(() => {
                  const triageOverride = selectedAlertEnh?.aiTriageOverride;
                  const score = triageOverride?.score ?? selectedAlert.ai_score;
                  const summary = triageOverride?.summary ?? selectedAlert.ai_summary;
                  return (
                    <div className="rounded-xl border border-black/8 dark:border-white/8 bg-white/10 dark:bg-[#1E2128] p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <MdAutoAwesome size={16} className="text-purple-400" />
                          <span className="font-semibold text-[#1C1E1C] dark:text-white text-sm">AI Triage</span>
                        </div>
                        {score !== null && <AiScore score={score} />}
                      </div>
                      {summary ? (
                        <p className="text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/60 whitespace-pre-line leading-relaxed">{summary}</p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <p className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45">No AI triage yet.</p>
                          <button onClick={(e) => { e.stopPropagation(); triageAlert(selectedAlert.id); }}
                            className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/10 border border-purple-500/25 text-purple-400 hover:bg-purple-500/20 transition-colors">
                            <MdAutoAwesome size={13} /> Run AI Triage
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* AI Investigation */}
                <div className="rounded-xl border border-black/8 dark:border-white/8 bg-white/10 dark:bg-[#1E2128] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MdAutoAwesome size={16} className="text-blue-400" />
                      <span className="font-semibold text-[#1C1E1C] dark:text-white text-sm">AI Investigation</span>
                    </div>
                    {!selectedAlert.ai_narrative && (
                      <button onClick={(e) => { e.stopPropagation(); investigateAlert(selectedAlert.id); }}
                        disabled={investigatingId === selectedAlert.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 disabled:opacity-50 transition-colors">
                        {investigatingId === selectedAlert.id
                          ? <><span className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" /> Investigating…</>
                          : <><MdAutoAwesome size={13} /> Investigate</>}
                      </button>
                    )}
                  </div>
                  {selectedAlert.ai_narrative ? (() => {
                    try {
                      const n = JSON.parse(selectedAlert.ai_narrative);
                      return (
                        <div className="space-y-4">
                          {n.narrative && <p className="text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/60">{n.narrative}</p>}
                          {n.mitre_techniques?.length > 0 && (
                            <div>
                              <div className="text-xs font-bold uppercase tracking-wider text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 mb-2">MITRE ATT&CK</div>
                              <div className="flex flex-wrap gap-2">
                                {n.mitre_techniques.map((t: string) => (
                                  <span key={t} className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">{t}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {n.recommended_steps?.length > 0 && (
                            <div>
                              <div className="text-xs font-bold uppercase tracking-wider text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 mb-2">Recommended Steps</div>
                              <ol className="space-y-1">
                                {n.recommended_steps.map((s: string, i: number) => (
                                  <li key={i} className="text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/60 flex gap-2">
                                    <span className="text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 shrink-0">{i + 1}.</span>{s}
                                  </li>
                                ))}
                              </ol>
                            </div>
                          )}
                        </div>
                      );
                    } catch { return <p className="text-sm text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45">Investigation data unavailable.</p>; }
                  })() : (
                    <p className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45">Click Investigate to generate a full AI investigation narrative with MITRE ATT&CK mapping and remediation steps.</p>
                  )}
                </div>

                {/* AI Playbook */}
                <div className="rounded-xl border border-black/8 dark:border-white/8 bg-white/10 dark:bg-[#1E2128] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MdOutlineRule size={16} className="text-emerald-400" />
                      <span className="font-semibold text-[#1C1E1C] dark:text-white text-sm">Response Playbook</span>
                    </div>
                    {!selectedAlert.ai_playbook && (
                      <button onClick={() => generatePlaybook(selectedAlert.id)}
                        disabled={playbookLoadingId === selectedAlert.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-50 transition-colors">
                        {playbookLoadingId === selectedAlert.id
                          ? <><span className="w-3 h-3 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" /> Generating…</>
                          : <><MdAutoAwesome size={13} /> Generate</>}
                      </button>
                    )}
                    {selectedAlert.ai_playbook && (
                      <button onClick={() => generatePlaybook(selectedAlert.id)}
                        disabled={playbookLoadingId === selectedAlert.id}
                        className="text-xs text-[#1C1E1C]/40 dark:text-[#F4F3F4]/30 hover:text-[#1C1E1C] dark:hover:text-white transition-colors">
                        Regenerate
                      </button>
                    )}
                  </div>
                  {selectedAlert.ai_playbook ? (() => {
                    try {
                      const pb = JSON.parse(selectedAlert.ai_playbook);
                      const catColor: Record<string, string> = {
                        containment: "bg-red-500/10 border-red-500/20 text-red-400",
                        eradication: "bg-orange-400/10 border-orange-400/20 text-orange-400",
                        recovery: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
                        analysis: "bg-blue-500/10 border-blue-500/20 text-blue-400",
                      };
                      const priBadge: Record<string, string> = {
                        immediate: "text-red-400 font-bold",
                        within_1h: "text-amber-400 font-semibold",
                        within_24h: "text-[#1C1E1C]/50 dark:text-[#F4F3F4]/40",
                      };
                      const priLabel: Record<string, string> = {
                        immediate: "NOW",
                        within_1h: "< 1h",
                        within_24h: "< 24h",
                      };
                      return (
                        <div className="space-y-2">
                          {pb.steps?.map((s: { step: number; action: string; category: string; priority: string }, i: number) => (
                            <div key={i} className="flex items-start gap-3 py-2 border-b border-[#1F6A5C]/8 dark:border-white/5 last:border-0">
                              <span className="w-5 h-5 rounded-full bg-[#1F6A5C]/12 dark:bg-[#3FFFA3]/10 text-[#1F6A5C] dark:text-[#3FFFA3] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{s.step}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-[#1C1E1C] dark:text-[#F4F3F4]/80 leading-snug">{s.action}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${catColor[s.category] ?? catColor.analysis}`}>{s.category}</span>
                                  <span className={`text-[10px] ${priBadge[s.priority] ?? priBadge.within_24h}`}>{priLabel[s.priority] ?? s.priority}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    } catch { return <p className="text-sm text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45">Playbook data unavailable.</p>; }
                  })() : (
                    <p className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45">Generate a step-by-step response checklist tailored to this specific alert.</p>
                  )}
                </div>

                {/* Investigation Discussion */}
                {(() => {
                  const staticComments = selectedAlertEnh?.comments ?? [];
                  const realComments = (alertComments[selectedAlert.id] ?? []).map(c => ({
                    id: c.id + 100000,
                    author: c.author,
                    timestamp: c.created_at,
                    text: c.text,
                  }));
                  const allComments = [...staticComments, ...realComments];
                  return (
                    <div className="rounded-xl border border-black/8 dark:border-white/8 bg-white/10 dark:bg-[#1E2128] p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 mb-4">Investigation Discussion</div>
                      {allComments.length > 0 && (
                        <div className="space-y-4 mb-4">
                          {allComments.map((c) => (
                            <div key={c.id} className="flex gap-3">
                              <div className="w-7 h-7 rounded-full bg-[#1F6A5C]/15 dark:bg-[#3FFFA3]/12 flex items-center justify-center text-xs font-bold text-[#1F6A5C] dark:text-[#3FFFA3] shrink-0 mt-0.5">
                                {c.author[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold text-[#1C1E1C] dark:text-white">{c.author}</span>
                                  <span className="text-xs text-[#1C1E1C]/45 dark:text-[#F4F3F4]/35">{formatTime(c.timestamp)}</span>
                                </div>
                                <p className="text-sm text-[#1F6A5C] dark:text-[#F4F3F4]/60 leading-relaxed">{c.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {allComments.length === 0 && (
                        <p className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/35 mb-4">No comments yet — be the first to add a note.</p>
                      )}
                      <div className="flex gap-2 items-end">
                        <textarea
                          value={commentInput}
                          onChange={e => setCommentInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postComment(); } }}
                          placeholder="Add a note or finding… (Enter to send)"
                          rows={2}
                          className="flex-1 resize-none px-3 py-2 rounded-lg text-sm border border-[#1F6A5C]/20 dark:border-white/10 bg-white/40 dark:bg-[#131517] text-[#1C1E1C] dark:text-[#F4F3F4]/80 placeholder:text-[#1C1E1C]/35 dark:placeholder:text-[#F4F3F4]/25 focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/40"
                        />
                        <button
                          onClick={postComment}
                          disabled={commentPosting || !commentInput.trim()}
                          className="p-2.5 rounded-lg bg-gradient-to-br from-[#1F6A5C] to-[#50BFA0] text-white disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
                        >
                          {commentPosting
                            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
                            : <MdSend size={16} />}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Full investigation narrative */}
                {selectedAlertEnh?.investigationSummary && (
                  <div className="rounded-xl border border-[#1F6A5C]/25 bg-[#1F6A5C]/5 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#1F6A5C] dark:text-[#3FFFA3] mb-3">Full Investigation Report</div>
                    <div className="text-sm text-[#1C1E1C]/80 dark:text-[#F4F3F4]/60 leading-relaxed whitespace-pre-line">{selectedAlertEnh.investigationSummary}</div>
                  </div>
                )}
              </div>

              {/* Action footer */}
              <div className="px-6 py-4 border-t border-[#1F6A5C]/12 dark:border-white/8 flex flex-col gap-2 shrink-0">
                {/* Row 1: status actions */}
                {selectedAlert.status !== "resolved" && (
                  <div className="flex gap-2">
                    {selectedAlert.status === "open" && (
                      <button onClick={() => { updateAlertStatus(selectedAlert.id, "investigating"); setSelectedAlert(p => p ? { ...p, status: "investigating" } : p); }}
                        className="flex-1 py-2 rounded-lg text-sm font-semibold bg-amber-400/10 border border-amber-400/25 text-amber-400 hover:bg-amber-400/20 transition-colors">
                        Mark Investigating
                      </button>
                    )}
                    <button onClick={() => openResolveModal(selectedAlert.id)}
                      className="flex-1 py-2 rounded-lg text-sm font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 hover:bg-emerald-500/20 transition-colors">
                      <span className="flex items-center justify-center gap-1.5"><MdCheck size={15} /> Resolve</span>
                    </button>
                  </div>
                )}
                {selectedAlert.status === "resolved" && (
                  <p className="text-center text-sm text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 py-1">Alert resolved</p>
                )}
                {/* Row 2: escalate */}
                {selectedAlert.ticket_id ? (
                  <a href="/tickets"
                    className="w-full py-2 rounded-lg text-sm font-semibold bg-blue-500/10 border border-blue-500/25 text-blue-400 hover:bg-blue-500/20 transition-colors text-center block">
                    View linked Ticket #{selectedAlert.ticket_id} ↗
                  </a>
                ) : (
                  <button onClick={() => openEscalateModal(selectedAlert)}
                    className="w-full py-2 rounded-lg text-sm font-semibold bg-[#1F6A5C]/10 border border-[#1F6A5C]/25 text-[#1F6A5C] dark:text-[#3FFFA3] dark:bg-[#3FFFA3]/8 dark:border-[#3FFFA3]/20 hover:bg-[#1F6A5C]/20 dark:hover:bg-[#3FFFA3]/15 transition-colors">
                    <span className="flex items-center justify-center gap-1.5"><IoGitPullRequestSharp size={14} /> Escalate to Ticket</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyState({ icon, title, sub, compact = false }: { icon: React.ReactNode; title: string; sub: string; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "py-6" : "py-12"} text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45`}>
      <div className="mb-3 opacity-40">{icon}</div>
      <div className="font-semibold text-[#1F6A5C] dark:text-[#F4F3F4]/60 mb-1">{title}</div>
      <div className="text-sm text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 dark:text-[#F4F3F4]/45 max-w-sm">{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    open:          "bg-red-500/10 border-red-500/25 text-red-400",
    investigating: "bg-amber-400/10 border-amber-400/25 text-amber-400",
    resolved:      "bg-emerald-500/10 border-emerald-500/25 text-emerald-500",
    suppressed:    "bg-[#50BFA0]/40 border-[#1F6A5C]/35 text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${map[status] ?? map.open}`}>
      {status}
    </span>
  );
}
