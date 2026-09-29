const { AppError, HubSpotError } = require('../errors');

function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }

  if (err instanceof HubSpotError) {
    const passThrough = err.status >= 400 && err.status < 500 && ![401, 403, 429].includes(err.status);
    const hints = {
      401: 'HubSpot rejected the access token. Check HUBSPOT_ACCESS_TOKEN.',
      403: 'The Private App is missing a required scope. See README > Private App scopes.',
      429: 'HubSpot rate limit reached. Try again shortly.',
    };
    return res.status(passThrough ? err.status : 502).json({
      error: err.message,
      source: 'hubspot',
      hubspotStatus: err.status,
      hint: hints[err.status],
      category: err.body?.category,
      correlationId: err.body?.correlationId,
    });
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = { notFound, errorHandler };
