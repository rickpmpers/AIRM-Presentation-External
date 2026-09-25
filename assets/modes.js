const answers = {
  what: { title: 'What is this?', text: 'AIRM is a complete AI Risk & Reliability Management platform and continuous telemetry underwriting engine. It pairs 10-format architecture intake with dynamic HMAC-SHA256 signed package synthesis, in-memory credential containment, closed-loop carrier premium rate adjustments, FAIR-style Monte Carlo loss simulation, and multi-framework governance screening.', link: ['Read the architecture', 'articles/02-the-architecture.html'] },
  involved: { title: 'How can I get involved?', text: 'The alpha/beta is strictly non-commercial: eligible participants are individuals and small personal or community teams running OpenClaw or comparable agent systems. Participants run an isolated aglet container, verify and execute signed packages locally with zero credential egress, and export sanitized scores to IC Cloud. In parallel, the core platform is engineered for future white-label carrier distribution.', link: ['Review eligibility and apply', 'apply.html'] },
  needed: { title: 'Why is this needed?', text: 'More than sixty P&C carriers have filed AI exclusions and new ISO endorsement forms carve out AI liabilities. While legacy underwriting relies on static questionnaires, AIRM replaces self-attestations with continuous runtime telemetry, cryptographic evidence boundaries, and bridges technical signals into actuarial loss and rate adjustment language.', link: ['Read the problem statement', 'articles/01-the-problem.html'] },
  value: { title: 'What is the value?', text: 'For engineering teams, it provides automated architecture analysis, quantifiable telemetry collection, and comprehensive compliance across NIST AI RMF, ISO 42001/42005/23894, and OWASP 2025 without exposing source code or credentials. For carriers, it provides continuous risk scoring, dynamic underwriting rate adjustments, multi-tenant isolation, and a white-label distributable customer container.', link: ['Read the scoring method', 'articles/03-the-scoring-methodology.html'] },
  architecture: { title: 'How does the architecture work?', text: 'The system operates across two boundaries: the customer aglet container (parsing 10 document formats, holding cloud credentials in-memory, running verified collectors locally) and the carrier IC Cloud (synthesizing and HMAC-SHA256 signing dynamic packages, and receiving score-only exports for dynamic underwriting rate adjustments).', link: ['Explore the architecture', 'articles/02-the-architecture.html'] },
  scoring: { title: 'How is risk scored?', text: 'Scoring spans 10 technical vectors and 8 governance frameworks. Stronger controls lower risk; missing evidence stays unknown and lowers coverage. Open-source tool evidence (Promptfoo, DeepEval, Giskard, ART, AIF360, Evidently) is normalized with tool:// provenance and requires human review. FAIR Monte Carlo loss simulation and 75/25 AI-exclusion gap pricing are also available.', link: ['Read scoring methodology', 'articles/03-the-scoring-methodology.html'] },
  loop: { title: 'What is the closed-loop run?', text: 'AIRM completed a proven end-to-end loop: ingesting an architecture document, analyzing detected cloud components, generating dynamic IC Cloud packages with engineer prompt directives, cryptographically verifying HMAC-SHA256 signatures, collecting local CloudWatch metrics, screening controls, exporting score-only payloads, and calculating a dynamic -2.5% carrier underwriting adjustment.', link: ['Read the architecture', 'articles/02-the-architecture.html'] }
};

let currentMode = 'static';
let micStream = null;

const $ = (selector) => document.querySelector(selector);
const transcript = $('#transcript');
const voiceState = $('#voice-state');
const avatarMouth = $('#avatar-mouth');

function addMessage(role, html) {
  const item = document.createElement('div');
  item.className = `message ${role}`;
  item.innerHTML = `<span class="message-role">${role === 'assistant' ? 'AIRM guide' : 'You'}</span><p>${html}</p>`;
  transcript.appendChild(item);
  transcript.scrollTop = transcript.scrollHeight;
}

// --- Voice selection: prefer higher-quality system/neural voices over the flat default ---
const VOICE_PREFERENCE = [
  'Google UK English Female', 'Google US English',
  'Microsoft Aria Online (Natural)', 'Microsoft Jenny Online (Natural)', 'Microsoft Ana Online (Natural)',
  'Samantha', 'Ava', 'Serena', 'Nicky',
];
let cachedVoice = null;
function pickVoice() {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  for (const name of VOICE_PREFERENCE) {
    const hit = voices.find((v) => v.name === name);
    if (hit) { cachedVoice = hit; return hit; }
  }
  const enhanced = voices.find((v) => /en-(US|GB)/.test(v.lang) && /natural|neural|enhanced|premium/i.test(v.name));
  if (enhanced) { cachedVoice = enhanced; return enhanced; }
  const localEnglish = voices.find((v) => v.localService && v.lang.startsWith('en'));
  cachedVoice = localEnglish || voices.find((v) => v.lang.startsWith('en')) || voices[0];
  return cachedVoice;
}
if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => { cachedVoice = null; pickVoice(); };
}

// --- Lip sync: cycle mouth visemes while speaking, nudged by word-boundary events when available ---
const VISEMES = ['v-rest', 'v-small', 'v-mid', 'v-wide', 'v-round', 'v-mid', 'v-small'];
let visemeTimer = null;
let blinkTimer = null;

function setViseme(cls) {
  if (!avatarMouth) return;
  avatarMouth.className = `avatar-mouth ${cls}`;
}

function startLipSync() {
  if (!avatarMouth || visemeTimer) return;
  let i = 0;
  visemeTimer = setInterval(() => {
    i = (i + 1) % VISEMES.length;
    setViseme(VISEMES[i]);
  }, 110);
}

function stopLipSync() {
  if (visemeTimer) { clearInterval(visemeTimer); visemeTimer = null; }
  setViseme('v-rest');
}

function startBlinking() {
  if (blinkTimer) return;
  const blink = () => {
    document.body.classList.add('is-blinking');
    setTimeout(() => document.body.classList.remove('is-blinking'), 130);
    blinkTimer = setTimeout(blink, 2600 + Math.random() * 3200);
  };
  blinkTimer = setTimeout(blink, 1800);
}
startBlinking();

// Split into short natural phrases so pacing has real pauses instead of one flat run-on utterance.
function splitIntoPhrases(text) {
  return text.split(/(?<=[.!?,;:])\s+/).map((s) => s.trim()).filter(Boolean);
}

function speak(text) {
  if (!('speechSynthesis' in window)) { voiceState.textContent = 'Speech output is not available in this browser.'; return; }
  window.speechSynthesis.cancel();
  const voice = pickVoice();
  const phrases = splitIntoPhrases(text);
  let started = false;
  phrases.forEach((phrase, idx) => {
    const utterance = new SpeechSynthesisUtterance(phrase);
    if (voice) { utterance.voice = voice; utterance.lang = voice.lang; }
    utterance.rate = 1.0;
    utterance.pitch = 1.0 + (Math.random() * 0.06 - 0.03);
    if (idx === 0) {
      utterance.onstart = () => {
        started = true;
        voiceState.textContent = 'Speaking…';
        document.body.classList.add('is-speaking');
        startLipSync();
      };
    }
    if (idx === phrases.length - 1) {
      utterance.onend = () => {
        stopLipSync();
        document.body.classList.remove('is-speaking');
        voiceState.textContent = micStream ? 'Live voice is enabled.' : 'Ready. Microphone stays off until you enable live voice.';
      };
    }
    window.speechSynthesis.speak(utterance);
  });
  if (!started && phrases.length) { document.body.classList.add('is-speaking'); startLipSync(); }
}

function answer(topic) {
  const item = answers[topic];
  if (!item) return;
  addMessage('user', item.title);
  const html = `${item.text} <a href="${item.link[1]}">${item.link[0]} →</a>`;
  addMessage('assistant', html);
  if (currentMode === 'avatar') speak(item.text);
}

function answerFreeform(question) {
  const q = question.toLowerCase();
  let topic = 'what';
  if (q.includes('join') || q.includes('involve') || q.includes('beta') || q.includes('apply')) topic = 'involved';
  else if (q.includes('why') || q.includes('need') || q.includes('problem') || q.includes('exclusion')) topic = 'needed';
  else if (q.includes('value') || q.includes('benefit') || q.includes('worth')) topic = 'value';
  else if (q.includes('loop') || q.includes('closed') || q.includes('test') || q.includes('run')) topic = 'loop';
  else if (q.includes('arch') || q.includes('boundary') || q.includes('container') || q.includes('perimeter') || q.includes('package')) topic = 'architecture';
  else if (q.includes('score') || q.includes('vector') || q.includes('governance') || q.includes('price') || q.includes('rate') || q.includes('fair')) topic = 'scoring';
  answer(topic);
}

function selectMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-tab').forEach((tab) => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('[data-presence]').forEach((panel) => panel.classList.toggle('hidden', panel.dataset.presence !== mode));
  $('#static-links').hidden = mode !== 'static';
  const labels = { avatar: 'Animated avatar guide', static: 'Static articles' };
  const help = { avatar: 'Ask a question and the avatar will answer with text and speech. Stop interrupts speech and motion together.', static: 'Static mode shows the five project articles directly.' };
  $('#presence-label').textContent = labels[mode];
  $('#mode-help').textContent = help[mode];
  $('#speak-toggle').disabled = mode === 'static';
  $('#mic-button').disabled = mode === 'static';
  if (mode === 'static') { window.speechSynthesis?.cancel(); document.body.classList.remove('is-speaking'); stopLipSync(); }
}

document.querySelectorAll('.mode-tab').forEach((tab) => tab.addEventListener('click', () => selectMode(tab.dataset.mode)));
document.querySelectorAll('.callout').forEach((button) => button.addEventListener('click', () => answer(button.dataset.topic)));
$('#chat-form').addEventListener('submit', (event) => { event.preventDefault(); const input = $('#chat-input'); const value = input.value.trim(); if (!value) return; answerFreeform(value); input.value = ''; });
$('#speak-toggle').addEventListener('click', () => { const last = transcript.querySelector('.message.assistant:last-child p'); if (last) speak(last.textContent); });
$('#stop-button').addEventListener('click', () => { window.speechSynthesis?.cancel(); document.body.classList.remove('is-speaking'); stopLipSync(); voiceState.textContent = micStream ? 'Live voice is enabled.' : 'Speech stopped.'; });
$('#mic-button').addEventListener('click', async () => {
  if (micStream) { micStream.getTracks().forEach((track) => track.stop()); micStream = null; $('#mic-button').textContent = 'Enable live voice'; voiceState.textContent = 'Microphone off.'; return; }
  if (!navigator.mediaDevices?.getUserMedia) { voiceState.textContent = 'Live microphone input is not available in this browser.'; return; }
  try { micStream = await navigator.mediaDevices.getUserMedia({ audio: true }); $('#mic-button').textContent = 'Disable live voice'; voiceState.textContent = 'Live voice is enabled. A realtime speech service will connect here when configured.'; }
  catch { voiceState.textContent = 'Microphone permission was not granted.'; }
});

selectMode('static');
