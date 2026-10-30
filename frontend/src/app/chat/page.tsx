"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SideMenu } from "@/Components";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { getChatWebSocketUrl } from "@/lib/chatWebSocket";
import { motion, AnimatePresence } from "framer-motion";
import { IoPaperPlane, IoAdd, IoChatbubbles, IoPerson, IoSearch, IoChevronDown } from "react-icons/io5";
import { MdTag } from "react-icons/md";

// ── Types ────────────────────────────────────────────────────────────────────

interface Channel {
  id: number;
  name: string | null;
  type: "channel" | "dm";
  created_at: string;
  last_message: string | null;
  last_message_at: string | null;
  dm_peer_email: string | null;
}

interface Message {
  id: number;
  channel_id: number;
  sender_email: string;
  sender_name: string | null;
  text: string;
  created_at: string;
}

interface TeamUser {
  email: string;
  name: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function groupMessagesByDate(messages: Message[]) {
  const groups: { date: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.messages.push(msg);
    else groups.push({ date, messages: [msg] });
  }
  return groups;
}

const AVATAR_COLORS = [
  "from-[#1F6A5C] to-[#50BFA0]",
  "from-violet-700 to-violet-500",
  "from-blue-700 to-blue-500",
  "from-rose-700 to-rose-500",
  "from-amber-700 to-amber-500",
];

function avatarColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [showDmPicker, setShowDmPicker] = useState(false);
  const [dmSearch, setDmSearch] = useState("");
  const [channelSearch, setChannelSearch] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isAuthenticated && !isLoading) router.push("/");
  }, [isAuthenticated, isLoading, router]);

  // Load channels
  const fetchChannels = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const r = await api.get("/chat/channels");
      setChannels(r.data ?? []);
      if (!activeId && r.data?.length) {
        const first = r.data.find((c: Channel) => c.type === "channel") ?? r.data[0];
        if (first) setActiveId(first.id);
      }
    } catch {}
  }, [isAuthenticated, activeId]);

  useEffect(() => { fetchChannels(); }, [isAuthenticated]);

  // Load team users
  useEffect(() => {
    if (!isAuthenticated) return;
    api.get("/chat/users").then(r => setTeamUsers(r.data ?? [])).catch(() => {});
  }, [isAuthenticated]);

  // Load messages when active channel changes
  useEffect(() => {
    if (!activeId) return;
    setLoadingMsgs(true);
    setMessages([]);
    api.get(`/chat/channels/${activeId}/messages`)
      .then(r => setMessages(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
  }, [activeId]);

  // Scroll to bottom when messages load
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // WebSocket
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) return;
      const url = getChatWebSocketUrl(token);
      if (!url) return;

      let ws: WebSocket;
      try { ws = new WebSocket(url); } catch { return; }
      wsRef.current = ws;

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(String(ev.data));
          if (data.type === "chat_message") {
            // Update message list if we're in that channel
            setActiveId(cur => {
              if (cur === data.channel_id) {
                setMessages(prev => [...prev, data.message]);
              }
              return cur;
            });
            // Update last_message preview in channel list
            setChannels(prev => prev.map(c =>
              c.id === data.channel_id
                ? { ...c, last_message: data.message.text, last_message_at: data.message.created_at }
                : c
            ));
          }
        } catch {}
      };

      ws.onclose = () => {
        if (wsRef.current === ws) wsRef.current = null;
        if (!cancelled) retryTimer = setTimeout(connect, 4000);
      };

      ws.onerror = () => { try { ws.close(); } catch {} };
    };

    connect();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      try { wsRef.current?.close(); } catch {}
      wsRef.current = null;
    };
  }, [isAuthenticated, isLoading]);

  async function sendMessage() {
    if (!text.trim() || !activeId || sending) return;
    setSending(true);
    const optimistic: Message = {
      id: Date.now(),
      channel_id: activeId,
      sender_email: user?.email ?? "",
      sender_name: user?.email ?? "",
      text: text.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setText("");
    try {
      const r = await api.post(`/chat/channels/${activeId}/messages`, { text: optimistic.text });
      setMessages(prev => prev.map(m => m.id === optimistic.id ? r.data : m));
      fetchChannels();
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setText(optimistic.text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function openDm(peerEmail: string) {
    setShowDmPicker(false);
    setDmSearch("");
    try {
      const r = await api.post("/chat/dm", { peer_email: peerEmail });
      await fetchChannels();
      setActiveId(r.data.id);
    } catch {}
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (!isAuthenticated && !isLoading) return null;

  const activeChannel = channels.find(c => c.id === activeId);
  const groupChannels = channels.filter(c => c.type === "channel");
  const dmChannels = channels.filter(c => c.type === "dm");

  const filteredGroupChannels = groupChannels.filter(c =>
    !channelSearch || (c.name ?? "").toLowerCase().includes(channelSearch.toLowerCase())
  );
  const filteredDmChannels = dmChannels.filter(c =>
    !channelSearch || (c.dm_peer_email ?? "").toLowerCase().includes(channelSearch.toLowerCase())
  );
  const filteredTeamUsers = teamUsers.filter(u =>
    !dmSearch || u.name.toLowerCase().includes(dmSearch.toLowerCase()) || u.email.toLowerCase().includes(dmSearch.toLowerCase())
  );

  const grouped = groupMessagesByDate(messages);

  function channelDisplayName(c: Channel) {
    if (c.type === "dm") return c.dm_peer_email ?? "DM";
    return c.name ?? "channel";
  }

  return (
    <>
      <SideMenu />
      <div
        className="flex h-screen overflow-hidden bg-[#F4F3F4] dark:bg-[#131517]"
        style={{ paddingLeft: "var(--app-sidebar-width, 308px)" }}
      >
        {/* ── Channel sidebar ── */}
        <div className="w-56 flex-shrink-0 flex flex-col bg-[#103E36] text-white overflow-hidden">
          <div className="px-3 pt-4 pb-2 flex-shrink-0">
            <div className="text-xs font-bold uppercase tracking-widest text-[#3FFFA3]/60 mb-2 px-1">Workspace</div>
            <div className="relative mb-3">
              <IoSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                value={channelSearch}
                onChange={e => setChannelSearch(e.target.value)}
                placeholder="Search..."
                className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-white/10 text-xs text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-[#3FFFA3]/40"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
            {/* Channels */}
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-2 pt-1 pb-1 mt-1">
              Channels
            </div>
            {filteredGroupChannels.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors ${
                  activeId === c.id
                    ? "bg-[#3FFFA3]/15 text-[#3FFFA3]"
                    : "text-white/60 hover:bg-white/8 hover:text-white"
                }`}
              >
                <MdTag size={14} className="shrink-0 opacity-70" />
                <span className="truncate">{c.name}</span>
              </button>
            ))}

            {/* DMs */}
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-2 pt-3 pb-1 flex items-center justify-between">
              <span>Direct Messages</span>
              <button
                onClick={() => setShowDmPicker(p => !p)}
                className="w-4 h-4 rounded flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white"
              >
                <IoAdd size={12} />
              </button>
            </div>

            <AnimatePresence>
              {showDmPicker && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mx-1 mb-2 bg-white/8 rounded-lg p-2">
                    <input
                      autoFocus
                      value={dmSearch}
                      onChange={e => setDmSearch(e.target.value)}
                      placeholder="Find teammate..."
                      className="w-full px-2 py-1 rounded bg-white/10 text-xs text-white placeholder:text-white/30 outline-none mb-1.5"
                    />
                    <div className="space-y-0.5 max-h-32 overflow-y-auto">
                      {filteredTeamUsers.map(u => (
                        <button
                          key={u.email}
                          onClick={() => openDm(u.email)}
                          className="w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-white/70 hover:bg-white/10 hover:text-white text-left"
                        >
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${avatarColor(u.email)} flex items-center justify-center text-[9px] font-bold text-white shrink-0`}>
                            {initials(u.name)}
                          </div>
                          <span className="truncate">{u.name}</span>
                        </button>
                      ))}
                      {filteredTeamUsers.length === 0 && (
                        <div className="text-xs text-white/30 px-2 py-1">No teammates found</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {filteredDmChannels.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors ${
                  activeId === c.id
                    ? "bg-[#3FFFA3]/15 text-[#3FFFA3]"
                    : "text-white/60 hover:bg-white/8 hover:text-white"
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${avatarColor(c.dm_peer_email ?? "")} flex items-center justify-center text-[9px] font-bold text-white shrink-0`}>
                  {initials(c.dm_peer_email ?? "?")}
                </div>
                <span className="truncate text-xs">{c.dm_peer_email}</span>
              </button>
            ))}

            {dmChannels.length === 0 && !showDmPicker && (
              <div className="text-[11px] text-white/25 px-3 py-1">
                No DMs yet — click + to start one
              </div>
            )}
          </div>
        </div>

        {/* ── Messages panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!activeChannel ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-[#1C1E1C]/40 dark:text-white/20">
                <IoChatbubbles size={48} className="mx-auto mb-3 opacity-40" />
                <div className="font-semibold">Select a channel to start chatting</div>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex-shrink-0 h-14 flex items-center px-5 gap-3 border-b border-black/5 dark:border-white/8 bg-white dark:bg-[#1E2128]">
                {activeChannel.type === "channel" ? (
                  <MdTag size={18} className="text-[#1F6A5C] dark:text-[#3FFFA3]/70" />
                ) : (
                  <IoPerson size={16} className="text-[#1F6A5C] dark:text-[#3FFFA3]/70" />
                )}
                <span className="font-bold text-[#1C1E1C] dark:text-white">
                  {channelDisplayName(activeChannel)}
                </span>
                {activeChannel.type === "channel" && (
                  <span className="text-sm text-[#1C1E1C]/45 dark:text-white/30">
                    Team channel
                  </span>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {loadingMsgs ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-8 h-8 rounded-full bg-[#50BFA0]/20 shrink-0" />
                        <div className="space-y-2 flex-1">
                          <div className="h-3 bg-[#50BFA0]/15 rounded w-24" />
                          <div className="h-3 bg-[#50BFA0]/10 rounded w-64" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : grouped.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-[#1C1E1C]/40 dark:text-white/20">
                    <IoChatbubbles size={40} className="mb-3 opacity-40" />
                    <div className="font-semibold">No messages yet</div>
                    <div className="text-sm">Be the first to say something in #{channelDisplayName(activeChannel)}</div>
                  </div>
                ) : (
                  grouped.map((group) => (
                    <div key={group.date}>
                      <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px bg-black/6 dark:bg-white/8" />
                        <span className="text-xs text-[#1C1E1C]/40 dark:text-white/30 font-medium">{group.date}</span>
                        <div className="flex-1 h-px bg-black/6 dark:bg-white/8" />
                      </div>
                      <div className="space-y-0.5">
                        {group.messages.map((msg, idx) => {
                          const prev = group.messages[idx - 1];
                          const isContinued = prev && prev.sender_email === msg.sender_email &&
                            new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;
                          const isOwn = msg.sender_email === user?.email;
                          const name = msg.sender_name || msg.sender_email;

                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.1 }}
                              className={`flex gap-3 group rounded-lg px-2 py-1 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] ${isContinued ? "mt-0" : "mt-3"}`}
                            >
                              <div className="w-8 shrink-0 flex items-start justify-center pt-0.5">
                                {!isContinued ? (
                                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColor(msg.sender_email)} flex items-center justify-center text-xs font-bold text-white`}>
                                    {initials(name)}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-[#1C1E1C]/25 dark:text-white/20 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                                    {formatTime(msg.created_at)}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                {!isContinued && (
                                  <div className="flex items-baseline gap-2 mb-0.5">
                                    <span className={`text-sm font-bold ${isOwn ? "text-[#1F6A5C] dark:text-[#3FFFA3]" : "text-[#1C1E1C] dark:text-white"}`}>
                                      {name}
                                    </span>
                                    <span className="text-[10px] text-[#1C1E1C]/35 dark:text-white/25">
                                      {formatTime(msg.created_at)}
                                    </span>
                                  </div>
                                )}
                                <p className="text-sm text-[#1C1E1C]/85 dark:text-white/80 whitespace-pre-wrap break-words leading-relaxed">
                                  {msg.text}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="flex-shrink-0 px-5 pb-5 pt-2">
                <div className="flex items-end gap-3 rounded-xl border border-black/8 dark:border-white/10 bg-white dark:bg-[#1E2128] px-4 py-3 shadow-sm">
                  <textarea
                    ref={inputRef}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${activeChannel.type === "channel" ? "#" : ""}${channelDisplayName(activeChannel)}`}
                    rows={1}
                    style={{ resize: "none", maxHeight: 120 }}
                    className="flex-1 bg-transparent text-sm text-[#1C1E1C] dark:text-white placeholder:text-[#1C1E1C]/35 dark:placeholder:text-white/25 outline-none leading-relaxed"
                    onInput={e => {
                      const t = e.currentTarget;
                      t.style.height = "auto";
                      t.style.height = Math.min(t.scrollHeight, 120) + "px";
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!text.trim() || sending}
                    className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-[#1F6A5C] to-[#50BFA0] flex items-center justify-center text-white disabled:opacity-30 transition-opacity hover:opacity-90"
                  >
                    <IoPaperPlane size={14} />
                  </button>
                </div>
                <div className="text-[10px] text-[#1C1E1C]/30 dark:text-white/20 mt-1.5 px-1">
                  Enter to send · Shift+Enter for new line
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
