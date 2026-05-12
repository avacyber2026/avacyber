/**
 * Минимальные данные до очереди GSOC: hostname и указание времени инцидента.
 * Время: поле incident_at ИЛИ явные признаки даты/времени в описании.
 */

const MISSING_CODES = {
  hostname: 'hostname',
  incident_time: 'incident_time',
};

function descriptionHasIncidentTime(text) {
  if (!text || typeof text !== 'string') return false;
  const s = text.trim();
  if (s.length < 4) return false;
  if (/\d{4}-\d{2}-\d{2}/.test(s)) return true;
  if (/\d{1,2}[./]\d{1,2}[./]\d{2,4}/.test(s)) return true;
  if (/\d{1,2}:\d{2}/.test(s)) return true;
  if (/\b(yesterday|today|last week|this morning|this afternoon|tonight)\b/i.test(s)) return true;
  if (/\b(вчера|сегодня|завтра|утром|вечером|неделю назад)\b/i.test(s)) return true;
  return false;
}

/**
 * @param {{ hostname?: string | null, incident_at?: Date | string | null, description?: string | null }} input
 * @returns {{ ok: boolean, missing: string[], missingLabelsEn: string[], missingLabelsRu: string[] }}
 */
function evaluateMinReportData({ hostname, incident_at, description }) {
  const missing = [];
  if (!hostname || !String(hostname).trim()) {
    missing.push(MISSING_CODES.hostname);
  }
  const hasIncidentAt = incident_at != null && String(incident_at).trim() !== '';
  const timeOk = hasIncidentAt || descriptionHasIncidentTime(description || '');
  if (!timeOk) {
    missing.push(MISSING_CODES.incident_time);
  }

  const labelsEn = [];
  const labelsRu = [];
  for (const code of missing) {
    if (code === MISSING_CODES.hostname) {
      labelsEn.push('hostname');
      labelsRu.push('hostname');
    } else if (code === MISSING_CODES.incident_time) {
      labelsEn.push('incident time (when it happened)');
      labelsRu.push('времени инцидента');
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    missingLabelsEn: labelsEn,
    missingLabelsRu: labelsRu,
  };
}

function buildMinDataNotificationBody(ev) {
  const ruList = ev.missingLabelsRu.join(' и ');
  const enList = ev.missingLabelsEn.join(' and ');
  const ru = `Дополните отчёт: не хватает ${ruList}.`;
  const en = `Please complete your report — missing ${enList}.`;
  return { title: 'Дополните отчёт / Complete your report', body: `${ru}\n${en}` };
}

module.exports = {
  evaluateMinReportData,
  buildMinDataNotificationBody,
  MISSING_CODES,
  descriptionHasIncidentTime,
};
