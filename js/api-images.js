/**
 * TechNest - Dynamic API Image Loading Module
 * Fetches product images dynamically via HTTP fetch calls to public APIs
 * (DummyJSON & Unsplash) instead of using hardcoded local images.
 */

const API_IMAGE_CACHE_KEY = "technest_api_image_cache_v5";

// Clear out old cache versions (earlier providers, and v4 which always cached the
// first search result — causing several laptops to share one duplicate photo)
["technest_api_image_cache_v1", "technest_api_image_cache_v2", "technest_api_image_cache_v3", "technest_api_image_cache_v4"].forEach(oldKey => {
  try { localStorage.removeItem(oldKey); } catch (e) {}
});

// Paste your free Unsplash "Access Key" here (get one at https://unsplash.com/developers)
const UNSPLASH_ACCESS_KEY = "S7-Q6GrlaKj5pGfZ4emykFRPUu0ao_knhd1EomuuAnE";

// Helper to retrieve cached API images from sessionStorage/localStorage
function getApiImageCache() {
  try {
    const cached = localStorage.getItem(API_IMAGE_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (e) {
    return {};
  }
}

// Helper to save image URL into cache
function cacheApiImage(key, url) {
  try {
    const cache = getApiImageCache();
    cache[key] = url;
    localStorage.setItem(API_IMAGE_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn("Could not write to image cache", e);
  }
}

// Real laptop brands Unsplash reliably has stock photos for
const KNOWN_LAPTOP_BRANDS = ["Apple", "Dell", "HP", "Lenovo", "ASUS", "Acer", "MSI"];

// Laptop category -> a search term guaranteed to return real laptop photos
const LAPTOP_CATEGORY_QUERY = {
  Gaming: "gaming laptop",
  Ultrabook: "ultrabook laptop",
  Business: "business laptop",
  Professional: "professional laptop",
  Student: "student laptop"
};

// Accessory category -> a specific, reliable search term (avoids brand names like "TechNest")
const ACCESSORY_CATEGORY_QUERY = {
  Peripherals: "computer peripherals",
  Adapters: "usb hub adapter",
  Storage: "nvme ssd drive",
  Stands: "aluminum laptop stand",
  Audio: "wireless headphones",
  Cooling: "laptop cooling pad",
  Bags: "laptop backpack"
};

// Build a search query that reliably returns an on-topic photo instead of the exact (often fictional) product name
function buildImageSearchQuery(item) {
  const isLaptop = !!item.ram; // laptops carry a `ram` field, accessories don't

  if (isLaptop) {
    if (KNOWN_LAPTOP_BRANDS.includes(item.brand)) {
      return `${item.brand} laptop`;
    }
    return LAPTOP_CATEGORY_QUERY[item.category] || "laptop computer";
  }

  if (item.name && /mouse/i.test(item.name)) return "wireless mouse";
  if (item.name && /keyboard/i.test(item.name)) return "mechanical keyboard";
  return ACCESSORY_CATEGORY_QUERY[item.category] || "computer accessory";
}

/**
 * Dynamic API fetch for laptop image
 * Queries live API endpoints (DummyJSON laptop endpoint or Unsplash public API)
 */
async function fetchProductImageFromAPI(laptopItem) {
  // Admin-set custom image (URL or uploaded photo) always wins over the auto-fetched one
  try {
    const imageOverrides = JSON.parse(localStorage.getItem("technest_image_overrides") || "{}");
    if (imageOverrides[laptopItem.id]) {
      return imageOverrides[laptopItem.id];
    }
  } catch (e) {}

  // Otherwise use the clean generated render (stock photos came back with keyboards/screens the wrong way round).
  // The Unsplash lookup below is kept for reference but is no longer reached.
  return laptopRenderDataUrl(laptopItem);

  const cacheKey = `laptop_${laptopItem.id}_${laptopItem.name.replace(/\s+/g, '_')}`;
  const cache = getApiImageCache();

  if (cache[cacheKey]) {
    return cache[cacheKey];
  }

  // Fallback high quality API image URLs if API network is slow or offline
  const fallbackApiUrls = [
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80", // Macbook/Pro
    "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80", // Ultrabook
    "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=800&q=80", // Gaming
    "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=800&q=80", // Modern Laptop
    "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?auto=format&fit=crop&w=800&q=80", // Metallic Laptop
    "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=80", // Studio Laptop
    "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80", // Dell XPS style
    "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=800&q=80"  // Tech Workstation
  ];

  // 1. Try fetching a real matching photo from the Unsplash Search API (requires an Access Key)
  if (UNSPLASH_ACCESS_KEY && UNSPLASH_ACCESS_KEY !== "YOUR_UNSPLASH_ACCESS_KEY_HERE") {
    try {
      const searchQuery = encodeURIComponent(buildImageSearchQuery(laptopItem));
      // Fetch several candidates per query (not just 1) — several laptops in the same
      // brand/category can share a search term, so picking a different result per
      // laptop (by id) keeps each one visually distinct instead of all showing photo #1.
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${searchQuery}&per_page=10&orientation=squarish`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } }
      );

      if (response.ok) {
        const data = await response.json();
        const results = data.results || [];
        const photo = results.length ? results[laptopItem.id % results.length] : null;
        if (photo && photo.urls && photo.urls.regular) {
          cacheApiImage(cacheKey, photo.urls.regular);
          return photo.urls.regular;
        }
      } else {
        console.warn("Unsplash API request failed:", response.status, response.statusText);
      }
    } catch (err) {
      console.warn("Unsplash API fetch error, falling back to static images:", err);
    }
  }

  // 2. Fallback to bundled Unsplash image URLs when no key is set or the API call fails
  const index = (laptopItem.id - 1) % fallbackApiUrls.length;
  const chosenApiUrl = fallbackApiUrls[index];
  cacheApiImage(cacheKey, chosenApiUrl);
  return chosenApiUrl;
}

/**
 * Bulk API Fetch for catalogue rendering
 */
async function loadDynamicApiImagesForLaptops(laptopsList, callbackOnItemLoaded) {
  for (const laptop of laptopsList) {
    fetchProductImageFromAPI(laptop).then(apiUrl => {
      laptop.apiImage = apiUrl;
      if (typeof callbackOnItemLoaded === "function") {
        callbackOnItemLoaded(laptop, apiUrl);
      }
    });
  }
}

/**
 * Generated laptop pictures.
 * Stock photos were hit-and-miss (keyboards facing the wrong way, screens not visible), so every
 * laptop without an admin-uploaded image gets a clean front-view render with the screen on,
 * the keyboard facing the viewer and the model's own name and specs on the display.
 * The "tn-render" marker lets the 3D viewer tell these apart from real photos.
 */
const LAPTOP_THEMES = {
  apple:   { a: "#93c5fd", b: "#c4b5fd", c: "#fbcfe8", body: ["#e5e7eb", "#b8bcc8"] },
  dell:    { a: "#0ea5e9", b: "#1d4ed8", c: "#312e81", body: ["#cbd5e1", "#94a3b8"] },
  hp:      { a: "#06b6d4", b: "#0891b2", c: "#164e63", body: ["#d1d5db", "#9ca3af"] },
  lenovo:  { a: "#f43f5e", b: "#be123c", c: "#4c0519", body: ["#6b7280", "#374151"] },
  asus:    { a: "#8b5cf6", b: "#6d28d9", c: "#1e1b4b", body: ["#9ca3af", "#4b5563"] },
  acer:    { a: "#22c55e", b: "#15803d", c: "#052e16", body: ["#d1d5db", "#9ca3af"] },
  msi:     { a: "#ef4444", b: "#991b1b", c: "#0f0f0f", body: ["#4b5563", "#1f2937"] },
  default: { a: "#3b82f6", b: "#7c3aed", c: "#ec4899", body: ["#cbd5e1", "#94a3b8"] }
};

function _lapEsc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Screen content (wallpaper + model name + key specs) as raw SVG markup for a w x h box
function _lapScreenMarkup(l, w, h, uid) {
  const th = LAPTOP_THEMES[String(l.brand || "").toLowerCase()] || LAPTOP_THEMES.default;
  const name = _lapEsc(String(l.name || "TechNest Laptop").slice(0, 28));
  const brand = _lapEsc(String(l.brand || "TechNest").toUpperCase());
  const line1 = _lapEsc([l.processor, l.ramNum ? l.ramNum + "GB" : "", l.storageNum ? (l.storageNum >= 1024 ? l.storageNum / 1024 + "TB" : l.storageNum + "GB") : ""].filter(Boolean).join(" · ").slice(0, 38));
  const k = w / 560;
  return `<defs><linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${th.a}"/><stop offset=".55" stop-color="${th.b}"/><stop offset="1" stop-color="${th.c}"/></linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#${uid}g)"/>` +
    `<circle cx="${w * 0.82}" cy="${h * 0.22}" r="${h * 0.32}" fill="rgba(255,255,255,0.14)"/><circle cx="${w * 0.12}" cy="${h * 0.95}" r="${h * 0.4}" fill="rgba(255,255,255,0.08)"/>` +
    `<svg x="${w * 0.06}" y="${h * 0.06}" width="${w * 0.24}" height="${w * 0.12}" viewBox="0 0 120 60" overflow="visible">${laptopBrandLogoMarkup(l.brand || "TechNest")}</svg>` +
    `<text x="${w * 0.08}" y="${h * 0.52}" font-family="Arial,sans-serif" font-weight="800" font-size="${(name.length > 22 ? 25 : name.length > 16 ? 33 : 42) * k}" fill="#fff">${name}</text>` +
    `<text x="${w * 0.08}" y="${h * 0.68}" font-family="Arial,sans-serif" font-size="${19 * k}" fill="rgba(255,255,255,0.9)">${line1}</text>` +
    `<rect x="${w * 0.08}" y="${h * 0.78}" width="${w * 0.2}" height="${5 * k}" rx="${3 * k}" fill="rgba(255,255,255,0.7)"/>`;
}

/**
 * Simple brand marks (drawn wordmarks / symbols, white with a dark outline so they read on any finish).
 * Returns SVG markup for a 120 x 60 box.
 */
function laptopBrandLogoMarkup(brand) {
  const b = String(brand || "").toLowerCase();
  const st = 'fill="#fff" stroke="#0f172a" stroke-width="1.6" paint-order="stroke" stroke-linejoin="round"';
  const text = (s, size, extra) => `<text x="60" y="38" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="${size}" ${extra || ""} ${st}>${_lapEsc(s)}</text>`;
  if (b === "dell") return `<circle cx="60" cy="30" r="25" fill="none" stroke="#fff" stroke-width="5"/><circle cx="60" cy="30" r="27.5" fill="none" stroke="#0f172a" stroke-width="1.2"/><text x="60" y="37" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="15" ${st}>DELL</text>`;
  if (b === "hp") return `<circle cx="60" cy="30" r="26" fill="#fff" stroke="#0f172a" stroke-width="1.6"/><text x="60" y="41" text-anchor="middle" font-family="Arial,sans-serif" font-style="italic" font-weight="900" font-size="32" fill="#0f172a">hp</text>`;
  if (b === "apple") return `<g stroke="#0f172a" stroke-width="1.6" paint-order="stroke" fill="#fff"><path d="M60 22c-6-5-17-3-20 6-4 12 4 28 12 29 3 0 5-2 8-2s5 2 8 2c6-1 13-14 11-22-5 1-9-3-9-9-3-3-7-4-10-4z"/><path d="M62 18c1-5 5-8 9-8 0 5-3 9-9 8z"/></g>`;
  if (b === "lenovo") return text("Lenovo", 27);
  if (b === "asus") return text("ASUS", 29, 'letter-spacing="2"');
  if (b === "acer") return text("acer", 31);
  if (b === "msi") return text("MSI", 32, 'font-style="italic"');
  if (b === "technest") return text("TechNest", 21);
  const name = String(brand || "Laptop").slice(0, 9);
  return text(name, name.length > 6 ? 18 : 24);
}

function laptopBrandLogoDataUrl(brand) {
  return _lapDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60">${laptopBrandLogoMarkup(brand)}</svg>`);
}

// Put the right brand logo on the back cover of every 3D laptop on the page
function applyBrandLogoToLaptop(el, brand) {
  if (el) el.style.setProperty("--logo", `url("${laptopBrandLogoDataUrl(brand)}")`);
}

function _lapDataUrl(svg) {
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

// Just the screen picture (used on the 3D laptop's display)
function laptopScreenDataUrl(l) {
  l = l || {};
  return _lapDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 350"><!--tn-screen-->${_lapScreenMarkup(l, 560, 350, "s")}</svg>`);
}

// Full product picture: front-view laptop, screen on, keyboard facing the viewer
function laptopRenderDataUrl(l) {
  l = l || {};
  const th = LAPTOP_THEMES[String(l.brand || "").toLowerCase()] || LAPTOP_THEMES.default;
  const gaming = /gaming/i.test(l.category || "");
  const body = gaming ? ["#4b5563", "#1f2937"] : th.body;
  // Keyboard: 4 key rows + space bar, drawn in perspective (rows get wider towards the viewer)
  const rowTop = 203, rowH = 6.4, rowGap = 2.2;
  let keys = "";
  for (let r = 0; r < 4; r++) {
    const y = rowTop + r * (rowH + rowGap);
    const half = 112 + r * 5;            // half-width of this row
    const n = 13, gap = 2, kw = (half * 2 - gap * (n - 1)) / n;
    for (let c = 0; c < n; c++) {
      const fill = gaming ? `hsl(${(c * 28 + r * 30) % 360},85%,60%)` : "#3b4256";
      keys += `<rect x="${(200 - half + c * (kw + gap)).toFixed(1)}" y="${y}" width="${kw.toFixed(1)}" height="${rowH}" rx="1.4" fill="${fill}"/>`;
    }
  }
  const spaceY = rowTop + 4 * (rowH + rowGap);
  keys += `<rect x="146" y="${spaceY}" width="108" height="${rowH}" rx="1.6" fill="${gaming ? "#a78bfa" : "#3b4256"}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><!--tn-render-->` +
    `<defs><linearGradient id="bd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${body[0]}"/><stop offset="1" stop-color="${body[1]}"/></linearGradient></defs>` +
    `<rect width="400" height="300" fill="#ffffff"/>` +
    // screen on top
    `<rect x="64" y="22" width="272" height="176" rx="12" fill="#0b0f1a" stroke="${body[1]}" stroke-width="2"/>` +
    `<svg x="74" y="32" width="252" height="156" viewBox="0 0 252 156" overflow="hidden"><clipPath id="cl"><rect width="252" height="156" rx="4"/></clipPath><g clip-path="url(#cl)">${_lapScreenMarkup(l, 252, 156, "c")}</g></svg>` +
    `<circle cx="200" cy="27" r="1.8" fill="#334155"/>` +
    // keyboard deck below the screen: narrower at the hinge, wider at the front edge (viewed from above)
    `<path d="M60 198 H340 L382 268 Q384 276 374 276 H26 Q16 276 18 268 Z" fill="url(#bd)" stroke="${body[1]}" stroke-width="1"/>` +
    `<rect x="60" y="196" width="280" height="4" fill="rgba(0,0,0,0.35)"/>` +
    // keyboard well, then keys, then trackpad in front
    `<path d="M80 200 H320 L338 246 H62 Z" fill="#161b2b"/>` + keys +
    `<rect x="160" y="252" width="80" height="18" rx="4" fill="rgba(0,0,0,0.10)" stroke="rgba(0,0,0,0.25)" stroke-width="1"/>` +
    `</svg>`;
  return _lapDataUrl(svg);
}

// Home-page hero laptop gets the generic TechNest screen instead of a random stock photo
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".laptop-3d").forEach(el => applyBrandLogoToLaptop(el, "TechNest"));
  const heroImg = document.querySelector(".hero-img-panel .laptop-lid img");
  if (heroImg) heroImg.src = laptopScreenDataUrl({ brand: "TechNest", name: "Premium Laptops", processor: "Apple · Dell · HP · Lenovo · ASUS" });
});
