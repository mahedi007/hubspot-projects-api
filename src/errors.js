// Errors raised by our own validation / business logic
class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
  }
}

// Errors returned by the HubSpot API
class HubSpotError extends Error {
  constructor(status, message, body) {
    super(message);
    this.name = 'HubSpotError';
    this.status = status;
    this.body = body;
  }
}

module.exports = { AppError, HubSpotError };
