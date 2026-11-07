const crypto = require('crypto');

module.exports = async (req, res) => {
  const given = Buffer.from(String(req.headers['x-admin-key'] || ''));
  const real = Buffer.from(String(process.env.ADMIN_PASSWORD || ''));
  if (!real.length || given.length !== real.length || !crypto.timingSafeEqual(given, real)) {
    return res.status(401).json({ error: 'Wrong password' });
  }
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/enquiries?select=*&order=created_at.desc&limit=2000`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
  });
  if (!r.ok) return res.status(500).json({ error: 'Database error' });
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(await r.json());
};
