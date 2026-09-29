const test = require('node:test');
const assert = require('node:assert/strict');
const { validateProjectInput, assertDateOrder } = require('../src/utils/validateProject');
const { toHubSpotProperties, toProject } = require('../src/utils/projectMapper');

test('create requires projectName', () => {
  assert.throws(() => validateProjectInput({}, { partial: false }), /Validation failed/);
});

test('normalizes status labels to HubSpot values', () => {
  const { fields } = validateProjectInput({ projectName: 'X', status: 'In Progress' });
  assert.equal(fields.status, 'in_progress');
  assert.equal(validateProjectInput({ status: 'Completed' }, { partial: true }).fields.status, 'completed');
});

test('rejects invalid status, dates and value', () => {
  try {
    validateProjectInput({ projectName: 'X', status: 'done', startDate: '2026-02-30', projectValue: -5 });
    assert.fail('should throw');
  } catch (err) {
    assert.equal(err.status, 400);
    assert.equal(err.details.length, 3);
  }
});

test('rejects unknown fields and empty updates', () => {
  assert.throws(() => validateProjectInput({ foo: 1 }, { partial: true }), /Validation failed/);
  assert.throws(() => validateProjectInput({}, { partial: true }), /Validation failed/);
});

test('separates association ids from properties', () => {
  const { fields, relations } = validateProjectInput({ projectName: 'X', contactId: '101', companyId: 202 });
  assert.deepEqual(relations, { contactId: '101', companyId: '202' });
  assert.equal(fields.contactId, undefined);
});

test('end date must not be before start date', () => {
  assert.throws(() => assertDateOrder('2026-05-01', '2026-04-01'), /Validation failed/);
  assert.doesNotThrow(() => assertDateOrder('2026-04-01', '2026-05-01'));
});

test('maps between API fields and HubSpot properties', () => {
  assert.deepEqual(toHubSpotProperties({ projectName: 'X', projectValue: 100 }), { project_name: 'X', project_value: '100' });
  const p = toProject({ id: '1', properties: { project_name: 'X', project_value: '100', end_date: '2026-01-01T00:00:00Z', start_date: '' } });
  assert.equal(p.projectValue, 100);
  assert.equal(p.endDate, '2026-01-01');
  assert.equal(p.startDate, null);
});
