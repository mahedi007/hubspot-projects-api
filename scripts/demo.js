/**
 * End-to-end demo of the full workflow against your HubSpot test account:
 * create Contact + Company, create Project with associations, mark it Completed,
 * then confirm the automation updated the Company.
 */
const hubspot = require('../src/hubspot/client');
const projectService = require('../src/services/projectService');

const log = (label, data) => console.log(`\n=== ${label} ===\n${JSON.stringify(data, null, 2)}`);

(async () => {
  try {
    const stamp = Date.now();
    const contact = await hubspot.post('/crm/v3/objects/contacts', {
      properties: { email: `demo+${stamp}@example.com`, firstname: 'Demo', lastname: 'Contact' },
    });
    const company = await hubspot.post('/crm/v3/objects/companies', {
      properties: { name: `Demo Company ${stamp}`, domain: `demo-${stamp}.example.com` },
    });
    log('Created contact and company', { contactId: contact.id, companyId: company.id });

    const created = await projectService.createProject({
      projectName: 'Website Redesign',
      status: 'In Progress',
      startDate: '2026-10-01',
      endDate: '2026-12-15',
      projectValue: 12500,
      contactId: contact.id,
      companyId: company.id,
    });
    log('Created project', created);

    const updated = await projectService.updateProject(created.id, { status: 'Completed' });
    log('Automation result', updated.automation);
    log('Company after automation', updated.companies);

    const list = await projectService.listProjects({ limit: 5 });
    log('Latest projects', list);
  } catch (err) {
    console.error(`Demo failed: ${err.message}`);
    if (err.details || err.body) console.error(JSON.stringify(err.details || err.body, null, 2));
    process.exit(1);
  }
})();
