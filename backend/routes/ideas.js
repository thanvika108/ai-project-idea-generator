const express = require('express');
const supabase = require('../supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { generateIdeas, domains } = require('../utils/ideas');
const router = express.Router();
function dbReady(res) { if (!supabase) { res.status(503).json({ error: 'Database is not configured. Complete backend/.env first.' }); return false; } return true; }

router.get('/domains', (req, res) => res.json({ domains: Object.keys(domains), skillLevels: ['Beginner', 'Intermediate', 'Advanced'] }));
router.post('/generate', (req, res) => {
  const domain = typeof req.body.domain === 'string' ? req.body.domain : 'Open Innovation';
  const skillLevel = typeof req.body.skillLevel === 'string' ? req.body.skillLevel : 'Beginner';
  const interests = typeof req.body.interests === 'string' ? req.body.interests.trim().slice(0, 120) : '';
  const count = Number(req.body.count ?? 5);
  if (!Object.hasOwn(domains, domain)) return res.status(400).json({ error: 'Choose a valid project domain.' });
  if (!['Beginner', 'Intermediate', 'Advanced'].includes(skillLevel)) return res.status(400).json({ error: 'Choose a valid skill level.' });
  if (!Number.isInteger(count) || count < 1 || count > 8) return res.status(400).json({ error: 'Choose between 1 and 8 ideas.' });
  res.json({ ideas: generateIdeas({ domain, skillLevel, interests, count }), note: 'Ideas are generated locally from curated templates; no external AI API is used.' });
});
router.use(requireAuth);
router.get('/saved', async (req, res, next) => {
  try { if (!dbReady(res)) return; const { data, error } = await supabase.from('saved_ideas').select('id,title,domain,skill_level,idea_data,created_at').eq('user_id', req.user.sub).order('created_at', { ascending: false }); if (error) throw error; res.json({ ideas: data }); } catch (e) { next(e); }
});
router.post('/saved', async (req, res, next) => {
  try {
    if (!dbReady(res)) return;
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const domain = typeof req.body.domain === 'string' ? req.body.domain : '';
    const skillLevel = typeof req.body.skillLevel === 'string' ? req.body.skillLevel : 'Beginner';
    const ideaData = req.body.ideaData;
    if (title.length < 3 || title.length > 180) return res.status(400).json({ error: 'Idea title must be between 3 and 180 characters.' });
    if (!Object.hasOwn(domains, domain)) return res.status(400).json({ error: 'Choose a valid domain.' });
    if (!['Beginner', 'Intermediate', 'Advanced'].includes(skillLevel)) return res.status(400).json({ error: 'Choose a valid skill level.' });
    if (!ideaData || typeof ideaData !== 'object' || Array.isArray(ideaData)) return res.status(400).json({ error: 'A valid idea detail object is required.' });
    const { data, error } = await supabase.from('saved_ideas').insert({ user_id: req.user.sub, title, domain, skill_level: skillLevel, idea_data: ideaData }).select('id,title,domain,skill_level,idea_data,created_at').single();
    if (error) { if (error.code === '23505') return res.status(409).json({ error: 'You have already saved this idea.' }); throw error; }
    res.status(201).json({ message: 'Idea saved to your shortlist.', idea: data });
  } catch (e) { next(e); }
});
router.delete('/saved/:id', async (req, res, next) => {
  try { if (!dbReady(res)) return; const { data, error } = await supabase.from('saved_ideas').delete().eq('id', req.params.id).eq('user_id', req.user.sub).select('id').maybeSingle(); if (error) throw error; if (!data) return res.status(404).json({ error: 'Saved idea was not found.' }); res.json({ message: 'Idea removed from your shortlist.' }); } catch (e) { next(e); }
});
router.get('/admin/stats', requireAdmin, async (req, res, next) => {
  try { if (!dbReady(res)) return; const [users, ideas] = await Promise.all([supabase.from('app_users').select('id', { count: 'exact', head: true }), supabase.from('saved_ideas').select('id', { count: 'exact', head: true })]); if (users.error) throw users.error; if (ideas.error) throw ideas.error; res.json({ totalUsers: users.count || 0, totalSavedIdeas: ideas.count || 0 }); } catch (e) { next(e); }
});
module.exports = router;
