const BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api`;

/**
 * Central API helper.
 * - Prepends VITE_API_BASE_URL + '/api' so every call works in dev and production.
 * - Callers should pass paths WITHOUT a leading "/api" (e.g. "/contests", not "/api/contests").
 * - Checks Content-Type before parsing JSON (guards against HTML error pages).
 * - Throws a meaningful Error on non-2xx responses.
 * - Returns {} for successful responses with no body (e.g. 204 No Content).
 */
export async function api(path, options) {
  const res = await fetch(`${BASE}${path}`, options);
  const ct  = res.headers.get('content-type') ?? '';

  if (!ct.includes('application/json')) {
    if (!res.ok) throw new Error(`Server error ${res.status}: ${res.statusText}`);
    return {};
  }

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || json.message || `Request failed (${res.status})`);
  return json;
}
