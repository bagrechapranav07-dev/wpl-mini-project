/**
 * TechNest - Backend API helpers
 * All store data (catalogue, orders, contact messages, repair bookings) lives in MongoDB
 * behind the Express backend in /backend.
 */

// Same origin when the site is served by the backend, otherwise point at the local backend
const API_BASE = location.port === "5000" ? "/api" : "http://localhost:5000/api";

async function apiRequest(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// Blocking GET used only to load the catalogue before the page scripts render it.
// Returns null if the backend is unreachable.
function apiGetSync(path) {
  try {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", API_BASE + path, false);
    xhr.send();
    return xhr.status === 200 ? JSON.parse(xhr.responseText) : null;
  } catch (e) {
    console.warn("Backend unreachable:", e);
    return null;
  }
}

// Map a MongoDB product document onto the shape the storefront uses (numeric `id`)
function fromApiProduct(doc) {
  return { ...doc, id: doc.productId };
}

// Clear data the old localStorage-only version of the site left behind
(function clearLegacyLocalData() {
  try {
    ["technest_admin_orders", "technest_admin_messages", "technest_admin_repairs",
     "technest_price_overrides", "technest_deleted_laptops", "technest_custom_laptops",
     "technest_image_overrides"].forEach(key => localStorage.removeItem(key));
  } catch (e) {}
})();
