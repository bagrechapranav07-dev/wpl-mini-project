/**
 * TechNest - Shopping Cart Engine
 * Manages cart persistence in localStorage, item quantities, subtotal calculations,
 * and header badge notifications.
 */

const CART_STORAGE_KEY = "technest_cart_v1";

// Retrieve cart items from localStorage
function getCartItems() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

// Save cart items array to localStorage
function saveCartItems(items) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    updateCartBadge();
  } catch (e) {
    console.error("Failed to save cart to localStorage", e);
  }
}

// Add product to cart by ID and type ('laptop' or 'accessory')
function addToCart(productId, productType = "laptop", redirectAfterAdd = false) {
  let product = null;
  if (productType === "laptop") {
    product = LAPTOPS.find(p => p.id === Number(productId));
  } else {
    product = ACCESSORIES.find(a => a.id === Number(productId));
  }

  if (!product) return;

  const items = getCartItems();
  const existingIndex = items.findIndex(item => item.id === product.id && item.type === productType);

  if (existingIndex > -1) {
    items[existingIndex].quantity += 1;
  } else {
    items.push({
      id: product.id,
      type: productType,
      name: product.name,
      price: product.price,
      originalPrice: product.originalPrice || Math.round(product.price * 1.15),
      image: product.apiImage || product.image || "images/hero-laptop.jpg",
      brand: product.brand || "TechNest",
      specs: product.ram ? `${product.brand} | ${product.ram} | ${product.storage}` : (product.category || "Accessory"),
      quantity: 1
    });
  }

  saveCartItems(items);
  showToastNotification(`✅ "${product.name}" added to cart!`);

  if (redirectAfterAdd === true) {
    setTimeout(() => {
      window.location.href = "cart.html";
    }, 700);
  }
}

// Buy Now -> Adds to cart and takes the shopper to their cart to review, like Amazon
function buyNowDirect(productId, productType = "laptop") {
  addToCart(productId, productType, true);
}

// Update item quantity in cart
function updateCartQuantity(productId, productType, newQty) {
  let items = getCartItems();
  if (newQty <= 0) {
    items = items.filter(item => !(item.id === Number(productId) && item.type === productType));
  } else {
    const target = items.find(item => item.id === Number(productId) && item.type === productType);
    if (target) {
      target.quantity = Number(newQty);
    }
  }
  saveCartItems(items);
  renderCartPage();
}

// Remove item from cart completely
function removeFromCart(productId, productType) {
  let items = getCartItems();
  items = items.filter(item => !(item.id === Number(productId) && item.type === productType));
  saveCartItems(items);
  renderCartPage();
  showToastNotification("Item removed from cart");
}

// Clear all cart items
function clearCart() {
  saveCartItems([]);
  renderCartPage();
}

// Compute cart financial totals
function calculateCartTotals() {
  const items = getCartItems();
  let subtotal = 0;
  let mrpTotal = 0;
  let itemCount = 0;

  items.forEach(item => {
    subtotal += item.price * item.quantity;
    mrpTotal += item.originalPrice * item.quantity;
    itemCount += item.quantity;
  });

  const discount = Math.max(0, mrpTotal - subtotal);
  const deliveryFee = subtotal > 50000 || items.length === 0 ? 0 : 499;
  const grandTotal = subtotal + (items.length > 0 ? deliveryFee : 0);

  return {
    subtotal,
    mrpTotal,
    discount,
    deliveryFee,
    grandTotal,
    itemCount
  };
}

// Update navbar cart badge counter across all pages
function updateCartBadge() {
  const badges = document.querySelectorAll(".cart-badge-count");
  const items = getCartItems();
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  badges.forEach(badge => {
    badge.textContent = totalCount;
    if (totalCount > 0) {
      badge.style.display = "inline-flex";
    } else {
      badge.style.display = "none";
    }
  });
}

// Render cart details on cart.html page
function renderCartPage() {
  const container = document.getElementById("cartItemsList");
  if (!container) return; // Not on cart.html page

  const items = getCartItems();
  const totals = calculateCartTotals();

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-cart-box">
        <div class="empty-cart-icon">🛒</div>
        <h3>Your TechNest Shopping Cart is empty</h3>
        <p>Your shopping cart lives to serve. Give it purpose — fill it with amazing laptops and accessories!</p>
        <a href="laptops.html" class="btn btn-primary" style="margin-top: 1rem;">Shop Laptops Now</a>
      </div>
    `;
    updateSummaryUI(totals);
    return;
  }

  let html = `<div class="cart-items-wrapper">`;
  items.forEach(item => {
    const itemTotal = item.price * item.quantity;
    html += `
      <div class="cart-item-card">
        <img src="${item.image}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-info">
          <div class="cart-item-header">
            <h3 class="cart-item-title">${item.name}</h3>
            <span class="cart-item-price">₹${itemTotal.toLocaleString("en-IN")}</span>
          </div>
          <p class="cart-item-specs">${item.specs}</p>
          <div class="cart-stock-status">In Stock • Eligible for Free Delivery</div>
          <div class="cart-item-actions">
            <div class="qty-selector">
              <button onclick="updateCartQuantity(${item.id}, '${item.type}', ${item.quantity - 1})">-</button>
              <span>${item.quantity}</span>
              <button onclick="updateCartQuantity(${item.id}, '${item.type}', ${item.quantity + 1})">+</button>
            </div>
            <button class="cart-remove-btn" onclick="removeFromCart(${item.id}, '${item.type}')">Delete</button>
          </div>
        </div>
      </div>
    `;
  });
  html += `</div>`;
  container.innerHTML = html;

  updateSummaryUI(totals);
}

function updateSummaryUI(totals) {
  const subtotalEl = document.getElementById("cartSubtotal");
  const mrpEl = document.getElementById("cartMrpTotal");
  const discountEl = document.getElementById("cartDiscount");
  const deliveryEl = document.getElementById("cartDeliveryFee");
  const grandTotalEl = document.getElementById("cartGrandTotal");
  const checkoutBtn = document.getElementById("cartCheckoutBtn");

  if (subtotalEl) subtotalEl.textContent = `₹${totals.subtotal.toLocaleString("en-IN")}`;
  if (mrpEl) mrpEl.textContent = `₹${totals.mrpTotal.toLocaleString("en-IN")}`;
  if (discountEl) discountEl.textContent = `-₹${totals.discount.toLocaleString("en-IN")}`;
  if (deliveryEl) deliveryEl.textContent = totals.deliveryFee === 0 ? "FREE" : `₹${totals.deliveryFee}`;
  if (grandTotalEl) grandTotalEl.textContent = `₹${totals.grandTotal.toLocaleString("en-IN")}`;

  if (checkoutBtn) {
    if (totals.itemCount === 0) {
      checkoutBtn.classList.add("disabled");
      checkoutBtn.setAttribute("disabled", "true");
    } else {
      checkoutBtn.classList.remove("disabled");
      checkoutBtn.removeAttribute("disabled");
    }
  }
}

// Toast notification popup helper
function showToastNotification(message) {
  let toast = document.getElementById("technestToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "technestToast";
    toast.className = "toast-notification";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartBadge();
  renderCartPage();
});
