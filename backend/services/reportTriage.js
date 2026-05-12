/**
 * AI Triage Service for security reports.
 * Uses LLM (OpenAI/Azure/mock) to classify incidents and check report completeness.
 * PII masking before sending to LLM. Prompt logs stored for 90 days.
 */

const crypto = require('crypto');
const pool = require('../db/pool');

const CATEGORIES = ['Email activity', 'Malware', 'Account compromise', 'Generic suspicious'];

const REQUIRED_FIELDS_BY_CATEGORY = {
  'Email activity': ['sender email or address', 'time of suspicious email', 'subject line or content description'],
  'Malware': ['hostname or device name', 'symptoms observed', 'time first noticed'],
  'Account compromise': ['affected account or email', 'suspicious activities observed', 'time of discovery'],
  'Generic suspicious': ['description of activity', 'time and location/system'],
};

// PII masking: email -> u***@domain.com, IP -> x.x.x.***
function maskPII(text) {
  if (!text) return '';
  let masked = text;
  // Mask email addresses
  masked = masked.replace(/([a-zA-Z0-9._%+-])[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    (_, first, domain) => `${first}***@${domain}`
  );
  // Mask IP addresses
  masked = masked.replace(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.)\d{1,3}\b/g, '$1***');
  // Mask names (simple heuristic: capitalized word pairs)
  masked = masked.replace(/\b([A-Z][a-z]+)\s+([A-Z][a-z]{2,})\b/g, '$1 [REDACTED]');
  return masked;
}

function buildPrompt(description, subject, email, hostname) {
  const maskedDesc = maskPII(description);
  const maskedSubject = maskPII(subject || '');
  const maskedEmail = email ? maskPII(email) : 'not provided';
  const maskedHostname = hostname || 'not provided';

  return `You are a security incident triage assistant. Analyze the following security report and provide a structured assessment.

Categories: ${CATEGORIES.join(', ')}

Required fields per category:
${Object.entries(REQUIRED_FIELDS_BY_CATEGORY).map(([cat, fields]) => `- ${cat}: ${fields.join(', ')}`).join('\n')}

Report Subject: ${maskedSubject}
Report Description: ${maskedDesc}
Reporter Email: ${maskedEmail}
Hostname: ${maskedHostname}

Respond in the same language as the report description. Supported languages: English, German, Czech, French, Spanish.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "inferred_category": "one of the categories above",
  "is_sufficient": true or false,
  "missing_fields": ["list of missing required fields if is_sufficient is false"],
  "enrichment_snippet": "brief checklist/summary for GSOC analyst",
  "confidence": 0.0 to 1.0
}`;
}

async function triageWithLLM(prompt) {
  const provider = process.env.LLM_PROVIDER || 'mock';
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL || 'gpt-4o';
  const baseUrl = process.env.LLM_BASE_URL;

  if (provider === 'mock' || !apiKey) {
    return triageMock(prompt);
  }

  const OpenAI = require('openai');
  const client = new OpenAI({
    apiKey,
    ...(baseUrl ? { baseURL: baseUrl } : {}),
    timeout: 30000,
    maxRetries: 2,
  });

  const startMs = Date.now();
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: 'You are a security incident triage assistant. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 800,
  });

  const latencyMs = Date.now() - startMs;
  const raw = response.choices?.[0]?.message?.content || '';

  // Parse JSON from response (handle possible markdown fences)
  let parsed;
  try {
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.error('AI response parse error:', e.message, 'Raw:', raw.slice(0, 200));
    throw new Error('Failed to parse AI response as JSON');
  }

  return { result: parsed, latencyMs, model, raw };
}

function triageMock(prompt) {
  const lower = prompt.toLowerCase();

  let category = 'Generic suspicious';
  if (lower.includes('email') || lower.includes('phish')) category = 'Email activity';
  else if (lower.includes('malware') || lower.includes('virus') || lower.includes('ransomware')) category = 'Malware';
  else if (lower.includes('account') || lower.includes('password') || lower.includes('login')) category = 'Account compromise';

  const requiredFields = REQUIRED_FIELDS_BY_CATEGORY[category] || [];
  const missing = [];
  if (!lower.includes('hostname') && !lower.includes('device') && !lower.includes('computer')) {
    const hostField = requiredFields.find((f) => f.includes('hostname') || f.includes('device'));
    if (hostField) missing.push(hostField);
  }
  if (!lower.includes('time') && !lower.includes('when') && !lower.includes('date')) {
    const timeField = requiredFields.find((f) => f.includes('time'));
    if (timeField) missing.push(timeField);
  }

  const isSufficient = missing.length === 0;

  return {
    result: {
      inferred_category: category,
      is_sufficient: isSufficient,
      missing_fields: missing,
      enrichment_snippet: `Mock triage: Category=${category}. ${isSufficient ? 'Report has sufficient details.' : `Missing: ${missing.join(', ')}`}`,
      confidence: 0.75,
    },
    latencyMs: 50,
    model: 'mock',
    raw: 'mock response',
  };
}

async function logPrompt(reportId, prompt, result, model, latencyMs) {
  try {
    const promptHash = crypto.createHash('sha256').update(prompt).digest('hex');
    await pool.query(
      `INSERT INTO ai_prompt_log (report_id, prompt_hash, prompt_version, response_json, model_name, latency_ms)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [reportId, promptHash, 'v1', JSON.stringify(result), model, latencyMs]
    );
  } catch (err) {
    if (err.code !== '42P01') console.error('AI prompt log error:', err.message);
  }
}

/**
 * Main triage function.
 * @param {{ description: string, subject?: string, email?: string, hostname?: string, reportId?: string }} input
 * @returns {{ inferred_category: string, is_sufficient: boolean, missing_fields: string[], enrichment_snippet: string, confidence: number }}
 */
async function triage({ description, subject, email, hostname, reportId }) {
  const prompt = buildPrompt(description, subject, email, hostname);
  const { result, latencyMs, model } = await triageWithLLM(prompt);

  // Validate and normalize result
  const normalized = {
    inferred_category: CATEGORIES.includes(result.inferred_category) ? result.inferred_category : 'Generic suspicious',
    is_sufficient: !!result.is_sufficient,
    missing_fields: Array.isArray(result.missing_fields) ? result.missing_fields : [],
    enrichment_snippet: result.enrichment_snippet || '',
    confidence: typeof result.confidence === 'number' ? Math.min(1, Math.max(0, result.confidence)) : 0.5,
  };

  if (reportId) {
    await logPrompt(reportId, prompt, normalized, model, latencyMs);
  }

  return normalized;
}

module.exports = { triage, maskPII, CATEGORIES, REQUIRED_FIELDS_BY_CATEGORY };
