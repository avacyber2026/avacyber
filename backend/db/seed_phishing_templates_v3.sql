-- More attachment + QR templates so each campaign type has proper options

INSERT INTO phishing_templates (name, type, subject, from_name, from_email, category, difficulty, html_body) VALUES

-- ── Attachment templates ──────────────────────────────────────────────────────

('HR: Payslip Available — Download Required', 'attachment',
 'Your payslip for May 2025 is ready — please download and verify',
 'HR Payroll System', 'payroll@hr-secure-portal.net',
 'hr', 'easy',
$$<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:24px}
  .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.08)}
  .hdr{background:#1565c0;padding:24px 32px;color:#fff}
  .hdr h2{margin:0;font-size:18px;font-weight:700}
  .hdr p{margin:4px 0 0;font-size:12px;opacity:.8}
  .body{padding:32px;color:#333}
  .payslip-card{border:1px solid #e0e0e0;border-radius:8px;padding:20px;margin:20px 0;background:#f9fbe7}
  .attach{display:flex;align-items:center;gap:14px;background:#e3f2fd;border:1px solid #90caf9;border-radius:6px;padding:14px 18px;margin:20px 0;cursor:pointer;text-decoration:none;color:inherit}
  .attach-icon{width:42px;height:48px;background:#1565c0;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;flex-shrink:0}
  .btn{display:inline-block;background:#1565c0;color:#fff!important;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;margin-top:8px}
  .footer{background:#f5f5f5;padding:16px 32px;font-size:11px;color:#888;border-top:1px solid #eee}
</style></head>
<body>
<div class="wrap">
  <div class="hdr">
    <h2>HR Payroll — Monthly Payslip</h2>
    <p>Confidential · Employee Self-Service Portal</p>
  </div>
  <div class="body">
    <p>Dear Employee,</p>
    <p>Your payslip for <strong>May 2025</strong> is now available. Please download and review it to confirm your salary, deductions and tax information are correct.</p>
    <div class="payslip-card">
      <table style="width:100%;font-size:13px;border-collapse:collapse">
        <tr><td style="color:#555;padding:4px 0;width:180px">Pay Period</td><td><strong>01 May – 31 May 2025</strong></td></tr>
        <tr><td style="color:#555;padding:4px 0">Payment Date</td><td><strong>28 May 2025</strong></td></tr>
        <tr><td style="color:#555;padding:4px 0">Net Pay</td><td><strong style="font-size:18px;color:#1565c0">£3,842.50</strong></td></tr>
        <tr><td style="color:#555;padding:4px 0">Status</td><td><span style="color:#2e7d32;font-weight:600">✓ Processed</span></td></tr>
      </table>
    </div>
    <p style="font-size:13px;color:#666">Please open the attachment below to view your full payslip including tax breakdown and benefit deductions.</p>
    <a href="{{PHISHING_URL}}" class="attach">
      <div class="attach-icon">PDF</div>
      <div>
        <div style="font-weight:600;font-size:14px">Payslip_May2025_CONF.pdf</div>
        <div style="font-size:12px;color:#666;margin-top:2px">147 KB · Encrypted · Requires login to open</div>
      </div>
    </a>
    <p style="font-size:12px;color:#888">If you have any payroll queries, contact HR at payroll@corp.com or ext. 2200.</p>
  </div>
  <div class="footer">HR Payroll System · Confidential · Payroll reference: PAY-2025-05-8831</div>
</div>
</body></html>$$),

('IT: Security Audit Report — Confidential', 'attachment',
 'CONFIDENTIAL: Your device security audit report — immediate review required',
 'IT Security Audit Team', 'audit@security-compliance.net',
 'it', 'medium',
$$<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#fff;margin:0;padding:24px}
  .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.08)}
  .hdr{background:#b71c1c;padding:24px 32px;color:#fff}
  .hdr h2{margin:0;font-size:18px;font-weight:700}
  .hdr p{margin:4px 0 0;font-size:12px;opacity:.8}
  .body{padding:32px;color:#333}
  .risk-badge{display:inline-block;background:#b71c1c;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:.5px;margin-bottom:16px}
  .finding{background:#fafafa;border:1px solid #ddd;border-radius:4px;padding:12px 16px;margin:8px 0;font-size:13px;display:flex;gap:10px}
  .finding::before{content:"⚠";color:#b71c1c;flex-shrink:0}
  .attach{display:flex;align-items:center;gap:14px;background:#ffebee;border:1px solid #ef9a9a;border-radius:6px;padding:14px 18px;margin:20px 0;text-decoration:none;color:inherit;cursor:pointer}
  .attach-icon{width:42px;height:48px;background:#b71c1c;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;flex-shrink:0}
  .btn{display:inline-block;background:#b71c1c;color:#fff!important;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;margin-top:8px}
  .footer{background:#f5f5f5;padding:16px 32px;font-size:11px;color:#888;border-top:1px solid #eee}
</style></head>
<body>
<div class="wrap">
  <div class="hdr">
    <h2>IT Security — Device Audit Report</h2>
    <p>Confidential · Internal Distribution Only · Ref: AUD-2025-0441</p>
  </div>
  <div class="body">
    <span class="risk-badge">⚠ HIGH RISK FINDINGS</span>
    <p>Dear Employee,</p>
    <p>Our quarterly security audit has flagged <strong>3 high-risk findings</strong> on your device. You are required to review the full report (attached) and confirm remediation within <strong>48 hours</strong>.</p>
    <div class="finding">Unauthorised software detected — potential policy violation</div>
    <div class="finding">Outbound connections to unclassified external IPs logged</div>
    <div class="finding">Local admin rights active without current approval on record</div>
    <p style="font-size:13px;color:#666;margin-top:16px">The full audit report with technical details and required actions is in the confidential PDF attached below. You must sign and return the remediation acknowledgement form by Friday.</p>
    <a href="{{PHISHING_URL}}" class="attach">
      <div class="attach-icon">PDF</div>
      <div>
        <div style="font-weight:600;font-size:14px">SecurityAudit_CONFIDENTIAL_AUD-2025-0441.pdf</div>
        <div style="font-size:12px;color:#666;margin-top:2px">2.4 MB · Restricted · Requires corporate credentials</div>
      </div>
    </a>
    <p style="font-size:12px;color:#888">Do not forward this report. For queries contact security-audit@corp.com.</p>
  </div>
  <div class="footer">IT Security Audit Team · security-audit@corp.com · Ref: AUD-2025-0441</div>
</div>
</body></html>$$),

-- ── QR Code templates ─────────────────────────────────────────────────────────

('IT: Corporate WiFi Network Update (QR)', 'qr',
 'IT: Corporate WiFi is changing — scan QR to reconnect your devices',
 'IT Network Team', 'networks@it-helpdesk.net',
 'it', 'medium',
$$<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f4f8;margin:0;padding:24px}
  .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.08)}
  .hdr{background:#004d7a;padding:24px 32px;color:#fff}
  .hdr h2{margin:0;font-size:18px;font-weight:700}
  .hdr p{margin:4px 0 0;font-size:12px;opacity:.8}
  .body{padding:32px;color:#333}
  .notice{background:#e3f2fd;border-left:4px solid #0277bd;border-radius:4px;padding:14px 18px;margin-bottom:24px;font-size:14px}
  .qr-box{text-align:center;border:2px dashed #0277bd;border-radius:12px;padding:28px;margin:24px 0;background:#f8fbff}
  .qr-img{width:160px;height:160px;background:#e0e7ff;border-radius:8px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:52px}
  .network-info{background:#f5f5f5;border-radius:6px;padding:16px;margin:16px 0;font-size:13px}
  .network-info table{width:100%;border-collapse:collapse}
  .network-info td{padding:4px 0}
  .network-info .label{color:#777;width:140px}
  .footer{background:#f5f5f5;padding:16px 32px;font-size:11px;color:#888;border-top:1px solid #eee}
</style></head>
<body>
<div class="wrap">
  <div class="hdr">
    <h2>IT Network Team — WiFi Update</h2>
    <p>Mandatory network re-authentication · All devices affected</p>
  </div>
  <div class="body">
    <div class="notice">📶 <strong>Action required by Monday:</strong> Corporate WiFi is migrating to WPA3-Enterprise. All devices must be re-authenticated before the old network is decommissioned.</div>
    <p>Dear All,</p>
    <p>As part of our network security upgrade, the corporate wireless network is migrating from WPA2 to <strong>WPA3-Enterprise with certificate-based authentication</strong>. All laptops, phones and tablets must be re-enrolled before <strong>Monday 9 AM</strong>.</p>
    <div class="network-info">
      <table>
        <tr><td class="label">New SSID</td><td><strong>CORP-SECURE-2025</strong></td></tr>
        <tr><td class="label">Security</td><td>WPA3-Enterprise / 802.1X</td></tr>
        <tr><td class="label">Cutover Date</td><td><strong>Monday 09:00 AM</strong></td></tr>
        <tr><td class="label">Old SSID</td><td><span style="text-decoration:line-through;color:#999">CORP-WIFI</span> (being removed)</td></tr>
      </table>
    </div>
    <div class="qr-box">
      <div class="qr-img">⬛</div>
      <p style="margin:0;font-size:13px;color:#555;font-weight:600">Scan with your phone or tablet camera</p>
      <p style="margin:6px 0 0;font-size:12px;color:#888">Or visit: <a href="{{PHISHING_URL}}" style="color:#0277bd">{{PHISHING_URL}}</a></p>
    </div>
    <p style="font-size:13px;color:#666">For laptops, IT will push the certificate automatically via MDM. Only mobile devices require manual QR scan. Contact ext. 1000 if you need assistance.</p>
  </div>
  <div class="footer">IT Network Team · networks@corp.com · Ticket #NET-4892 · Do not reply.</div>
</div>
</body></html>$$),

('Security: Verify Identity — Building Access Badge', 'qr',
 'Physical Security: Verify your building access badge before Friday',
 'Physical Security Office', 'security-badges@facilities.net',
 'general', 'hard',
$$<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:24px}
  .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.08)}
  .hdr{background:#37474f;padding:24px 32px;color:#fff;display:flex;align-items:center;gap:14px}
  .hdr-icon{width:40px;height:40px;background:rgba(255,255,255,.15);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
  .hdr-text h2{margin:0;font-size:17px;font-weight:700}
  .hdr-text p{margin:3px 0 0;font-size:11px;opacity:.75}
  .body{padding:32px;color:#333}
  .badge-card{border:2px solid #37474f;border-radius:10px;padding:20px 24px;margin:20px 0;display:flex;align-items:center;gap:20px;background:#fafafa}
  .badge-avatar{width:52px;height:52px;background:#37474f;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;font-weight:700;flex-shrink:0}
  .badge-chip{display:inline-block;background:#ff6f00;color:#fff;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;margin-top:4px}
  .qr-box{text-align:center;border:2px dashed #37474f;border-radius:12px;padding:24px;margin:24px 0;background:#fafafa}
  .qr-img{width:150px;height:150px;background:#e8eaf6;border-radius:8px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:48px}
  .footer{background:#f5f5f5;padding:16px 32px;font-size:11px;color:#888;border-top:1px solid #eee}
</style></head>
<body>
<div class="wrap">
  <div class="hdr">
    <div class="hdr-icon">🪪</div>
    <div class="hdr-text">
      <h2>Physical Security — Badge Verification</h2>
      <p>Annual access control audit · All staff required to verify</p>
    </div>
  </div>
  <div class="body">
    <p>Dear Employee,</p>
    <p>As part of our <strong>annual physical access control audit</strong>, all staff are required to verify their building access badge before <strong>Friday 5:00 PM</strong>. Badges not verified will be deactivated over the weekend.</p>
    <div class="badge-card">
      <div class="badge-avatar">ID</div>
      <div>
        <div style="font-weight:600;font-size:14px">Your access badge</div>
        <div style="font-size:12px;color:#666;margin-top:2px">Badge ID: BADGE-2024-7731</div>
        <div style="font-size:12px;color:#666">Access Level: Standard / All floors</div>
        <div class="badge-chip">PENDING VERIFICATION</div>
      </div>
    </div>
    <p style="font-size:14px">To verify your badge, scan the QR code below using your phone. The process takes under 60 seconds.</p>
    <div class="qr-box">
      <div class="qr-img">⬛</div>
      <p style="margin:0;font-size:13px;color:#555;font-weight:600">Point your phone camera at this code</p>
      <p style="margin:6px 0 0;font-size:12px;color:#888">Or visit: <a href="{{PHISHING_URL}}" style="color:#37474f">{{PHISHING_URL}}</a></p>
    </div>
    <p style="font-size:12px;color:#888">If your badge was issued before 2023, you may need to collect a replacement. Contact Facilities at ext. 3300.</p>
  </div>
  <div class="footer">Physical Security Office · security@corp.com · Annual Badge Audit 2025 · Ref: BADGE-AUD-2025</div>
</div>
</body></html>$$)

ON CONFLICT DO NOTHING;
