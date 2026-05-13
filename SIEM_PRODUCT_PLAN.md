# AVA Cyber — AI-Native SIEM Product Plan

## What We're Building

An **AI-Native SIEM with integrated Security Case Management** — positioned for mid-market companies (100–2,000 employees) who can't afford Splunk, CrowdStrike, or Microsoft Sentinel at enterprise pricing.

Built on top of the existing SecureConnect platform (AVA Cyber), which already has:
- Incident reporting and management
- Ticketing and case management
- Role-based access control (SOC, GRC, IAM, Pentesting, GSOC, Admin)
- Real-time WebSocket notifications
- Email alerting
- Audit logging
- User management and approval workflows

---

## Market Positioning

### Product Name Concept
**AVA Cyber — AI-Native SIEM** (or "Open XDR" once endpoint agents are added)

### The Pitch
> "Detect, investigate, and respond in one platform. AI triages your alerts so your analysts focus on what matters. No Jira integration. No Splunk bill."

### Target Customer
- Mid-market companies: 100–2,000 employees
- Industries: Finance, healthcare, SaaS, retail, critical infrastructure
- Buyer: CISO, SOC Manager, Head of Security Operations
- Pain point: Alert fatigue, tool sprawl, expensive enterprise SIEM pricing

### Why This Wins in the Market
Most SIEMs are **detection only** — you still need a separate ticketing system (Jira, ServiceNow), a separate case management tool, and a separate SOAR for response automation. AVA Cyber has all of this already built in. That is the core differentiator:

| Capability | Splunk | Elastic SIEM | AVA Cyber |
|------------|--------|-------------|-----------|
| Log ingestion | ✅ | ✅ | ✅ (building) |
| AI detection rules | Partial | Partial | ✅ (building) |
| Alert triage AI | Add-on $$$ | No | ✅ (building) |
| Case management | No (need Jira) | No | ✅ Already built |
| Incident ticketing | No | No | ✅ Already built |
| RBAC for security teams | Basic | Basic | ✅ Already built |
| Price | $100k+/yr | $30k+/yr | Mid-market pricing |

### Competitive Landscape
- **Hunters.ai** — Open XDR, raised $68M, same model
- **Stellar Cyber** — Open XDR, raised $150M, same model
- **Exabeam** — AI SIEM, acquired for $1B+
- **Vectra AI** — AI NDR/XDR, $350M raised
- All of these target enterprise. The mid-market gap is real and underserved.

---

## Product Roadmap

### Phase 1 — AI-Native SIEM (Build Now)
**What you can sell immediately.**

#### Log Ingestion
- Syslog receiver (UDP/TCP port 514) — works with firewalls, routers, Linux hosts
- REST API endpoint — any source can POST events
- Agent-based collection (lightweight script or Beats-compatible)
- Cloud integrations: AWS CloudTrail, Azure Activity Logs, GCP Audit Logs
- Normalization layer: maps all sources to a common schema (OCSF or ECS)

#### Detection Engine
- Sigma rule support (industry standard — massive free rule library from SigmaHQ)
- Custom rule builder (UI-based)
- Real-time rule evaluation on incoming events
- Scheduled threat hunts

#### AI Features (core value prop)
1. **AI Alert Triage** — every alert scored 0–100 confidence, plain-English explanation of why it fired, auto-suppression of known false positives
2. **AI Investigation Narratives** — when alert fires, AI correlates related events and writes: "User john.doe logged in from Russia, accessed 847 files in 4 minutes, then connected to 185.x.x.x. Matches data exfiltration pattern."
3. **Natural Language Rule Builder** — type "alert me when any user logs in outside business hours and accesses more than 50 files" → AI generates the detection rule
4. **Behavioral Anomaly Detection (UEBA)** — learns normal behavior per user/host, flags deviations ("this user never logs in at 3am")

#### Integrated Response (already built in AVA Cyber)
- Alert fires → AI writes investigation narrative → one-click creates incident ticket in existing system
- Existing notifications (email + WebSocket) fire automatically
- Existing RBAC routes alert to the right team
- Full audit trail already in place

### Phase 2 — Open XDR (3–6 months after Phase 1)
- Add lightweight endpoint agent (Wazuh agent or custom) for first-party endpoint telemetry
- Network sensor integration (Zeek/Suricata for NDR)
- Identity integration (Active Directory / Azure Entra logs)
- Now you can market as **Open XDR**

### Phase 3 — Managed Detection & Response (MDR) (future)
- Offer the platform as a managed service
- You or partners provide human analyst coverage on top of the platform
- Recurring revenue, higher margins

---

## Technical Architecture

### Tech Stack (inherits from existing)
- **Backend**: Node.js + Express (existing)
- **Frontend**: Next.js 14 + TypeScript + Tailwind + Chakra UI (existing)
- **Primary DB**: PostgreSQL (existing) — used for rules, alerts, metadata
- **Log Storage**: PostgreSQL with partitioning for MVP; migrate to ClickHouse for scale
- **AI**: OpenAI API (already integrated in project)
- **Real-time**: WebSocket (already built)

### New Database Tables
```sql
-- Raw ingested log events
siem_events (
  id, source, source_ip, event_type, severity,
  raw_log, normalized, tags, ingested_at
)

-- Fired detection alerts
siem_alerts (
  id, rule_id, event_id, severity, status,
  ai_score, ai_summary, ai_narrative,
  assigned_to, ticket_id, created_at, resolved_at
)

-- Detection rules
siem_rules (
  id, name, description, logic, sigma_yaml,
  enabled, created_by, ai_generated,
  hit_count, false_positive_count, created_at
)

-- Behavioral baselines (UEBA)
siem_baselines (
  entity_type, entity_id, metric, baseline_value,
  stddev, last_updated
)

-- Log sources / integrations
siem_sources (
  id, name, type, config, enabled,
  last_seen, event_count, created_at
)
```

### New Backend Routes
```
POST /siem/ingest              — receive log events
GET  /siem/events              — query events (with filters)
GET  /siem/alerts              — get alerts
PUT  /siem/alerts/:id          — update alert status
GET  /siem/rules               — list detection rules
POST /siem/rules               — create rule
PUT  /siem/rules/:id           — update/enable/disable rule
POST /siem/ai/generate-rule    — NL → detection rule
POST /siem/ai/triage/:alertId  — AI triage an alert
POST /siem/ai/investigate/:alertId — AI investigation narrative
GET  /siem/sources             — list log sources
POST /siem/sources             — add log source
GET  /siem/stats               — SIEM dashboard metrics
```

### Frontend Structure (new section)
```
/siem                    — SIEM Overview dashboard
/siem/alerts             — AI-triaged alert queue
/siem/events             — Live event stream + search
/siem/rules              — Detection rules manager
/siem/rules/new          — AI rule builder
/siem/sources            — Log source management
/siem/investigate/:id    — AI investigation console
```

### UI Placement
- New top-level sidebar link: "SIEM" with a shield icon
- Visible to security roles (SOC, GSOC, Security Manager, Admin)
- Sub-navigation within the SIEM section
- Existing design system (teal palette, glass cards, dark mode) — consistent with rest of app

---

## AI Implementation Detail

### Alert Triage Prompt (OpenAI)
Each alert is sent to the AI with:
- The raw event that triggered it
- The rule that matched
- Last 10 events from the same source IP / user
- Historical false positive rate for this rule

AI returns:
- `score`: 0–100 (likelihood of true positive)
- `reasoning`: plain English explanation
- `recommended_action`: investigate / suppress / escalate

### Investigation Narrative Prompt
When analyst opens an alert, AI receives:
- The alert details
- All events from the same user/IP in the last 24 hours
- Any related open tickets or incidents

AI returns a structured narrative:
- Timeline of events
- What happened in plain English
- MITRE ATT&CK technique mapping
- Recommended response steps

### Rule Generation Prompt
User types natural language description.
AI generates:
- A detection rule in the platform's native format
- A Sigma rule (exportable, shareable)
- Description + rationale
- Suggested severity level

---

## Pricing Model (suggested)

| Tier | Price | Includes |
|------|-------|----------|
| **Starter** | $500/mo | Up to 5GB/day ingestion, 3 users, community Sigma rules |
| **Professional** | $1,500/mo | Up to 20GB/day, 10 users, AI triage + rule builder |
| **Business** | $4,000/mo | Unlimited ingestion, unlimited users, full AI suite, UEBA |
| **Enterprise** | Custom | On-prem option, SLA, dedicated support |

Compare: Splunk starts at ~$150/GB or $100k+/year contracts.
Your Starter tier is an easy yes for a 200-person company paying $6k/year.

---

## What to Build First (Implementation Order)

1. **DB migrations** — `siem_events`, `siem_alerts`, `siem_rules`, `siem_sources` tables
2. **Backend routes** — ingest endpoint, events query, alerts CRUD, rules CRUD
3. **SIEM sidebar link + page shell** — visible in browser immediately
4. **SIEM overview dashboard** — stats cards, recent alerts, source status
5. **Live event stream page** — real-time log feed with search/filter
6. **Alerts queue** — list view with AI score badges
7. **AI triage** — wire OpenAI to score alerts on creation
8. **Detection rules manager** — list, enable/disable, view hit counts
9. **AI rule builder** — natural language → rule generation
10. **AI investigation console** — narrative generation when opening an alert
11. **UEBA baselines** — behavioral anomaly detection layer
12. **Log source management** — add/configure sources in UI

---

## Notes
- Existing incident management stays exactly as-is — SIEM is additive
- Alerts that escalate auto-create tickets in existing system (uses existing `/tickets` route)
- Existing notification system (email + WebSocket) reused for SIEM alerts
- OpenAI already integrated in backend — just needs new prompt engineering
- All AI features degrade gracefully if OpenAI is unavailable (show alert without AI score)
