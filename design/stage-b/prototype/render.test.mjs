import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderHome } from './home.js';
import { renderWork } from './work.js';
import { icons } from './icons.js';
import { createState, applyAction } from './model.js';
import { caseData } from '../case.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const ui = { esc, icons, notesOpen: true };

test('all phases render without mutating state; their visible actions have controller handlers', () => {
  const controller = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
  for (const phase of ['initial', 'analyzing', 'extracted']) {
    let state = createState();
    if (phase !== 'extracted') state = applyAction(state, 'START_READ').state;
    if (phase === 'analyzing') state = applyAction(state, 'BEGIN_ANALYSIS').state;
    const before = JSON.stringify(state);
    const views = [renderHome(state, ui), renderWork(state, ui)];
    assert.equal(JSON.stringify(state), before);
    for (const html of views) for (const [, action] of html.matchAll(/data-action="([^"]+)"/g)) assert(controller.includes(`case '${action}'`), action);
    if (phase !== 'extracted') {
      assert(!views[0].includes(caseData.aiTenant), 'unextracted entry must not pretend to have AI output');
      assert(!views[1].includes('work-field-note '));
    }
  }
});

test('all four extracted notes have unique source anchors; closing notes restores a single reading region', () => {
  const state = createState(), html = renderWork(state, ui);
  for (const key of ['tenant', 'event', 'deadline', 'amount']) assert.equal([...html.matchAll(new RegExp(`id="source-${key}"`, 'g'))].length, 1);
  const closed = renderWork(state, { ...ui, notesOpen: false });
  assert(closed.includes('notes-closed'));
  assert(!closed.includes('<aside class="work-notes"'));
  assert(closed.includes('展开批注'));
  assert(closed.includes(caseData.paragraphs[2]));
});

test('user corrections are escaped and never rewrite the original material', () => {
  const state = createState();
  applyAction(state, 'EDIT_FIELD', { field: 'tenant', value: caseData.tenant });
  const injection = '<img src=x onerror=alert(1)>';
  applyAction(state, 'EDIT_FIELD', { field: 'event', value: injection });
  const html = renderWork(state, { ...ui, editingField: 'event', editValue: injection });
  assert(!html.includes(injection)); assert(html.includes('&lt;img'));
  const documentOnly = html.slice(html.indexOf('<article class="work-document"'), html.indexOf('<aside class="work-notes"'));
  assert(documentOnly.includes(`${caseData.tenant}（虚构）`));
  assert(!documentOnly.includes(caseData.aiTenant));
  assert(!documentOnly.includes('&lt;img'));
  assert.equal([...html.matchAll(/id="field-edit-input"/g)].length, 1);
});

test('stale summary and saved/submitted continuation are distinct on the desk', () => {
  const state = createState();
  state.summaryStale = true; state.dirty = true;
  assert(renderHome(state, ui).includes('摘要待同步'));
  state.summaryStale = false; state.dirty = false;
  state.saved = { summary: '人工整理的待复核摘要', savedAt: '2026-11-03 09:30:00', relation: 'deferred' };
  assert(renderHome(state, ui).includes('打开已保存摘要'));
  state.submitted = true;
  assert(renderHome(state, ui).includes('人工检查已完成，摘要已提交复核'));
});

test('controller boot and the fixed-case click flow work with a DOM stub (no browser assertion)', async () => {
  const handlers = {}, values = new Map(), elements = new Map(), fields = new Map();
  let timer;
  const element = id => ({ id, innerHTML: '', textContent: '', dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, focus() {}, querySelector() { return null; }, querySelectorAll() { return []; } });
  for (const id of ['app', 'modal-root', 'announcer']) elements.set(id, element(id));
  const body = element('body');
  globalThis.document = { body, activeElement: body, querySelector(selector) { if (selector.startsWith('#')) return fields.get(selector) || elements.get(selector.slice(1)) || null; return null; }, querySelectorAll() { return []; }, getElementById(id) { return fields.get('#' + id) || elements.get(id) || null; }, addEventListener(type, fn) { handlers[type] = fn; } };
  globalThis.localStorage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  globalThis.window = { scrollY: 0, innerWidth: 1440, scrollTo() {}, matchMedia: () => ({ matches: true }) };
  globalThis.requestAnimationFrame = fn => fn();
  globalThis.setTimeout = fn => { timer = fn; return 1; }; globalThis.clearTimeout = () => { timer = null; };
  await import('./app.js');
  const read = () => JSON.parse(values.get('xiajin-stage-c-prototype-v1')).state;
  const click = (action, extra = {}) => { const control = { dataset: { action, ...extra }, disabled: false, closest: () => control }; handlers.click({ target: control }); };
  assert(elements.get('app').innerHTML.includes('我的案头'));
  click('new'); assert(elements.get('modal-root').innerHTML.includes('待整理的材料将在这里开始'));
  click('load-sample'); click('start-read'); assert.equal(read().phase, 'initial');
  click('extract'); assert.equal(read().phase, 'analyzing'); timer(); assert.equal(read().phase, 'extracted');
  click('edit-field', { field: 'tenant' }); fields.set('#field-edit-input', { value: caseData.tenant }); click('save-field', { field: 'tenant' });
  for (const field of ['event', 'deadline', 'amount']) click('confirm-field', { field });
  click('related');
  const compared = elements.get('modal-root').innerHTML.replace(/<[^>]*>/g, '');
  assert(compared.includes(caseData.relatedText), 'comparison retains the literal related original');
  assert(compared.includes('单位换算后一致'));
  click('set-relation', { relation: 'deferred' }); click('return-from-related'); click('summary');
  const summary = elements.get('modal-root').innerHTML.match(/<textarea id="summary-text"[^>]*>([\s\S]*?)<\/textarea>/)[1];
  fields.set('#summary-text', { value: summary }); click('save-summary'); assert(read().saved); assert.equal(read().submitted, false);
  fields.set('#submit-review-button', element('submit-review-button')); fields.set('#review-blockers', element('review-blockers'));
  handlers.change({ target: { id: 'review-check', checked: true } }); click('submit-review'); assert.equal(read().submitted, true);
  assert(elements.get('modal-root').innerHTML.includes('当前等待复核人处理'));
  click('close-modal'); click('home'); assert(elements.get('app').innerHTML.includes('人工检查已完成'));
});
