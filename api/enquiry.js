const nodemailer = require('nodemailer');

const clip = (v, n) => String(v || '').trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  if (b.website) return res.status(200).json({ ok: true }); // spam trap

  const d = {
    name: clip(b.name, 100),
    phone: clip(b.phone, 20),
    email: clip(b.email, 150),
    product: clip(b.product, 100),
    message: clip(b.message, 2000),
  };
  if (!d.name) return res.status(400).json({ error: 'Please enter your name.' });
  if (!/^\+?[\d\s-]{8,15}$/.test(d.phone)) return res.status(400).json({ error: 'Please enter a valid contact number.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return res.status(400).json({ error: 'Please enter a valid email ID.' });

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/enquiries`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(d),
    });
    if (!r.ok) throw new Error(await r.text());
  } catch (err) {
    console.error('DB error', err);
    return res.status(500).json({ error: 'Could not save your enquiry. Please call us.' });
  }

  const text = `New enquiry\nName: ${d.name}\nPhone: ${d.phone}\nEmail: ${d.email}\nInterested in: ${d.product}\n\n${d.message}`;
  const jobs = [];

  const { GMAIL_USER, GMAIL_APP_PASSWORD, NOTIFY_EMAIL } = process.env;
  if (GMAIL_USER && GMAIL_APP_PASSWORD) {
    const t = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } });
    jobs.push(t.sendMail({
      from: `"Bharat Business Desk" <${GMAIL_USER}>`,
      to: NOTIFY_EMAIL || GMAIL_USER,
      replyTo: d.email,
      subject: `New enquiry: ${d.product} - ${d.name}`,
      text,
    }));
  }

  const { FAST2SMS_KEY, NOTIFY_PHONE } = process.env;
  if (FAST2SMS_KEY && NOTIFY_PHONE) {
    const sms = `Enquiry: ${d.name}, ${d.phone}, ${d.product}. ${d.message}`.slice(0, 300);
    jobs.push(fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: { authorization: FAST2SMS_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ route: 'q', message: sms, numbers: NOTIFY_PHONE }),
    }));
  }

  (await Promise.allSettled(jobs)).forEach((x) => x.status === 'rejected' && console.error('Notify error', x.reason));
  return res.status(200).json({ ok: true });
};
