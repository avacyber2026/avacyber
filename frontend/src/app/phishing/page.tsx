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
  MdOutlineEmail, MdAdd, MdClose, MdEdit, MdDelete, MdPlayArrow,
  MdOutlineBarChart, MdArrowBack, MdOutlineGroup, MdCode, MdPreview,
  MdCheck, MdRefresh,
} from "react-icons/md";
import {
  IoFishOutline, IoLinkOutline, IoDocumentAttachOutline, IoQrCodeOutline,
  IoChevronForward, IoChevronBack, IoAlertCircle, IoPeople, IoBarChart,
} from "react-icons/io5";
import { FaShieldAlt } from "react-icons/fa";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PhishingStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSent: number;
  totalClicked: number;
  totalReported: number;
  clickRate: number;
  reportRate: number;
  recentCampaigns: PhishingCampaign[];
}

interface PhishingCampaign {
  id: number;
  name: string;
  description: string | null;
  type: "url" | "attachment" | "qr";
  status: "draft" | "scheduled" | "running" | "completed" | "paused";
  template_id: number | null;
  template_name?: string;
  group_ids: number[];
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_reported: number;
  created_by: string | null;
  created_at: string;
  results?: PhishingResult[];
}

interface PhishingTemplate {
  id: number;
  name: string;
  type: "url" | "attachment" | "qr";
  subject: string;
  from_name: string;
  from_email: string;
  html_body: string;
  preview_text: string | null;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  created_by: string | null;
  created_at: string;
}

interface PhishingGroup {
  id: number;
  name: string;
  description: string | null;
  user_emails: string[];
  created_at: string;
}

interface PhishingResult {
  id: number;
  email: string;
  full_name: string | null;
  department: string | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  reported_at: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const glass = "rounded-xl border border-white/20 dark:border-white/10 bg-white/20 dark:bg-[#1E2128]";
const inp = "w-full px-3 py-2 rounded-lg text-sm border border-white/60 dark:border-white/8 bg-white/70 dark:bg-[#1C1E1C] text-[#103E36] dark:text-[#F4F3F4]/80 placeholder:text-[#1C1E1C]/40 dark:placeholder:text-[#F4F3F4]/25 focus:outline-none focus:ring-2 focus:ring-[#1F6A5C]/40";

type Tab = "overview" | "campaigns" | "templates" | "groups";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "overview",   label: "Overview",   icon: <IoBarChart size={16} /> },
  { key: "campaigns",  label: "Campaigns",  icon: <MdOutlineEmail size={16} /> },
  { key: "templates",  label: "Templates",  icon: <MdCode size={16} /> },
  { key: "groups",     label: "Groups",     icon: <IoPeople size={16} /> },
];

const STATUS_COLOR: Record<string, string> = {
  draft:     "text-[#F4F3F4]/55 bg-white/10 border-white/20",
  scheduled: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  running:   "text-[#3FFFA3] bg-[#3FFFA3]/10 border-[#3FFFA3]/30",
  completed: "text-teal-400 bg-teal-400/10 border-teal-400/30",
  paused:    "text-amber-400 bg-amber-400/10 border-amber-400/30",
};

const TYPE_META = {
  url:        { label: "URL",        icon: <IoLinkOutline size={14} />,            color: "text-blue-400 bg-blue-400/10 border-blue-400/25" },
  attachment: { label: "Attachment", icon: <IoDocumentAttachOutline size={14} />,  color: "text-orange-400 bg-orange-400/10 border-orange-400/25" },
  qr:         { label: "QR Code",    icon: <IoQrCodeOutline size={14} />,          color: "text-purple-400 bg-purple-400/10 border-purple-400/25" },
};

const DIFF_COLOR: Record<string, string> = {
  easy:   "text-teal-400 bg-teal-400/10 border-teal-400/25",
  medium: "text-amber-400 bg-amber-400/10 border-amber-400/25",
  hard:   "text-red-400 bg-red-400/10 border-red-400/25",
};

const CAT_COLOR: Record<string, string> = {
  it:      "text-blue-400 bg-blue-400/8",
  hr:      "text-green-400 bg-green-400/8",
  finance: "text-amber-400 bg-amber-400/8",
  general: "text-[#F4F3F4]/55 bg-white/8",
};

// ── Small components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${STATUS_COLOR[status] ?? STATUS_COLOR.draft}`}>
      {status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-[#3FFFA3] animate-pulse" />}
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: "url" | "attachment" | "qr" }) {
  const m = TYPE_META[type] ?? TYPE_META.url;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${m.color}`}>
      {m.icon}{m.label}
    </span>
  );
}

function DiffBadge({ difficulty }: { difficulty: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${DIFF_COLOR[difficulty] ?? DIFF_COLOR.medium}`}>
      {difficulty}
    </span>
  );
}

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
      <div className="text-[#1C1E1C]/30 dark:text-[#F4F3F4]/20">{icon}</div>
      <div className="font-semibold text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55">{title}</div>
      <div className="text-sm text-[#1C1E1C]/50 dark:text-[#F4F3F4]/35 max-w-xs">{sub}</div>
    </div>
  );
}

function ClickRate({ sent, clicked }: { sent: number; clicked: number }) {
  if (!sent) return <span className="text-xs text-[#F4F3F4]/40">—</span>;
  const pct = Math.round((clicked / sent) * 100);
  const color = pct >= 30 ? "text-red-400" : pct >= 15 ? "text-amber-400" : "text-teal-400";
  return <span className={`font-bold tabular-nums ${color}`}>{pct}%</span>;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PhishingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { colorMode } = useColorMode();
  const isDark = colorMode === "dark";

  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<PhishingStats | null>(null);
  const [campaigns, setCampaigns] = useState<PhishingCampaign[]>([]);
  const [templates, setTemplates] = useState<PhishingTemplate[]>([]);
  const [groups, setGroups] = useState<PhishingGroup[]>([]);
  const [loading, setLoading] = useState(false);

  // Campaign wizard
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [draft, setDraft] = useState<{
    name: string; description: string; type: "url" | "attachment" | "qr";
    template_id: number | null; group_ids: number[]; scheduled_at: string;
  }>({ name: "", description: "", type: "url", template_id: null, group_ids: [], scheduled_at: "" });

  // Campaign detail
  const [selectedCampaign, setSelectedCampaign] = useState<PhishingCampaign | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Template editor
  const [editingTemplate, setEditingTemplate] = useState<PhishingTemplate | null>(null);
  const [isNewTemplate, setIsNewTemplate] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Group editor
  const [editingGroup, setEditingGroup] = useState<PhishingGroup | null>(null);
  const [isNewGroup, setIsNewGroup] = useState(false);
  const [groupEmailInput, setGroupEmailInput] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/");
  }, [isAuthenticated, isLoading, router]);

  const fetchStats = useCallback(async () => {
    try {
      const r = await api.get("/phishing/stats");
      setStats(r.data);
    } catch {}
  }, []);

  const fetchCampaigns = useCallback(async () => {
    try {
      const r = await api.get("/phishing/campaigns");
      setCampaigns(r.data);
    } catch {}
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const r = await api.get("/phishing/templates");
      setTemplates(r.data);
    } catch {}
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const r = await api.get("/phishing/groups");
      setGroups(r.data);
    } catch {}
  }, []);

  useEffect(() => { if (isAuthenticated) fetchStats(); }, [isAuthenticated, fetchStats]);
  useEffect(() => { if (tab === "campaigns")  fetchCampaigns(); }, [tab, fetchCampaigns]);
  useEffect(() => { if (tab === "templates")  fetchTemplates(); }, [tab, fetchTemplates]);
  useEffect(() => { if (tab === "groups")     fetchGroups(); }, [tab, fetchGroups]);
  useEffect(() => { if (tab === "campaigns" || showWizard) fetchTemplates(); }, [tab, showWizard, fetchTemplates]);
  useEffect(() => { if (showWizard) fetchGroups(); }, [showWizard, fetchGroups]);

  async function openCampaignDetail(c: PhishingCampaign) {
    setDetailLoading(true);
    setSelectedCampaign(c);
    try {
      const r = await api.get(`/phishing/campaigns/${c.id}`);
      setSelectedCampaign(r.data);
    } catch {}
    setDetailLoading(false);
  }

  async function deleteCampaign(id: number) {
    await api.delete(`/phishing/campaigns/${id}`);
    setCampaigns(p => p.filter(c => c.id !== id));
    if (selectedCampaign?.id === id) setSelectedCampaign(null);
    toast.success("Campaign deleted");
  }

  async function launchCampaign(id: number) {
    try {
      const r = await api.post(`/phishing/campaigns/${id}/launch`);
      setCampaigns(p => p.map(c => c.id === id ? { ...c, status: r.data.status } : c));
      toast.success("Campaign launched");
    } catch {
      toast.error("Cannot launch campaign");
    }
  }

  async function submitWizard() {
    if (!draft.name) { toast.error("Campaign name required"); return; }
    try {
      setLoading(true);
      const r = await api.post("/phishing/campaigns", draft);
      setCampaigns(p => [r.data, ...p]);
      setShowWizard(false);
      setWizardStep(1);
      setDraft({ name: "", description: "", type: "url", template_id: null, group_ids: [], scheduled_at: "" });
      toast.success("Campaign created");
      setTab("campaigns");
    } catch {
      toast.error("Failed to create campaign");
    } finally {
      setLoading(false);
    }
  }

  // Template CRUD
  function openNewTemplate() {
    setEditingTemplate({ id: 0, name: "", type: "url", subject: "", from_name: "IT Security", from_email: "security@corp.com", html_body: "", preview_text: null, category: "general", difficulty: "medium", created_by: null, created_at: "" });
    setIsNewTemplate(true);
    setPreviewMode(false);
  }

  async function saveTemplate() {
    if (!editingTemplate) return;
    if (!editingTemplate.name || !editingTemplate.subject) { toast.error("Name and subject required"); return; }
    try {
      setLoading(true);
      if (isNewTemplate) {
        const r = await api.post("/phishing/templates", editingTemplate);
        setTemplates(p => [r.data, ...p]);
        toast.success("Template created");
      } else {
        const r = await api.put(`/phishing/templates/${editingTemplate.id}`, editingTemplate);
        setTemplates(p => p.map(t => t.id === editingTemplate.id ? r.data : t));
        toast.success("Template saved");
      }
      setEditingTemplate(null);
    } catch {
      toast.error("Failed to save template");
    } finally {
      setLoading(false);
    }
  }

  async function deleteTemplate(id: number) {
    await api.delete(`/phishing/templates/${id}`);
    setTemplates(p => p.filter(t => t.id !== id));
    toast.success("Template deleted");
  }

  // Group CRUD
  function openNewGroup() {
    setEditingGroup({ id: 0, name: "", description: null, user_emails: [], created_at: "" });
    setIsNewGroup(true);
    setGroupEmailInput("");
  }

  async function saveGroup() {
    if (!editingGroup?.name) { toast.error("Group name required"); return; }
    try {
      setLoading(true);
      if (isNewGroup) {
        const r = await api.post("/phishing/groups", editingGroup);
        setGroups(p => [...p, r.data]);
        toast.success("Group created");
      } else {
        const r = await api.put(`/phishing/groups/${editingGroup.id}`, editingGroup);
        setGroups(p => p.map(g => g.id === editingGroup.id ? r.data : g));
        toast.success("Group saved");
      }
      setEditingGroup(null);
    } catch {
      toast.error("Failed to save group");
    } finally {
      setLoading(false);
    }
  }

  async function deleteGroup(id: number) {
    await api.delete(`/phishing/groups/${id}`);
    setGroups(p => p.filter(g => g.id !== id));
    toast.success("Group deleted");
  }

  if (isLoading || !isAuthenticated) return null;

  // ── Template Editor ─────────────────────────────────────────────────────────

  if (editingTemplate) {
    return (
      <div className={`flex min-h-screen ${isDark ? "dark" : ""} bg-[#F4F3F4] dark:bg-[#131517]`}>
        <SideMenu />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/20 dark:border-white/8 bg-white/40 dark:bg-[#1A1C1F]">
            <div className="flex items-center gap-3">
              <button onClick={() => setEditingTemplate(null)} className="p-1.5 rounded-lg hover:bg-white/20 dark:hover:bg-white/8 transition-colors text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55">
                <MdArrowBack size={18} />
              </button>
              <h1 className="font-bold text-[#1C1E1C] dark:text-white">{isNewTemplate ? "New Template" : `Edit: ${editingTemplate.name}`}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPreviewMode(p => !p)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${previewMode ? "bg-[#1F6A5C]/20 border-[#1F6A5C]/40 text-[#1F6A5C] dark:text-[#3FFFA3]" : "border-white/20 dark:border-white/8 bg-white/15 dark:bg-[#1E2128] text-[#103E36] dark:text-[#F4F3F4]/80"}`}>
                {previewMode ? <MdCode size={16} /> : <MdPreview size={16} />}
                {previewMode ? "Code" : "Preview"}
              </button>
              <button onClick={saveTemplate} disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#1F6A5C] to-[#50BFA0] text-white shadow hover:opacity-90 transition-opacity disabled:opacity-50">
                <MdCheck size={16} />
                Save Template
              </button>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Left sidebar: metadata */}
            <div className="w-72 flex-shrink-0 border-r border-white/20 dark:border-white/8 overflow-y-auto p-5 space-y-4 bg-white/20 dark:bg-[#1A1C1F]">
              <div>
                <label className="block text-xs font-semibold text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 mb-1.5">Template Name</label>
                <input className={inp} value={editingTemplate.name}
                  onChange={e => setEditingTemplate(t => t && ({ ...t, name: e.target.value }))}
                  placeholder="e.g. IT Password Reset" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 mb-1.5">Type</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["url","attachment","qr"] as const).map(t => (
                    <button key={t} onClick={() => setEditingTemplate(et => et && ({ ...et, type: t }))}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all capitalize ${editingTemplate.type === t ? "bg-gradient-to-r from-[#1F6A5C] to-[#50BFA0] text-white border-transparent" : "border-white/20 dark:border-white/8 text-[#103E36]/70 dark:text-[#F4F3F4]/55 hover:bg-white/15 dark:hover:bg-white/[0.04]"}`}>
                      {t === "qr" ? "QR" : t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 mb-1.5">Subject Line</label>
                <input className={inp} value={editingTemplate.subject}
                  onChange={e => setEditingTemplate(t => t && ({ ...t, subject: e.target.value }))}
                  placeholder="Email subject line" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 mb-1.5">Sender Name</label>
                <input className={inp} value={editingTemplate.from_name}
                  onChange={e => setEditingTemplate(t => t && ({ ...t, from_name: e.target.value }))}
                  placeholder="IT Help Desk" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 mb-1.5">Sender Email</label>
                <input className={inp} value={editingTemplate.from_email}
                  onChange={e => setEditingTemplate(t => t && ({ ...t, from_email: e.target.value }))}
                  placeholder="helpdesk@corp.com" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 mb-1.5">Category</label>
                  <select className={inp} value={editingTemplate.category}
                    onChange={e => setEditingTemplate(t => t && ({ ...t, category: e.target.value }))}>
                    <option value="general">General</option>
                    <option value="it">IT</option>
                    <option value="hr">HR</option>
                    <option value="finance">Finance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 mb-1.5">Difficulty</label>
                  <select className={inp} value={editingTemplate.difficulty}
                    onChange={e => setEditingTemplate(t => t && ({ ...t, difficulty: e.target.value as "easy"|"medium"|"hard" }))}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              <div className="pt-2 border-t border-white/20 dark:border-white/8">
                <p className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/35 leading-relaxed">
                  Use <code className="bg-white/30 dark:bg-white/8 px-1 rounded">{"{{PHISHING_URL}}"}</code> for the tracking link and <code className="bg-white/30 dark:bg-white/8 px-1 rounded">{"{{TOKEN}}"}</code> for a unique ID.
                </p>
              </div>
            </div>

            {/* Editor / Preview */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white/10 dark:bg-[#131517]">
              {previewMode ? (
                <iframe
                  srcDoc={editingTemplate.html_body}
                  sandbox="allow-same-origin"
                  className="flex-1 w-full border-0"
                  title="Template Preview"
                />
              ) : (
                <textarea
                  value={editingTemplate.html_body}
                  onChange={e => setEditingTemplate(t => t && ({ ...t, html_body: e.target.value }))}
                  className="flex-1 w-full p-6 font-mono text-sm resize-none outline-none bg-[#0d1117] text-[#e6edf3] leading-relaxed"
                  spellCheck={false}
                  placeholder={"<!DOCTYPE html>\n<html>\n<head>...</head>\n<body>\n  <!-- Your phishing simulation email HTML here -->\n  <!-- Use {{PHISHING_URL}} for the tracking link -->\n</body>\n</html>"}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Group Editor ────────────────────────────────────────────────────────────

  if (editingGroup) {
    const addEmail = () => {
      const e = groupEmailInput.trim().toLowerCase();
      if (!e || !e.includes("@")) return;
      if (editingGroup.user_emails.includes(e)) return;
      setEditingGroup(g => g && ({ ...g, user_emails: [...g.user_emails, e] }));
      setGroupEmailInput("");
    };
    const removeEmail = (em: string) =>
      setEditingGroup(g => g && ({ ...g, user_emails: g.user_emails.filter(x => x !== em) }));

    return (
      <div className={`flex min-h-screen ${isDark ? "dark" : ""} bg-[#F4F3F4] dark:bg-[#131517]`}>
        <SideMenu />
        <div className="flex-1 max-w-2xl mx-auto px-6 py-10 space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setEditingGroup(null)} className="p-1.5 rounded-lg hover:bg-white/20 dark:hover:bg-white/8 transition-colors text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55">
              <MdArrowBack size={18} />
            </button>
            <h1 className="text-xl font-bold text-[#1C1E1C] dark:text-white">{isNewGroup ? "New Group" : `Edit: ${editingGroup.name}`}</h1>
          </div>

          <div className={`${glass} p-6 space-y-4`}>
            <div>
              <label className="block text-xs font-semibold text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 mb-1.5">Group Name</label>
              <input className={inp} value={editingGroup.name}
                onChange={e => setEditingGroup(g => g && ({ ...g, name: e.target.value }))}
                placeholder="e.g. Finance Department" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 mb-1.5">Description</label>
              <input className={inp} value={editingGroup.description ?? ""}
                onChange={e => setEditingGroup(g => g && ({ ...g, description: e.target.value }))}
                placeholder="Optional description" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 mb-1.5">
                User Emails <span className="font-normal text-[#F4F3F4]/40">({editingGroup.user_emails.length} added)</span>
              </label>
              <div className="flex gap-2">
                <input className={`${inp} flex-1`} value={groupEmailInput}
                  onChange={e => setGroupEmailInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addEmail(); }}}
                  placeholder="user@company.com" />
                <button onClick={addEmail} className="px-3 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#1F6A5C] to-[#50BFA0] text-white">Add</button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {editingGroup.user_emails.map(em => (
                  <span key={em} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[#1F6A5C]/15 border border-[#1F6A5C]/25 text-[#1F6A5C] dark:text-[#3FFFA3]">
                    {em}
                    <button onClick={() => removeEmail(em)} className="hover:text-red-400 transition-colors"><MdClose size={12} /></button>
                  </span>
                ))}
              </div>
            </div>
            <button onClick={saveGroup} disabled={loading}
              className="w-full py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-r from-[#1F6A5C] to-[#50BFA0] text-white shadow hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? "Saving…" : "Save Group"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main layout ─────────────────────────────────────────────────────────────

  return (
    <div className={`flex min-h-screen ${isDark ? "dark" : ""} bg-[#F4F3F4] dark:bg-[#131517]`}>
      <SideMenu />

      <div className="flex-1 overflow-y-auto px-6 py-8 max-w-7xl mx-auto w-full">

        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1F6A5C] to-[#50BFA0] flex items-center justify-center text-white shadow-md">
              <IoFishOutline size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-[#1C1E1C] dark:text-white">Phishing Awareness</h1>
              <p className="text-sm text-[#1C1E1C]/70 dark:text-[#F4F3F4]/45">Security awareness training &amp; simulation campaigns</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchStats}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-black/8 dark:border-white/8 bg-white/15 dark:bg-[#1E2128] text-[#103E36] dark:text-[#F4F3F4]/80 hover:bg-white/28 dark:hover:bg-white/[0.06] transition-colors">
              <MdRefresh size={16} />Refresh
            </button>
            {tab === "campaigns" && (
              <button onClick={() => { setShowWizard(true); setWizardStep(1); }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#1F6A5C] to-[#50BFA0] text-white shadow hover:opacity-90 transition-opacity">
                <MdAdd size={16} />New Campaign
              </button>
            )}
            {tab === "templates" && (
              <button onClick={openNewTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#1F6A5C] to-[#50BFA0] text-white shadow hover:opacity-90 transition-opacity">
                <MdAdd size={16} />New Template
              </button>
            )}
            {tab === "groups" && (
              <button onClick={openNewGroup}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#1F6A5C] to-[#50BFA0] text-white shadow hover:opacity-90 transition-opacity">
                <MdAdd size={16} />New Group
              </button>
            )}
          </div>
        </motion.div>

        {/* ── Stats cards ── */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Campaigns Run",    value: stats.totalCampaigns,  sub: `${stats.activeCampaigns} active`, grad: "from-[#1F6A5C] to-[#50BFA0]", icon: <IoFishOutline size={18} /> },
              { label: "Emails Sent",      value: stats.totalSent.toLocaleString(), sub: "across all campaigns", grad: "from-blue-600 to-blue-400", icon: <MdOutlineEmail size={18} /> },
              { label: "Click Rate",       value: `${stats.clickRate}%`, sub: `${stats.totalClicked} users clicked`, grad: stats.clickRate >= 25 ? "from-red-600 to-red-400" : "from-amber-500 to-amber-300", icon: <IoLinkOutline size={18} /> },
              { label: "Report Rate",      value: `${stats.reportRate}%`, sub: `${stats.totalReported} reported phish`, grad: "from-teal-600 to-teal-400", icon: <FaShieldAlt size={14} /> },
            ].map((c, i) => (
              <motion.div key={c.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className={`${glass} p-5`}>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${c.grad} flex items-center justify-center text-white shadow-md mb-3`}>
                  {c.icon}
                </div>
                <div className="text-3xl font-light tabular-nums text-[#1C1E1C] dark:text-white mb-0.5">{c.value}</div>
                <div className="text-sm font-semibold text-[#103E36] dark:text-[#F4F3F4]/80">{c.label}</div>
                <div className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/40 mt-0.5">{c.sub}</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* ── Tab nav ── */}
        <div className={`${glass} p-1 mb-6 flex gap-1 flex-wrap`}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.key ? "bg-gradient-to-r from-[#1F6A5C] to-[#50BFA0] text-white shadow" : "text-[#103E36]/70 dark:text-[#F4F3F4]/55 hover:bg-white/20 dark:hover:bg-white/[0.04]"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ─────────────── OVERVIEW ─────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="space-y-6">
            {/* Recent campaigns */}
            <div className={`${glass} p-5`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-[#1C1E1C] dark:text-white">Recent Campaigns</h2>
                <button onClick={() => setTab("campaigns")} className="text-xs text-[#1F6A5C] dark:text-[#3FFFA3]/70 hover:underline font-semibold">View all</button>
              </div>
              {!stats?.recentCampaigns?.length ? (
                <EmptyState icon={<MdOutlineEmail size={36} />} title="No campaigns yet" sub="Create your first phishing simulation campaign." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/40 border-b border-white/15 dark:border-white/8">
                        <th className="text-left py-2 pr-4 font-semibold">Campaign</th>
                        <th className="text-left py-2 pr-4 font-semibold">Type</th>
                        <th className="text-left py-2 pr-4 font-semibold">Status</th>
                        <th className="text-right py-2 pr-4 font-semibold">Sent</th>
                        <th className="text-right py-2 pr-4 font-semibold">Clicked</th>
                        <th className="text-right py-2 font-semibold">Click Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 dark:divide-white/[0.04]">
                      {stats.recentCampaigns.map(c => (
                        <tr key={c.id} className="hover:bg-white/10 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                          onClick={() => { setTab("campaigns"); openCampaignDetail(c); }}>
                          <td className="py-3 pr-4 font-medium text-[#1C1E1C] dark:text-white">{c.name}</td>
                          <td className="py-3 pr-4"><TypeBadge type={c.type} /></td>
                          <td className="py-3 pr-4"><StatusBadge status={c.status} /></td>
                          <td className="py-3 pr-4 text-right tabular-nums text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55">{c.total_sent}</td>
                          <td className="py-3 pr-4 text-right tabular-nums text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55">{c.total_clicked}</td>
                          <td className="py-3 text-right"><ClickRate sent={c.total_sent} clicked={c.total_clicked} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick tip */}
            <div className={`${glass} p-5 flex gap-4 items-start`}>
              <div className="w-9 h-9 rounded-lg bg-amber-400/15 flex items-center justify-center text-amber-400 flex-shrink-0 mt-0.5">
                <IoAlertCircle size={18} />
              </div>
              <div>
                <div className="font-semibold text-sm text-[#1C1E1C] dark:text-white mb-1">Industry benchmark: 25–30% click rate</div>
                <p className="text-sm text-[#1C1E1C]/65 dark:text-[#F4F3F4]/45">
                  The average employee click rate on simulated phishing emails is 25–30% before training. With recurring campaigns and education, organisations typically reduce this to under 5% within 12 months.
                  A report rate above 20% indicates a strong security culture.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────── CAMPAIGNS ────────────────────────────────────────── */}
        {tab === "campaigns" && !selectedCampaign && (
          <div className={`${glass} p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[#1C1E1C] dark:text-white text-lg">All Campaigns</h2>
            </div>
            {campaigns.length === 0 ? (
              <EmptyState icon={<MdOutlineEmail size={40} />} title="No campaigns yet" sub='Click "New Campaign" to launch your first phishing simulation.' />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/40 border-b border-white/15 dark:border-white/8">
                      <th className="text-left py-2 pr-4 font-semibold">Campaign</th>
                      <th className="text-left py-2 pr-4 font-semibold">Type</th>
                      <th className="text-left py-2 pr-4 font-semibold">Template</th>
                      <th className="text-left py-2 pr-4 font-semibold">Status</th>
                      <th className="text-right py-2 pr-4 font-semibold">Sent</th>
                      <th className="text-right py-2 pr-4 font-semibold">Clicked</th>
                      <th className="text-right py-2 pr-4 font-semibold">Reported</th>
                      <th className="text-right py-2 pr-4 font-semibold">Click Rate</th>
                      <th className="text-right py-2 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 dark:divide-white/[0.04]">
                    {campaigns.map(c => (
                      <tr key={c.id} className="hover:bg-white/10 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 pr-4">
                          <button onClick={() => openCampaignDetail(c)} className="font-medium text-[#1C1E1C] dark:text-white hover:text-[#1F6A5C] dark:hover:text-[#3FFFA3] text-left transition-colors">
                            {c.name}
                          </button>
                          {c.description && <div className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/35 truncate max-w-xs">{c.description}</div>}
                        </td>
                        <td className="py-3 pr-4"><TypeBadge type={c.type} /></td>
                        <td className="py-3 pr-4 text-xs text-[#1C1E1C]/65 dark:text-[#F4F3F4]/45 truncate max-w-[160px]">{c.template_name ?? "—"}</td>
                        <td className="py-3 pr-4"><StatusBadge status={c.status} /></td>
                        <td className="py-3 pr-4 text-right tabular-nums text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55">{c.total_sent}</td>
                        <td className="py-3 pr-4 text-right tabular-nums text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55">{c.total_clicked}</td>
                        <td className="py-3 pr-4 text-right tabular-nums text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55">{c.total_reported}</td>
                        <td className="py-3 pr-4 text-right"><ClickRate sent={c.total_sent} clicked={c.total_clicked} /></td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            {(c.status === "draft" || c.status === "scheduled") && (
                              <button onClick={() => launchCampaign(c.id)} title="Launch"
                                className="p-1.5 rounded-lg text-[#3FFFA3] hover:bg-[#3FFFA3]/10 transition-colors">
                                <MdPlayArrow size={16} />
                              </button>
                            )}
                            <button onClick={() => deleteCampaign(c.id)} title="Delete"
                              className="p-1.5 rounded-lg text-red-400/70 hover:bg-red-400/10 hover:text-red-400 transition-colors">
                              <MdDelete size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Campaign detail */}
        {tab === "campaigns" && selectedCampaign && (
          <div className="space-y-4">
            <button onClick={() => setSelectedCampaign(null)} className="inline-flex items-center gap-2 text-sm text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 hover:text-[#1F6A5C] dark:hover:text-[#3FFFA3] transition-colors font-semibold">
              <MdArrowBack size={16} /> Back to campaigns
            </button>
            <div className={`${glass} p-6`}>
              <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-xl font-bold text-[#1C1E1C] dark:text-white">{selectedCampaign.name}</h2>
                    <TypeBadge type={selectedCampaign.type} />
                    <StatusBadge status={selectedCampaign.status} />
                  </div>
                  {selectedCampaign.description && <p className="text-sm text-[#1C1E1C]/65 dark:text-[#F4F3F4]/45">{selectedCampaign.description}</p>}
                  <p className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/35 mt-1">Template: {selectedCampaign.template_name ?? "None"} &nbsp;·&nbsp; Created {formatDate(selectedCampaign.created_at)}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Emails Sent",     value: selectedCampaign.total_sent,     color: "" },
                  { label: "Opened",          value: selectedCampaign.total_opened,   color: "text-blue-400" },
                  { label: "Clicked",         value: selectedCampaign.total_clicked,  color: selectedCampaign.total_clicked > 0 ? "text-red-400" : "" },
                  { label: "Reported",        value: selectedCampaign.total_reported, color: "text-teal-400" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl border border-white/15 dark:border-white/8 bg-white/15 dark:bg-[#1C1E1C]/40 p-4 text-center">
                    <div className={`text-3xl font-light tabular-nums ${s.color} text-[#1C1E1C] dark:text-white`}>{s.value}</div>
                    <div className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/40 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Results table */}
              {detailLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 rounded bg-[#50BFA0]/10 animate-pulse" />)}</div>
              ) : selectedCampaign.results && selectedCampaign.results.length > 0 ? (
                <>
                  <h3 className="font-semibold text-sm text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 mb-3">User Results</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/40 border-b border-white/15 dark:border-white/8">
                          <th className="text-left py-2 pr-4 font-semibold">User</th>
                          <th className="text-left py-2 pr-4 font-semibold">Department</th>
                          <th className="text-center py-2 pr-4 font-semibold">Sent</th>
                          <th className="text-center py-2 pr-4 font-semibold">Opened</th>
                          <th className="text-center py-2 pr-4 font-semibold">Clicked</th>
                          <th className="text-center py-2 font-semibold">Reported</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 dark:divide-white/[0.04]">
                        {selectedCampaign.results.map(r => (
                          <tr key={r.id} className="hover:bg-white/8 dark:hover:bg-white/[0.02] transition-colors">
                            <td className="py-2.5 pr-4">
                              <div className="font-medium text-[#1C1E1C] dark:text-[#F4F3F4]/80">{r.full_name ?? r.email}</div>
                              <div className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/35">{r.email}</div>
                            </td>
                            <td className="py-2.5 pr-4 text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/40">{r.department ?? "—"}</td>
                            <td className="py-2.5 pr-4 text-center">{r.sent_at ? <MdCheck className="text-teal-400 mx-auto" size={16} /> : <span className="text-[#F4F3F4]/25">—</span>}</td>
                            <td className="py-2.5 pr-4 text-center">{r.opened_at ? <MdCheck className="text-blue-400 mx-auto" size={16} /> : <span className="text-[#F4F3F4]/25">—</span>}</td>
                            <td className="py-2.5 pr-4 text-center">{r.clicked_at ? <span className="text-red-400 font-bold text-xs">CLICKED</span> : <span className="text-[#F4F3F4]/25">—</span>}</td>
                            <td className="py-2.5 text-center">{r.reported_at ? <span className="text-teal-400 font-bold text-xs">REPORTED</span> : <span className="text-[#F4F3F4]/25">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-sm text-[#1C1E1C]/50 dark:text-[#F4F3F4]/35 text-center py-6">No individual results recorded yet.</p>
              )}
            </div>
          </div>
        )}

        {/* ─────────────── TEMPLATES ────────────────────────────────────────── */}
        {tab === "templates" && (
          <div>
            {templates.length === 0 ? (
              <div className={`${glass} p-5`}>
                <EmptyState icon={<MdCode size={40} />} title="No templates yet" sub='Click "New Template" to create your first phishing simulation email.' />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {templates.map(t => (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    className={`${glass} p-5 flex flex-col gap-3`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[#1C1E1C] dark:text-white truncate">{t.name}</div>
                        <div className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/40 mt-0.5 truncate">{t.from_name} &lt;{t.from_email}&gt;</div>
                      </div>
                    </div>
                    <div className="text-xs bg-white/20 dark:bg-[#1C1E1C]/60 rounded-lg px-3 py-2 text-[#1C1E1C]/80 dark:text-[#F4F3F4]/65 truncate border border-white/20 dark:border-white/8">
                      📧 {t.subject}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <TypeBadge type={t.type} />
                      <DiffBadge difficulty={t.difficulty} />
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${CAT_COLOR[t.category] ?? CAT_COLOR.general}`}>{t.category}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-white/15 dark:border-white/8">
                      <button onClick={() => { setEditingTemplate(t); setIsNewTemplate(false); setPreviewMode(false); }}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border border-white/20 dark:border-white/8 text-[#103E36]/80 dark:text-[#F4F3F4]/65 hover:bg-white/20 dark:hover:bg-white/[0.04] transition-colors">
                        <MdEdit size={14} />Edit HTML
                      </button>
                      <button onClick={() => deleteTemplate(t.id)}
                        className="p-2 rounded-lg text-red-400/60 hover:bg-red-400/10 hover:text-red-400 transition-colors border border-transparent hover:border-red-400/20">
                        <MdDelete size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─────────────── GROUPS ───────────────────────────────────────────── */}
        {tab === "groups" && (
          <div className={`${glass} p-5`}>
            <h2 className="font-bold text-[#1C1E1C] dark:text-white mb-4">User Groups</h2>
            {groups.length === 0 ? (
              <EmptyState icon={<IoPeople size={40} />} title="No groups yet" sub='Create groups to target specific departments in your campaigns.' />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/40 border-b border-white/15 dark:border-white/8">
                      <th className="text-left py-2 pr-4 font-semibold">Group Name</th>
                      <th className="text-left py-2 pr-4 font-semibold">Description</th>
                      <th className="text-right py-2 pr-4 font-semibold">Users</th>
                      <th className="text-right py-2 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 dark:divide-white/[0.04]">
                    {groups.map(g => (
                      <tr key={g.id} className="hover:bg-white/8 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 pr-4 font-medium text-[#1C1E1C] dark:text-white">{g.name}</td>
                        <td className="py-3 pr-4 text-[#1C1E1C]/60 dark:text-[#F4F3F4]/40 text-xs">{g.description ?? "—"}</td>
                        <td className="py-3 pr-4 text-right tabular-nums">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#1F6A5C]/12 text-[#1F6A5C] dark:text-[#3FFFA3]">
                            {g.user_emails?.length ?? 0} users
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button onClick={() => { setEditingGroup(g); setIsNewGroup(false); setGroupEmailInput(""); }}
                              className="p-1.5 rounded-lg text-[#1C1E1C]/60 dark:text-[#F4F3F4]/40 hover:bg-white/20 dark:hover:bg-white/[0.04] hover:text-[#1F6A5C] dark:hover:text-[#3FFFA3] transition-colors">
                              <MdEdit size={15} />
                            </button>
                            <button onClick={() => deleteGroup(g.id)}
                              className="p-1.5 rounded-lg text-red-400/60 hover:bg-red-400/10 hover:text-red-400 transition-colors">
                              <MdDelete size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Campaign Creation Wizard ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showWizard && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-2xl rounded-2xl border border-white/20 dark:border-white/10 bg-white/90 dark:bg-[#1A1C1F] shadow-2xl overflow-hidden`}>

              {/* Wizard header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/20 dark:border-white/8">
                <div>
                  <div className="font-bold text-[#1C1E1C] dark:text-white">New Phishing Campaign</div>
                  <div className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/40 mt-0.5">Step {wizardStep} of 4</div>
                </div>
                <button onClick={() => setShowWizard(false)} className="p-1.5 rounded-lg hover:bg-white/20 dark:hover:bg-white/8 transition-colors text-[#1C1E1C]/60 dark:text-[#F4F3F4]/40">
                  <MdClose size={20} />
                </button>
              </div>

              {/* Progress bar */}
              <div className="h-1 bg-white/20 dark:bg-white/8">
                <motion.div animate={{ width: `${(wizardStep / 4) * 100}%` }} className="h-full bg-gradient-to-r from-[#1F6A5C] to-[#50BFA0] transition-all" />
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">

                {/* Step 1: Type + name */}
                {wizardStep === 1 && (
                  <div className="space-y-5">
                    <div>
                      <div className="text-sm font-bold text-[#1C1E1C] dark:text-white mb-3">Choose campaign type</div>
                      <div className="grid grid-cols-3 gap-3">
                        {([
                          { type: "url"        as const, icon: <IoLinkOutline size={28} />,           label: "URL",        desc: "Credential harvesting via fake login page" },
                          { type: "attachment" as const, icon: <IoDocumentAttachOutline size={28} />, label: "Attachment", desc: "Malicious document / invoice simulation" },
                          { type: "qr"         as const, icon: <IoQrCodeOutline size={28} />,         label: "QR Code",    desc: "QR code redirecting to phishing page" },
                        ]).map(o => (
                          <button key={o.type} onClick={() => setDraft(d => ({ ...d, type: o.type }))}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all ${draft.type === o.type ? "border-[#1F6A5C] bg-[#1F6A5C]/8 dark:bg-[#1F6A5C]/15" : "border-white/25 dark:border-white/10 hover:border-[#1F6A5C]/40 hover:bg-white/20 dark:hover:bg-white/[0.04]"}`}>
                            <div className={`${draft.type === o.type ? "text-[#1F6A5C] dark:text-[#3FFFA3]" : "text-[#1C1E1C]/50 dark:text-[#F4F3F4]/35"}`}>{o.icon}</div>
                            <div className={`font-bold text-sm ${draft.type === o.type ? "text-[#1F6A5C] dark:text-[#3FFFA3]" : "text-[#1C1E1C] dark:text-white"}`}>{o.label}</div>
                            <div className="text-xs text-[#1C1E1C]/55 dark:text-[#F4F3F4]/40 leading-snug">{o.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 mb-1.5">Campaign Name *</label>
                      <input className={inp} value={draft.name}
                        onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                        placeholder="e.g. Q2 2025 – All Staff Credential Test" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 mb-1.5">Description</label>
                      <input className={inp} value={draft.description}
                        onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                        placeholder="Optional description" />
                    </div>
                  </div>
                )}

                {/* Step 2: Template */}
                {wizardStep === 2 && (
                  <div>
                    <div className="text-sm font-bold text-[#1C1E1C] dark:text-white mb-3">Choose an email template</div>
                    {templates.length === 0 ? (
                      <div className="text-center py-8 text-[#1C1E1C]/50 dark:text-[#F4F3F4]/35 text-sm">
                        No templates yet. <button onClick={() => { setShowWizard(false); setTab("templates"); openNewTemplate(); }} className="text-[#1F6A5C] dark:text-[#3FFFA3] hover:underline">Create one first.</button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {templates.map(t => (
                          <button key={t.id} onClick={() => setDraft(d => ({ ...d, template_id: t.id }))}
                            className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${draft.template_id === t.id ? "border-[#1F6A5C] bg-[#1F6A5C]/8 dark:bg-[#1F6A5C]/15" : "border-white/20 dark:border-white/8 hover:border-[#1F6A5C]/40 hover:bg-white/15 dark:hover:bg-white/[0.04]"}`}>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm text-[#1C1E1C] dark:text-white">{t.name}</div>
                              <div className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/40 mt-0.5 truncate">📧 {t.subject}</div>
                              <div className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/35 mt-0.5">{t.from_name} &lt;{t.from_email}&gt;</div>
                            </div>
                            <div className="flex flex-col gap-1.5 items-end flex-shrink-0">
                              <TypeBadge type={t.type} />
                              <DiffBadge difficulty={t.difficulty} />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Groups */}
                {wizardStep === 3 && (
                  <div>
                    <div className="text-sm font-bold text-[#1C1E1C] dark:text-white mb-3">Choose target groups</div>
                    {groups.length === 0 ? (
                      <div className="text-center py-8 text-[#1C1E1C]/50 dark:text-[#F4F3F4]/35 text-sm">
                        No groups yet. <button onClick={() => { setShowWizard(false); setTab("groups"); openNewGroup(); }} className="text-[#1F6A5C] dark:text-[#3FFFA3] hover:underline">Create groups first.</button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {groups.map(g => {
                          const checked = draft.group_ids.includes(g.id);
                          return (
                            <button key={g.id} onClick={() => setDraft(d => ({ ...d, group_ids: checked ? d.group_ids.filter(x => x !== g.id) : [...d.group_ids, g.id] }))}
                              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${checked ? "border-[#1F6A5C] bg-[#1F6A5C]/8 dark:bg-[#1F6A5C]/15" : "border-white/20 dark:border-white/8 hover:border-[#1F6A5C]/40 hover:bg-white/15 dark:hover:bg-white/[0.04]"}`}>
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? "bg-[#1F6A5C] border-[#1F6A5C]" : "border-white/30 dark:border-white/15"}`}>
                                {checked && <MdCheck className="text-white" size={12} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm text-[#1C1E1C] dark:text-white">{g.name}</div>
                                {g.description && <div className="text-xs text-[#1C1E1C]/55 dark:text-[#F4F3F4]/40">{g.description}</div>}
                              </div>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-[#1F6A5C]/12 text-[#1F6A5C] dark:text-[#3FFFA3] font-semibold flex-shrink-0">
                                {g.user_emails?.length ?? 0} users
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Schedule */}
                {wizardStep === 4 && (
                  <div className="space-y-4">
                    <div className="text-sm font-bold text-[#1C1E1C] dark:text-white mb-1">Schedule or launch now</div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Launch Now",      sub: "Start the campaign immediately",  val: "" },
                        { label: "Schedule Later",  sub: "Pick a date and time to send",    val: "later" },
                      ].map(o => (
                        <button key={o.val} onClick={() => setDraft(d => ({ ...d, scheduled_at: o.val === "" ? "" : d.scheduled_at || "" }))}
                          className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 text-left transition-all ${(o.val === "" ? !draft.scheduled_at : !!draft.scheduled_at) ? "border-[#1F6A5C] bg-[#1F6A5C]/8 dark:bg-[#1F6A5C]/15" : "border-white/20 dark:border-white/8 hover:border-[#1F6A5C]/40"}`}>
                          <span className="font-semibold text-sm text-[#1C1E1C] dark:text-white">{o.label}</span>
                          <span className="text-xs text-[#1C1E1C]/55 dark:text-[#F4F3F4]/40">{o.sub}</span>
                        </button>
                      ))}
                    </div>
                    {draft.scheduled_at !== "" && (
                      <div>
                        <label className="block text-xs font-semibold text-[#1C1E1C]/70 dark:text-[#F4F3F4]/55 mb-1.5">Schedule date &amp; time</label>
                        <input type="datetime-local" className={inp} value={draft.scheduled_at}
                          onChange={e => setDraft(d => ({ ...d, scheduled_at: e.target.value }))} />
                      </div>
                    )}
                    <div className={`rounded-xl border border-white/20 dark:border-white/8 p-4 text-sm space-y-1.5 bg-white/20 dark:bg-[#1C1E1C]/40`}>
                      <div className="font-semibold text-[#1C1E1C] dark:text-white mb-2">Campaign Summary</div>
                      <div className="flex gap-2"><span className="text-[#1C1E1C]/55 dark:text-[#F4F3F4]/40 w-24">Name:</span><span className="text-[#1C1E1C] dark:text-[#F4F3F4]/80 font-medium">{draft.name || "—"}</span></div>
                      <div className="flex gap-2"><span className="text-[#1C1E1C]/55 dark:text-[#F4F3F4]/40 w-24">Type:</span><TypeBadge type={draft.type} /></div>
                      <div className="flex gap-2"><span className="text-[#1C1E1C]/55 dark:text-[#F4F3F4]/40 w-24">Template:</span><span className="text-[#1C1E1C] dark:text-[#F4F3F4]/80">{templates.find(t => t.id === draft.template_id)?.name ?? "None"}</span></div>
                      <div className="flex gap-2"><span className="text-[#1C1E1C]/55 dark:text-[#F4F3F4]/40 w-24">Groups:</span><span className="text-[#1C1E1C] dark:text-[#F4F3F4]/80">{draft.group_ids.length > 0 ? draft.group_ids.map(id => groups.find(g => g.id === id)?.name).filter(Boolean).join(", ") : "None"}</span></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Wizard footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/20 dark:border-white/8 bg-white/20 dark:bg-[#1A1C1F]">
                <button onClick={() => wizardStep > 1 ? setWizardStep(s => s - 1) : setShowWizard(false)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-white/25 dark:border-white/8 text-[#103E36]/70 dark:text-[#F4F3F4]/55 hover:bg-white/20 dark:hover:bg-white/[0.04] transition-colors">
                  <IoChevronBack size={16} />{wizardStep > 1 ? "Back" : "Cancel"}
                </button>
                {wizardStep < 4 ? (
                  <button onClick={() => setWizardStep(s => s + 1)} disabled={wizardStep === 1 && !draft.name}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#1F6A5C] to-[#50BFA0] text-white shadow hover:opacity-90 transition-opacity disabled:opacity-40">
                    Next<IoChevronForward size={16} />
                  </button>
                ) : (
                  <button onClick={submitWizard} disabled={loading || !draft.name}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#1F6A5C] to-[#50BFA0] text-white shadow hover:opacity-90 transition-opacity disabled:opacity-40">
                    {loading ? "Creating…" : "Create Campaign"}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
