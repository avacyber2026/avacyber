-- ── Phishing Awareness Tables ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS phishing_templates (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(300) NOT NULL,
  type            VARCHAR(50)  NOT NULL DEFAULT 'url',      -- url | attachment | qr
  subject         VARCHAR(400) NOT NULL,
  from_name       VARCHAR(200) NOT NULL DEFAULT 'IT Security',
  from_email      VARCHAR(200) NOT NULL DEFAULT 'security@corp.com',
  html_body       TEXT         NOT NULL DEFAULT '',
  preview_text    VARCHAR(300),
  category        VARCHAR(100) DEFAULT 'general',           -- general | finance | hr | it
  difficulty      VARCHAR(50)  DEFAULT 'medium',            -- easy | medium | hard
  created_by      VARCHAR(200),
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phishing_user_groups (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(200) NOT NULL,
  description  TEXT,
  user_emails  JSONB        DEFAULT '[]',
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phishing_campaigns (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(300) NOT NULL,
  description     TEXT,
  type            VARCHAR(50)  NOT NULL DEFAULT 'url',
  status          VARCHAR(50)  NOT NULL DEFAULT 'draft',     -- draft | scheduled | running | completed | paused
  template_id     INTEGER REFERENCES phishing_templates(id) ON DELETE SET NULL,
  group_ids       JSONB        DEFAULT '[]',
  scheduled_at    TIMESTAMPTZ,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  total_sent      INTEGER      DEFAULT 0,
  total_opened    INTEGER      DEFAULT 0,
  total_clicked   INTEGER      DEFAULT 0,
  total_reported  INTEGER      DEFAULT 0,
  created_by      VARCHAR(200),
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phishing_results (
  id           SERIAL PRIMARY KEY,
  campaign_id  INTEGER REFERENCES phishing_campaigns(id) ON DELETE CASCADE,
  user_id      INTEGER,
  email        VARCHAR(300) NOT NULL,
  full_name    VARCHAR(200),
  department   VARCHAR(200),
  sent_at      TIMESTAMPTZ,
  opened_at    TIMESTAMPTZ,
  clicked_at   TIMESTAMPTZ,
  reported_at  TIMESTAMPTZ,
  link_token   VARCHAR(100) UNIQUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Seed: User Groups ─────────────────────────────────────────────────────────

INSERT INTO phishing_user_groups (name, description, user_emails) VALUES
('All Staff',          'All company employees',                      '["alice@corp.com","bob@corp.com","carol@corp.com","david@corp.com","eve@corp.com","frank@corp.com","grace@corp.com","henry@corp.com","iris@corp.com","jack@corp.com","karen@corp.com","liam@corp.com"]'),
('Finance Department', 'Finance and accounting team',                '["carol@corp.com","david@corp.com","karen@corp.com","liam@corp.com","mia@corp.com"]'),
('IT Team',            'IT and engineering staff',                   '["alice@corp.com","bob@corp.com","noah@corp.com","olivia@corp.com"]'),
('Executive Team',     'C-suite and senior leadership',              '["ceo@corp.com","cfo@corp.com","ciso@corp.com","cto@corp.com"]')
ON CONFLICT DO NOTHING;

-- ── Seed: Templates ───────────────────────────────────────────────────────────

INSERT INTO phishing_templates (name, type, subject, from_name, from_email, category, difficulty, html_body) VALUES

('IT: Password Expiry Warning', 'url',
 'Action Required: Your password expires in 24 hours',
 'IT Help Desk', 'helpdesk@it-portal.net',
 'it', 'easy',
$$<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; background: #f0f2f5; margin: 0; padding: 24px; }
  .wrap { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  .hdr  { background: #0078d4; padding: 28px 32px; color: white; }
  .hdr h2 { margin: 0; font-size: 18px; font-weight: 600; }
  .hdr p  { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }
  .body { padding: 32px; color: #333; }
  .alert { background: #fff3cd; border-left: 4px solid #f0a500; border-radius: 4px; padding: 14px 16px; margin-bottom: 24px; font-size: 14px; }
  .btn  { display: inline-block; background: #0078d4; color: #ffffff !important; padding: 13px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px; }
  .footer { background: #f8f9fa; padding: 18px 32px; font-size: 12px; color: #999; border-top: 1px solid #eee; }
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <h2>IT Help Desk — Security Notice</h2>
    <p>Automated notification from the Identity Management System</p>
  </div>
  <div class="body">
    <div class="alert"><strong>⚠ Action required:</strong> Your corporate password will expire in <strong>24 hours</strong>.</div>
    <p>Dear User,</p>
    <p>Our systems have detected that your account password is approaching its expiry date. To avoid being locked out of email, VPN, and internal applications, please reset your password now using the button below.</p>
    <p style="text-align:center;margin:32px 0;">
      <a href="{{PHISHING_URL}}" class="btn">Reset My Password →</a>
    </p>
    <p style="font-size:13px;color:#666;">Failure to reset within 24 hours will lock your account. You will need to contact IT to regain access, which may take up to 2 business days.</p>
    <p style="font-size:13px;color:#666;">Reference ID: <strong>IMS-{{TOKEN}}</strong></p>
  </div>
  <div class="footer">IT Help Desk &nbsp;·&nbsp; helpdesk@corp.com &nbsp;·&nbsp; This is an automated security notification. Do not reply.</div>
</div>
</body>
</html>$$),

('HR: Benefits Open Enrollment', 'url',
 'Open Enrollment closes Friday – update your benefits now',
 'HR Benefits Portal', 'benefits@hr-portal.net',
 'hr', 'medium',
$$<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 24px; }
  .wrap { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  .hdr  { background: #2e7d32; padding: 28px 32px; color: white; }
  .hdr h2 { margin: 0; font-size: 18px; font-weight: 600; }
  .hdr p  { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }
  .body { padding: 32px; color: #333; }
  .box  { background: #e8f5e9; border: 1px solid #a5d6a7; border-radius: 6px; padding: 18px; margin-bottom: 24px; }
  .countdown { font-size: 28px; font-weight: bold; color: #c62828; text-align: center; margin: 8px 0; }
  .btn  { display: inline-block; background: #2e7d32; color: #fff !important; padding: 13px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px; }
  .footer { background: #f8f9fa; padding: 18px 32px; font-size: 12px; color: #999; border-top: 1px solid #eee; }
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <h2>Human Resources — Benefits Enrollment</h2>
    <p>Annual Open Enrollment Period · 2025</p>
  </div>
  <div class="body">
    <div class="box">
      <p style="margin:0 0 4px;font-size:14px;font-weight:600;">Open Enrollment closes in:</p>
      <div class="countdown">2 DAYS</div>
      <p style="margin:0;font-size:13px;color:#555;">Friday, 5:00 PM</p>
    </div>
    <p>Dear Employee,</p>
    <p>This is a reminder that Annual Open Enrollment closes this <strong>Friday at 5:00 PM</strong>. If you do not update your elections, your current benefits will roll over — however, any life event changes (new dependents, address changes) must be submitted during this window.</p>
    <p style="text-align:center;margin:32px 0;">
      <a href="{{PHISHING_URL}}" class="btn">Review &amp; Update My Benefits →</a>
    </p>
    <p style="font-size:13px;color:#666;">Questions? Contact HR at benefits@corp.com or ext. 2200.</p>
  </div>
  <div class="footer">Human Resources &nbsp;·&nbsp; benefits@corp.com &nbsp;·&nbsp; Please do not reply to this automated message.</div>
</div>
</body>
</html>$$),

('Finance: Urgent Invoice Approval', 'attachment',
 'URGENT: Invoice #INV-2025-1147 requires your approval',
 'Finance Department', 'invoices@finance-portal.net',
 'finance', 'medium',
$$<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 24px; }
  .wrap { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  .hdr  { background: #37474f; padding: 28px 32px; color: white; }
  .hdr h2 { margin: 0; font-size: 18px; font-weight: 600; }
  .hdr p  { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }
  .body { padding: 32px; color: #333; }
  .inv  { background: #fafafa; border: 1px solid #ddd; border-radius: 6px; padding: 20px; margin: 24px 0; font-size: 14px; }
  .inv table { width: 100%; border-collapse: collapse; }
  .inv td { padding: 6px 0; }
  .inv .label { color: #777; width: 140px; }
  .inv .amount { font-size: 22px; font-weight: bold; color: #c62828; }
  .attach { background: #fff3e0; border: 1px solid #ffe0b2; border-radius: 6px; padding: 14px 16px; margin: 20px 0; font-size: 14px; cursor: pointer; }
  .attach-icon { display: inline-block; background: #ef6c00; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-right: 8px; }
  .btn  { display: inline-block; background: #37474f; color: #fff !important; padding: 13px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 15px; }
  .footer { background: #f8f9fa; padding: 18px 32px; font-size: 12px; color: #999; border-top: 1px solid #eee; }
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <h2>Finance Department — Invoice Approval</h2>
    <p>Automated AP Workflow System</p>
  </div>
  <div class="body">
    <p>Dear Manager,</p>
    <p>The following invoice has been submitted for your approval. Please review the attached document and approve or reject via the AP portal by <strong>end of business today</strong>.</p>
    <div class="inv">
      <table>
        <tr><td class="label">Invoice #:</td><td><strong>INV-2025-1147</strong></td></tr>
        <tr><td class="label">Vendor:</td><td>CloudSoft Technologies Ltd.</td></tr>
        <tr><td class="label">Date:</td><td>May 27, 2025</td></tr>
        <tr><td class="label">Due Date:</td><td><strong style="color:#c62828;">Today</strong></td></tr>
        <tr><td class="label">Amount:</td><td><span class="amount">$24,850.00</span></td></tr>
        <tr><td class="label">Category:</td><td>Software Licensing</td></tr>
      </table>
    </div>
    <a href="{{PHISHING_URL}}" class="attach">
      <span class="attach-icon">PDF</span>
      <strong>INV-2025-1147_CloudSoft.pdf</strong>
      <span style="color:#999;font-size:12px;margin-left:8px;">(Click to open)</span>
    </a>
    <p style="text-align:center;margin:24px 0;">
      <a href="{{PHISHING_URL}}" class="btn">Open AP Approval Portal →</a>
    </p>
    <p style="font-size:13px;color:#666;">Late payment incurs a 1.5% monthly penalty per vendor contract clause 4.2.</p>
  </div>
  <div class="footer">Finance Department &nbsp;·&nbsp; ap@corp.com &nbsp;·&nbsp; AP Workflow v3.1 &nbsp;·&nbsp; Ref: WF-8821</div>
</div>
</body>
</html>$$),

('IT: Authenticator App Update (QR)', 'qr',
 'IT Security: Update your authenticator — scan QR code now',
 'IT Security Team', 'security-noreply@it-secure.net',
 'it', 'hard',
$$<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; background: #f0f2f5; margin: 0; padding: 24px; }
  .wrap { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  .hdr  { background: #1a237e; padding: 28px 32px; color: white; }
  .hdr h2 { margin: 0; font-size: 18px; font-weight: 600; }
  .hdr p  { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }
  .body { padding: 32px; color: #333; }
  .alert { background: #e3f2fd; border-left: 4px solid #1565c0; border-radius: 4px; padding: 14px 16px; margin-bottom: 24px; font-size: 14px; }
  .qr-box { text-align: center; border: 2px dashed #1565c0; border-radius: 12px; padding: 32px; margin: 24px 0; background: #fafafa; }
  .qr-placeholder { width: 160px; height: 160px; background: #e8eaf6; border-radius: 8px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 48px; }
  .steps { background: #f5f5f5; border-radius: 6px; padding: 20px; margin: 20px 0; }
  .steps ol { margin: 0; padding-left: 20px; font-size: 14px; line-height: 2; }
  .footer { background: #f8f9fa; padding: 18px 32px; font-size: 12px; color: #999; border-top: 1px solid #eee; }
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <h2>IT Security Team — MFA Update Required</h2>
    <p>Mandatory authenticator app migration · Ticket #SEC-4421</p>
  </div>
  <div class="body">
    <div class="alert"><strong>📱 Action required by Friday:</strong> We are migrating all MFA tokens to our new authenticator platform. You must re-enroll before the deadline or you will lose access.</div>
    <p>Dear User,</p>
    <p>As part of our security infrastructure upgrade, we are replacing the current authenticator app with our new enterprise MFA solution. All employees must scan the QR code below to transfer their authentication token to the new system.</p>
    <div class="qr-box">
      <div class="qr-placeholder">⬛</div>
      <p style="margin:0;font-size:13px;color:#666;">Scan with your authenticator app camera</p>
      <p style="margin:8px 0 0;font-size:12px;color:#999;">Or visit: <a href="{{PHISHING_URL}}" style="color:#1565c0;">{{PHISHING_URL}}</a></p>
    </div>
    <div class="steps">
      <strong style="font-size:14px;">Steps to complete enrollment:</strong>
      <ol>
        <li>Open your authenticator app (Microsoft or Google)</li>
        <li>Tap the <strong>+</strong> icon to add a new account</li>
        <li>Select "Scan QR code" and point your camera above</li>
        <li>Confirm the 6-digit code shown in the app</li>
      </ol>
    </div>
    <p style="font-size:13px;color:#666;">If you have already completed this migration, please disregard this email. For assistance contact IT at ext. 1000.</p>
  </div>
  <div class="footer">IT Security Team &nbsp;·&nbsp; security@corp.com &nbsp;·&nbsp; Ticket #SEC-4421 &nbsp;·&nbsp; Do not reply.</div>
</div>
</body>
</html>$$)
ON CONFLICT DO NOTHING;

-- ── Seed: Demo Campaigns ──────────────────────────────────────────────────────

INSERT INTO phishing_campaigns (name, description, type, status, template_id, group_ids, started_at, completed_at, total_sent, total_opened, total_clicked, total_reported, created_by, created_at) VALUES

('Q1 2025 – Password Reset Awareness',
 'Baseline test targeting all staff with a classic IT credential harvesting scenario.',
 'url', 'completed',
 (SELECT id FROM phishing_templates WHERE name = 'IT: Password Expiry Warning' LIMIT 1),
 '[1]',
 NOW() - INTERVAL '45 days', NOW() - INTERVAL '38 days',
 87, 54, 23, 8, 'admin', NOW() - INTERVAL '46 days'),

('Finance Team – Invoice Scam Simulation',
 'Targeted campaign against Finance to test susceptibility to BEC/invoice fraud.',
 'attachment', 'completed',
 (SELECT id FROM phishing_templates WHERE name = 'Finance: Urgent Invoice Approval' LIMIT 1),
 '[2]',
 NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days',
 45, 38, 11, 4, 'admin', NOW() - INTERVAL '21 days'),

('All Staff – MFA Migration QR Phish',
 'Advanced QR code phishing campaign to test executive and general staff awareness.',
 'qr', 'running',
 (SELECT id FROM phishing_templates WHERE name = 'IT: Authenticator App Update (QR)' LIMIT 1),
 '[1,4]',
 NOW() - INTERVAL '3 days', NULL,
 120, 72, 14, 21, 'admin', NOW() - INTERVAL '4 days')
ON CONFLICT DO NOTHING;

-- ── Seed: Demo Results ────────────────────────────────────────────────────────

INSERT INTO phishing_results (campaign_id, email, full_name, department, sent_at, opened_at, clicked_at, reported_at, link_token) VALUES

((SELECT id FROM phishing_campaigns WHERE name = 'Q1 2025 – Password Reset Awareness'),
 'carol@corp.com', 'Carol Mitchell', 'Finance', NOW() - INTERVAL '45 days', NOW() - INTERVAL '44 days 22 hours', NOW() - INTERVAL '44 days 21 hours 50 minutes', NULL, 'tok_demo_001'),
((SELECT id FROM phishing_campaigns WHERE name = 'Q1 2025 – Password Reset Awareness'),
 'bob@corp.com', 'Bob Harris', 'IT', NOW() - INTERVAL '45 days', NOW() - INTERVAL '44 days 20 hours', NULL, NOW() - INTERVAL '44 days 19 hours', 'tok_demo_002'),
((SELECT id FROM phishing_campaigns WHERE name = 'Q1 2025 – Password Reset Awareness'),
 'grace@corp.com', 'Grace Lee', 'Marketing', NOW() - INTERVAL '45 days', NOW() - INTERVAL '44 days 18 hours', NOW() - INTERVAL '44 days 17 hours', NULL, 'tok_demo_003'),
((SELECT id FROM phishing_campaigns WHERE name = 'Q1 2025 – Password Reset Awareness'),
 'henry@corp.com', 'Henry Park', 'Operations', NOW() - INTERVAL '45 days', NOW() - INTERVAL '44 days 16 hours', NULL, NULL, 'tok_demo_004'),

((SELECT id FROM phishing_campaigns WHERE name = 'Finance Team – Invoice Scam Simulation'),
 'david@corp.com', 'David Chen', 'Finance', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days 21 hours', NOW() - INTERVAL '19 days 21 hours', NULL, 'tok_demo_005'),
((SELECT id FROM phishing_campaigns WHERE name = 'Finance Team – Invoice Scam Simulation'),
 'karen@corp.com', 'Karen Adams', 'Finance', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days 18 hours', NULL, NOW() - INTERVAL '19 days 17 hours', 'tok_demo_006'),
((SELECT id FROM phishing_campaigns WHERE name = 'Finance Team – Invoice Scam Simulation'),
 'liam@corp.com', 'Liam Walsh', 'Finance', NOW() - INTERVAL '20 days', NULL, NULL, NULL, 'tok_demo_007'),

((SELECT id FROM phishing_campaigns WHERE name = 'All Staff – MFA Migration QR Phish'),
 'ceo@corp.com', 'James Thornton (CEO)', 'Executive', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days 22 hours', NULL, NOW() - INTERVAL '2 days 21 hours', 'tok_demo_008'),
((SELECT id FROM phishing_campaigns WHERE name = 'All Staff – MFA Migration QR Phish'),
 'alice@corp.com', 'Alice Nguyen', 'IT', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days 20 hours', NOW() - INTERVAL '2 days 20 hours', NULL, 'tok_demo_009'),
((SELECT id FROM phishing_campaigns WHERE name = 'All Staff – MFA Migration QR Phish'),
 'frank@corp.com', 'Frank Russo', 'Sales', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days 15 hours', NOW() - INTERVAL '2 days 15 hours', NULL, 'tok_demo_010')
ON CONFLICT DO NOTHING;
