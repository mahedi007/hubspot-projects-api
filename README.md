# HubSpot Projects API

This is a small Node.js app I built for the HubSpot API assessment. It adds a Project custom object to HubSpot and exposes a REST API to create, update, list and fetch projects. Each project can be linked to a Contact and a Company, and when a project is marked Completed, the app updates a date field on the linked Company.

I tested everything against a HubSpot developer test account, first with `npm run demo` and then with the included Postman collection. Every request came back with the expected response.

## Stack

- Node.js
- Express
- dotenv
- Native `fetch` for HubSpot calls

I deliberately didn't use the HubSpot SDK. Calling the REST endpoints directly keeps every request visible in the code, which I think makes the integration easier to review.

## Folder structure

```
src/
  index.js                    starts the server
  app.js                      Express setup and routes
  config.js                   reads environment variables
  errors.js                   AppError and HubSpotError classes
  hubspot/
    client.js                 HTTP wrapper: auth, retries, error parsing
    projectSchema.js          custom object and property definitions
    objectTypes.js            finds and caches the Project objectTypeId
  services/
    projectService.js         create, read, update, list, associate
    associationService.js     v4 associations and batch reads/updates
    automationService.js      the "project completed" rule
  routes/projects.js          REST endpoints
  middleware/errorHandler.js  turns errors into consistent JSON responses
  utils/                      validation, field mapping, date helpers
scripts/
  setup-hubspot.js            creates the custom object and company property
  demo.js                     runs the whole flow end to end
tests/                        unit tests (node:test)
postman/                      Postman collection
```

## Setting up HubSpot

Custom objects need an Enterprise subscription, so a free portal won't work. I used a free developer account and created a developer test account inside it, which comes with Enterprise features.

In the test account, create a Private App. Depending on your account, it's under **Settings > Integrations > Private Apps** or **Development > Legacy Apps**. Give it these scopes:

| Scope | Used for |
|---|---|
| `crm.schemas.custom.read` and `.write` | creating and reading the custom object schema |
| `crm.objects.custom.read` and `.write` | working with project records |
| `crm.objects.contacts.read` and `.write` | reading contacts and creating associations |
| `crm.objects.companies.read` and `.write` | reading companies and running the automation |
| `crm.schemas.companies.read` and `.write` | creating the Last Completed Project Date property |

Copy the access token. It starts with `pat-`.

## Running it

```bash
git clone <repo-url>
cd hubspot-projects-api
npm install
cp .env.example .env     # paste your token into .env
npm run setup            # creates the custom object and company property
npm start                # runs on http://localhost:3000
```

`npm run setup` is safe to run more than once. It checks what already exists and skips it.

## Scripts and tests

Besides the app itself, the repo has two helper scripts in `scripts/` and a small test file in `tests/`. None of them are needed for the server to run. I kept them because they made the project much easier to set up and check.

### `scripts/setup-hubspot.js` (`npm run setup`)

This prepares a HubSpot account for the app. It creates the Project custom object (all six properties, plus the Contact and Company associations) and the Last Completed Project Date property on Companies.

I wrote this as a script instead of creating the object by hand in HubSpot so that the setup is repeatable. Anyone reviewing this can run it against their own test account and get exactly the same object and property names. It checks what already exists before creating anything, so running it twice is harmless. Without it, the API has nothing in HubSpot to work with.

### `scripts/demo.js` (`npm run demo`)

This runs the whole workflow in one command:

1. Creates a demo contact and company
2. Creates a project linked to both
3. Marks the project Completed, which triggers the automation
4. Prints the results, including the company's updated date

I used it as a quick "is everything still working?" check whenever I changed something. It calls the service functions directly, so the server doesn't need to be running. It's optional: delete it and nothing else breaks. One thing to know is that each run creates a new contact and company, so don't run it too often in an account you care about.

### `tests/validateProject.test.js` (`npm test`)

These are seven unit tests using Node's built-in test runner, so there's nothing extra to install. They cover the code that doesn't talk to HubSpot:

- a project can't be created without a name
- status labels like "In Progress" are converted to HubSpot values (`in_progress`)
- invalid dates, unknown statuses and negative values are rejected
- the end date can't be earlier than the start date
- field names map correctly between the API and HubSpot

They need no token or internet and run in under a second. I added them because validation is the easiest part to break without noticing when you change things. The HubSpot calls themselves are covered by the demo script and the Postman collection, since those need a live account.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `HUBSPOT_ACCESS_TOKEN` | yes | your Private App token |
| `HUBSPOT_PROJECT_OBJECT_TYPE` | no | the custom object's id, e.g. `2-12345678`. `npm run setup` prints it. If you leave it empty, the app looks it up by name on the first request. |
| `PORT` | no | defaults to 3000 |

The `.env` file is in `.gitignore`, so the token never gets committed.

## How the custom object is configured

The setup script creates the object with `POST /crm/v3/schemas`. The full definition is in `src/hubspot/projectSchema.js`.

- Internal name: `project`
- Label in the HubSpot UI: **Client Project / Client Projects** (see the note below)
- Primary display property: `project_name`
- Required properties: `project_name`, `project_id`
- Associated with: Contacts, Companies

| Label | Internal name | Type | Notes |
|---|---|---|---|
| Project Name | `project_name` | text | required |
| Project ID | `project_id` | text | required and unique. If you don't send one, the app generates one like `PRJ-MUK6Y5AN` |
| Status | `project_status` | dropdown | Not Started, In Progress, On Hold, Completed, Cancelled |
| Start Date | `start_date` | date | `YYYY-MM-DD` |
| End Date | `end_date` | date | can't be earlier than Start Date |
| Project Value | `project_value` | number | can't be negative |

The setup also adds one property to Companies: **Last Completed Project Date** (`last_completed_project_date`, a date field).

### Why the label is "Client Project"

The first time I ran setup, HubSpot rejected the schema because the label "Project" was already taken. The custom schema list came back empty, so the clash wasn't with a custom object. It was with HubSpot's own built-in Projects object, which reserves that label.

I changed only the display label to "Client Project" and kept the internal name as `project`. That way nothing in the code or the API had to change, and it's still clearly the Project object the brief asks for.

## API endpoints

The API uses camelCase field names (`projectName`, `startDate`, and so on) and maps them to HubSpot property names internally. Wherever you see `:id`, it means the HubSpot record id.

| Method | Endpoint | What it does |
|---|---|---|
| GET | `/` | lists the available endpoints |
| GET | `/health` | health check |
| POST | `/api/projects` | creates a project. You can pass `contactId` and `companyId` to associate it straight away |
| GET | `/api/projects` | lists projects. Optional query params: `limit` (1 to 100, default 20), `after` (paging cursor), `status` |
| GET | `/api/projects/:id` | gets one project, including its associated contacts and companies. Add `?idProperty=project_id` to look it up by Project ID instead |
| PATCH | `/api/projects/:id` | updates any field, and can also take `contactId` or `companyId` |
| PUT | `/api/projects/:id/associations/contacts/:contactId` | associates a contact |
| PUT | `/api/projects/:id/associations/companies/:companyId` | associates a company |

Status accepts either the label or the internal value, so `"Completed"`, `"In Progress"` and `"in_progress"` all work.

### Examples

Create a project:

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "Website Redesign",
    "projectId": "PRJ-1001",
    "status": "In Progress",
    "startDate": "2026-10-01",
    "endDate": "2026-12-15",
    "projectValue": 12500,
    "contactId": "559574358746",
    "companyId": "348882834168"
  }'
```

Mark it completed:

```bash
curl -X PATCH http://localhost:3000/api/projects/<id> \
  -H "Content-Type: application/json" \
  -d '{ "status": "Completed" }'
```

Here's a real (shortened) response from my test run:

```json
{
  "id": "337225875145",
  "projectName": "Website Redesign",
  "projectId": "PRJ-MUK6Y5AN",
  "status": "completed",
  "startDate": "2026-10-01",
  "endDate": "2026-12-15",
  "projectValue": 12500,
  "contacts": [
    { "id": "559574358746", "firstName": "Demo", "lastName": "Contact", "email": "demo+1790536072676@example.com" }
  ],
  "companies": [
    { "id": "348882834168", "name": "Demo Company 1790536072676", "lastCompletedProjectDate": "2026-09-27" }
  ]
}
```

The PATCH response also includes an `automation` field that shows which companies were updated.

### Postman

Import `postman/HubSpot-Projects-API.postman_collection.json`. Then, in the collection's Variables tab, set `contactId` and `companyId` to real record ids from your portal. The "Create project" request saves the new record id automatically, so the requests after it just work.

One thing to be aware of: "Create project" uses `PRJ-1001` as the Project ID. Because that property is unique, running the collection a second time returns a 409 on that request. That's the duplicate check doing its job. Change the ID in the request body if you want to run it again.

### Errors

Every error comes back as JSON, for example:

```json
{ "error": "Validation failed", "details": ["endDate must be on or after startDate"] }
```

- **400**: bad input or invalid JSON
- **404**: project or route not found
- **409**: a project with that Project ID already exists
- **502**: something went wrong on the HubSpot side (bad token, missing scope, rate limit). The response includes a `hint`, the HubSpot status code and the `correlationId` to help debug it.

## The automation

**The rule:** when a project's status changes to Completed, set Last Completed Project Date on every company associated with it.

How it works, in `src/services/automationService.js`:

1. Before updating, the app reads the project's current status, so the rule only fires on an actual change to Completed. Saving a project that's already Completed doesn't trigger it again.
2. After the update, it fetches the associated companies through the v4 associations API.
3. It updates them in a single batch call, but only when the new date is later than the one already stored.
4. The result is returned in the response's `automation` field. If the rule fails for some reason, the project update still goes through, and the error shows up in `automation.error` instead of being swallowed.

A project that's created with status Completed triggers the rule too.

## Assumptions and decisions

- **Completion date.** I used the date the status changes to Completed, not the End Date. End Date is often a planned date, so it didn't feel like the right signal.
- **Dates are in UTC.** A project completed at 1 AM in Dhaka on Sept 28 is recorded as Sept 27, because it was still the 27th in UTC. I kept it this way for consistency, since HubSpot date properties are stored at midnight UTC.
- **The date never goes backwards.** If an older project gets closed late, it won't overwrite a newer completion date on the company.
- **Status property name.** I called it `project_status` rather than `status` to avoid clashing with anything HubSpot uses internally.
- **Project ID vs record id.** Project ID is a business-facing key, separate from HubSpot's own record id. It's unique, and the app generates one if you don't provide it.
- **Default associations.** I used the v4 `associations/default` endpoint, so there are no association labels or type ids to configure.
- **The rule lives in the app.** The brief asked for the logic in the application, so the rule runs when changes go through this API. It won't fire if someone changes the status directly in the HubSpot UI. Handling that would need a webhook subscription or a HubSpot workflow.
- **No auth on the API itself.** It's meant to run locally for review, so I didn't add any.
- **Retries.** Rate-limited requests (429) are retried with backoff. Server errors (5xx) are only retried on GET requests, so a failed POST never creates a duplicate record.

## What I'd add next

- A webhook listener, so status changes made in the HubSpot UI also trigger the rule
- Endpoints to remove associations and delete projects