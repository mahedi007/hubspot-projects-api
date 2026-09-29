const { LAST_COMPLETED_PROJECT_DATE } = require('../hubspot/projectSchema');
const { getAssociatedIds, batchRead, batchUpdate } = require('./associationService');
const { normalizeDate, todayUtc } = require('../utils/dates');

const RULE_NAME = 'project_completed_updates_company';

/**
 * Business rule: when a Project moves to "completed", set
 * last_completed_project_date on every associated Company.
 *
 * The completion date is today's date (UTC). A Company is only updated if the new
 * date is later than its current value, so an older project being closed late
 * never moves the date backwards.
 */
async function onProjectCompleted(projectObjectType, projectRecordId) {
  const completedDate = todayUtc();
  const result = { rule: RULE_NAME, completedDate, updatedCompanyIds: [], skippedCompanyIds: [] };

  const companyIds = await getAssociatedIds(projectObjectType, projectRecordId, 'companies');
  if (!companyIds.length) {
    result.note = 'No associated companies to update';
    return result;
  }

  const companies = await batchRead('companies', companyIds, [LAST_COMPLETED_PROJECT_DATE]);
  const toUpdate = [];
  for (const company of companies) {
    const current = normalizeDate(company.properties?.[LAST_COMPLETED_PROJECT_DATE]);
    if (!current || current < completedDate) toUpdate.push(company.id);
    else result.skippedCompanyIds.push(company.id);
  }

  if (toUpdate.length) {
    await batchUpdate(
      'companies',
      toUpdate.map((id) => ({ id, properties: { [LAST_COMPLETED_PROJECT_DATE]: completedDate } }))
    );
  }
  result.updatedCompanyIds = toUpdate;
  return result;
}

module.exports = { onProjectCompleted, RULE_NAME };
