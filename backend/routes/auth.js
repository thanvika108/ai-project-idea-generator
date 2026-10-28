const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

function tokenFor(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
}
function safeUser(user) { return { id: user.id, name: user.name, email: user.email, role: user.role }; }
function validEmail(email) { return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254; }

router.post('/signup', async (req, res, next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'Name must be between 2 and 80 characters.' });
    if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 8 || password.length > 72) return res.status(400).json({ error: 'Password must be 8–72 characters long.' });
    if (!supabase) return res.status(503).json({ error: 'Database is not configured. Complete backend/.env first.' });
    const { data: existing, error: lookupError } = await supabase.from('app_users').select('id').eq('email', email).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });
    const password_hash = await bcrypt.hash(password, 12);
    const { data: user, error } = await supabase.from('app_users').insert({ name, email, password_hash, role: 'student' }).select('id,name,email,role').single();
    if (error) { if (error.code === '23505') return res.status(409).json({ error: 'An account with this email already exists.' }); throw error; }
    return res.status(201).json({ message: 'Account created successfully.', token: tokenFor(user), user: safeUser(user) });
  } catch (error) { next(error); }
});

router.post('/signin', async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!validEmail(email) || !password) return res.status(400).json({ error: 'Enter your email and password.' });
    if (!supabase) return res.status(503).json({ error: 'Database is not configured. Complete backend/.env first.' });
    const { data: user, error } = await supabase.from('app_users').select('id,name,email,role,password_hash').eq('email', email).maybeSingle();
    if (error) throw error;
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
    return res.json({ message: 'Signed in successfully.', token: tokenFor(user), user: safeUser(user) });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'Database is not configured.' });
    const { data: user, error } = await supabase.from('app_users').select('id,name,email,role').eq('id', req.user.sub).maybeSingle();
    if (error) throw error;
    if (!user) return res.status(401).json({ error: 'Account no longer exists. Please sign in again.' });
    res.json({ user });
  } catch (error) { next(error); }
});
module.exports = router;
