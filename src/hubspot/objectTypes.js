const config = require('../config');
const hubspot = require('./client');
const { AppError } = require('../errors');
const { PROJECT_OBJECT_NAME } = require('./projectSchema');

let cachedProjectType = config.hubspot.projectObjectType;

async function getProjectObjectType() {
  if (cachedProjectType) return cachedProjectType;

  const { results } = await hubspot.get('/crm/v3/schemas');
  const schema = results.find((s) => s.name === PROJECT_OBJECT_NAME);
  if (!schema) {
    throw new AppError(500, 'Project custom object not found in HubSpot. Run "npm run setup" first.');
  }
  cachedProjectType = schema.objectTypeId;
  return cachedProjectType;
}

module.exports = { getProjectObjectType };
