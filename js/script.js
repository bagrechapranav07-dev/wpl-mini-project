/**
 * TechNest Laptop Store — Main Application Script
 * Implements Smart Filtering, Dynamic Image Rendering,
 * Shopping Cart and Form submission logging.
 */

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupLaptopCatalogue();
  setupForms();
});

// Mobile menu navbar toggle
function setupNavigation() {
  const toggleBtn = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener("click", () => {
      navLinks.classList.toggle("show");
    });
  }
}

/**
 * TechNest Laptop Catalogue Controller
 */
function setupLaptopCatalogue() {
  const grid = document.getElementById("laptopGrid");
  if (!grid) return; // Not on laptops.html or homepage preview

  const isHomePage = document.querySelector(".hero") !== null;

  // Filter elements
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");
  const minPriceInput = document.getElementById("minPrice");
  const maxPriceInput = document.getElementById("maxPrice");
  const clearFiltersBtn = document.getElementById("clearFiltersBtn");
  const activeChipsContainer = document.getElementById("activeFilterChips");
  const productCountDisplay = document.getElementById("productCountDisplay");

  // Render laptops grid with Dynamic API Images
  function renderLaptops(items) {
    grid.innerHTML = "";

    if (productCountDisplay) {
      productCountDisplay.textContent = `Showing ${items.length} of ${LAPTOPS.length} laptops`;
    }

    if (items.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
          <h3 style="color: #1e293b; margin-bottom: 0.5rem;">No laptops found matching your filters</h3>
          <p style="color: #64748b; font-size: 0.95rem; margin-bottom: 1rem;">Try clearing some filters or searching for another term.</p>
          <button class="btn btn-outline" onclick="resetAllFilters()">Reset All Filters</button>
        </div>
      `;
      return;
    }

    items.forEach(laptop => {
      const discountPercent = laptop.originalPrice ? Math.round(((laptop.originalPrice - laptop.price) / laptop.originalPrice) * 100) : 15;
      const card = document.createElement("div");
      card.className = "product-card";

      // Use a placeholder background until API image loads
      const placeholderImg = typeof laptopRenderDataUrl === "function"
        ? laptopRenderDataUrl(laptop)
        : `https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=60`;

      card.innerHTML = `
        ${laptop.badge ? `<span class="product-badge">${laptop.badge}</span>` : ""}
        <div class="product-img-wrap" id="imgWrap_${laptop.id}" style="background:#ffffff;">
          <img id="img_${laptop.id}" src="${placeholderImg}" alt="${laptop.name}" style="opacity:1; transition: opacity 0.3s;">
        </div>
        <div class="product-card-body">
          <h3 class="product-title">${laptop.name}</h3>
          <div class="product-rating-row">
            <span class="stars">&#9733; ${laptop.rating}</span>
            <span class="reviews-count">(${laptop.reviewsCount.toLocaleString('en-IN')} reviews)</span>
          </div>
          <div class="product-specs-tags">
            <span class="spec-tag">${laptop.brand}</span>
            <span class="spec-tag">${laptop.processor}</span>
            <span class="spec-tag">${laptop.ram}</span>
            <span class="spec-tag">${laptop.storage}</span>
            <span class="spec-tag">${laptop.displaySize || ''}</span>
          </div>
          <p class="product-desc">${laptop.description}</p>
          <div class="product-price-block">
            <div class="price-row">
              <span class="current-price">&#8377;${laptop.price.toLocaleString("en-IN")}</span>
              ${laptop.originalPrice ? `<span class="mrp-price">&#8377;${laptop.originalPrice.toLocaleString("en-IN")}</span>` : ""}
              <span class="discount-percentage">${discountPercent}% off</span>
            </div>
            <div class="product-actions-btn-group">
              <button class="btn btn-outline btn-sm" onclick="addToCart(${laptop.id}, 'laptop', false)">Add to Cart</button>
              <button class="btn btn-accent btn-sm" onclick="buyNowDirect(${laptop.id}, 'laptop')">Buy Now</button>
            </div>
          </div>
        </div>
      `;
      grid.appendChild(card);

      // Async: swap placeholder with API image when fetched
      if (typeof fetchProductImageFromAPI === "function") {
        fetchProductImageFromAPI(laptop).then(apiUrl => {
          const imgEl = document.getElementById(`img_${laptop.id}`);
          if (imgEl && apiUrl) {
            imgEl.style.opacity = "0";
            imgEl.src = apiUrl;
            imgEl.onload = () => { imgEl.style.opacity = "1"; };
            imgEl.onerror = () => { imgEl.style.opacity = "1"; }; // Keep visible on error
            laptop.apiImage = apiUrl;
          }
        });
      }
    });
  }

  // Initial render
  if (isHomePage) {
    // Admin-added laptops (id >= 1000) lead the home page, newest first
    const added = LAPTOPS.filter(l => l.id >= 1000).reverse();
    const base = LAPTOPS.filter(l => l.id < 1000);
    renderLaptops(added.concat(base).slice(0, 4));
    return;
  }

  renderLaptops(LAPTOPS);

  // Filter Engine
  function applyFilters() {
    const query = (searchInput?.value || "").toLowerCase().trim();
    const minP = parseFloat(minPriceInput?.value) || 0;
    const maxP = parseFloat(maxPriceInput?.value) || Infinity;
    const sortBy = sortSelect?.value || "featured";

    // Get checked checkboxes for each category
    const selectedBrands = Array.from(document.querySelectorAll('input[name="brandFilter"]:checked')).map(cb => cb.value);
    const selectedProcessors = Array.from(document.querySelectorAll('input[name="processorFilter"]:checked')).map(cb => cb.value);
    const selectedRams = Array.from(document.querySelectorAll('input[name="ramFilter"]:checked')).map(cb => Number(cb.value));
    const selectedCategories = Array.from(document.querySelectorAll('input[name="categoryFilter"]:checked')).map(cb => cb.value);
    const selectedRating = parseFloat(document.querySelector('input[name="ratingFilter"]:checked')?.value || 0);

    let filtered = LAPTOPS.filter(laptop => {
      // Search term
      const matchesSearch = !query ||
        laptop.name.toLowerCase().includes(query) ||
        laptop.brand.toLowerCase().includes(query) ||
        laptop.processor.toLowerCase().includes(query);

      // Brands
      const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(laptop.brand);

      // Processor
      const matchesProcessor = selectedProcessors.length === 0 || selectedProcessors.some(proc => laptop.processor.includes(proc));

      // RAM
      const matchesRam = selectedRams.length === 0 || selectedRams.includes(laptop.ramNum);

      // Category
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(laptop.category);

      // Price Range
      const matchesPrice = laptop.price >= minP && laptop.price <= maxP;

      // Rating
      const matchesRating = laptop.rating >= selectedRating;

      return matchesSearch && matchesBrand && matchesProcessor && matchesRam && matchesCategory && matchesPrice && matchesRating;
    });

    // Sorting logic
    if (sortBy === "price-low") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === "rating") {
      filtered.sort((a, b) => b.rating - a.rating);
    }

    renderLaptops(filtered);
    renderActiveFilterChips(selectedBrands, selectedProcessors, selectedRams, selectedCategories, minP, maxP);
  }

  function renderActiveFilterChips(brands, procs, rams, cats, minP, maxP) {
    if (!activeChipsContainer) return;
    activeChipsContainer.innerHTML = "";

    const chips = [];
    brands.forEach(b => chips.push({ label: `Brand: ${b}`, type: "brand", val: b }));
    procs.forEach(p => chips.push({ label: `CPU: ${p}`, type: "proc", val: p }));
    rams.forEach(r => chips.push({ label: `RAM: ${r}GB`, type: "ram", val: r }));
    cats.forEach(c => chips.push({ label: `Use: ${c}`, type: "cat", val: c }));

    if (minP > 0 || maxP < Infinity) {
      chips.push({ label: `Price: ₹${minP || 0} - ${maxP === Infinity ? 'Max' : '₹' + maxP}`, type: "price" });
    }

    chips.forEach(chip => {
      const chipEl = document.createElement("span");
      chipEl.className = "chip";
      chipEl.innerHTML = `${chip.label} <span class="chip-remove" onclick="removeSingleFilter('${chip.type}', '${chip.val}')">&times;</span>`;
      activeChipsContainer.appendChild(chipEl);
    });
  }

  // Event Listeners for Filters
  if (searchInput) searchInput.addEventListener("input", applyFilters);
  if (sortSelect) sortSelect.addEventListener("change", applyFilters);
  if (minPriceInput) minPriceInput.addEventListener("input", applyFilters);
  if (maxPriceInput) maxPriceInput.addEventListener("input", applyFilters);

  document.querySelectorAll('.filter-sidebar input[type="checkbox"], .filter-sidebar input[type="radio"]').forEach(input => {
    input.addEventListener("change", applyFilters);
  });

  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", resetAllFilters);
  }

  window.resetAllFilters = function() {
    if (searchInput) searchInput.value = "";
    if (minPriceInput) minPriceInput.value = "";
    if (maxPriceInput) maxPriceInput.value = "";
    if (sortSelect) sortSelect.value = "featured";

    document.querySelectorAll('.filter-sidebar input[type="checkbox"]').forEach(cb => cb.checked = false);
    const defaultRating = document.querySelector('input[name="ratingFilter"][value="0"]');
    if (defaultRating) defaultRating.checked = true;

    applyFilters();
  };

  window.removeSingleFilter = function(type, val) {
    if (type === "brand" || type === "proc" || type === "ram" || type === "cat") {
      const cb = document.querySelector(`.filter-sidebar input[value="${val}"]`);
      if (cb) cb.checked = false;
    } else if (type === "price") {
      if (minPriceInput) minPriceInput.value = "";
      if (maxPriceInput) maxPriceInput.value = "";
    }
    applyFilters();
  };
}

// Render accessories page grid
function setupAccessoriesCatalogue() {
  const grid = document.getElementById("accessoriesGrid");
  if (!grid) return;

  grid.innerHTML = "";
  ACCESSORIES.forEach(item => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-img-wrap skeleton-loader" id="accImgWrap_${item.id}">
        <img id="accImg_${item.id}" src="${item.image || ''}" alt="${item.name}" style="opacity:0;" onload="this.style.opacity='1'; this.parentElement.classList.remove('skeleton-loader');">
      </div>
      <h3 class="product-title">${item.name}</h3>
      <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 0.8rem;">Category: ${item.category} • ${item.brand}</p>
      <div class="product-price-block">
        <div class="price-row">
          <span class="current-price">${item.formattedPrice}</span>
          <span class="mrp-price">₹${item.originalPrice}</span>
        </div>
        <div class="product-actions-btn-group">
          <button class="btn btn-outline btn-sm" onclick="addToCart(${item.id}, 'accessory', true)">Add to Cart</button>
          <button class="btn btn-amazon btn-sm" onclick="buyNowDirect(${item.id}, 'accessory')">Buy Now</button>
        </div>
      </div>
    `;
    grid.appendChild(card);

    if (typeof fetchProductImageFromAPI === "function") {
      fetchProductImageFromAPI(item).then(apiUrl => {
        const imgEl = document.getElementById(`accImg_${item.id}`);
        if (imgEl) {
          imgEl.src = apiUrl;
          item.apiImage = apiUrl;
        }
      });
    }
  });
}

// Form Handlers (Logs messages & repairs into Admin responses)
function setupForms() {
  const repairForm = document.getElementById("repairForm");
  const contactForm = document.getElementById("contactForm");

  if (repairForm) {
    repairForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(repairForm);
      const repairData = {
        id: "REP-" + Math.floor(1000 + Math.random() * 9000),
        date: new Date().toLocaleString("en-IN"),
        name: repairForm.querySelector('[name="name"]')?.value || "Customer",
        phone: repairForm.querySelector('[name="phone"]')?.value || "",
        laptopModel: repairForm.querySelector('[name="laptopModel"]')?.value || "Laptop",
        issueType: repairForm.querySelector('[name="issueType"]')?.value || "General Service",
        description: repairForm.querySelector('[name="description"]')?.value || ""
      };

      if (typeof saveRepairBooking === "function") {
        saveRepairBooking(repairData);
      }

      alert("Thank you! Your repair booking has been saved and logged to store responses. Our technician will contact you shortly.");
      repairForm.reset();
    });
  }

  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const msgData = {
        id: "MSG-" + Math.floor(1000 + Math.random() * 9000),
        date: new Date().toLocaleString("en-IN"),
        name: contactForm.querySelector('[name="name"]')?.value || "Visitor",
        email: contactForm.querySelector('[name="email"]')?.value || "",
        phone: contactForm.querySelector('[name="phone"]')?.value || "",
        subject: contactForm.querySelector('[name="subject"]')?.value || "Inquiry",
        message: contactForm.querySelector('[name="message"]')?.value || ""
      };

      if (typeof saveContactMessage === "function") {
        saveContactMessage(msgData);
      }

      alert("Thank you for contacting TechNest! Your inquiry has been submitted and recorded.");
      contactForm.reset();
    });
  }
}

// Enquiry modal helper
function openEnquiryModal(productName) {
  const modal = document.getElementById("simpleModal");
  const modalTitle = document.getElementById("modalProductTitle");
  if (modal && modalTitle) {
    modalTitle.textContent = productName;
    modal.style.display = "flex";
  } else {
    alert(`Thank you for your interest in ${productName}! Please visit our store or call +91 98765 43210 for purchase.`);
  }
}

function closeModal() {
  const modal = document.getElementById("simpleModal");
  if (modal) {
    modal.style.display = "none";
  }
}
