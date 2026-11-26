import test from 'node:test';
import assert from 'node:assert/strict';
import { caseData } from '../case.js';
import { createState, applyAction, buildSummary, getReviewBlockers, snapshotForStorage } from './model.js';

const at = '2026-11-03 09:30:00';
function fixture() {
  let state = createState();
  return { get state() { return state; }, run(action, payload = {}) { const result = applyAction(state, action, { at, ...payload }); state = result.state; return result; } };
}
function confirmAll(f) {
  assert.equal(f.run('EDIT_FIELD', { field: 'tenant', value: caseData.tenant }).error, undefined);
  for (const field of ['event', 'deadline', 'amount']) assert.equal(f.run('CONFIRM_FIELD', { field }).error, undefined);
}
function saveCurrent(f) {
  f.run('SET_SUMMARY', { text: buildSummary(f.state), refreshed: true });
  assert.equal(f.run('SAVE_SUMMARY').error, undefined);
}
function ready() { const f = fixture(); confirmAll(f); f.run('SET_RELATION', { relation: 'deferred' }); saveCurrent(f); return f; }

test('a new sample has empty fields and an observable extraction lifecycle', () => {
  const f = fixture();
  f.run('START_READ');
  assert.equal(f.state.phase, 'initial');
  assert(Object.values(f.state.fields).every(field => field.value === '' && field.status === 'pending'));
  assert(f.run('CONFIRM_FIELD', { field: 'amount' }).error);
  assert(f.run('FINISH_ANALYSIS').error);
  f.run('BEGIN_ANALYSIS'); assert.equal(f.state.phase, 'analyzing');
  f.run('FINISH_ANALYSIS'); assert.equal(f.state.phase, 'extracted');
  assert.equal(f.state.fields.tenant.value, caseData.aiTenant);
  assert.equal(f.state.fields.tenant.lowConfidence, true);
  assert(Object.values(f.state.fields).every(field => field.status === 'pending'));
});

test('the known AI name error cannot be confirmed and correction keeps the original intact', () => {
  const original = JSON.stringify(caseData), f = fixture();
  assert(f.run('CONFIRM_FIELD', { field: 'tenant' }).error);
  assert.equal(f.state.fields.tenant.status, 'pending');
  assert(f.run('EDIT_FIELD', { field: 'tenant', value: '另一个单位' }).error);
  assert.equal(f.state.fields.tenant.value, caseData.aiTenant);
  f.run('EDIT_FIELD', { field: 'tenant', value: `${caseData.tenant}（虚构）` });
  assert.equal(f.state.fields.tenant.status, 'confirmed');
  assert.equal(f.state.fields.tenant.aiValue, caseData.aiTenant);
  assert.equal(f.state.fields.tenant.revisions[0].before, caseData.aiTenant);
  assert.equal(JSON.stringify(caseData), original);
});

test('a partial draft can be saved, while unconfirmed fields and relation block submission', () => {
  const f = fixture(); saveCurrent(f);
  assert(f.state.saved);
  assert.equal(f.state.submitted, false);
  assert(f.run('SUBMIT_REVIEW', { checked: true }).error);
  assert(getReviewBlockers(f.state).some(value => value.includes('人工确认')));
  confirmAll(f); saveCurrent(f);
  assert(f.run('SUBMIT_REVIEW', { checked: true }).error);
  assert(getReviewBlockers(f.state).some(value => value.includes('关联判断')));
});

test('a clean current draft requires a separate explicit human check before submission', () => {
  const f = ready();
  assert.deepEqual(getReviewBlockers(f.state), []);
  for (const checked of [undefined, false, 'true']) assert(f.run('SUBMIT_REVIEW', { checked }).error);
  assert.equal(f.state.submitted, false);
  assert.equal(f.run('SUBMIT_REVIEW', { checked: true }).error, undefined);
  assert.equal(f.state.submitted, true);
  assert.equal(f.state.submittedAt, at);
  assert.equal(f.state.events.at(-1).action, 'SUBMIT_REVIEW');
  assert.match(f.state.events.at(-1).detail, /等待复核人/);
  assert.equal(f.state.taskId, undefined);
});

test('field or relation changes invalidate submission and an old summary cannot be saved unchanged', () => {
  const f = ready(); f.run('SUBMIT_REVIEW', { checked: true });
  const saved = JSON.stringify(f.state.saved);
  f.run('SET_RELATION', { relation: 'linked' });
  assert.equal(f.state.submitted, false);
  assert.equal(f.state.dirty, true);
  assert.equal(f.state.summaryStale, true);
  assert.equal(JSON.stringify(f.state.saved), saved);
  f.run('SET_SUMMARY', { text: f.state.summary }); // A save handler re-sending old text is not a review.
  assert.equal(f.state.summaryStale, true);
  assert(f.run('SAVE_SUMMARY').error);
  assert(f.run('SUBMIT_REVIEW', { checked: true }).error);
  saveCurrent(f);
  assert.equal(f.state.summaryStale, false);
  assert.match(f.state.summary, /已人工关联/);
  assert.equal(f.run('SUBMIT_REVIEW', { checked: true }).error, undefined);
});

test('saving before correcting the AI error cannot leave the old wrong name in an accepted draft', () => {
  const f = fixture(); saveCurrent(f);
  assert(f.state.saved.summary.includes(caseData.aiTenant));
  confirmAll(f); f.run('SET_RELATION', { relation: 'separate' });
  assert.equal(f.state.summaryStale, true);
  assert(f.run('SAVE_SUMMARY').error);
  saveCurrent(f);
  assert(!f.state.saved.summary.includes(caseData.aiTenant));
  assert(f.state.saved.summary.includes(caseData.tenant));
  assert.match(f.state.saved.summary, /暂不关联/);
  assert.equal(f.run('SUBMIT_REVIEW', { checked: true }).error, undefined);
});

test('editing a saved summary preserves the snapshot and requires a new save', () => {
  const f = ready(), old = f.state.saved.summary;
  f.run('SET_SUMMARY', { text: old + '\n人工补充：待核对完整流水。' });
  assert.equal(f.state.saved.summary, old);
  assert(f.run('SUBMIT_REVIEW', { checked: true }).error);
  f.run('SAVE_SUMMARY'); assert.equal(f.state.dirty, false);
  assert.equal(f.run('SUBMIT_REVIEW', { checked: true }).error, undefined);
});

test('empty edits, invalid fields, source keys and unknown actions preserve state', () => {
  const f = ready();
  for (const [action, payload] of [['EDIT_FIELD', { field: 'tenant', value: ' ' }], ['EDIT_FIELD', { field: 'other', value: 'x' }], ['SET_RELATION', { relation: 'automatic' }], ['OPEN_SOURCE', { source: 'missing' }], ['UNKNOWN', {}]]) {
    const before = JSON.stringify(f.state);
    assert(f.run(action, payload).error);
    assert.equal(JSON.stringify(f.state), before);
  }
  f.run('SET_SUMMARY', { text: ' ' });
  assert(f.run('SAVE_SUMMARY').error);
});

test('navigation and viewing evidence do not dirty an accepted draft; storage snapshots are independent', () => {
  const f = ready(); f.run('SUBMIT_REVIEW', { checked: true });
  f.run('OPEN_SOURCE', { source: 'receipt' }); f.run('VIEW', { view: 'home' });
  assert.equal(f.state.dirty, false); assert.equal(f.state.submitted, true);
  const snapshot = snapshotForStorage(f.state);
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), f.state);
  snapshot.fields.tenant.value = 'changed outside';
  assert.equal(f.state.fields.tenant.value, caseData.tenant);
  f.run('RESET');
  assert.equal(f.state.saved, null); assert.equal(f.state.events.length, 0);
  assert.equal(f.state.fields.tenant.value, caseData.aiTenant);
});
