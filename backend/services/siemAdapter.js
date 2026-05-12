/**
 * SIEM Adapter — Splunk integration for finding open incidents.
 * Uses SPLUNK_BASE_URL, SPLUNK_TOKEN, SPLUNK_SEARCH_INDEX env vars.
 * Falls back to mock adapter when SPLUNK_BASE_URL is not set.
 */

const TIMEOUT_MS = 10000;

async function findOpenIncidentsSplunk({ email, hostname }) {
  const baseUrl = process.env.SPLUNK_BASE_URL;
  const token = process.env.SPLUNK_TOKEN;
  const index = process.env.SPLUNK_SEARCH_INDEX || 'main';

  if (!baseUrl || !token) {
    return findOpenIncidentsMock({ email, hostname });
  }

  const conditions = [];
  if (hostname) conditions.push(`hostname="${hostname}"`);
  if (email) conditions.push(`email="${email}"`);
  if (!conditions.length) return { found: false, incidents: [] };

  const searchQuery = `search index=${index} (${conditions.join(' OR ')}) NOT (status="Closed" OR status="Resolved") | table _time, incident_id, url, assignee, status | head 10`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Create search job
    const createRes = await fetch(`${baseUrl}/services/search/jobs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `search=${encodeURIComponent(searchQuery)}&output_mode=json&exec_mode=oneshot`,
      signal: controller.signal,
    });

    if (!createRes.ok) {
      console.error('SIEM Splunk error:', createRes.status, await createRes.text().catch(() => ''));
      return { found: false, incidents: [], error: `Splunk HTTP ${createRes.status}` };
    }

    const data = await createRes.json();
    const results = data.results || [];

    const incidents = results.map((r) => ({
      id: r.incident_id || r.sid || 'unknown',
      url: r.url || `${baseUrl}/app/search/incident/${r.incident_id || ''}`,
      assignee: r.assignee || 'Unassigned',
    }));

    return { found: incidents.length > 0, incidents };
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('SIEM Splunk timeout after', TIMEOUT_MS, 'ms');
      return { found: false, incidents: [], error: 'timeout' };
    }
    console.error('SIEM Splunk error:', err.message);
    return { found: false, incidents: [], error: err.message };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Mock adapter for development/testing.
 * Returns a match if hostname contains "infected" or email contains "compromised".
 */
function findOpenIncidentsMock({ email, hostname }) {
  const hn = (hostname || '').toLowerCase();
  const em = (email || '').toLowerCase();

  if (hn.includes('infected') || em.includes('compromised') || hn.includes('malware')) {
    return {
      found: true,
      incidents: [{
        id: `SIEM-MOCK-${Date.now()}`,
        url: 'https://splunk.example.com/incident/mock-001',
        assignee: 'SOC-Analyst-1',
      }],
    };
  }

  return { found: false, incidents: [] };
}

async function findOpenIncidents({ email, hostname }) {
  if (process.env.SPLUNK_BASE_URL) {
    return findOpenIncidentsSplunk({ email, hostname });
  }
  return findOpenIncidentsMock({ email, hostname });
}

module.exports = { findOpenIncidents, findOpenIncidentsMock };
