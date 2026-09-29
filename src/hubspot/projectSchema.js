// Single source of truth for the Project custom object and related properties.

const PROJECT_OBJECT_NAME = 'project';

const STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const STATUS_OPTIONS = [
  { label: 'Not Started', value: STATUS.NOT_STARTED, displayOrder: 0 },
  { label: 'In Progress', value: STATUS.IN_PROGRESS, displayOrder: 1 },
  { label: 'On Hold', value: STATUS.ON_HOLD, displayOrder: 2 },
  { label: 'Completed', value: STATUS.COMPLETED, displayOrder: 3 },
  { label: 'Cancelled', value: STATUS.CANCELLED, displayOrder: 4 },
];

const projectSchema = {
  name: PROJECT_OBJECT_NAME,
  description: 'Client projects managed through the HubSpot Projects API app',
  labels: { singular: 'Client Project', plural: 'Client Projects' },
  primaryDisplayProperty: 'project_name',
  secondaryDisplayProperties: ['project_id', 'project_status'],
  searchableProperties: ['project_name', 'project_id'],
  requiredProperties: ['project_name', 'project_id'],
  properties: [
    { name: 'project_name', label: 'Project Name', type: 'string', fieldType: 'text' },
    { name: 'project_id', label: 'Project ID', type: 'string', fieldType: 'text', hasUniqueValue: true },
    { name: 'project_status', label: 'Status', type: 'enumeration', fieldType: 'select', options: STATUS_OPTIONS },
    { name: 'start_date', label: 'Start Date', type: 'date', fieldType: 'date' },
    { name: 'end_date', label: 'End Date', type: 'date', fieldType: 'date' },
    { name: 'project_value', label: 'Project Value', type: 'number', fieldType: 'number' },
  ],
  associatedObjects: ['CONTACT', 'COMPANY'],
};

// Company property written by the automation rule
const LAST_COMPLETED_PROJECT_DATE = 'last_completed_project_date';

const companyLastCompletedProperty = {
  name: LAST_COMPLETED_PROJECT_DATE,
  label: 'Last Completed Project Date',
  description: 'Set automatically when an associated Project is marked Completed',
  type: 'date',
  fieldType: 'date',
  groupName: 'companyinformation',
};

module.exports = {
  PROJECT_OBJECT_NAME,
  STATUS,
  STATUS_VALUES: Object.values(STATUS),
  projectSchema,
  LAST_COMPLETED_PROJECT_DATE,
  companyLastCompletedProperty,
};
