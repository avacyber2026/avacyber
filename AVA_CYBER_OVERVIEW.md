# AVA Cyber — Product Overview

## What Is AVA Cyber?

AVA Cyber is an AI-powered security operations platform built for mid-market companies.
It combines three things that security teams currently buy separately — and pay a fortune for — into one product:

- **SIEM** — detect threats from your logs and data sources
- **Case Management** — track, investigate, and resolve every incident
- **AI Layer** — triage alerts, write detections, and investigate threats automatically

Most companies running a security team today use Splunk or Microsoft Sentinel for detection,
Jira or ServiceNow for case management, and a separate SOAR tool for response automation.
AVA Cyber replaces all three.

---

## The Problem We Solve

Security teams are drowning.

A mid-size company generates hundreds of security alerts every day.
Analysts manually review each one. Most are false alarms.
By the time a real threat surfaces, the team is exhausted and the damage is done.

On top of that:
- Enterprise SIEM tools (Splunk, Sentinel) cost $50,000–$200,000+ per year
- They require dedicated engineers to operate and maintain
- They don't include case management — you still need Jira
- They don't include response automation — you still need a SOAR tool
- Their AI features are expensive add-ons, not core functionality

Mid-market companies — 100 to 2,000 employees — are completely underserved.
They have real security needs but can't justify enterprise pricing or headcount.

---

## Our Solution

AVA Cyber gives mid-market companies enterprise-grade security operations at a price they can actually afford.

### Detect
Connect your existing security tools — firewalls, cloud environments, identity systems, endpoints — and AVA Cyber ingests all of their logs in real time. Built-in detection rules (and the ability to create new ones using plain English) flag suspicious activity the moment it happens.

### Investigate
When something is flagged, the AI has already done the first 30 minutes of analyst work. It correlates related events, builds a timeline, and writes a plain-English narrative of what happened — before the analyst even opens the alert.

### Respond
One click turns an alert into a tracked incident with the AI investigation attached. The right team is notified automatically. Every action is logged. Nothing falls through the cracks.

---

## How It Is Different

| | Splunk / Sentinel | AVA Cyber |
|---|---|---|
| Detects threats | Yes | Yes |
| AI that actually works | Expensive add-on | Built in, core feature |
| Case management included | No — need Jira | Yes |
| Response automation included | No — need SOAR | Yes |
| Usable without a dedicated engineer | No | Yes |
| Price for 500-person company | $80,000–$150,000/yr | $18,000–$48,000/yr |
| Setup time | Weeks to months | Days |

---

## The AI Layer — What It Actually Does

This is not AI as a marketing word. These are four specific things the AI does that directly replace analyst time:

**1. Alert Triage**
Every alert is scored from 0 to 100. The AI explains why it fired and whether it looks real.
The analyst sees five high-confidence alerts instead of five hundred. Alert fatigue solved.

**2. Investigation Narratives**
When you open an alert, the AI has already written the investigation.
"This user logged in from an unusual location, accessed 800 files in 4 minutes, and connected to an external IP. This matches a data exfiltration pattern. Recommended action: isolate the session and escalate."
An analyst used to spend 45 minutes building this picture. Now it's instant.

**3. Detection Rule Builder**
Type what you want to detect in plain English.
"Alert me when someone logs in outside business hours and then accesses payroll files."
The AI writes the rule. Non-engineers can build detections. Coverage gaps close faster.

**4. Behavioral Learning**
The platform learns what normal looks like for every user and every system.
When something deviates — unusual login time, unusual location, unusual file access volume — it surfaces automatically, even without a pre-written rule.

---

## Platform Architecture (Non-Technical)

```
                    YOUR ENVIRONMENT
        ┌─────────────────────────────────────┐
        │  Firewalls   Cloud   Endpoints   Apps│
        └──────────────────┬──────────────────┘
                           │ logs & events
                           ▼
               ┌───────────────────────┐
               │   AVA Cyber Ingestor  │
               │  (normalizes all data │
               │   into one format)    │
               └───────────┬───────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │Detection │ │Behavioral│ │  Search  │
        │  Engine  │ │Baselines │ │  Index   │
        │ (rules)  │ │ (UEBA)   │ │(raw logs)│
        └────┬─────┘ └────┬─────┘ └──────────┘
             │            │
             └─────┬──────┘
                   │ alert
                   ▼
          ┌─────────────────┐
          │    AI Layer     │
          │  triage · score │
          │  investigate    │
          │  narrate        │
          └────────┬────────┘
                   │
                   ▼
        ┌────────────────────┐
        │  Alert Queue       │
        │  (analyst sees 5   │
        │  not 500)          │
        └────────┬───────────┘
                 │ one click
                 ▼
        ┌────────────────────┐
        │  Incident Ticket   │◄── existing AVA Cyber
        │  + AI narrative    │    case management
        │  + team assigned   │
        │  + full audit log  │
        └────────────────────┘
```

The flow is linear: data comes in, rules and AI evaluate it, the analyst sees only what matters, one click creates a tracked incident. End to end — no switching between tools.

---

## Who Uses It

**Security Analysts (SOC)**
Their daily tool. They live in the alert queue and investigation console.
AI does the grunt work so they do the thinking.

**Security Managers**
Oversight view. See what's open, what's resolved, what the AI flagged as high risk.
SLA tracking built in — nothing sits unresolved past its deadline.

**GRC / Compliance Teams**
Full audit trail of every event, every decision, every response.
Exportable reports. Evidence collection is automatic.

**IT / DevOps (as log sources)**
They don't use the platform directly — their infrastructure just ships logs to it.
Setup takes minutes, not weeks.

**CISOs**
Dashboard view of security posture. No spreadsheets. No chasing analysts for updates.

---

## Growth Path

**Today — AI-Native SIEM**
Ingest logs from any existing tool. AI detection, triage, investigation. Full case management. This is what we sell first.

**Next — Open XDR**
Add a lightweight agent that collects first-party data directly from endpoints and networks. Richer data means more accurate AI. Better product, higher price point.

**Later — Managed Detection & Response (MDR)**
Offer the platform as a managed service. We (or certified partners) provide human analyst coverage on top of the AI. Recurring revenue, premium tier.

---

## Pricing (Concept)

| Tier | Monthly | Who It's For |
|------|---------|-------------|
| Starter | $500 | Small teams, up to 5GB/day of logs |
| Professional | $1,500 | Growing security teams, AI triage + rule builder |
| Business | $4,000 | Full AI suite including behavioral detection |
| Enterprise | Custom | Large orgs, on-premise option, dedicated support |

A 500-person company on the Professional plan pays $18,000/year.
The same company on Splunk pays $80,000–$150,000/year.
The same company on Splunk + Jira + a SOAR tool pays more than $200,000/year.

---

## Why Now

Three things converging make this the right moment:

1. **AI is finally good enough.** GPT-4 class models can genuinely replace analyst triage time. This was not true 3 years ago.

2. **The mid-market is completely underserved.** Enterprise tools are too expensive and too complex. SMB tools are too basic. Nobody owns this space yet.

3. **Regulations are tightening.** GDPR, NIS2, DORA, SEC cyber disclosure rules — mid-market companies are being held to standards that require proper security tooling. They need a solution. They need one they can afford.

---

## One Line

> AVA Cyber is the security operations platform that mid-market companies can actually afford — AI that triages your alerts, investigates your incidents, and responds before your analyst finishes their coffee.
