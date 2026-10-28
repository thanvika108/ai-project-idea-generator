const domains = {
  'AI & Machine Learning': ['A smart study assistant that turns notes into short quizzes', 'A campus FAQ helper that answers from a curated question bank', 'A plant-leaf issue classifier using a small labeled image dataset'],
  'Web Development': ['A campus event discovery and registration portal', 'A peer skill-exchange board for students', 'A student club activity and announcement hub'],
  'IoT & Embedded': ['A classroom energy-use logging dashboard with simulated sensor readings', 'A smart plant-watering monitor prototype using moisture readings', 'A campus parking occupancy dashboard using sample sensor data'],
  'Cybersecurity': ['A password-strength learning tool that explains safer choices', 'A phishing-awareness quiz with instant explanations', 'A personal data privacy checklist and risk score'],
  'Environment': ['A waste-segregation learning game for campus', 'A water-use logging and conservation suggestion dashboard', 'A campus tree map with care reminders'],
  'Healthcare & Wellness': ['A student habit tracker focused on sleep and hydration reminders', 'A first-aid knowledge quiz with trusted educational content', 'A campus wellness resource directory'],
  'Education': ['A peer tutoring and doubt-session scheduler', 'A revision planner based on topics and exam dates', 'A lab equipment learning catalogue with safety notes'],
  'Open Innovation': ['A queue-time reporting board for campus services', 'A lost-and-found listing board for college', 'A student idea voting and feedback portal']
};
const skills = {
  Beginner: ['Use HTML forms and CSS cards, store records in PostgreSQL, and add simple filters.', 'Build a clear MVP with validation, a responsive layout, and a small relational schema.'],
  Intermediate: ['Add role-based views, analytics, CSV export, and robust server-side validation.', 'Include pagination, reusable API helpers, and automated route tests.'],
  Advanced: ['Add audit history, accessibility checks, richer analytics, and deployment monitoring.', 'Evaluate performance, threat-model permissions, and document measurable outcomes.']
};
function generateIdeas({ domain = 'Open Innovation', skillLevel = 'Beginner', interests = '', count = 5 }) {
  const pool = domains[domain] || domains['Open Innovation'];
  const cleanedInterest = String(interests || '').trim().slice(0, 120);
  const result = [];
  for (let i = 0; i < Math.min(Math.max(Number(count) || 5, 1), 8); i++) {
    const title = pool[i % pool.length];
    result.push({
      title: i >= pool.length ? `${title} — ${['Lite', 'Insights Edition', 'Campus Edition', 'Challenge Mode'][i % 4]}` : title,
      domain,
      skillLevel,
      problem: `Students need a practical way to address a real ${domain.toLowerCase()} challenge without an overly large first-year project.`,
      solution: `${title}. ${cleanedInterest ? `Include the user's interest in ${cleanedInterest} where it fits.` : ''} Start with a small working prototype and expand after user feedback.`,
      features: ['Simple, accessible user interface', 'Validated forms and saved records', 'Search or filter relevant information', 'A dashboard showing useful summaries'],
      stack: ['HTML5', 'CSS3', 'Vanilla JavaScript', 'Node.js', 'Express.js', 'Supabase PostgreSQL'],
      difficulty: skillLevel,
      estimatedWeeks: skillLevel === 'Beginner' ? '2–3 weeks' : skillLevel === 'Intermediate' ? '3–5 weeks' : '5–8 weeks',
      nextSteps: skills[skillLevel] || skills.Beginner,
      demoTip: 'Prepare 3–5 sample records, demonstrate one complete user workflow, and explain one limitation honestly.'
    });
  }
  return result;
}
module.exports = { generateIdeas, domains };
