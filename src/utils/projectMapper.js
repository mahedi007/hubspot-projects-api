const { normalizeDate } = require('./dates');

// API field name -> HubSpot internal property name
const FIELD_MAP = {
  projectName: 'project_name',
  projectId: 'project_id',
  status: 'project_status',
  startDate: 'start_date',
  endDate: 'end_date',
  projectValue: 'project_value',
};

const PROJECT_PROPERTY_NAMES = Object.values(FIELD_MAP);

const clean = (v) => (v === undefined || v === null || v === '' ? null : v);

function toHubSpotProperties(fields) {
  const properties = {};
  for (const [apiField, hsName] of Object.entries(FIELD_MAP)) {
    if (fields[apiField] !== undefined) properties[hsName] = String(fields[apiField]);
  }
  return properties;
}

function toProject(record) {
  const p = record.properties || {};
  const value = clean(p.project_value);
  return {
    id: record.id,
    projectName: clean(p.project_name),
    projectId: clean(p.project_id),
    status: clean(p.project_status),
    startDate: normalizeDate(clean(p.start_date)),
    endDate: normalizeDate(clean(p.end_date)),
    projectValue: value === null ? null : Number(value),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toContact(record) {
  const p = record.properties || {};
  return {
    id: record.id,
    firstName: clean(p.firstname),
    lastName: clean(p.lastname),
    email: clean(p.email),
    phone: clean(p.phone),
    jobTitle: clean(p.jobtitle),
  };
}

function toCompany(record) {
  const p = record.properties || {};
  return {
    id: record.id,
    name: clean(p.name),
    domain: clean(p.domain),
    city: clean(p.city),
    country: clean(p.country),
    lastCompletedProjectDate: normalizeDate(clean(p.last_completed_project_date)),
  };
}

module.exports = { FIELD_MAP, PROJECT_PROPERTY_NAMES, toHubSpotProperties, toProject, toContact, toCompany };
