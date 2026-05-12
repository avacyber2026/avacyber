/**
 * Email service using nodemailer SMTP.
 * Env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 * Falls back gracefully if SMTP is not configured (logs warning).
 */

let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (_) {
  nodemailer = null;
}

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!nodemailer) {
    console.warn('nodemailer not installed — emails will not be sent');
    return null;
  }

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host) {
    console.warn('SMTP_HOST not set — emails will not be sent');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  });

  return transporter;
}

const FROM = () => process.env.SMTP_FROM || 'noreply@secureconnect.local';

const TEMPLATES = {
  missing_fields: {
    en: {
      subject: (reportSubject) => `Action required: Additional information needed for "${reportSubject}"`,
      html: (reportSubject, reportId, missingFields) => `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#1F6A5C;">Additional Information Needed</h2>
          <p>Your security report <strong>"${reportSubject}"</strong> (ID: ${reportId}) requires additional details before our team can proceed.</p>
          <p><strong>Missing information:</strong></p>
          <ul>${missingFields.map((f) => `<li>${f}</li>`).join('')}</ul>
          <p>Please log in to SecureConnect and update your report with the requested information.</p>
          <p style="color:#666;font-size:12px;">This is an automated message from SecureConnect Security Platform.</p>
        </div>`,
    },
    de: {
      subject: (reportSubject) => `Aktion erforderlich: Zusätzliche Informationen für "${reportSubject}" benötigt`,
      html: (reportSubject, reportId, missingFields) => `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#1F6A5C;">Zusätzliche Informationen erforderlich</h2>
          <p>Ihr Sicherheitsbericht <strong>"${reportSubject}"</strong> (ID: ${reportId}) erfordert weitere Details.</p>
          <p><strong>Fehlende Informationen:</strong></p>
          <ul>${missingFields.map((f) => `<li>${f}</li>`).join('')}</ul>
          <p>Bitte melden Sie sich bei SecureConnect an und aktualisieren Sie Ihren Bericht.</p>
        </div>`,
    },
    cs: {
      subject: (reportSubject) => `Vyžadována akce: Potřebné další informace pro "${reportSubject}"`,
      html: (reportSubject, reportId, missingFields) => `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#1F6A5C;">Potřebné další informace</h2>
          <p>Vaše bezpečnostní hlášení <strong>"${reportSubject}"</strong> (ID: ${reportId}) vyžaduje další podrobnosti.</p>
          <p><strong>Chybějící informace:</strong></p>
          <ul>${missingFields.map((f) => `<li>${f}</li>`).join('')}</ul>
          <p>Přihlaste se prosím do SecureConnect a aktualizujte své hlášení.</p>
        </div>`,
    },
    fr: {
      subject: (reportSubject) => `Action requise : Informations supplémentaires nécessaires pour "${reportSubject}"`,
      html: (reportSubject, reportId, missingFields) => `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#1F6A5C;">Informations supplémentaires nécessaires</h2>
          <p>Votre rapport de sécurité <strong>"${reportSubject}"</strong> (ID: ${reportId}) nécessite des détails supplémentaires.</p>
          <p><strong>Informations manquantes :</strong></p>
          <ul>${missingFields.map((f) => `<li>${f}</li>`).join('')}</ul>
          <p>Veuillez vous connecter à SecureConnect et mettre à jour votre rapport.</p>
        </div>`,
    },
    es: {
      subject: (reportSubject) => `Acción requerida: Se necesita información adicional para "${reportSubject}"`,
      html: (reportSubject, reportId, missingFields) => `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#1F6A5C;">Se necesita información adicional</h2>
          <p>Su informe de seguridad <strong>"${reportSubject}"</strong> (ID: ${reportId}) requiere detalles adicionales.</p>
          <p><strong>Información faltante:</strong></p>
          <ul>${missingFields.map((f) => `<li>${f}</li>`).join('')}</ul>
          <p>Inicie sesión en SecureConnect y actualice su informe.</p>
        </div>`,
    },
  },

  siem_matched: {
    en: {
      subject: (reportSubject) => `Update: Your report "${reportSubject}" linked to existing incident`,
      html: (reportSubject, reportId, siemId) => `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#1F6A5C;">Report Linked to Existing Incident</h2>
          <p>Your security report <strong>"${reportSubject}"</strong> (ID: ${reportId}) has been automatically linked to an existing security incident (${siemId}).</p>
          <p>Our security team is already investigating this matter. You will receive updates as the investigation progresses.</p>
        </div>`,
    },
  },

  report_resolved: {
    en: {
      subject: (reportSubject) => `Resolved: Your report "${reportSubject}" has been closed`,
      html: (reportSubject, reportId, comment) => `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#1F6A5C;">Report Resolved</h2>
          <p>Your security report <strong>"${reportSubject}"</strong> (ID: ${reportId}) has been reviewed and resolved.</p>
          ${comment ? `<p><strong>Resolution note:</strong> ${comment}</p>` : ''}
          <p>If you have further concerns, please submit a new report.</p>
        </div>`,
    },
  },

  sla_breach: {
    en: {
      subject: (reportSubject) => `ALERT: SLA breach for report "${reportSubject}"`,
      html: (reportSubject, reportId, priority, deadline) => `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#C0392B;">SLA Breach Alert</h2>
          <p>Report <strong>"${reportSubject}"</strong> (ID: ${reportId}) has breached its SLA deadline.</p>
          <p><strong>Priority:</strong> ${priority}<br><strong>Deadline was:</strong> ${deadline}</p>
          <p>Immediate attention is required.</p>
        </div>`,
    },
  },

  report_min_data: {
    en: {
      subject: (reportSubject) => `Complete your report: "${reportSubject}"`,
      html: (reportSubject, reportId, ruLine, enLine) => `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#1F6A5C;">Additional information required</h2>
          <p><strong>RU:</strong> ${ruLine}</p>
          <p><strong>EN:</strong> ${enLine}</p>
          <p>Report ID: <strong>${reportId}</strong>. Please log in to SecureConnect and update your report.</p>
        </div>`,
    },
  },

  ticket_description_unclear: {
    en: {
      subject: (title, id) => `Clarification needed: ticket #${id} "${title}"`,
      html: (title, id, employeeEmail, comment) => `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#1F6A5C;">Employee: description not clear</h2>
          <p>Ticket <strong>#${id}</strong> — "${title}"</p>
          <p><strong>Respondent:</strong> ${employeeEmail}</p>
          ${comment ? `<p><strong>Comment:</strong> ${comment}</p>` : ''}
          <p>Please rephrase the request or follow up in SecureConnect.</p>
        </div>`,
    },
  },
};

function detectLanguage(text) {
  if (!text) return 'en';
  const lower = text.toLowerCase();
  const patterns = {
    de: /\b(und|der|die|das|ist|ein|eine|nicht|ich|sie|haben)\b/gi,
    cs: /\b(je|se|na|pro|ale|byl|jeho|jako|jsou|při)\b/gi,
    fr: /\b(est|les|des|une|pour|dans|pas|que|sur|avec)\b/gi,
    es: /\b(los|las|una|por|del|que|con|para|esta|como)\b/gi,
  };

  let bestLang = 'en';
  let bestScore = 0;
  for (const [lang, pattern] of Object.entries(patterns)) {
    const matches = (lower.match(pattern) || []).length;
    if (matches > bestScore) {
      bestScore = matches;
      bestLang = lang;
    }
  }
  return bestScore >= 2 ? bestLang : 'en';
}

function getTemplate(templateName, lang, ...args) {
  const tmpl = TEMPLATES[templateName];
  if (!tmpl) return null;
  const langTmpl = tmpl[lang] || tmpl.en;
  if (!langTmpl) return null;
  return {
    subject: langTmpl.subject(...args),
    html: langTmpl.html(...args),
  };
}

async function sendEmail(to, subject, html) {
  const t = getTransporter();
  if (!t) {
    console.log(`[EMAIL SKIP] To: ${to} | Subject: ${subject}`);
    return false;
  }

  try {
    await t.sendMail({
      from: FROM(),
      to,
      subject,
      html,
    });
    console.log(`[EMAIL SENT] To: ${to} | Subject: ${subject}`);
    return true;
  } catch (err) {
    console.error('Email send error:', err.message);
    return false;
  }
}

async function sendMissingFieldsEmail(to, reportSubject, reportId, missingFields, description) {
  const lang = detectLanguage(description || reportSubject);
  const tmpl = getTemplate('missing_fields', lang, reportSubject, reportId, missingFields);
  if (!tmpl) return false;
  return sendEmail(to, tmpl.subject, tmpl.html);
}

async function sendSiemMatchedEmail(to, reportSubject, reportId, siemId) {
  const tmpl = getTemplate('siem_matched', 'en', reportSubject, reportId, siemId);
  if (!tmpl) return false;
  return sendEmail(to, tmpl.subject, tmpl.html);
}

async function sendReportResolvedEmail(to, reportSubject, reportId, comment) {
  const tmpl = getTemplate('report_resolved', 'en', reportSubject, reportId, comment);
  if (!tmpl) return false;
  return sendEmail(to, tmpl.subject, tmpl.html);
}

async function sendSlaBreachEmail(to, reportSubject, reportId, priority, deadline) {
  const tmpl = getTemplate('sla_breach', 'en', reportSubject, reportId, priority, deadline);
  if (!tmpl) return false;
  return sendEmail(to, tmpl.subject, tmpl.html);
}

/** @param {{ missingLabelsRu: string[], missingLabelsEn: string[] }} minEval */
async function sendReportMinDataRequiredEmail(to, reportSubject, reportId, minEval) {
  const ruList = (minEval.missingLabelsRu || []).join(' и ');
  const enList = (minEval.missingLabelsEn || []).join(' and ');
  const ruLine = `Дополните отчёт: не хватает ${ruList}.`;
  const enLine = `Please complete your report — missing ${enList}.`;
  const tmpl = getTemplate('report_min_data', 'en', reportSubject, reportId, ruLine, enLine);
  if (!tmpl) return false;
  return sendEmail(to, tmpl.subject, tmpl.html);
}

async function sendTicketDescriptionUnclearEmail(to, title, ticketId, employeeEmail, comment) {
  const tmpl = getTemplate('ticket_description_unclear', 'en', title, ticketId, employeeEmail, comment || '');
  if (!tmpl) return false;
  return sendEmail(to, tmpl.subject, tmpl.html);
}

module.exports = {
  sendEmail,
  sendMissingFieldsEmail,
  sendSiemMatchedEmail,
  sendReportResolvedEmail,
  sendSlaBreachEmail,
  sendReportMinDataRequiredEmail,
  sendTicketDescriptionUnclearEmail,
  detectLanguage,
};
