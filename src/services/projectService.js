const hubspot = require('../hubspot/client');
const { getProjectObjectType } = require('../hubspot/objectTypes');
const { STATUS, LAST_COMPLETED_PROJECT_DATE } = require('../hubspot/projectSchema');
const { AppError } = require('../errors');
const { validateProjectInput, assertDateOrder } = require('../utils/validateProject');
const { PROJECT_PROPERTY_NAMES, toHubSpotProperties, toProject, toContact, toCompany } = require('../utils/projectMapper');
const { associate, getAssociatedIds, batchRead } = require('./associationService');
const { onProjectCompleted, RULE_NAME } = require('./automationService');

const CONTACT_PROPERTIES = ['firstname', 'lastname', 'email', 'phone', 'jobtitle'];
const COMPANY_PROPERTIES = ['name', 'domain', 'city', 'country', LAST_COMPLETED_PROJECT_DATE];
const ASSOCIATION_TARGETS = ['contacts', 'companies'];
const ID_PROPERTIES = ['project_id'];

function generateProjectId() {
  return `PRJ-${Date.now().toString(36).toUpperCase()}`;
}

async function linkRelations(projectType, recordId, relations) {
  const tasks = [];
  if (relations.contactId) tasks.push(associate(projectType, recordId, 'contacts', relations.contactId));
  if (relations.companyId) tasks.push(associate(projectType, recordId, 'companies', relations.companyId));
  await Promise.all(tasks);
}

// Runs the completion rule. A failure here does not undo the project change;
// it is reported back in the response so the caller can see what happened.
async function runCompletionRule(projectType, recordId) {
  try {
    return await onProjectCompleted(projectType, recordId);
  } catch (err) {
    console.error(`[automation] ${RULE_NAME} failed for project ${recordId}:`, err.message);
    return { rule: RULE_NAME, error: err.message };
  }
}

async function createProject(input) {
  const { fields, relations } = validateProjectInput(input, { partial: false });
  if (!fields.projectId) fields.projectId = generateProjectId();
  if (!fields.status) fields.status = STATUS.NOT_STARTED;
  assertDateOrder(fields.startDate, fields.endDate);

  const type = await getProjectObjectType();
  const record = await hubspot.post(`/crm/v3/objects/${type}`, { properties: toHubSpotProperties(fields) });

  await linkRelations(type, record.id, relations);

  // A project created directly as Completed also triggers the rule
  const automation = fields.status === STATUS.COMPLETED ? await runCompletionRule(type, record.id) : null;

  const project = await getProject(record.id);
  return { ...project, automation };
}

async function getProject(id, { idProperty } = {}) {
  if (idProperty && !ID_PROPERTIES.includes(idProperty)) {
    throw new AppError(400, `idProperty must be one of: ${ID_PROPERTIES.join(', ')}`);
  }
  const type = await getProjectObjectType();
  const record = await hubspot.get(`/crm/v3/objects/${type}/${encodeURIComponent(id)}`, {
    properties: PROJECT_PROPERTY_NAMES,
    idProperty,
  });

  const [contactIds, companyIds] = await Promise.all([
    getAssociatedIds(type, record.id, 'contacts'),
    getAssociatedIds(type, record.id, 'companies'),
  ]);
  const [contacts, companies] = await Promise.all([
    batchRead('contacts', contactIds, CONTACT_PROPERTIES),
    batchRead('companies', companyIds, COMPANY_PROPERTIES),
  ]);

  return {
    ...toProject(record),
    contacts: contacts.map(toContact),
    companies: companies.map(toCompany),
  };
}

async function listProjects({ limit, after, status } = {}) {
  const type = await getProjectObjectType();
  const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);

  let data;
  if (status) {
    const { fields } = validateProjectInput({ status }, { partial: true });
    data = await hubspot.post(`/crm/v3/objects/${type}/search`, {
      filterGroups: [{ filters: [{ propertyName: 'project_status', operator: 'EQ', value: fields.status }] }],
      properties: PROJECT_PROPERTY_NAMES,
      sorts: [{ propertyName: 'hs_lastmodifieddate', direction: 'DESCENDING' }],
      limit: pageSize,
      after,
    });
  } else {
    data = await hubspot.get(`/crm/v3/objects/${type}`, { properties: PROJECT_PROPERTY_NAMES, limit: pageSize, after });
  }

  return {
    results: (data.results || []).map(toProject),
    total: data.total,
    paging: { nextAfter: data.paging?.next?.after || null },
  };
}

async function updateProject(id, input) {
  const { fields, relations } = validateProjectInput(input, { partial: true });
  const type = await getProjectObjectType();

  // Read the current state first so we can detect a status transition
  const existing = await hubspot.get(`/crm/v3/objects/${type}/${encodeURIComponent(id)}`, { properties: PROJECT_PROPERTY_NAMES });
  const before = toProject(existing);
  assertDateOrder(fields.startDate ?? before.startDate, fields.endDate ?? before.endDate);

  let updated = existing;
  if (Object.keys(fields).length) {
    updated = await hubspot.patch(`/crm/v3/objects/${type}/${existing.id}`, { properties: toHubSpotProperties(fields) });
  }
  await linkRelations(type, existing.id, relations);

  const afterUpdate = toProject(updated);
  const becameCompleted = before.status !== STATUS.COMPLETED && afterUpdate.status === STATUS.COMPLETED;
  const automation = becameCompleted ? await runCompletionRule(type, existing.id) : null;

  const project = await getProject(existing.id);
  return { ...project, automation };
}

async function associateProject(id, toType, toId) {
  if (!ASSOCIATION_TARGETS.includes(toType)) {
    throw new AppError(400, `Association target must be one of: ${ASSOCIATION_TARGETS.join(', ')}`);
  }
  if (!/^\d+$/.test(String(toId))) throw new AppError(400, 'Target id must be a numeric HubSpot record id');

  const type = await getProjectObjectType();
  await associate(type, id, toType, toId);
  return getProject(id);
}

module.exports = { createProject, getProject, listProjects, updateProject, associateProject };
