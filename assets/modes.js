const answers = {
  what: { title: 'What is this?', text: 'AIRM is an evidence-based control-screening system for AI production risk. It looks at whether technical and governance controls exist around real failure modes, while keeping raw evidence inside the assessed company’s perimeter.', link: ['Read the architecture', 'articles/02-the-architecture.html'] },
  involved: { title: 'How can I get involved?', text: 'The current beta is closed source and aimed at developers and IT architects running complex agent systems. The application asks for concrete answers about prompt injection, blast radius, drift, vendor concentration, evidence, and human oversight.', link: ['Apply for beta access', 'apply.html'] },
  needed: { title: 'Why is this needed?', text: 'AI systems are moving into production while underwriting and governance processes still rely heavily on attestations. The project explores a practical assessment layer that can test controls without exporting source code, logs, or infrastructure details.', link: ['Read the problem statement', 'articles/01-the-problem.html'] },
  value: { title: 'What is the value?', text: 'For builders, it creates a structured way to pressure-test systems. For assessors and insurers, it creates a repeatable evidence boundary. The output is a control score and evidence trail, not a claim that the system predicts loss or sets premiums.', link: ['Read the scoring method', 'articles/03-the-scoring-methodology.html'] }
};

let currentMode = 'person';
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
  if (currentMode !== 'chat' && currentMode !== 'static') speak(item.text);
}

function answerFreeform(question) {
  const q = question.toLowerCase();
  let topic = 'what';
  if (q.includes('join') || q.includes('involve') || q.includes('beta') || q.includes('apply')) topic = 'involved';
  else if (q.includes('why') || q.includes('need') || q.includes('problem')) topic = 'needed';
  else if (q.includes('value') || q.includes('benefit') || q.includes('worth')) topic = 'value';
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
  const labels = { person: 'Live person stream', avatar: 'Animated avatar', chat: 'Chat bot', static: 'Static articles' };
  const help = { person: 'Live person mode is ready for a provider video stream. Until connected, answers still work here.', avatar: 'Avatar mode uses browser speech output and a local animated fallback. Stop interrupts speech and motion together.', chat: 'Chat mode keeps the conversation text-first and works without audio permissions.', static: 'Static mode opens the five project articles directly.' };
  $('#presence-label').textContent = labels[mode];
  $('#mode-help').textContent = help[mode];
  $('#speak-toggle').disabled = mode === 'chat' || mode === 'static';
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
