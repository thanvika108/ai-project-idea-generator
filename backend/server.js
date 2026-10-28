require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const supabase = require('./supabase');
const authRoutes = require('./routes/auth');
const ideaRoutes = require('./routes/ideas');

const app = express();
const port = Number(process.env.PORT) || 3000;
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], objectSrc: ["'none'"], upgradeInsecureRequests: null } } }));
app.use(cors({ origin: false }));
app.use(express.json({ limit: '32kb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 180, standardHeaders: 'draft-8', legacyHeaders: false }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'AI Project Idea Generator', databaseConfigured: Boolean(supabase) }));
app.use('/api/auth', authRoutes);
app.use('/api/ideas', ideaRoutes);
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.get('*path', (req, res, next) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API endpoint not found.' });
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'), err => { if (err) next(err); });
});
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}:`, err.message);
  if (res.headersSent) return next(err);
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 500 ? err.status : 500;
  res.status(status).json({ error: status === 500 ? 'Something went wrong on the server. Check the server terminal for details.' : err.message });
});

async function provisionAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!supabase || !email || !password || password === 'change-this-before-running') {
    console.warn('Admin bootstrap skipped. Configure Supabase and set a unique ADMIN_PASSWORD in backend/.env.'); return;
  }
  if (password.length < 12) { console.warn('Admin bootstrap skipped: ADMIN_PASSWORD must be at least 12 characters.'); return; }
  const { data: found, error: findError } = await supabase.from('app_users').select('id,role').eq('email', email).maybeSingle();
  if (findError) throw findError;
  const password_hash = await bcrypt.hash(password, 12);
  if (found) {
    const { error } = await supabase.from('app_users').update({ role: 'admin', password_hash, name: 'MREC Administrator' }).eq('id', found.id);
    if (error) throw error;
    console.log(`Admin account verified for ${email}.`); return;
  }
  const { error } = await supabase.from('app_users').insert({ name: 'MREC Administrator', email, password_hash, role: 'admin' });
  if (error && error.code !== '23505') throw error;
  console.log(`Admin account provisioned for ${email}.`);
}

if (require.main === module) {
  app.listen(port, async () => {
    console.log(`AI Project Idea Generator running at http://localhost:${port}`);
    try { await provisionAdmin(); } catch (error) { console.error('Admin bootstrap failed:', error.message); }
  });
}
module.exports = app;
