/**
 * One-time, idempotent setup:
 *  1. Creates the "Project" custom object (with properties and Contact/Company associations)
 *  2. Creates the "Last Completed Project Date" property on Companies
 * Safe to run more than once; existing items are skipped.
 */
const hubspot = require('../src/hubspot/client');
const { projectSchema, companyLastCompletedProperty } = require('../src/hubspot/projectSchema');

async function ensureProjectSchema() {
  const { results } = await hubspot.get('/crm/v3/schemas');
  const existing = results.find((s) => s.name === projectSchema.name);
  if (existing) {
    console.log(`Project custom object already exists (objectTypeId: ${existing.objectTypeId})`);
    return existing.objectTypeId;
  }
  const created = await hubspot.post('/crm/v3/schemas', projectSchema);
  console.log(`Created Project custom object (objectTypeId: ${created.objectTypeId})`);
  return created.objectTypeId;
}

async function ensureCompanyProperty() {
  const { name } = companyLastCompletedProperty;
  try {
    await hubspot.get(`/crm/v3/properties/companies/${name}`);
    console.log(`Company property "${name}" already exists`);
  } catch (err) {
    if (err.status !== 404) throw err;
    await hubspot.post('/crm/v3/properties/companies', companyLastCompletedProperty);
    console.log(`Created Company property "${name}"`);
  }
}

(async () => {
  try {
    const objectTypeId = await ensureProjectSchema();
    await ensureCompanyProperty();
    console.log(`\nSetup complete. Optional: add HUBSPOT_PROJECT_OBJECT_TYPE=${objectTypeId} to .env`);
  } catch (err) {
    console.error(`Setup failed: ${err.message}`);
    if (err.body) console.error(JSON.stringify(err.body, null, 2));
    process.exit(1);
  }
})();
