const config = require('./config');
const app = require('./app');

app.listen(config.port, (err) => {
  if (err) {
    console.error(`Failed to start on port ${config.port}: ${err.message}`);
    process.exit(1);
  }
  console.log(`HubSpot Projects API running on http://localhost:${config.port}`);
});