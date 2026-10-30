"use client";

import { useEffect, useState, useCallback } from "react";
import { SideMenu } from "@/Components";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import style from "@/styles/Report.module.css";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { MdCheck, MdContentCopy, MdRefresh } from "react-icons/md";
import { IoCheckmarkCircle, IoCloseCircle } from "react-icons/io5";
import { FaServer, FaCloud, FaNetworkWired, FaKey } from "react-icons/fa";
import { SiCloudflare } from "react-icons/si";

const API_BASE = "https://api.ava-cyber.com";
const SYSLOG_HOST = "api.ava-cyber.com";
const SYSLOG_PORT = "514";

type ApiKey = { id: number; name: string; key_prefix: string; enabled: boolean; created_at: string };

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-[#1F6A5C]/10 dark:hover:bg-white/10 text-[#1C1E1C]/40 dark:text-white/30 hover:text-[#1F6A5C] dark:hover:text-[#3FFFA3] transition-colors shrink-0">
      {copied ? <MdCheck size={14} className="text-emerald-500" /> : <MdContentCopy size={14} />}
    </button>
  );
}

function CodeLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#0D1117] font-mono text-xs">
      {label && <span className="text-[#F4F3F4]/35 shrink-0">{label}</span>}
      <span className="text-[#3FFFA3] truncate flex-1">{value}</span>
      <CopyButton value={value} />
    </div>
  );
}

function IntegrationCard({ icon, title, badge, children }: {
  icon: React.ReactNode; title: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white dark:bg-[#1E2128] border border-[#1F6A5C]/15 dark:border-white/8 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1F6A5C]/10 dark:border-white/6">
        <div className="w-8 h-8 rounded-lg bg-[#1F6A5C]/10 dark:bg-[#3FFFA3]/10 flex items-center justify-center text-[#1F6A5C] dark:text-[#3FFFA3]">
          {icon}
        </div>
        <span className="font-semibold text-[#1C1E1C] dark:text-white">{title}</span>
        {badge && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-semibold">{badge}</span>
        )}
      </div>
      <div className="px-5 py-4 space-y-3">{children}</div>
    </div>
  );
}

export default function IntegrationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "ok" | "fail">("idle");

  useEffect(() => {
    if (!isAuthenticated && !isLoading) router.push("/");
  }, [isAuthenticated, isLoading, router]);

  const loadKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const res = await api.get("/siem/api-keys");
      setApiKeys(res.data ?? []);
    } catch { setApiKeys([]); }
    finally { setKeysLoading(false); }
  }, []);

  useEffect(() => { if (isAuthenticated) loadKeys(); }, [isAuthenticated, loadKeys]);

  async function testIngest() {
    setTestStatus("loading");
    try {
      await api.get("/v1/ingest/health");
      setTestStatus("ok");
      toast.success("Ingest API is reachable");
    } catch {
      setTestStatus("fail");
      toast.error("Ingest API unreachable");
    }
    setTimeout(() => setTestStatus("idle"), 4000);
  }

  const activeKey = apiKeys.find(k => k.enabled);
  const keyDisplay = activeKey ? `${activeKey.key_prefix}••••••••••••••••••••` : "<YOUR_API_KEY>";

  if (!isAuthenticated && !isLoading) return null;

  return (
    <>
      <SideMenu />
      <div className={`${style.main} bg-[#F4F3F4] dark:bg-[#1C1E1C] min-h-screen p-6`}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#103E36] dark:text-[#F4F3F4]">Integrations</h1>
              <p className="text-sm text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 mt-1">Connect your security tools to stream events into AVA Cyber SIEM</p>
            </div>
            <button onClick={testIngest} disabled={testStatus === "loading"}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[#1F6A5C]/20 dark:border-white/10 bg-white dark:bg-[#1E2128] text-[#1C1E1C] dark:text-[#F4F3F4]/80 hover:bg-[#F4F3F4] dark:hover:bg-white/[0.06] transition-colors">
              {testStatus === "loading" && <span className="w-3.5 h-3.5 border-2 border-[#1F6A5C]/30 border-t-[#1F6A5C] rounded-full animate-spin" />}
              {testStatus === "ok" && <IoCheckmarkCircle className="text-emerald-500" size={16} />}
              {testStatus === "fail" && <IoCloseCircle className="text-red-400" size={16} />}
              {testStatus === "idle" && <MdRefresh size={16} />}
              Test Connection
            </button>
          </div>

          {/* API Key notice */}
          <div className="rounded-xl bg-amber-400/8 border border-amber-400/20 px-5 py-4 flex items-start gap-3">
            <FaKey className="text-amber-400 mt-0.5 shrink-0" size={14} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#1C1E1C] dark:text-[#F4F3F4]/80 mb-0.5">API Key required for HTTP integrations</p>
              {keysLoading ? (
                <p className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/40">Loading keys…</p>
              ) : activeKey ? (
                <p className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45">Active key: <span className="font-mono text-amber-600 dark:text-amber-400">{activeKey.key_prefix}••••</span> ({activeKey.name}) — copy the full key from <a href="/siem" className="underline text-[#1F6A5C] dark:text-[#3FFFA3]">SIEM → Sources → API Keys</a></p>
              ) : (
                <p className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45">No API key found. Create one in <a href="/siem" className="underline text-[#1F6A5C] dark:text-[#3FFFA3]">SIEM → Sources → API Keys</a> then return here.</p>
              )}
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Syslog */}
            <IntegrationCard icon={<FaServer size={15} />} title="Syslog (UDP / TCP)" badge="Live">
              <p className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45">Point your firewall, router, or log forwarder to this address. No API key needed — events are attributed by source IP.</p>
              <div className="space-y-1.5">
                <CodeLine label="host" value={SYSLOG_HOST} />
                <CodeLine label="port" value={SYSLOG_PORT} />
                <CodeLine label="proto" value="UDP  or  TCP" />
              </div>
              <p className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/35 mt-1">Compatible with rsyslog, syslog-ng, Palo Alto, Fortinet, Cisco ASA, pfSense, and any RFC 5424 sender.</p>
              <div className="rounded-lg bg-[#0D1117] px-3 py-2.5 font-mono text-xs text-[#F4F3F4]/60 space-y-1 mt-1">
                <div className="text-[#F4F3F4]/35"># rsyslog.conf</div>
                <div>*.* @{SYSLOG_HOST}:{SYSLOG_PORT}  <span className="text-[#F4F3F4]/35"># UDP</span></div>
                <div>*.* @@{SYSLOG_HOST}:{SYSLOG_PORT} <span className="text-[#F4F3F4]/35"># TCP</span></div>
              </div>
            </IntegrationCard>

            {/* HTTP API */}
            <IntegrationCard icon={<FaNetworkWired size={15} />} title="HTTP Ingest API" badge="Live">
              <p className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45">Send events over HTTPS from any script, SIEM forwarder, or custom integration. Requires an API key.</p>
              <div className="space-y-1.5">
                <CodeLine label="POST" value={`${API_BASE}/v1/ingest/events`} />
                <CodeLine label="header" value={`X-AVA-API-Key: ${keyDisplay}`} />
              </div>
              <div className="rounded-lg bg-[#0D1117] px-3 py-2.5 font-mono text-xs text-[#3FFFA3]/80 space-y-1 mt-1">
                <div className="text-[#F4F3F4]/35"># curl example</div>
                <div className="break-all text-[#F4F3F4]/60">curl -X POST {API_BASE}/v1/ingest/events \</div>
                <div className="text-[#F4F3F4]/60 pl-2">-H &quot;X-AVA-API-Key: {keyDisplay}&quot; \</div>
                <div className="text-[#F4F3F4]/60 pl-2">-H &quot;Content-Type: application/json&quot; \</div>
                <div className="text-[#F4F3F4]/60 pl-2">-d &apos;&#123;&quot;event_type&quot;:&quot;auth_failure&quot;,&quot;source_ip&quot;:&quot;1.2.3.4&quot;&#125;&apos;</div>
              </div>
              <div className="text-xs text-[#1C1E1C]/50 dark:text-[#F4F3F4]/35 mt-1">Also supports <span className="font-mono">/v1/ingest/events/batch</span> (up to 500 events) and <span className="font-mono">/v1/ingest/raw</span> for raw syslog lines over HTTP.</div>
            </IntegrationCard>

            {/* Cloudflare */}
            <IntegrationCard icon={<SiCloudflare size={15} />} title="Cloudflare Logpush" badge="Live">
              <p className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45">Stream Cloudflare firewall, access, and DNS logs directly into AVA Cyber via Logpush.</p>
              <div className="space-y-1.5">
                <CodeLine label="POST" value={`${API_BASE}/v1/ingest/cloudflare`} />
                <CodeLine label="header" value={`X-AVA-API-Key: ${keyDisplay}`} />
              </div>
              <ol className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 space-y-1 list-decimal pl-4 mt-1">
                <li>Cloudflare Dashboard → Analytics → Logpush → Create job</li>
                <li>Select dataset (Firewall Events, HTTP Requests, etc.)</li>
                <li>Set destination to <span className="font-mono text-[#1F6A5C] dark:text-[#3FFFA3]">HTTPS</span> and paste the URL above</li>
                <li>Add header <span className="font-mono">X-AVA-API-Key</span> with your key</li>
              </ol>
            </IntegrationCard>

            {/* JumpCloud */}
            <IntegrationCard icon={<FaCloud size={15} />} title="JumpCloud Directory" badge="Live">
              <p className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45">Stream JumpCloud Directory Insights events (logins, MFA, group changes) into your SIEM.</p>
              <div className="space-y-1.5">
                <CodeLine label="POST" value={`${API_BASE}/v1/ingest/jumpcloud`} />
                <CodeLine label="header" value={`X-AVA-API-Key: ${keyDisplay}`} />
              </div>
              <ol className="text-xs text-[#1C1E1C]/60 dark:text-[#F4F3F4]/45 space-y-1 list-decimal pl-4 mt-1">
                <li>JumpCloud Admin → Insights → Webhooks → New Webhook</li>
                <li>Set URL to the endpoint above</li>
                <li>Add custom header <span className="font-mono">X-AVA-API-Key</span> with your key</li>
                <li>Select event types and save</li>
              </ol>
            </IntegrationCard>

          </div>

          {/* Generic forwarders */}
          <div className="rounded-xl bg-white dark:bg-[#1E2128] border border-[#1F6A5C]/15 dark:border-white/8 px-5 py-4">
            <p className="font-semibold text-[#1C1E1C] dark:text-white mb-3">Connect via existing SIEM forwarders</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {[
                { name: "Splunk", hint: "Use HTTP Event Collector output → point to /v1/ingest/events" },
                { name: "Elastic", hint: "Use Logstash http output plugin or Fleet policy" },
                { name: "Azure Sentinel", hint: "Use Logic App HTTP action or Sentinel data connector" },
                { name: "Google Chronicle", hint: "Use Chronicle forwarder with HTTP output" },
                { name: "Rapid7", hint: "Use InsightIDR event source → syslog forwarding" },
              ].map(({ name, hint }) => (
                <div key={name} className="rounded-lg bg-[#F4F3F4]/50 dark:bg-white/5 border border-[#1F6A5C]/10 dark:border-white/6 p-3 group relative cursor-default">
                  <p className="text-sm font-medium text-[#1C1E1C] dark:text-[#F4F3F4]/80">{name}</p>
                  <p className="text-[10px] text-[#1C1E1C]/40 dark:text-[#F4F3F4]/30 mt-1 leading-tight">{hint}</p>
                </div>
              ))}
            </div>
          </div>

        </motion.div>
      </div>
    </>
  );
}
