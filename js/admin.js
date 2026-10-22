/**
 * TechNest - Admin Portal Logic & Response Management Engine
 * Manages Admin Auth state and displays all customer responses (Orders, Contact Inquiries, Service Requests).
 * All data is read from and written to MongoDB through the backend API (js/api.js).
 */

const ADMIN_AUTH_KEY = "technest_admin_auth";

// Responses loaded from the backend when the dashboard opens
let adminOrders = [];
let adminMessages = [];
let adminRepairs = [];

function formatAdminDate(isoDate) {
  return isoDate ? new Date(isoDate).toLocaleString("en-IN") : "";
}

function formatShippingAddress(a) {
  if (!a) return "N/A";
  return `${a.address}, ${a.city}, ${a.state} - ${a.pincode}`;
}

// Check admin authentication
function isAdminLoggedIn() {
  return localStorage.getItem(ADMIN_AUTH_KEY) === "true";
}

// Perform Login (verified against the Admin collection in MongoDB)
async function performAdminLogin(username, password) {
  try {
    await apiRequest("/admin/login", { method: "POST", body: { username, password } });
    localStorage.setItem(ADMIN_AUTH_KEY, "true");
    return true;
  } catch (e) {
    return false;
  }
}

// Perform Logout
function performAdminLogout() {
  localStorage.removeItem(ADMIN_AUTH_KEY);
  window.location.href = "admin-login.html";
}

// Save a new customer order to the backend
function saveCustomerOrder(orderData) {
  return apiRequest("/orders", { method: "POST", body: orderData });
}

// Save a contact message to the backend
function saveContactMessage(msgData) {
  return apiRequest("/contact", { method: "POST", body: msgData });
}

// Save a repair booking to the backend
function saveRepairBooking(repairData) {
  return apiRequest("/repairs", { method: "POST", body: repairData });
}

// Dashboard rendering controller
async function setupAdminDashboard() {
  if (!document.getElementById("adminDashboardView")) return;

  // Route protection
  if (!isAdminLoggedIn()) {
    window.location.href = "admin-login.html";
    return;
  }

  renderAdminLaptopPricingTable();
  renderAdminDeletedLaptopsTable();

  try {
    [adminOrders, adminMessages, adminRepairs] = await Promise.all([
      apiRequest("/orders"),
      apiRequest("/contact"),
      apiRequest("/repairs")
    ]);
  } catch (e) {
    alert("Could not reach the backend. Make sure it is running (cd backend && npm start).");
  }

  renderAdminMetrics();
  renderAdminOrdersTable();
  renderAdminMessagesTable();
  renderAdminRepairsTable();
}

/**
 * Laptop Pricing, Discount & Catalogue Management
 * Every change is saved to MongoDB, so it is live on the home page, catalogue, cart and
 * checkout for every visitor.
 */
const ADMIN_IMG_PLACEHOLDER = "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=100&q=60";

// Save fields of a laptop to the backend and mirror them onto the in-memory copy
async function updateLaptopInStore(laptopId, fields) {
  const updated = fromApiProduct(await apiRequest(`/laptops/${laptopId}`, { method: "PATCH", body: fields }));
  const laptop = LAPTOPS.find(l => l.id === laptopId);
  if (laptop) Object.assign(laptop, updated);
  return updated;
}

/**
 * Add a brand-new laptop from the "Add New Laptop" form.
 * The backend gives it an id >= 1000 (so it never collides with the seed catalogue).
 */
function addNewLaptopToStore(event) {
  event.preventDefault();
  const form = event.target;
  const val = (name) => (form.querySelector(`[name="${name}"]`)?.value || "").trim();

  const name = val("name");
  const brand = val("brand");
  const processor = val("processor");
  const ramNum = Number(val("ram"));
  const storageNum = Number(val("storage"));
  const price = Math.round(Number(val("price")));
  const originalPrice = Math.round(Number(val("originalPrice"))) || price;
  const category = val("category") || "Business";

  if (!name || !brand || !processor || !ramNum || !storageNum || !price) {
    alert("Please fill in Name, Brand, Processor, RAM, Storage and Price.");
    return;
  }

  const newLaptop = {
    name,
    brand,
    processor,
    processorSeries: processor,
    ram: `${ramNum}GB RAM`,
    ramNum,
    storage: `${storageNum}GB SSD`,
    storageNum,
    price,
    originalPrice: originalPrice < price ? price : originalPrice,
    rating: 4.5,
    reviewsCount: 0,
    category,
    displaySize: val("displaySize") || '15.6"',
    os: val("os") || "Windows 11",
    badge: val("badge") || "New Arrival",
    description: val("description") || `${brand} ${name} — the newest addition to the TechNest lineup.`
  };

  const finish = async (imageUrl) => {
    if (imageUrl) newLaptop.image = imageUrl;
    try {
      const saved = fromApiProduct(await apiRequest("/laptops", { method: "POST", body: newLaptop }));
      LAPTOPS.push(saved);
      renderAdminLaptopPricingTable();
      form.reset();
      const prev = document.getElementById("newLapPrevImg");
      if (prev && prev.dataset.default) prev.src = prev.dataset.default;
      showToastNotification(`"${saved.name}" added — now live on the home page, catalogue and 3D viewer.`);
    } catch (e) {
      alert(`Couldn't add the laptop: ${e.message}`);
    }
  };

  const file = form.querySelector('[name="imageFile"]')?.files?.[0];
  const pastedUrl = val("imageUrl");
  if (file) {
    if (!file.type.startsWith("image/")) { alert("Please choose an image file."); return; }
    if (file.size > 1.5 * 1024 * 1024) { alert("Please choose an image under 1.5MB."); return; }
    const reader = new FileReader();
    reader.onload = () => finish(reader.result);
    reader.readAsDataURL(file);
  } else {
    finish(pastedUrl);
  }
}

// Set a laptop's image by pasting a URL (e.g. a direct link to a product photo)
function setLaptopImageFromUrl(laptopId) {
  const laptop = LAPTOPS.find(l => l.id === laptopId);
  const current = (laptop && laptop.image) || "";
  const url = prompt(`Paste an image URL for "${laptop ? laptop.name : "this laptop"}":`, current.startsWith("data:") ? "" : current);
  if (url === null) return; // cancelled
  if (!url.trim()) {
    clearLaptopImageOverride(laptopId);
    return;
  }
  saveLaptopImageOverride(laptopId, url.trim());
}

// Set a laptop's image by uploading a photo from this device (stored as a data URL)
function handleLaptopImageUpload(laptopId, inputEl) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please choose an image file.");
    inputEl.value = "";
    return;
  }
  if (file.size > 1.5 * 1024 * 1024) {
    alert("Please choose an image under 1.5MB.");
    inputEl.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => saveLaptopImageOverride(laptopId, reader.result);
  reader.readAsDataURL(file);
}

async function saveLaptopImageOverride(laptopId, imageUrl) {
  try {
    const laptop = await updateLaptopInStore(laptopId, { image: imageUrl });
    renderAdminLaptopPricingTable();
    showToastNotification(`Image updated for "${laptop.name}" — now live on the storefront.`);
  } catch (e) {
    alert(`Couldn't save this image: ${e.message}`);
  }
}

async function clearLaptopImageOverride(laptopId) {
  try {
    await updateLaptopInStore(laptopId, { image: null });
    renderAdminLaptopPricingTable();
    showToastNotification("Custom image removed — back to the default photo.");
  } catch (e) {
    alert(`Couldn't remove the image: ${e.message}`);
  }
}

function renderAdminLaptopPricingTable() {
  const container = document.getElementById("adminLaptopPricingTableBody");
  if (!container || typeof LAPTOPS === "undefined") return;

  container.innerHTML = LAPTOPS.map(laptop => {
    const discountPct = laptop.originalPrice
      ? Math.max(0, Math.round(((laptop.originalPrice - laptop.price) / laptop.originalPrice) * 100))
      : 0;
    const hasCustomImage = !!laptop.image;
    return `
    <tr>
      <td>
        <div style="width:60px; height:44px; border-radius:8px; overflow:hidden; background:var(--gray-100); margin-bottom:0.35rem;">
          <img id="adminLaptopImg_${laptop.id}" src="${ADMIN_IMG_PLACEHOLDER}" alt="${laptop.name}" style="width:100%; height:100%; object-fit:cover;">
        </div>
        <div style="display:flex; flex-direction:column; gap:0.25rem; width:60px;">
          <button type="button" class="btn btn-outline btn-sm" style="padding:0.15rem 0.3rem; font-size:0.68rem;" onclick="setLaptopImageFromUrl(${laptop.id})">🔗 URL</button>
          <label class="btn btn-outline btn-sm" style="padding:0.15rem 0.3rem; font-size:0.68rem; text-align:center; cursor:pointer;">
            📁 Upload
            <input type="file" accept="image/*" style="display:none;" onchange="handleLaptopImageUpload(${laptop.id}, this)">
          </label>
          ${hasCustomImage ? `<button type="button" class="btn btn-outline btn-sm" style="padding:0.15rem 0.3rem; font-size:0.68rem; color:#dc2626; border-color:#fca5a5;" onclick="clearLaptopImageOverride(${laptop.id})">✕ Clear</button>` : ""}
        </div>
      </td>
      <td>
        <strong>${laptop.name}</strong><br>
        <span style="font-size:0.78rem; color:#64748b;">${laptop.brand} • ${laptop.processor}</span>
      </td>
      <td>
        <input type="number" min="0" id="mrpInput_${laptop.id}" class="form-control" style="width:110px;"
               value="${laptop.originalPrice}" oninput="recomputeAdminPricingRow(${laptop.id}, 'mrp')">
      </td>
      <td>
        <input type="number" min="0" id="priceInput_${laptop.id}" class="form-control" style="width:110px;"
               value="${laptop.price}" oninput="recomputeAdminPricingRow(${laptop.id}, 'price')">
      </td>
      <td>
        <input type="number" min="0" max="95" id="discountInput_${laptop.id}" class="form-control" style="width:70px; display:inline-block;"
               value="${discountPct}" oninput="recomputeAdminPricingRow(${laptop.id}, 'discount')"> %
      </td>
      <td style="white-space:nowrap;">
        <button class="btn btn-primary btn-sm" onclick="saveLaptopPricing(${laptop.id})">Save</button>
        <button class="btn btn-outline btn-sm" onclick="resetLaptopPricing(${laptop.id})">Reset</button>
        <button class="btn btn-outline btn-sm" style="color:#dc2626; border-color:#fca5a5;" onclick="deleteLaptopFromStore(${laptop.id})">Delete</button>
      </td>
    </tr>`;
  }).join("");

  // Load real product photos asynchronously, same as the storefront pages do
  if (typeof fetchProductImageFromAPI === "function") {
    LAPTOPS.forEach(laptop => {
      fetchProductImageFromAPI(laptop).then(apiUrl => {
        const imgEl = document.getElementById(`adminLaptopImg_${laptop.id}`);
        if (imgEl && apiUrl) imgEl.src = apiUrl;
      });
    });
  }
}

async function deleteLaptopFromStore(laptopId) {
  const laptop = LAPTOPS.find(l => l.id === laptopId);
  const name = laptop ? laptop.name : "this laptop";
  const isCustom = laptopId >= 1000; // admin-added laptops use ids >= 1000

  const confirmMsg = isCustom
    ? `Permanently remove "${name}"? This laptop was added by you, so it can't be restored — you'd need to re-add it via the form.`
    : `Remove "${name}" from the storefront? It will disappear from the home page and catalogue, but you can restore it anytime from the Removed Laptops list below.`;

  if (!confirm(confirmMsg)) return;

  try {
    if (isCustom) {
      await apiRequest(`/laptops/${laptopId}`, { method: "DELETE" });
    } else {
      await apiRequest(`/laptops/${laptopId}`, { method: "PATCH", body: { isActive: false } });
      if (laptop) LAPTOPS_REMOVED.push({ ...laptop, isActive: false });
    }
  } catch (e) {
    alert(`Couldn't remove the laptop: ${e.message}`);
    return;
  }

  const idx = LAPTOPS.findIndex(l => l.id === laptopId);
  if (idx > -1) LAPTOPS.splice(idx, 1);

  renderAdminLaptopPricingTable();
  renderAdminDeletedLaptopsTable();
  showToastNotification(`"${name}" removed from the storefront.`);
}

async function restoreLaptopToStore(laptopId) {
  try {
    const restored = fromApiProduct(await apiRequest(`/laptops/${laptopId}`, { method: "PATCH", body: { isActive: true } }));
    const idx = LAPTOPS_REMOVED.findIndex(l => l.id === laptopId);
    if (idx > -1) LAPTOPS_REMOVED.splice(idx, 1);
    LAPTOPS.push(restored);
    LAPTOPS.sort((a, b) => a.id - b.id);
  } catch (e) {
    alert(`Couldn't restore the laptop: ${e.message}`);
    return;
  }

  renderAdminLaptopPricingTable();
  renderAdminDeletedLaptopsTable();
  showToastNotification("Laptop restored to the storefront.");
}

function renderAdminDeletedLaptopsTable() {
  const section = document.getElementById("adminDeletedLaptopsSection");
  const container = document.getElementById("adminDeletedLaptopsTableBody");
  if (!container || !section) return;

  section.style.display = LAPTOPS_REMOVED.length ? "block" : "none";
  container.innerHTML = LAPTOPS_REMOVED.map(laptop => `
    <tr>
      <td><strong>${laptop.name}</strong><br><span style="font-size:0.78rem; color:#64748b;">${laptop.brand} • ${laptop.processor}</span></td>
      <td style="text-align:right;"><button class="btn btn-primary btn-sm" onclick="restoreLaptopToStore(${laptop.id})">Restore</button></td>
    </tr>`).join("");
}

// Keeps MRP / Price / Discount % in sync as the admin edits any one of the three fields
function recomputeAdminPricingRow(laptopId, changedField) {
  const mrpEl = document.getElementById(`mrpInput_${laptopId}`);
  const priceEl = document.getElementById(`priceInput_${laptopId}`);
  const discEl = document.getElementById(`discountInput_${laptopId}`);
  if (!mrpEl || !priceEl || !discEl) return;

  const mrp = Number(mrpEl.value) || 0;
  const price = Number(priceEl.value) || 0;
  const disc = Number(discEl.value) || 0;

  if (changedField === "discount") {
    if (mrp > 0) priceEl.value = Math.round(mrp * (1 - disc / 100));
  } else {
    if (mrp > 0) discEl.value = Math.max(0, Math.round(((mrp - price) / mrp) * 100));
  }
}

async function saveLaptopPricing(laptopId) {
  const mrpEl = document.getElementById(`mrpInput_${laptopId}`);
  const priceEl = document.getElementById(`priceInput_${laptopId}`);
  if (!mrpEl || !priceEl) return;

  const newMrp = Math.round(Number(mrpEl.value));
  const newPrice = Math.round(Number(priceEl.value));

  if (!newPrice || newPrice <= 0) {
    alert("Please enter a valid selling price.");
    return;
  }
  if (newMrp && newMrp < newPrice) {
    alert("MRP cannot be lower than the selling price.");
    return;
  }

  try {
    const laptop = await updateLaptopInStore(laptopId, { price: newPrice, originalPrice: newMrp || newPrice });
    renderAdminLaptopPricingTable();
    showToastNotification(`Pricing updated for "${laptop.name}" — now live on the storefront.`);
  } catch (e) {
    alert(`Couldn't save pricing: ${e.message}`);
  }
}

async function resetLaptopPricing(laptopId) {
  const defaults = (typeof LAPTOPS_DEFAULT_PRICING !== "undefined")
    ? LAPTOPS_DEFAULT_PRICING.find(l => l.id === laptopId)
    : null;
  if (!defaults) {
    showToastNotification("This laptop has no default pricing to reset to.");
    return;
  }

  try {
    const laptop = await updateLaptopInStore(laptopId, { price: defaults.price, originalPrice: defaults.originalPrice });
    renderAdminLaptopPricingTable();
    showToastNotification(`Pricing reset to default for "${laptop.name}".`);
  } catch (e) {
    alert(`Couldn't reset pricing: ${e.message}`);
  }
}

// Minimal toast helper (admin dashboard doesn't load js/cart.js, which normally provides this)
if (typeof showToastNotification !== "function") {
  window.showToastNotification = function(message) {
    let toast = document.getElementById("technestToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "technestToast";
      toast.className = "toast-notification";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
  };
}

function renderAdminMetrics() {
  const totalRevenue = adminOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const revEl = document.getElementById("metricTotalRevenue");
  const ordEl = document.getElementById("metricTotalOrders");
  const msgEl = document.getElementById("metricTotalMessages");
  const repEl = document.getElementById("metricTotalRepairs");

  if (revEl) revEl.textContent = `₹${totalRevenue.toLocaleString("en-IN")}`;
  if (ordEl) ordEl.textContent = adminOrders.length;
  if (msgEl) msgEl.textContent = adminMessages.length;
  if (repEl) repEl.textContent = adminRepairs.length;
}

function renderAdminOrdersTable() {
  const container = document.getElementById("adminOrdersTableBody");
  if (!container) return;

  const query = (document.getElementById("adminOrderSearch")?.value || "").toLowerCase();

  const filtered = adminOrders.filter(o =>
    o.orderId.toLowerCase().includes(query) ||
    o.customerName.toLowerCase().includes(query) ||
    o.paymentMethod.toLowerCase().includes(query) ||
    (o.phone && o.phone.includes(query))
  );

  if (filtered.length === 0) {
    container.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 1.5rem; color: #64748b;">No customer orders found.</td></tr>`;
    return;
  }

  container.innerHTML = filtered.map(order => `
    <tr>
      <td><strong>${order.orderId}</strong></td>
      <td>
        <div style="font-weight: 600;">${order.customerName}</div>
        <div style="font-size: 0.8rem; color: #64748b;">${order.phone}</div>
      </td>
      <td>${order.items.map(i => `${i.name} (x${i.qty})`).join("<br>")}</td>
      <td><strong>₹${Number(order.totalAmount).toLocaleString("en-IN")}</strong></td>
      <td><span class="pay-method-badge">${order.paymentMethod}</span></td>
      <td>
        <select onchange="updateOrderStatus('${order._id}', this.value)" class="status-select status-${order.status.toLowerCase()}">
          <option value="Processing" ${order.status === "Processing" ? "selected" : ""}>Processing</option>
          <option value="Shipped" ${order.status === "Shipped" ? "selected" : ""}>Shipped</option>
          <option value="Delivered" ${order.status === "Delivered" ? "selected" : ""}>Delivered</option>
          <option value="Cancelled" ${order.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
        </select>
      </td>
      <td>
        <button class="btn btn-outline" style="padding: 0.25rem 0.6rem; font-size: 0.8rem;" onclick="viewOrderDetails('${order._id}')">View Details</button>
      </td>
    </tr>
  `).join("");
}

async function updateOrderStatus(id, newStatus) {
  try {
    const updated = await apiRequest(`/orders/${id}`, { method: "PATCH", body: { status: newStatus } });
    const idx = adminOrders.findIndex(o => o._id === id);
    if (idx > -1) adminOrders[idx] = updated;
    renderAdminOrdersTable();
    showToastNotification(`Order ${updated.orderId} status updated to ${newStatus}`);
  } catch (e) {
    alert(`Couldn't update the order: ${e.message}`);
    renderAdminOrdersTable();
  }
}

function viewOrderDetails(id) {
  const order = adminOrders.find(o => o._id === id);
  if (!order) return;

  const modal = document.getElementById("adminOrderModal");
  const content = document.getElementById("adminModalBody");
  if (modal && content) {
    content.innerHTML = `
      <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 1rem;">
        <h4>Receipt for Order #${order.orderId}</h4>
        <p style="font-size: 0.85rem; color: #64748b;">Date: ${formatAdminDate(order.createdAt)}</p>
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Customer Info:</strong>
        <p>${order.customerName} (${order.email || "N/A"})</p>
        <p>Phone: ${order.phone}</p>
        <p><strong>Shipping Address:</strong><br>${formatShippingAddress(order.shippingAddress)}</p>
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Ordered Items:</strong>
        <ul style="list-style: none; margin-top: 0.5rem; padding-left: 0;">
          ${order.items.map(i => `<li style="display:flex; justify-content:space-between; margin-bottom: 0.4rem; font-size: 0.9rem;"><span>${i.name} (x${i.qty})</span><span>₹${(i.price * i.qty).toLocaleString("en-IN")}</span></li>`).join("")}
        </ul>
        <div style="border-top: 1px dashed #cbd5e1; padding-top: 0.5rem; display:flex; justify-style:space-between; font-weight:700;">
          <span>Total Amount Paid:</span>
          <span>₹${Number(order.totalAmount).toLocaleString("en-IN")}</span>
        </div>
      </div>
      <p style="font-size: 0.85rem; color: #475569;"><strong>Payment Method:</strong> ${order.paymentMethod} (${order.notes || "Successful"})</p>
    `;
    modal.style.display = "flex";
  }
}

function closeAdminModal() {
  const modal = document.getElementById("adminOrderModal");
  if (modal) modal.style.display = "none";
}

function renderAdminMessagesTable() {
  const container = document.getElementById("adminMessagesTableBody");
  if (!container) return;

  if (adminMessages.length === 0) {
    container.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 1.5rem; color: #64748b;">No contact inquiries received yet.</td></tr>`;
    return;
  }

  container.innerHTML = adminMessages.map(m => `
    <tr>
      <td>${formatAdminDate(m.createdAt)}</td>
      <td><strong>${m.name}</strong><br><span style="font-size:0.8rem; color:#64748b;">${m.email} | ${m.phone}</span></td>
      <td><strong>${m.subject || "General Inquiry"}</strong></td>
      <td style="max-width: 300px; font-size: 0.85rem;">${m.message}</td>
      <td><button class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; color: #ef4444;" onclick="deleteAdminMessage('${m._id}')">Delete</button></td>
    </tr>
  `).join("");
}

async function deleteAdminMessage(id) {
  try {
    await apiRequest(`/contact/${id}`, { method: "DELETE" });
    adminMessages = adminMessages.filter(m => m._id !== id);
    renderAdminMessagesTable();
    renderAdminMetrics();
  } catch (e) {
    alert(`Couldn't delete the message: ${e.message}`);
  }
}

function renderAdminRepairsTable() {
  const container = document.getElementById("adminRepairsTableBody");
  if (!container) return;

  if (adminRepairs.length === 0) {
    container.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 1.5rem; color: #64748b;">No laptop repair service bookings yet.</td></tr>`;
    return;
  }

  container.innerHTML = adminRepairs.map(r => `
    <tr>
      <td>${formatAdminDate(r.createdAt)}</td>
      <td><strong>${r.name}</strong><br><span style="font-size:0.8rem; color:#64748b;">${r.phone}</span></td>
      <td><span class="pay-method-badge" style="background:#e0f2fe; color:#0369a1;">${r.laptopModel}</span></td>
      <td><strong>${r.issueType}</strong></td>
      <td style="font-size: 0.85rem;">${r.description || "N/A"}</td>
    </tr>
  `).join("");
}

// Permanently deletes every order, contact message and repair booking from the database
async function clearAllAdminResponses() {
  if (!confirm("Permanently delete ALL customer orders, contact messages and repair bookings from the database? This cannot be undone.")) return;

  try {
    await Promise.all([
      ...adminOrders.map(o => apiRequest(`/orders/${o._id}`, { method: "DELETE" })),
      ...adminMessages.map(m => apiRequest(`/contact/${m._id}`, { method: "DELETE" })),
      ...adminRepairs.map(r => apiRequest(`/repairs/${r._id}`, { method: "DELETE" }))
    ]);
    showToastNotification("All customer responses deleted.");
  } catch (e) {
    alert(`Some records couldn't be deleted: ${e.message}`);
  }
  setupAdminDashboard();
}

document.addEventListener("DOMContentLoaded", () => {
  setupAdminDashboard();
});
