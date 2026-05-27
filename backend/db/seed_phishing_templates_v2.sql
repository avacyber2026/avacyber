-- Additional phishing awareness templates

INSERT INTO phishing_templates (name, type, subject, from_name, from_email, category, difficulty, html_body) VALUES

('Microsoft: Document Shared With You', 'url',
 'Alex Johnson shared "Q4 Budget Review.xlsx" with you',
 'Microsoft SharePoint', 'no-reply@sharepoint-notify.net',
 'it', 'medium',
$$<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f3f2f1;margin:0;padding:24px}
  .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)}
  .hdr{background:#0078d4;padding:20px 32px;display:flex;align-items:center;gap:12px}
  .hdr-logo{width:28px;height:28px;background:#fff;border-radius:4px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#0078d4;font-size:14px;flex-shrink:0}
  .hdr h2{margin:0;color:#fff;font-size:16px;font-weight:600}
  .body{padding:32px}
  .avatar{width:48px;height:48px;border-radius:50%;background:#0078d4;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;margin-bottom:16px}
  .doc-card{border:1px solid #edebe9;border-radius:4px;padding:16px 20px;margin:24px 0;display:flex;align-items:center;gap:16px;text-decoration:none;color:inherit;background:#faf9f8}
  .doc-icon{width:40px;height:48px;background:#217346;border-radius:3px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;flex-shrink:0}
  .doc-name{font-weight:600;color:#323130;font-size:14px}
  .doc-meta{font-size:12px;color:#605e5c;margin-top:2px}
  .btn{display:inline-block;background:#0078d4;color:#fff!important;padding:11px 24px;border-radius:2px;text-decoration:none;font-weight:600;font-size:14px;margin-top:8px}
  .footer{background:#f3f2f1;padding:16px 32px;font-size:11px;color:#605e5c;border-top:1px solid #edebe9}
</style></head>
<body>
<div class="wrap">
  <div class="hdr">
    <div class="hdr-logo">SP</div>
    <h2>Microsoft SharePoint</h2>
  </div>
  <div class="body">
    <div class="avatar">AJ</div>
    <p style="margin:0 0 4px;font-size:15px;color:#323130"><strong>Alex Johnson</strong> shared a file with you</p>
    <p style="margin:0 0 24px;font-size:13px;color:#605e5c">alex.johnson@corp.com · SharePoint · Just now</p>
    <a href="{{PHISHING_URL}}" class="doc-card">
      <div class="doc-icon">XLS</div>
      <div>
        <div class="doc-name">Q4 Budget Review.xlsx</div>
        <div class="doc-meta">Microsoft Excel · 1.4 MB · Shared from Finance Team Site</div>
      </div>
    </a>
    <p style="font-size:13px;color:#605e5c;margin:16px 0">"Please review before the board meeting on Friday. Need your sign-off by EOD."</p>
    <a href="{{PHISHING_URL}}" class="btn">Open in SharePoint</a>
  </div>
  <div class="footer">
    Microsoft Corporation · You received this because alex.johnson@corp.com shared a file with you.
    <br>To stop receiving these notifications, manage your SharePoint notification settings.
  </div>
</div>
</body></html>$$),

('CEO Fraud: Urgent Wire Transfer', 'url',
 'Urgent request — need you to action this today',
 'James Thornton', 'ceo-office@corp-secure.net',
 'finance', 'hard',
$$<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#fff;margin:0;padding:0}
  .wrap{max-width:600px;margin:0 auto;padding:32px}
  p{color:#333;font-size:14px;line-height:1.7;margin:0 0 16px}
  .sig{margin-top:32px;padding-top:16px;border-top:1px solid #ddd}
  .sig-name{font-weight:bold;font-size:15px;color:#111}
  .sig-title{color:#555;font-size:13px}
  .sig-logo{display:inline-block;background:#1a1a2e;color:#fff;padding:4px 10px;border-radius:3px;font-size:12px;font-weight:700;margin-top:6px;letter-spacing:1px}
  .confidential{background:#fff8e1;border-left:3px solid #f0a500;padding:10px 14px;font-size:12px;color:#7d6608;margin-top:24px}
</style></head>
<body>
<div class="wrap">
  <p>Hi,</p>
  <p>I need you to process a wire transfer urgently today. We are finalising an acquisition and require a payment to be made before close of business — the lawyers have confirmed everything is in order on their end.</p>
  <p>Please wire <strong>$47,500.00 USD</strong> to the following account:</p>
  <p style="background:#f9f9f9;border:1px solid #ddd;border-radius:4px;padding:16px;font-size:13px">
    <strong>Beneficiary:</strong> Apex Capital Holdings Ltd<br>
    <strong>Bank:</strong> First International Bank<br>
    <strong>Account:</strong> 8841029934<br>
    <strong>Routing:</strong> 021000021<br>
    <strong>Reference:</strong> ACQ-2025-CONF
  </p>
  <p>This is time-sensitive. Please confirm once done. Do not discuss this with anyone else in the office yet — the deal is not public.</p>
  <p>For verification, please log in and confirm receipt of these instructions: <a href="{{PHISHING_URL}}" style="color:#0066cc">Confirm Instructions →</a></p>
  <div class="sig">
    <div class="sig-name">James Thornton</div>
    <div class="sig-title">Chief Executive Officer</div>
    <div class="sig-logo">CORP</div>
  </div>
  <div class="confidential">⚠ This email is confidential. If you are not the intended recipient, please delete it immediately and notify the sender.</div>
</div>
</body></html>$$),

('Dropbox: File Awaiting Your Review', 'url',
 'Sarah left a comment on "Contract_Final_v3.pdf"',
 'Dropbox', 'no-reply@dropbox-mail.net',
 'general', 'easy',
$$<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f7f5f2;margin:0;padding:24px}
  .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.08)}
  .hdr{background:#0061ff;padding:24px 32px;text-align:center}
  .hdr svg-logo{color:#fff}
  .body{padding:32px}
  .file-card{border:1.5px solid #e8e8e8;border-radius:8px;padding:18px 20px;margin:20px 0;display:flex;align-items:center;gap:16px}
  .file-icon{width:44px;height:44px;background:#e8f0fe;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#0061ff;flex-shrink:0}
  .comment-box{background:#f7f5f2;border-radius:8px;padding:14px 18px;margin:16px 0;border-left:3px solid #0061ff}
  .btn{display:inline-block;background:#0061ff;color:#fff!important;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px}
  .footer{padding:16px 32px;font-size:11px;color:#888;border-top:1px solid #f0f0f0;text-align:center}
</style></head>
<body>
<div class="wrap">
  <div class="hdr">
    <span style="color:#fff;font-size:24px;font-weight:900;letter-spacing:-1px">Dropbox</span>
  </div>
  <div class="body">
    <p style="font-size:15px;color:#222;margin:0 0 20px"><strong>Sarah Mitchell</strong> commented on a file shared with you</p>
    <div class="file-card">
      <div class="file-icon">PDF</div>
      <div>
        <div style="font-weight:600;color:#222;font-size:14px">Contract_Final_v3.pdf</div>
        <div style="font-size:12px;color:#888;margin-top:2px">2.1 MB · Legal Team Folder</div>
      </div>
    </div>
    <div class="comment-box">
      <div style="font-size:12px;color:#555;margin-bottom:6px"><strong>Sarah Mitchell</strong> · 14 minutes ago</div>
      <div style="font-size:13px;color:#333">"Hi — page 7, clause 4.3 needs your signature before we can proceed. Can you log in and approve today?"</div>
    </div>
    <p style="font-size:13px;color:#555;margin-bottom:20px">Sign in to view the full file and add your response.</p>
    <a href="{{PHISHING_URL}}" class="btn">Open in Dropbox</a>
  </div>
  <div class="footer">Dropbox Inc. · You received this notification because this file was shared with you.</div>
</div>
</body></html>$$),

('IT: Mandatory Device Compliance Scan', 'url',
 'Action required: Your device is not compliant — access will be suspended',
 'IT Security Operations', 'compliance@it-security-ops.net',
 'it', 'medium',
$$<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f0f2f5;margin:0;padding:24px}
  .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
  .hdr{background:#c62828;padding:24px 32px;color:#fff}
  .hdr h2{margin:0;font-size:18px;font-weight:700}
  .hdr p{margin:4px 0 0;font-size:12px;opacity:.85}
  .body{padding:32px;color:#333}
  .warn{background:#fbe9e7;border:1px solid #ef9a9a;border-radius:6px;padding:16px 20px;margin-bottom:24px}
  .warn h3{margin:0 0 6px;font-size:15px;color:#c62828}
  .warn p{margin:0;font-size:13px;color:#444}
  .issue-list{list-style:none;padding:0;margin:16px 0}
  .issue-list li{padding:8px 12px;border-radius:4px;background:#fafafa;border:1px solid #eee;font-size:13px;color:#555;margin-bottom:6px;display:flex;gap:10px}
  .issue-list li::before{content:"✗";color:#c62828;font-weight:700;flex-shrink:0}
  .btn{display:inline-block;background:#c62828;color:#fff!important;padding:13px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;margin-top:8px}
  .timer{text-align:center;font-size:28px;font-weight:700;color:#c62828;margin:20px 0 4px}
  .footer{background:#f8f9fa;padding:16px 32px;font-size:11px;color:#999;border-top:1px solid #eee}
</style></head>
<body>
<div class="wrap">
  <div class="hdr">
    <h2>🛡 IT Security — Compliance Alert</h2>
    <p>Automated Device Compliance System · Ticket #CMP-9921</p>
  </div>
  <div class="body">
    <div class="warn">
      <h3>⚠ Your device is NOT compliant</h3>
      <p>Corporate network access will be suspended in <strong>2 hours</strong> unless you complete the compliance scan below.</p>
    </div>
    <p style="font-size:14px">Device: <strong>WORKSTATION-07</strong> (Windows 11 Pro) failed the following checks during the automated compliance audit:</p>
    <ul class="issue-list">
      <li>Windows Defender real-time protection disabled</li>
      <li>Last security scan: 31 days ago (policy: every 7 days)</li>
      <li>Disk encryption status: Unverified</li>
      <li>Endpoint agent: Version outdated (3.1.2 → 3.4.0 required)</li>
    </ul>
    <div class="timer">1:58:33</div>
    <p style="text-align:center;font-size:12px;color:#999;margin-bottom:20px">Time remaining before access suspension</p>
    <p style="text-align:center">
      <a href="{{PHISHING_URL}}" class="btn">Run Compliance Scan Now</a>
    </p>
    <p style="font-size:12px;color:#888;margin-top:20px">If you believe this is an error, contact IT at ext. 1000. Reference: CMP-9921.</p>
  </div>
  <div class="footer">IT Security Operations · compliance@corp.com · Automated Device Compliance System v4.2</div>
</div>
</body></html>$$),

('Microsoft Teams: Missed Message', 'url',
 'You have 3 missed messages in Teams',
 'Microsoft Teams', 'noreply@teams-notify.net',
 'it', 'medium',
$$<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;margin:0;padding:24px}
  .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.08)}
  .hdr{background:#464775;padding:20px 28px;display:flex;align-items:center;gap:12px}
  .teams-icon{width:32px;height:32px;background:#fff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#464775;font-size:13px}
  .hdr h2{margin:0;color:#fff;font-size:16px;font-weight:600}
  .body{padding:28px 32px}
  .badge{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;background:#d93025;color:#fff;border-radius:50%;font-size:11px;font-weight:700;margin-left:6px;vertical-align:middle}
  .msg-card{border:1px solid #edebe9;border-radius:8px;padding:16px;margin:16px 0;display:flex;gap:14px;cursor:pointer}
  .avatar{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;flex-shrink:0}
  .msg-time{font-size:11px;color:#8a8886;margin-top:2px}
  .msg-preview{font-size:13px;color:#605e5c;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:340px}
  .btn{display:inline-block;background:#464775;color:#fff!important;padding:11px 24px;border-radius:4px;text-decoration:none;font-weight:600;font-size:13px;margin-top:8px}
  .footer{background:#f3f2f1;padding:14px 32px;font-size:11px;color:#8a8886;border-top:1px solid #edebe9}
</style></head>
<body>
<div class="wrap">
  <div class="hdr">
    <div class="teams-icon">T</div>
    <h2>Microsoft Teams</h2>
  </div>
  <div class="body">
    <p style="font-size:15px;color:#323130;margin:0 0 4px;font-weight:600">You have missed messages<span class="badge">3</span></p>
    <p style="font-size:13px;color:#605e5c;margin:0 0 20px">While you were away, your teammates sent you messages.</p>

    <a href="{{PHISHING_URL}}" class="msg-card" style="text-decoration:none;color:inherit;display:flex">
      <div class="avatar" style="background:#c43e1c">RM</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:14px;color:#323130">Rachel Myers <span style="font-weight:400;color:#8a8886">in Finance General</span></div>
        <div class="msg-time">Today 9:41 AM</div>
        <div class="msg-preview">Can you take a look at this before the standup? I need your approval on the...</div>
      </div>
    </a>

    <a href="{{PHISHING_URL}}" class="msg-card" style="text-decoration:none;color:inherit;display:flex">
      <div class="avatar" style="background:#0078d4">DK</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:14px;color:#323130">David Kim <span style="font-weight:400;color:#8a8886">Direct Message</span></div>
        <div class="msg-time">Today 10:03 AM</div>
        <div class="msg-preview">Hey — sent you access to the new portal. You'll need to log in to confirm your...</div>
      </div>
    </a>

    <a href="{{PHISHING_URL}}" class="msg-card" style="text-decoration:none;color:inherit;display:flex">
      <div class="avatar" style="background:#107c41">IT</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:14px;color:#323130">IT Support <span style="font-weight:400;color:#8a8886">in IT Announcements</span></div>
        <div class="msg-time">Today 10:18 AM</div>
        <div class="msg-preview">IMPORTANT: All staff must re-authenticate their Teams account by 5 PM today due to...</div>
      </div>
    </a>

    <p style="margin-top:20px"><a href="{{PHISHING_URL}}" class="btn">Open Microsoft Teams</a></p>
  </div>
  <div class="footer">Microsoft Teams · Microsoft Corporation · You received this notification based on your Teams settings.</div>
</div>
</body></html>$$),

('DHL: Package Delivery Attempted', 'url',
 'DHL: Delivery attempt failed — action required to reschedule',
 'DHL Express', 'delivery-notification@dhl-courier.net',
 'general', 'easy',
$$<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:24px}
  .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)}
  .hdr{background:#FFCC00;padding:20px 32px;display:flex;align-items:center;gap:12px}
  .hdr-dhl{font-size:28px;font-weight:900;color:#D40511;letter-spacing:-1px}
  .hdr-sub{font-size:12px;color:#333;margin-top:2px}
  .body{padding:32px;color:#333}
  .status-bar{background:#D40511;color:#fff;border-radius:6px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;gap:12px}
  .tracking{background:#f9f9f9;border:1px solid #ddd;border-radius:6px;padding:16px 20px;margin:20px 0;font-size:13px}
  .tracking-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee}
  .tracking-row:last-child{border-bottom:none}
  .btn{display:inline-block;background:#D40511;color:#fff!important;padding:13px 30px;border-radius:4px;text-decoration:none;font-weight:700;font-size:14px;margin-top:8px}
  .footer{background:#f4f4f4;padding:16px 32px;font-size:11px;color:#888;border-top:1px solid #ddd}
</style></head>
<body>
<div class="wrap">
  <div class="hdr">
    <div>
      <div class="hdr-dhl">DHL</div>
      <div class="hdr-sub">Express Delivery Notification</div>
    </div>
  </div>
  <div class="body">
    <div class="status-bar">
      <span style="font-size:20px">📦</span>
      <div>
        <div style="font-weight:700;font-size:15px">Delivery Attempted — Unsuccessful</div>
        <div style="font-size:12px;opacity:.85">Our driver attempted delivery today at 10:47 AM</div>
      </div>
    </div>
    <p>We attempted to deliver your parcel but were unable to complete the delivery. A customs fee of <strong>£2.99</strong> must be paid before we can redeliver.</p>
    <div class="tracking">
      <div class="tracking-row"><span style="color:#888">Tracking Number</span><strong>JD014600016839</strong></div>
      <div class="tracking-row"><span style="color:#888">Sender</span><span>Amazon.co.uk</span></div>
      <div class="tracking-row"><span style="color:#888">Status</span><span style="color:#D40511;font-weight:600">Awaiting customs payment</span></div>
      <div class="tracking-row"><span style="color:#888">Delivery window</span><span>Expires in 48 hours</span></div>
    </div>
    <p style="font-size:13px;color:#666">If payment is not received within 48 hours, your parcel will be returned to sender.</p>
    <p style="text-align:center;margin-top:24px">
      <a href="{{PHISHING_URL}}" class="btn">Pay £2.99 &amp; Reschedule Delivery</a>
    </p>
  </div>
  <div class="footer">DHL Express · dhl.com · This is an automated delivery notification. Do not reply to this email.</div>
</div>
</body></html>$$)

ON CONFLICT DO NOTHING;
