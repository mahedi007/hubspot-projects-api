const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

// HubSpot may return a date as "YYYY-MM-DD" or a full ISO timestamp; normalize to "YYYY-MM-DD".
function normalizeDate(value) {
  return value ? String(value).slice(0, 10) : null;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = { isValidDate, normalizeDate, todayUtc };
