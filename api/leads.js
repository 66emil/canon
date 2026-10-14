// Vercel Serverless Function: POST /api/leads — the lead forms of the new site (web/src/js/main.js).
// Same contract as the mock backend (mock/server.mjs): 201 on success, 422 {fields} on invalid input.
//
// Where leads go:
//   - always: the function log (Vercel → Project → Logs, search "[lead]");
//   - Telegram, when TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set in the project's environment variables.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normPhone = (p) => String(p || '').replace(/\D/g, '').replace(/^8(?=\d{10}$)/, '7');
const clip = (v, n) => (v == null ? null : String(v).trim().slice(0, n) || null);

function validate(b) {
  const errors = {};
  if (!clip(b.name, 80)) errors.name = 'required';
  const phone = normPhone(b.phone);
  if (!phone) errors.phone = 'required';
  else if (phone.length < 10 || phone.length > 15) errors.phone = 'invalid';
  if (b.email && !EMAIL_RE.test(String(b.email))) errors.email = 'invalid';
  if (!b.consent) errors.consent = 'required';
  return errors;
}

async function sendTelegram(lead) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return null;
  const text = [
    'Новая заявка с сайта КаньонТур',
    `Имя: ${lead.name}`,
    `Телефон: +${lead.phone}`,
    lead.email && `E-mail: ${lead.email}`,
    (lead.tourName || lead.tourSlug) && `Тур: ${lead.tourName || lead.tourSlug}`,
    lead.comment && lead.comment,
    lead.pageUrl && `Страница: ${lead.pageUrl}`,
  ].filter(Boolean).join('\n');
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  });
  if (!r.ok) console.error('[lead] telegram failed', r.status, await r.text());
  return r.ok;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { return res.status(400).json({ error: 'bad_json' }); } }
  b = b || {};

  // honeypot: real visitors never see this field
  if (b.website) return res.status(201).json({ ok: true });

  const errors = validate(b);
  if (Object.keys(errors).length) return res.status(422).json({ error: 'validation_failed', fields: errors });

  const lead = {
    id: `L-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    name: clip(b.name, 80),
    phone: normPhone(b.phone),
    email: clip(b.email, 120),
    tourSlug: clip(b.tourSlug, 60),
    tourName: clip(b.tourName, 120),
    comment: clip(b.comment, 500),
    pageUrl: clip(b.pageUrl, 300),
    utm: b.utm && typeof b.utm === 'object' ? b.utm : null,
  };
  console.log('[lead]', JSON.stringify(lead));

  const delivered = await sendTelegram(lead).catch((e) => { console.error('[lead] telegram error', e); return false; });
  // Telegram is configured but did not accept the message: let the visitor call instead of losing the lead
  if (delivered === false) return res.status(502).json({ error: 'delivery_failed' });
  return res.status(201).json({ id: lead.id, createdAt: lead.createdAt });
}
