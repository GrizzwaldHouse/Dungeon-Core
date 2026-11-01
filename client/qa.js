// qa.js
// Developer: Marcus Daley
// Date: 2026-10-31
// Why: Give owner playtests a low-friction, voice-friendly defect log without coupling QA state to the game simulation.

'use strict';

const STORAGE_KEY = 'dungeon-core-owner-qa-v1';
const issueTemplate = document.querySelector('#issue-template');
const issues = document.querySelector('#issues');
const saveStatus = document.querySelector('#save-status');
const voiceStatus = document.querySelector('#voice-status');
const dictateButton = document.querySelector('#dictate');
let recognition = null;
let activeField = null;

function issueRecord(article) {
  const value = (selector) => article.querySelector(selector)?.value || '';
  return { severity: value('.severity'), area: value('.area'), device: value('.issue-device'), result: value('.result'), note: value('.note'), expected: value('.expected'), evidence: value('.evidence') };
}

function sessionRecord() {
  const value = (id) => document.querySelector(id)?.value || '';
  return { time: value('#session-time'), device: value('#device'), viewport: value('#viewport'), gameUrl: value('#game-url'), issues: [...issues.querySelectorAll('.issue')].map(issueRecord) };
}

function saveDraft() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionRecord()));
  saveStatus.textContent = 'Draft saved locally at ' + new Date().toLocaleTimeString();
}

function addIssue(data = {}) {
  const article = issueTemplate.content.firstElementChild.cloneNode(true);
  article.querySelector('.severity').value = data.severity || 'P1';
  for (const [selector, value] of [['.area', data.area], ['.issue-device', data.device], ['.note', data.note], ['.expected', data.expected], ['.evidence', data.evidence]]) {
    if (value) article.querySelector(selector).value = value;
  }
  article.querySelector('.result').value = data.result || 'FAIL';
  article.querySelector('.remove').addEventListener('click', () => { article.remove(); renumber(); saveDraft(); });
  article.querySelectorAll('input, textarea, select').forEach((field) => {
    field.addEventListener('input', saveDraft);
    field.addEventListener('focus', () => { activeField = field.matches('textarea') ? field : article.querySelector('.note'); });
  });
  issues.append(article); renumber(); saveDraft();
}

function renumber() { [...issues.querySelectorAll('.issue')].forEach((article, index) => { article.querySelector('.issue-number').textContent = index + 1; }); }

function startDictation() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { voiceStatus.textContent = 'Voice dictation is unavailable in this browser. Use the keyboard microphone on your device instead.'; return; }
  if (recognition) { recognition.stop(); return; }
  activeField ||= issues.querySelector('.note');
  recognition = new SpeechRecognition(); recognition.continuous = true; recognition.interimResults = true; recognition.lang = 'en-US';
  dictateButton.setAttribute('aria-pressed', 'true'); dictateButton.textContent = 'Stop dictation'; voiceStatus.textContent = 'Listening. Speak the defect, expected result, and evidence.';
  recognition.onresult = (event) => { let text = ''; for (let i = event.resultIndex; i < event.results.length; i += 1) text += event.results[i][0].transcript; if (activeField) { activeField.value += (activeField.value ? ' ' : '') + text.trim(); activeField.dispatchEvent(new Event('input', { bubbles: true })); } };
  recognition.onerror = (event) => { voiceStatus.textContent = `Dictation stopped: ${event.error}. Check microphone permission or use the device keyboard microphone.`; recognition = null; dictateButton.setAttribute('aria-pressed', 'false'); dictateButton.textContent = 'Start dictation'; };
  recognition.onend = () => { if (recognition) { recognition = null; dictateButton.setAttribute('aria-pressed', 'false'); dictateButton.textContent = 'Start dictation'; voiceStatus.textContent = 'Dictation ended. Review the note and continue playing.'; } };
  recognition.start();
}

document.querySelector('#add-issue').addEventListener('click', () => addIssue());
document.querySelector('#export').addEventListener('click', () => { const blob = new Blob([JSON.stringify(sessionRecord(), null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `dungeon-core-qa-${new Date().toISOString().replace(/[:.]/g, '-')}.json`; link.click(); URL.revokeObjectURL(link.href); });
document.querySelector('#clear').addEventListener('click', () => { localStorage.removeItem(STORAGE_KEY); issues.replaceChildren(); addIssue(); saveStatus.textContent = 'Draft cleared.'; });
dictateButton.addEventListener('click', startDictation);
document.querySelectorAll('#session-time, #device, #viewport, #game-url').forEach((field) => field.addEventListener('input', saveDraft));
const draft = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
if (draft) { document.querySelector('#session-time').value = draft.time || ''; document.querySelector('#device').value = draft.device || ''; document.querySelector('#viewport').value = draft.viewport || ''; document.querySelector('#game-url').value = draft.gameUrl || 'http://localhost:3002/'; (draft.issues || []).forEach(addIssue); }
if (!issues.children.length) addIssue();
