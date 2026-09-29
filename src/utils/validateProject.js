const { AppError } = require('../errors');
const { STATUS_VALUES } = require('../hubspot/projectSchema');
const { FIELD_MAP } = require('./projectMapper');
const { isValidDate } = require('./dates');

const RELATION_FIELDS = ['contactId', 'companyId'];
const ALLOWED_FIELDS = [...Object.keys(FIELD_MAP), ...RELATION_FIELDS];

// Accepts "Completed", "In Progress", "in-progress", "in_progress" and maps to HubSpot values
function normalizeStatus(value) {
  return String(value).trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validates and normalizes a Project payload.
 * Returns { fields, relations } where fields are Project properties (API names)
 * and relations are optional contactId / companyId to associate.
 */
function validateProjectInput(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new AppError(400, 'Request body must be a JSON object');
  }

  const errors = [];
  const fields = {};
  const relations = {};

  const unknown = Object.keys(input).filter((k) => !ALLOWED_FIELDS.includes(k));
  if (unknown.length) errors.push(`Unknown fields: ${unknown.join(', ')}`);

  if (!partial && input.projectName === undefined) errors.push('projectName is required');

  for (const key of ['projectName', 'projectId']) {
    if (input[key] === undefined) continue;
    if (!nonEmptyString(input[key])) errors.push(`${key} must be a non-empty string`);
    else fields[key] = input[key].trim();
  }

  if (input.status !== undefined) {
    const status = normalizeStatus(input.status);
    if (!STATUS_VALUES.includes(status)) errors.push(`status must be one of: ${STATUS_VALUES.join(', ')}`);
    else fields.status = status;
  }

  for (const key of ['startDate', 'endDate']) {
    if (input[key] === undefined) continue;
    if (!isValidDate(input[key])) errors.push(`${key} must be a valid date in YYYY-MM-DD format`);
    else fields[key] = input[key];
  }

  if (input.projectValue !== undefined) {
    const value = Number(input.projectValue);
    if (input.projectValue === null || input.projectValue === '' || !Number.isFinite(value) || value < 0) {
      errors.push('projectValue must be a number greater than or equal to 0');
    } else {
      fields.projectValue = value;
    }
  }

  for (const key of RELATION_FIELDS) {
    if (input[key] === undefined) continue;
    const id = String(input[key]).trim();
    if (!/^\d+$/.test(id)) errors.push(`${key} must be a numeric HubSpot record id`);
    else relations[key] = id;
  }

  if (partial && !Object.keys(fields).length && !Object.keys(relations).length && !unknown.length) {
    errors.push('Provide at least one field to update');
  }

  if (errors.length) throw new AppError(400, 'Validation failed', errors);
  return { fields, relations };
}

function assertDateOrder(startDate, endDate) {
  if (startDate && endDate && startDate > endDate) {
    throw new AppError(400, 'Validation failed', ['endDate must be on or after startDate']);
  }
}

module.exports = { validateProjectInput, assertDateOrder, normalizeStatus };
