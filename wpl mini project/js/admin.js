/**
 * TechNest - Admin Portal Logic & Response Management Engine
 * Manages Admin Auth state and displays all customer responses (Orders, Contact Inquiries, Service Requests)
 */

const ADMIN_AUTH_KEY = "technest_admin_auth";
const ADMIN_ORDERS_KEY = "technest_admin_orders";
const ADMIN_MESSAGES_KEY = "technest_admin_messages";
const ADMIN_REPAIRS_KEY = "technest_admin_repairs";

// Default seed data if empty
function initializeAdminSeedData() {
  if (!localStorage.getItem(ADMIN_ORDERS_KEY)) {
    const seedOrders = [
      {
        orderId: "TN-894201",
        date: "2026-09-17 14:32",
        customerName: "Rahul Sharma",
        email: "rahul.sharma@example.com",
        phone: "+91 98765 12345",
        address: "Flat 402, Sunshine Apartments, Indiranagar, Bengaluru, Karnataka - 560038",
        items: [
          { name: "Apple MacBook Air M2", qty: 1, price: 84900 },
          { name: "USB-C Multiport Hub", qty: 1, price: 1299 }
        ],
        paymentMethod: "Amazon Pay UPI",
        totalAmount: 86199,
        status: "Delivered",
        notes: "Paid via Amazon Pay UPI ID rahul@okaxis"
      },
      {
        orderId: "TN-894202",
        date: "2026-09-17 15:05",
        customerName: "Priya Patel",
        email: "priya.patel@example.com",
        phone: "+91 99887 65432",
        address: "Plot 14, Sector 18, Cyber City, Gurugram, Haryana - 122002",
        items: [
          { name: "ASUS ROG Strix G16 Gaming", qty: 1, price: 114990 }
        ],
        paymentMethod: "Credit Card (HDFC)",
        totalAmount: 114990,
        status: "Processing",
        notes: "Card Ending **** 4892"
      }
    ];
    localStorage.setItem(ADMIN_ORDERS_KEY, JSON.stringify(seedOrders));
  }

  if (!localStorage.getItem(ADMIN_MESSAGES_KEY)) {
    const seedMessages = [
      {
        id: "MSG-101",
        date: "2026-09-16 11:20",
        name: "Amit Kumar",
        email: "amit.k@example.com",
        phone: "+91 98112 34567",
        subject: "Bulk Laptop Purchase for Startup",
        message: "Hi TechNest, we require 10 Lenovo ThinkPad laptops for our tech team. Please send a price quotation."
      }
    ];
    localStorage.setItem(ADMIN_MESSAGES_KEY, JSON.stringify(seedMessages));
  }

  if (!localStorage.getItem(ADMIN_REPAIRS_KEY)) {
    const seedRepairs = [
      {
        id: "REP-201",
        date: "2026-09-17 10:15",
        name: "Vikram Singh",
        phone: "+91 97654 32109",
        laptopModel: "Dell Inspiron 15 5000",
        issueType: "Screen Replacement & Battery Drain",
        description: "Display panel has blue flickering lines and battery dies within 20 minutes."
      }
    ];
    localStorage.setItem(ADMIN_REPAIRS_KEY, JSON.stringify(seedRepairs));
  }
}

// Check admin authentication
function isAdminLoggedIn() {
  return localStorage.getItem(ADMIN_AUTH_KEY) === "true";
}

// Perform Login
function performAdminLogin(username, password) {
  if (username === "admin" && password === "admin123") {
    localStorage.setItem(ADMIN_AUTH_KEY, "true");
    return true;
  }
  return false;
}

// Perform Logout
function performAdminLogout() {
  localStorage.removeItem(ADMIN_AUTH_KEY);
  window.location.href = "admin-login.html";
}

// Log a new customer order into localStorage
function saveCustomerOrder(orderData) {
  initializeAdminSeedData();
  const orders = JSON.parse(localStorage.getItem(ADMIN_ORDERS_KEY) || "[]");
  orders.unshift(orderData);
  localStorage.setItem(ADMIN_ORDERS_KEY, JSON.stringify(orders));
}

// Log contact message into localStorage
function saveContactMessage(msgData) {
  initializeAdminSeedData();
  const msgs = JSON.parse(localStorage.getItem(ADMIN_MESSAGES_KEY) || "[]");
  msgs.unshift(msgData);
  localStorage.setItem(ADMIN_MESSAGES_KEY, JSON.stringify(msgs));
}

// Log repair booking into localStorage
function saveRepairBooking(repairData) {
  initializeAdminSeedData();
  const repairs = JSON.parse(localStorage.getItem(ADMIN_REPAIRS_KEY) || "[]");
  repairs.unshift(repairData);
  localStorage.setItem(ADMIN_REPAIRS_KEY, JSON.stringify(repairs));
}

// Dashboard rendering controller
function setupAdminDashboard() {
  if (!document.getElementById("adminDashboardView")) return;

  // Route protection
  if (!isAdminLoggedIn()) {
    window.location.href = "admin-login.html";
    return;
  }

  initializeAdminSeedData();
  renderAdminMetrics();
  renderAdminLaptopPricingTable();
  renderAdminDeletedLaptopsTable();
  renderAdminOrdersTable();
  renderAdminMessagesTable();
  renderAdminRepairsTable();
}

/**
 * Laptop Pricing, Discount & Catalogue Management
 * Overrides/deletions are stored in localStorage and applied by js/data.js on every page
 * load, so a change here is immediately live on the home page, catalogue, cart and
 * checkout for any visitor on this browser.
 */
const PRICE_OVERRIDES_KEY = "technest_price_overrides";
const DELETED_LAPTOPS_KEY = "technest_deleted_laptops";
const IMAGE_OVERRIDES_KEY = "technest_image_overrides";
const CUSTOM_LAPTOPS_KEY = "technest_custom_laptops";
const ADMIN_IMG_PLACEHOLDER = "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=100&q=60";

function getPriceOverrides() {
  try {
    return JSON.parse(localStorage.getItem(PRICE_OVERRIDES_KEY) || "{}");
  } catch (e) {
    return {};
  }
}

function getCustomLaptops() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_LAPTOPS_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

/**
 * Add a brand-new laptop from the "Add New Laptop" form.
 * It gets an id >= 1000 (so it never collides with the seed catalogue), is saved to
 * localStorage so js/data.js includes it on every page from now on, and its image is
 * fetched through the same Unsplash API pipeline used for every other laptop.
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

  const customLaptops = getCustomLaptops();
  const nextId = 1000 + customLaptops.reduce((max, l) => Math.max(max, l.id - 1000 + 1), 0);

  const newLaptop = {
    id: nextId,
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

  customLaptops.push(newLaptop);
  localStorage.setItem(CUSTOM_LAPTOPS_KEY, JSON.stringify(customLaptops));

  // Reflect immediately on this page too
  if (!LAPTOPS.find(l => l.id === newLaptop.id)) LAPTOPS.push(newLaptop);

  renderAdminLaptopPricingTable();
  form.reset();
  showToastNotification(`"${newLaptop.name}" added — now live on the home page and catalogue.`);
}

function getImageOverrides() {
  try {
    return JSON.parse(localStorage.getItem(IMAGE_OVERRIDES_KEY) || "{}");
  } catch (e) {
    return {};
  }
}

// Set a laptop's image by pasting a URL (e.g. a direct link to a product photo)
function setLaptopImageFromUrl(laptopId) {
  const laptop = LAPTOPS.find(l => l.id === laptopId);
  const current = getImageOverrides()[laptopId] || "";
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
    alert("Please choose an image under 1.5MB — uploaded photos are stored in the browser, which has limited space.");
    inputEl.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => saveLaptopImageOverride(laptopId, reader.result);
  reader.readAsDataURL(file);
}

function saveLaptopImageOverride(laptopId, imageUrl) {
  const overrides = getImageOverrides();
  overrides[laptopId] = imageUrl;
  try {
    localStorage.setItem(IMAGE_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (e) {
    alert("Couldn't save this image — the browser's storage may be full. Try a smaller photo or a URL instead.");
    return;
  }

  const laptop = LAPTOPS.find(l => l.id === laptopId);
  if (laptop) laptop.apiImage = imageUrl;

  renderAdminLaptopPricingTable();
  showToastNotification(`Image updated for "${laptop ? laptop.name : "laptop"}" — now live on the storefront.`);
}

function clearLaptopImageOverride(laptopId) {
  const overrides = getImageOverrides();
  delete overrides[laptopId];
  localStorage.setItem(IMAGE_OVERRIDES_KEY, JSON.stringify(overrides));

  renderAdminLaptopPricingTable();
  showToastNotification("Custom image removed — back to the default photo.");
}

function getDeletedLaptopIds() {
  try {
    return JSON.parse(localStorage.getItem(DELETED_LAPTOPS_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function renderAdminLaptopPricingTable() {
  const container = document.getElementById("adminLaptopPricingTableBody");
  if (!container || typeof LAPTOPS === "undefined") return;

  container.innerHTML = LAPTOPS.map(laptop => {
    const discountPct = laptop.originalPrice
      ? Math.max(0, Math.round(((laptop.originalPrice - laptop.price) / laptop.originalPrice) * 100))
      : 0;
    const hasCustomImage = !!getImageOverrides()[laptop.id];
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

function deleteLaptopFromStore(laptopId) {
  const laptop = LAPTOPS.find(l => l.id === laptopId);
  const name = laptop ? laptop.name : "this laptop";
  const isCustom = laptopId >= 1000; // admin-added laptops use ids >= 1000

  const confirmMsg = isCustom
    ? `Permanently remove "${name}"? This laptop was added by you, so it can't be restored — you'd need to re-add it via the form.`
    : `Remove "${name}" from the storefront? It will disappear from the home page and catalogue, but you can restore it anytime from the Removed Laptops list below.`;

  if (!confirm(confirmMsg)) return;

  if (isCustom) {
    const remaining = getCustomLaptops().filter(l => l.id !== laptopId);
    localStorage.setItem(CUSTOM_LAPTOPS_KEY, JSON.stringify(remaining));
  } else {
    const deleted = getDeletedLaptopIds();
    if (!deleted.includes(laptopId)) deleted.push(laptopId);
    localStorage.setItem(DELETED_LAPTOPS_KEY, JSON.stringify(deleted));
  }

  const idx = LAPTOPS.findIndex(l => l.id === laptopId);
  if (idx > -1) LAPTOPS.splice(idx, 1);

  renderAdminLaptopPricingTable();
  renderAdminDeletedLaptopsTable();
  showToastNotification(`"${name}" removed from the storefront.`);
}

function restoreLaptopToStore(laptopId) {
  const deleted = getDeletedLaptopIds().filter(id => id !== laptopId);
  localStorage.setItem(DELETED_LAPTOPS_KEY, JSON.stringify(deleted));

  if (typeof LAPTOPS_SEED !== "undefined" && !LAPTOPS.find(l => l.id === laptopId)) {
    const seedLaptop = LAPTOPS_SEED.find(l => l.id === laptopId);
    if (seedLaptop) {
      const restored = { ...seedLaptop };
      const override = getPriceOverrides()[laptopId];
      if (override) {
        if (typeof override.price === "number") restored.price = override.price;
        if (typeof override.originalPrice === "number") restored.originalPrice = override.originalPrice;
      }
      LAPTOPS.push(restored);
      LAPTOPS.sort((a, b) => a.id - b.id);
    }
  }

  renderAdminLaptopPricingTable();
  renderAdminDeletedLaptopsTable();
  showToastNotification("Laptop restored to the storefront.");
}

function renderAdminDeletedLaptopsTable() {
  const section = document.getElementById("adminDeletedLaptopsSection");
  const container = document.getElementById("adminDeletedLaptopsTableBody");
  if (!container || !section) return;

  const deletedIds = getDeletedLaptopIds();
  section.style.display = deletedIds.length ? "block" : "none";
  if (!deletedIds.length || typeof LAPTOPS_SEED === "undefined") {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = deletedIds.map(id => {
    const laptop = LAPTOPS_SEED.find(l => l.id === id);
    if (!laptop) return "";
    return `
    <tr>
      <td><strong>${laptop.name}</strong><br><span style="font-size:0.78rem; color:#64748b;">${laptop.brand} • ${laptop.processor}</span></td>
      <td style="text-align:right;"><button class="btn btn-primary btn-sm" onclick="restoreLaptopToStore(${id})">Restore</button></td>
    </tr>`;
  }).join("");
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

function saveLaptopPricing(laptopId) {
  const mrpEl = document.getElementById(`mrpInput_${laptopId}`);
  const priceEl = document.getElementById(`priceInput_${laptopId}`);
  if (!mrpEl || !priceEl) return;

  const newMrp = Math.round(Number(mrpEl.value));
  const newPrice = Math.round(Number(priceEl.value));
  const laptop = LAPTOPS.find(l => l.id === laptopId);

  if (!newPrice || newPrice <= 0) {
    alert("Please enter a valid selling price.");
    return;
  }
  if (newMrp && newMrp < newPrice) {
    alert("MRP cannot be lower than the selling price.");
    return;
  }

  const overrides = getPriceOverrides();
  overrides[laptopId] = { price: newPrice, originalPrice: newMrp || newPrice };
  localStorage.setItem(PRICE_OVERRIDES_KEY, JSON.stringify(overrides));

  // Update the in-memory LAPTOPS array too, so this admin page reflects it instantly
  if (laptop) {
    laptop.price = newPrice;
    laptop.originalPrice = newMrp || newPrice;
  }

  renderAdminLaptopPricingTable();
  showToastNotification(`Pricing updated for "${laptop ? laptop.name : "laptop"}" — now live on the storefront.`);
}

function resetLaptopPricing(laptopId) {
  const overrides = getPriceOverrides();
  delete overrides[laptopId];
  localStorage.setItem(PRICE_OVERRIDES_KEY, JSON.stringify(overrides));

  const laptop = LAPTOPS.find(l => l.id === laptopId);
  const defaults = (typeof LAPTOPS_DEFAULT_PRICING !== "undefined")
    ? LAPTOPS_DEFAULT_PRICING.find(l => l.id === laptopId)
    : null;

  if (laptop && defaults) {
    laptop.price = defaults.price;
    laptop.originalPrice = defaults.originalPrice;
  }

  renderAdminLaptopPricingTable();
  showToastNotification(`Pricing reset to default for "${laptop ? laptop.name : "laptop"}".`);
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
  const orders = JSON.parse(localStorage.getItem(ADMIN_ORDERS_KEY) || "[]");
  const msgs = JSON.parse(localStorage.getItem(ADMIN_MESSAGES_KEY) || "[]");
  const repairs = JSON.parse(localStorage.getItem(ADMIN_REPAIRS_KEY) || "[]");

  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const revEl = document.getElementById("metricTotalRevenue");
  const ordEl = document.getElementById("metricTotalOrders");
  const msgEl = document.getElementById("metricTotalMessages");
  const repEl = document.getElementById("metricTotalRepairs");

  if (revEl) revEl.textContent = `₹${totalRevenue.toLocaleString("en-IN")}`;
  if (ordEl) ordEl.textContent = orders.length;
  if (msgEl) msgEl.textContent = msgs.length;
  if (repEl) repEl.textContent = repairs.length;
}

function renderAdminOrdersTable() {
  const container = document.getElementById("adminOrdersTableBody");
  if (!container) return;

  const orders = JSON.parse(localStorage.getItem(ADMIN_ORDERS_KEY) || "[]");
  const query = (document.getElementById("adminOrderSearch")?.value || "").toLowerCase();

  const filtered = orders.filter(o =>
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
        <select onchange="updateOrderStatus('${order.orderId}', this.value)" class="status-select status-${order.status.toLowerCase()}">
          <option value="Processing" ${order.status === "Processing" ? "selected" : ""}>Processing</option>
          <option value="Shipped" ${order.status === "Shipped" ? "selected" : ""}>Shipped</option>
          <option value="Delivered" ${order.status === "Delivered" ? "selected" : ""}>Delivered</option>
          <option value="Cancelled" ${order.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
        </select>
      </td>
      <td>
        <button class="btn btn-outline" style="padding: 0.25rem 0.6rem; font-size: 0.8rem;" onclick="viewOrderDetails('${order.orderId}')">View Details</button>
      </td>
    </tr>
  `).join("");
}

function updateOrderStatus(orderId, newStatus) {
  const orders = JSON.parse(localStorage.getItem(ADMIN_ORDERS_KEY) || "[]");
  const target = orders.find(o => o.orderId === orderId);
  if (target) {
    target.status = newStatus;
    localStorage.setItem(ADMIN_ORDERS_KEY, JSON.stringify(orders));
    renderAdminOrdersTable();
    showToastNotification(`Order ${orderId} status updated to ${newStatus}`);
  }
}

function viewOrderDetails(orderId) {
  const orders = JSON.parse(localStorage.getItem(ADMIN_ORDERS_KEY) || "[]");
  const order = orders.find(o => o.orderId === orderId);
  if (!order) return;

  const modal = document.getElementById("adminOrderModal");
  const content = document.getElementById("adminModalBody");
  if (modal && content) {
    content.innerHTML = `
      <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 1rem; margin-bottom: 1rem;">
        <h4>Receipt for Order #${order.orderId}</h4>
        <p style="font-size: 0.85rem; color: #64748b;">Date: ${order.date}</p>
      </div>
      <div style="margin-bottom: 1rem;">
        <strong>Customer Info:</strong>
        <p>${order.customerName} (${order.email || "N/A"})</p>
        <p>Phone: ${order.phone}</p>
        <p><strong>Shipping Address:</strong><br>${order.address}</p>
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

  const msgs = JSON.parse(localStorage.getItem(ADMIN_MESSAGES_KEY) || "[]");
  if (msgs.length === 0) {
    container.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 1.5rem; color: #64748b;">No contact inquiries received yet.</td></tr>`;
    return;
  }

  container.innerHTML = msgs.map(m => `
    <tr>
      <td>${m.date}</td>
      <td><strong>${m.name}</strong><br><span style="font-size:0.8rem; color:#64748b;">${m.email} | ${m.phone}</span></td>
      <td><strong>${m.subject || "General Inquiry"}</strong></td>
      <td style="max-width: 300px; font-size: 0.85rem;">${m.message}</td>
      <td><button class="btn btn-outline" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; color: #ef4444;" onclick="deleteAdminMessage('${m.id}')">Delete</button></td>
    </tr>
  `).join("");
}

function deleteAdminMessage(id) {
  let msgs = JSON.parse(localStorage.getItem(ADMIN_MESSAGES_KEY) || "[]");
  msgs = msgs.filter(m => m.id !== id);
  localStorage.setItem(ADMIN_MESSAGES_KEY, JSON.stringify(msgs));
  renderAdminMessagesTable();
  renderAdminMetrics();
}

function renderAdminRepairsTable() {
  const container = document.getElementById("adminRepairsTableBody");
  if (!container) return;

  const repairs = JSON.parse(localStorage.getItem(ADMIN_REPAIRS_KEY) || "[]");
  if (repairs.length === 0) {
    container.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 1.5rem; color: #64748b;">No laptop repair service bookings yet.</td></tr>`;
    return;
  }

  container.innerHTML = repairs.map(r => `
    <tr>
      <td>${r.date}</td>
      <td><strong>${r.name}</strong><br><span style="font-size:0.8rem; color:#64748b;">${r.phone}</span></td>
      <td><span class="pay-method-badge" style="background:#e0f2fe; color:#0369a1;">${r.laptopModel}</span></td>
      <td><strong>${r.issueType}</strong></td>
      <td style="font-size: 0.85rem;">${r.description || "N/A"}</td>
    </tr>
  `).join("");
}

function clearAllAdminResponses() {
  if (confirm("Are you sure you want to reset all test customer orders, messages, and repair responses?")) {
    localStorage.removeItem(ADMIN_ORDERS_KEY);
    localStorage.removeItem(ADMIN_MESSAGES_KEY);
    localStorage.removeItem(ADMIN_REPAIRS_KEY);
    initializeAdminSeedData();
    setupAdminDashboard();
    showToastNotification("All responses reset to initial demo state!");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupAdminDashboard();
});
