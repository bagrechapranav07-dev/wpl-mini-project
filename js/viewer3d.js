/**
 * TechNest 3D Viewer — click a laptop image to open an interactive 3D laptop.
 * Modes: Auto (continuous spin), Manual (drag to rotate), plus zoom and reset.
 */
(function () {
  var DEFAULT = { rx: 16, ry: -25 };
  var modal, laptop, img, titleEl, specsEl, state;

  function build() {
    modal = document.createElement("div");
    modal.className = "v3d-modal";
    modal.innerHTML =
      '<div class="v3d-box">' +
      '  <button class="v3d-close" aria-label="Close">&times;</button>' +
      '  <h3 class="v3d-title"></h3>' +
      '  <div class="v3d-main"><div class="v3d-left">' +
      '  <div class="v3d-stage">' +
      '    <div class="laptop-3d v3d-laptop">' +
      '      <div class="laptop-shadow"></div><div class="laptop-base"></div>' +
      '      <div class="laptop-lid"><img alt=""></div>' +
      '    </div>' +
      '  </div>' +
      '  <div class="v3d-controls">' +
      '    <button class="v3d-btn active" data-mode="auto">&#10227; Auto Rotate</button>' +
      '    <button class="v3d-btn" data-mode="manual">&#9995; Manual (drag)</button>' +
      '    <button class="v3d-btn" data-act="reset">Reset</button>' +
      '    <label class="v3d-zoom">Zoom <input type="range" min="60" max="150" value="100"></label>' +
      '  </div>' +
      '  <p class="v3d-hint">Auto mode spins the laptop 360&deg;. Drag with mouse/finger to rotate yourself.</p>' +
      '  </div><div class="v3d-specs"></div></div>' +
      '</div>';
    document.body.appendChild(modal);
    laptop = modal.querySelector(".v3d-laptop");
    img = modal.querySelector("img");
    titleEl = modal.querySelector(".v3d-title");
    specsEl = modal.querySelector(".v3d-specs");
    state = { mode: "auto", rx: DEFAULT.rx, ry: DEFAULT.ry, zoom: 1, dragging: false, raf: 0, lx: 0, ly: 0 };

    modal.addEventListener("click", function (e) {
      if (e.target === modal || e.target.classList.contains("v3d-close")) close();
      var b = e.target.closest(".v3d-btn");
      if (!b) return;
      if (b.dataset.mode) setMode(b.dataset.mode);
      if (b.dataset.act === "reset") { state.rx = DEFAULT.rx; state.ry = DEFAULT.ry; draw(); }
    });
    modal.querySelector("input").addEventListener("input", function (e) {
      state.zoom = e.target.value / 100; draw();
    });

    var stage = modal.querySelector(".v3d-stage");
    stage.addEventListener("pointerdown", function (e) {
      state.dragging = true; state.lx = e.clientX; state.ly = e.clientY;
      if (state.mode === "auto") setMode("manual");
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener("pointermove", function (e) {
      if (!state.dragging) return;
      state.ry += (e.clientX - state.lx) * 0.6;
      state.rx = Math.max(-10, Math.min(60, state.rx - (e.clientY - state.ly) * 0.4));
      state.lx = e.clientX; state.ly = e.clientY; draw();
    });
    function end() { state.dragging = false; }
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", end);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  function draw() {
    laptop.style.transform =
      "scale(" + state.zoom + ") rotateX(" + state.rx + "deg) rotateY(" + state.ry + "deg)";
  }

  function tick() {
    if (state.mode === "auto" && !state.dragging) { state.ry += 0.6; draw(); }
    state.raf = requestAnimationFrame(tick);
  }

  function setMode(m) {
    state.mode = m;
    modal.querySelectorAll("[data-mode]").forEach(function (b) {
      b.classList.toggle("active", b.dataset.mode === m);
    });
  }

  function inr(n) { return "₹" + Number(n).toLocaleString("en-IN"); }

  function renderSpecs(l) {
    if (!l) { specsEl.style.display = "none"; return; }
    specsEl.style.display = "";
    var rows = [
      ["Brand", l.brand], ["Category", l.category], ["Processor", l.processor], ["Series", l.processorSeries],
      ["Memory (RAM)", l.ram], ["Storage", l.storage], ["Display", l.displaySize], ["Operating System", l.os],
      ["Rating", "★ " + l.rating + " (" + Number(l.reviewsCount).toLocaleString("en-IN") + " reviews)"]
    ].filter(function (r) { return r[1]; });
    var off = l.originalPrice ? Math.round((l.originalPrice - l.price) / l.originalPrice * 100) : 0;
    specsEl.innerHTML =
      '<h4>Specifications</h4><table>' +
      rows.map(function (r) { return "<tr><th>" + r[0] + "</th><td>" + r[1] + "</td></tr>"; }).join("") +
      '</table><p class="v3d-desc">' + (l.description || "") + '</p>' +
      '<div class="v3d-price"><b>' + inr(l.price) + '</b>' +
      (l.originalPrice ? ' <s>' + inr(l.originalPrice) + '</s> <span>' + off + '% off</span>' : "") + '</div>' +
      '<div class="v3d-buy"><button class="btn btn-outline btn-sm" onclick="addToCart(' + l.id + ", 'laptop', false)\">Add to Cart</button>" +
      '<button class="btn btn-accent btn-sm" onclick="buyNowDirect(' + l.id + ", 'laptop')\">Buy Now</button></div>";
  }

  function open(src, name, l) {
    if (!modal) build();
    renderSpecs(l);
    img.src = src; titleEl.textContent = name || "3D View";
    state.rx = DEFAULT.rx; state.ry = DEFAULT.ry; state.zoom = 1;
    modal.querySelector("input").value = 100;
    setMode("auto"); draw();
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    cancelAnimationFrame(state.raf); tick();
  }

  function close() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
    cancelAnimationFrame(state.raf);
  }

  document.addEventListener("click", function (e) {
    var wrap = e.target.closest(".product-img-wrap");
    if (wrap && wrap.querySelector("img")) {
      var card = wrap.closest(".product-card");
      var t = card && card.querySelector(".product-title");
      var im = wrap.querySelector("img"), id = parseInt((im.id || "").replace("img_", ""), 10);
      var l = typeof LAPTOPS !== "undefined" ? LAPTOPS.find(function (x) { return x.id === id; }) : null;
      open(im.src, t ? t.textContent : "", l);
      return;
    }
    var hero = e.target.closest(".hero-img-panel .laptop-3d");
    if (hero) open(hero.querySelector("img").src, "TechNest Laptop");
  });
})();
