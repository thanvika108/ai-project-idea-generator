const API = '/api';
const state = { token: null, user: null, ideas: [], savedIds: new Set(), authMode: 'signin', activeView: 'home' };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const icons = { 'AI & Machine Learning': '✳', 'Web Development': '⌘', 'IoT & Embedded': '◉', Cybersecurity: '⌁', Environment: '♧', 'Healthcare & Wellness': '♡', Education: '▤', 'Open Innovation': '✦' };
function escapeHTML(value) { return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function setStatus(message, type = 'error', target = '#status-message') { const el = $(target); if (!el) return; el.textContent = message || ''; el.style.color = type === 'success' ? '#218b6c' : ''; }
function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); window.setTimeout(() => el.classList.remove('show'), 2600); }
function authHeaders() { return state.token ? { Authorization: `Bearer ${state.token}` } : {}; }
async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(options.headers || {}) } });
  let payload = {}; try { payload = await response.json(); } catch { /* server may return an empty body */ }
  if (!response.ok) { if (response.status === 401 && state.token) signOut(false); throw new Error(payload.error || `Request failed (${response.status}).`); }
  return payload;
}
function setSignedIn(user, token) {
  state.user = user; state.token = token;
  // The token is intentionally kept in memory rather than localStorage.
  $('#account-area').replaceChildren();
  const identity = document.createElement('span'); identity.className = 'user-greeting'; identity.textContent = `Hi, ${user.name.split(' ')[0]}`; identity.style.cssText = 'font-size:11px;color:#64728a;font-weight:700;margin-right:3px';
  const logout = document.createElement('button'); logout.className = 'button button-quiet'; logout.textContent = 'Sign out'; logout.addEventListener('click', () => signOut());
  $('#account-area').append(identity, logout);
  $('#saved-nav').hidden = false; $('#admin-nav').hidden = user.role !== 'admin';
}
function resetAccountUI() {
  state.user = null; state.token = null; state.savedIds = new Set();
  $('#account-area').innerHTML = '<button class="button button-quiet" id="signin-open">Sign in</button><button class="button button-primary" id="signup-open">Create account</button>';
  $('#signin-open').addEventListener('click', () => openAuth('signin'));
  $('#signup-open').addEventListener('click', () => openAuth('signup'));
  $('#saved-nav').hidden = true; $('#admin-nav').hidden = true;
}
function signOut(showMessage = true) { resetAccountUI(); showView('home'); if (showMessage) toast('You have signed out.'); renderIdeas(); }
function openAuth(mode) { state.authMode = mode; const signup = mode === 'signup'; $('#auth-title').textContent = signup ? 'Create your account' : 'Sign in to IdeaForge'; $('#auth-eyebrow').textContent = signup ? 'YOUR IDEAS START HERE' : 'WELCOME BACK'; $('#auth-subtitle').textContent = signup ? 'Create an account to save your favourite ideas.' : 'Keep your favourite ideas in one place.'; $('#name-field').hidden = !signup; $('#auth-name').required = signup; $('#auth-password').autocomplete = signup ? 'new-password' : 'current-password'; $('#auth-password').minLength = signup ? 8 : 1; $('#auth-submit').textContent = signup ? 'Create account →' : 'Sign in →'; $('#modal-switch').innerHTML = signup ? 'Already registered? <button type="button" id="switch-auth">Sign in</button>' : 'New to IdeaForge? <button type="button" id="switch-auth">Create an account</button>'; $('#auth-message').textContent = ''; $('#auth-modal').hidden = false; $('#switch-auth').addEventListener('click', () => openAuth(signup ? 'signin' : 'signup')); setTimeout(() => (signup ? $('#auth-name') : $('#auth-email')).focus(), 30); }
function closeAuth() { $('#auth-modal').hidden = true; }
function showView(view) {
  state.activeView = view;
  $('#discover-view').hidden = view !== 'home'; $('#hero').hidden = view !== 'home'; $('#saved-view').hidden = view !== 'saved'; $('#admin-view').hidden = view !== 'admin';
  $$('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === view));
  if (view === 'saved') loadSaved(); if (view === 'admin') loadAdmin();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function renderIdeas() {
  const grid = $('#idea-grid'); grid.replaceChildren();
  $('#results-heading').hidden = state.ideas.length === 0;
  $('#results-count').textContent = `${state.ideas.length} ideas generated`;
  state.ideas.forEach((idea, index) => grid.appendChild(makeIdeaCard(idea, index)));
}
function makeIdeaCard(idea, index, savedRecord = null) {
  const card = document.createElement('article'); card.className = 'idea-card';
  const savedId = savedRecord?.id;
  const isSaved = savedId ? true : state.savedIds.has(idea.title);
  card.innerHTML = `<div class="card-top"><span class="domain-icon" aria-hidden="true">${escapeHTML(icons[idea.domain] || '✦')}</span><span class="level-tag">${escapeHTML(idea.skillLevel || idea.skill_level || 'Beginner')}</span></div><h3>${escapeHTML(idea.title)}</h3><p>${escapeHTML(idea.solution || idea.idea_data?.solution || idea.problem || 'A practical student project idea to explore.')}</p><div class="card-meta"><span>${escapeHTML(idea.domain || 'Open Innovation')}</span><span>·</span><span>${escapeHTML(idea.estimatedWeeks || 'MVP scope')}</span></div><div class="card-actions"><button class="button button-small button-outline details-button">View details ↗</button>${savedRecord ? '<button class="button button-small button-outline remove-button">Remove</button>' : `<button class="button button-small ${isSaved ? 'button-outline saved' : 'button-primary'} save-button" ${isSaved ? 'disabled' : ''}>${isSaved ? '✓ Saved' : '+ Shortlist'}</button>`}</div>`;
  card.querySelector('.details-button').addEventListener('click', () => showIdeaDetails(savedRecord?.idea_data || idea));
  if (savedRecord) card.querySelector('.remove-button').addEventListener('click', async () => { if (!confirm('Remove this idea from your shortlist?')) return; try { await api(`/ideas/saved/${encodeURIComponent(savedRecord.id)}`, { method: 'DELETE' }); toast('Idea removed from shortlist.'); loadSaved(); } catch (e) { toast(e.message); } });
  else card.querySelector('.save-button').addEventListener('click', async () => saveIdea(idea, card.querySelector('.save-button')));
  return card;
}
async function saveIdea(idea, button) {
  if (!state.user) { openAuth('signin'); setStatus('Sign in or create an account to save ideas.', 'error', '#auth-message'); return; }
  button.disabled = true;
  try { await api('/ideas/saved', { method: 'POST', body: JSON.stringify({ title: idea.title, domain: idea.domain, skillLevel: idea.skillLevel || 'Beginner', ideaData: idea }) }); state.savedIds.add(idea.title); button.textContent = '✓ Saved'; button.classList.remove('button-primary'); button.classList.add('saved'); toast('Added to your shortlist.'); }
  catch (e) { button.disabled = false; toast(e.message); }
}
function showIdeaDetails(idea) {
  const features = Array.isArray(idea.features) ? idea.features : [];
  const stack = Array.isArray(idea.stack) ? idea.stack : [];
  const next = Array.isArray(idea.nextSteps) ? idea.nextSteps : [];
  $('#idea-detail-content').innerHTML = `<div class="eyebrow muted">PROJECT IDEA DETAIL</div><h2>${escapeHTML(idea.title)}</h2><div class="detail-meta"><span class="detail-chip">${escapeHTML(idea.domain || 'Open Innovation')}</span><span class="detail-chip">${escapeHTML(idea.skillLevel || 'Beginner')}</span><span class="detail-chip">${escapeHTML(idea.estimatedWeeks || 'Flexible timeline')}</span></div><h3>The problem</h3><p>${escapeHTML(idea.problem || 'Choose a small, meaningful problem that can be tested with real users.')}</p><h3>Proposed solution</h3><p>${escapeHTML(idea.solution || '')}</p><h3>Suggested features</h3><ul>${features.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul><h3>Suggested technology</h3><p>${escapeHTML(stack.join(', '))}</p><h3>Recommended next steps</h3><ul>${next.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul><h3>Demo tip</h3><p>${escapeHTML(idea.demoTip || 'Show the core workflow and explain what you would improve next.')}</p>`;
  $('#idea-dialog').showModal();
}
async function loadSaved() {
  if (!state.user) { $('#saved-grid').replaceChildren(); $('#saved-empty').hidden = false; return; }
  try { const result = await api('/ideas/saved'); const grid = $('#saved-grid'); grid.replaceChildren(); state.savedIds = new Set(result.ideas.map(item => item.title)); result.ideas.forEach(record => grid.appendChild(makeIdeaCard({ ...record.idea_data, title: record.title, domain: record.domain, skillLevel: record.skill_level }, 0, record))); $('#saved-empty').hidden = result.ideas.length > 0; }
  catch (e) { toast(e.message); }
}
async function loadAdmin() {
  try { const stats = await api('/ideas/admin/stats'); $('#stat-users').textContent = stats.totalUsers; $('#stat-ideas').textContent = stats.totalSavedIdeas; }
  catch (e) { toast(e.message); showView('home'); }
}
$('#generator-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.submitter; button.disabled = true; button.innerHTML = '<span>◌</span> Generating…'; setStatus('');
  try { const form = new FormData(event.currentTarget); const result = await api('/ideas/generate', { method: 'POST', body: JSON.stringify({ domain: form.get('domain'), skillLevel: form.get('skillLevel'), interests: form.get('interests'), count: Number(form.get('count')) }) }); state.ideas = result.ideas; renderIdeas(); setStatus(result.note, 'success'); $('#results-heading').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  catch (e) { setStatus(e.message); }
  finally { button.disabled = false; button.innerHTML = '<span>✳</span> Generate ideas <span>→</span>'; }
});
$('#auth-form').addEventListener('submit', async event => {
  event.preventDefault(); const submit = $('#auth-submit'); submit.disabled = true; submit.textContent = 'Please wait…'; setStatus('', 'error', '#auth-message');
  const body = { email: $('#auth-email').value.trim(), password: $('#auth-password').value };
  if (state.authMode === 'signup') body.name = $('#auth-name').value.trim();
  try { const result = await api(`/auth/${state.authMode}`, { method: 'POST', body: JSON.stringify(body) }); setSignedIn(result.user, result.token); closeAuth(); $('#auth-form').reset(); toast(state.authMode === 'signup' ? 'Account created. Welcome to IdeaForge!' : 'Welcome back!'); if (state.activeView === 'saved') loadSaved(); }
  catch (e) { setStatus(e.message, 'error', '#auth-message'); }
  finally { submit.disabled = false; submit.textContent = state.authMode === 'signup' ? 'Create account →' : 'Sign in →'; }
});
$('#signin-open').addEventListener('click', () => openAuth('signin')); $('#signup-open').addEventListener('click', () => openAuth('signup'));
$('#modal-close').addEventListener('click', closeAuth); $('#auth-modal').addEventListener('click', event => { if (event.target === $('#auth-modal')) closeAuth(); });
$('#idea-dialog-close').addEventListener('click', () => $('#idea-dialog').close());
$$('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
(async function init() {
  try { const result = await api('/ideas/generate', { method: 'POST', body: JSON.stringify({ domain: 'Open Innovation', skillLevel: 'Beginner', count: 3 }) }); state.ideas = result.ideas; renderIdeas(); }
  catch (e) { setStatus(`The idea preview is unavailable: ${e.message}`); }
})();
