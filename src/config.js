require('dotenv').config();

const config = {
  port: Number(process.env.PORT) || 3000,
  hubspot: {
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
    baseUrl: process.env.HUBSPOT_BASE_URL || 'https://api.hubapi.com',
    projectObjectType: process.env.HUBSPOT_PROJECT_OBJECT_TYPE || null,
  },
};

if (!config.hubspot.accessToken) {
  console.error('Missing HUBSPOT_ACCESS_TOKEN. Copy .env.example to .env and add your Private App token.');
  process.exit(1);
}

module.exports = config;
