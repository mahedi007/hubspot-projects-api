const config = require('../config');
const { HubSpotError } = require('../errors');

const MAX_RETRIES = 3;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(method, path, { body, query } = {}, attempt = 0) {
  const url = new URL(path, config.hubspot.baseUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value));
    }
  }

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${config.hubspot.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new HubSpotError(503, `Could not reach HubSpot: ${err.message}`);
  }

  const retryable = res.status === 429 || (res.status >= 500 && method === 'GET');
  if (retryable && attempt < MAX_RETRIES) {
    const retryAfter = Number(res.headers.get('retry-after'));
    await sleep(retryAfter ? retryAfter * 1000 : 500 * 2 ** attempt);
    return request(method, path, { body, query }, attempt + 1);
  }

  if (res.status === 204) return null;

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!res.ok) {
    throw new HubSpotError(res.status, data?.message || `HubSpot request failed with status ${res.status}`, data);
  }
  return data;
}

module.exports = {
  get: (path, query) => request('GET', path, { query }),
  post: (path, body, query) => request('POST', path, { body, query }),
  patch: (path, body) => request('PATCH', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  delete: (path) => request('DELETE', path),
};
