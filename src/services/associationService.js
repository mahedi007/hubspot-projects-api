const hubspot = require('../hubspot/client');

const BATCH_LIMIT = 100;

const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

/**
 * Creates the default (unlabeled) association between two records.
 * Uses the v4 "default" endpoint so we do not need to look up association type ids.
 */
async function associate(fromType, fromId, toType, toId) {
  return hubspot.put(`/crm/v4/objects/${fromType}/${fromId}/associations/default/${toType}/${toId}`);
}

/** Returns all record ids of toType associated with the given record (handles paging). */
async function getAssociatedIds(fromType, fromId, toType) {
  const ids = [];
  let after;
  do {
    const data = await hubspot.get(`/crm/v4/objects/${fromType}/${fromId}/associations/${toType}`, { limit: 500, after });
    ids.push(...(data.results || []).map((r) => String(r.toObjectId)));
    after = data.paging?.next?.after;
  } while (after);
  return ids;
}

/** Batch reads records by id, in chunks of 100 (HubSpot batch limit). */
async function batchRead(objectType, ids, properties) {
  if (!ids.length) return [];
  const results = [];
  for (const group of chunk(ids, BATCH_LIMIT)) {
    const data = await hubspot.post(`/crm/v3/objects/${objectType}/batch/read`, {
      properties,
      inputs: group.map((id) => ({ id })),
    });
    results.push(...(data.results || []));
  }
  return results;
}

/** Batch updates records, in chunks of 100. inputs: [{ id, properties }] */
async function batchUpdate(objectType, inputs) {
  for (const group of chunk(inputs, BATCH_LIMIT)) {
    await hubspot.post(`/crm/v3/objects/${objectType}/batch/update`, { inputs: group });
  }
}

module.exports = { associate, getAssociatedIds, batchRead, batchUpdate };
