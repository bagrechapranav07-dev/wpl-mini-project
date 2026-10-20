/**
 * TechNest 3D Viewer — click a laptop image to open an interactive 3D laptop.
 * Features: auto/manual rotation, zoom, finish colours, screen on/off,
 * spec hotspots (click a spec to fly the camera to that part), estimated
 * score bars, side-by-side compare, wishlist and keyboard controls.
 */
(function () {
  var DEFAULT = { rx: 16, ry: -25 };
  var FINISHES = [
    { name: "Silver", a: "#d5dae6", b: "#a3abbd" },
    { name: "Space Gray", a: "#6b7285", b: "#3c4254" },
    { name: "Midnight", a: "#2c3550", b: "#161c30" },
    { name: "Rose Gold", a: "#e8c9c1", b: "#c29a92" },
    { name: "Gold", a: "#e6d3a3", b: "#b79f62" }
  ];
  var modal, laptop, img, titleEl, specsEl, state, current = null;

  /* ---------- helpers ---------- */
  function inr(n) { return "₹" + Number(n).toLocaleString("en-IN"); }
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function inches(l) { return parseFloat(String(l.displaySize || "14").replace(/[^\d.]/g, "")) || 14; }

  function wishlist() {
    try { return JSON.parse(localStorage.getItem("technest_wishlist") || "[]"); } catch (e) { return []; }
  }
  function toggleWish(id) {
    var w = wishlist(), i = w.indexOf(id);
    if (i >= 0) w.splice(i, 1); else w.push(id);
    try { localStorage.setItem("technest_wishlist", JSON.stringify(w)); } catch (e) { }
    return i < 0;
  }

  /* Estimated scores (0-100) derived from the spec sheet */
  function scores(l) {
    var p = String(l.processor || "").toLowerCase(), cpu = 60;
    if (/i9|ryzen 9|max|pro/.test(p)) cpu = 95;
    else if (/i7|ryzen 7|m3|m2|m1/.test(p)) cpu = 80;
    else if (/i5|ryzen 5/.test(p)) cpu = 65;
    else if (/i3|ryzen 3|celeron|pentium/.test(p)) cpu = 45;
    var ram = clamp((l.ramNum || 8) / 32 * 100, 10, 100);
    var off = l.originalPrice ? (l.originalPrice - l.price) / l.originalPrice * 100 : 10;
    return [
      ["Performance", Math.round(cpu * 0.7 + ram * 0.3)],
      ["Multitasking", Math.round(ram)],
      ["Storage", Math.round(clamp((l.storageNum || 256) / 1024 * 100, 10, 100))],
      ["Portability", Math.round(clamp(100 - (inches(l) - 11) * 14 + (/ultra/i.test(l.category || "") ? 10 : 0), 10, 100))],
      ["Value", Math.round(clamp(40 + off * 2 + ((l.rating || 4) - 4) * 30, 10, 100))]
    ];
  }

  /* ---------- build ---------- */
  function build() {
    modal = document.createElement("div");
    modal.className = "v3d-modal";
    modal.innerHTML =
      '<div class="v3d-box">' +
      '  <button class="v3d-close" aria-label="Close">&times;</button>' +
      '  <h3 class="v3d-title"></h3>' +
      '  <div class="v3d-main"><div class="v3d-left">' +
      '    <div class="v3d-stage">' +
      '      <div class="laptop-3d v3d-laptop">' +
      '        <div class="laptop-shadow"></div>' +
      '        <div class="laptop-base">' +
      '          <span class="hs hs-cpu">CPU</span><span class="hs hs-ram">RAM</span><span class="hs hs-ssd">SSD</span>' +
      '        </div>' +
      '        <div class="laptop-lid"><img alt=""></div>' +
      '      </div>' +
      '    </div>' +
      '    <div class="v3d-controls">' +
      '      <button class="v3d-btn active" data-mode="auto">&#10227; Auto Rotate</button>' +
      '      <button class="v3d-btn" data-mode="manual">&#9995; Manual</button>' +
      '      <button class="v3d-btn" data-act="reset">Reset</button>' +
      '      <button class="v3d-btn" data-act="screen">&#128250; Screen: On</button>' +
      '      <label class="v3d-zoom">Zoom <input type="range" min="60" max="150" value="100"></label>' +
      '    </div>' +
      '    <div class="v3d-finish"><span>Finish:</span></div>' +
      '    <p class="v3d-hint">Drag to rotate &bull; arrow keys turn it &bull; +/&minus; zoom &bull; click a spec to inspect that part</p>' +
      '  </div><div class="v3d-specs"></div></div>' +
      '</div>';
    document.body.appendChild(modal);
    laptop = modal.querySelector(".v3d-laptop");
    img = modal.querySelector("img");
    titleEl = modal.querySelector(".v3d-title");
    specsEl = modal.querySelector(".v3d-specs");
    state = { mode: "auto", rx: DEFAULT.rx, ry: DEFAULT.ry, zoom: 1, dragging: false, raf: 0, lx: 0, ly: 0, tween: 0 };

    var fin = modal.querySelector(".v3d-finish");
    FINISHES.forEach(function (f, i) {
      var b = document.createElement("button");
      b.className = "v3d-swatch" + (i === 0 ? " active" : "");
      b.title = f.name; b.dataset.finish = i;
      b.style.background = "linear-gradient(135deg," + f.a + "," + f.b + ")";
      fin.appendChild(b);
    });

    modal.addEventListener("click", onClick);
    specsEl.addEventListener("change", function (e) {
      if (e.target.classList.contains("v3d-cmp-select")) renderCompare(parseInt(e.target.value, 10));
    });
    modal.querySelector("input").addEventListener("input", function (e) { state.zoom = e.target.value / 100; draw(); });

    var stage = modal.querySelector(".v3d-stage");
    stage.addEventListener("pointerdown", function (e) {
      cancelAnimationFrame(state.tween);
      state.dragging = true; state.lx = e.clientX; state.ly = e.clientY;
      if (state.mode === "auto") setMode("manual");
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener("pointermove", function (e) {
      if (!state.dragging) return;
      state.ry += (e.clientX - state.lx) * 0.6;
      state.rx = clamp(state.rx - (e.clientY - state.ly) * 0.4, -10, 70);
      state.lx = e.clientX; state.ly = e.clientY; draw();
    });
    function end() { state.dragging = false; }
    stage.addEventListener("pointerup", end);
    stage.addEventListener("pointercancel", end);

    document.addEventListener("keydown", function (e) {
      if (!modal.classList.contains("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") { setMode("manual"); state.ry -= 8; draw(); }
      else if (e.key === "ArrowRight") { setMode("manual"); state.ry += 8; draw(); }
      else if (e.key === "ArrowUp") { setMode("manual"); state.rx = clamp(state.rx + 5, -10, 70); draw(); }
      else if (e.key === "ArrowDown") { setMode("manual"); state.rx = clamp(state.rx - 5, -10, 70); draw(); }
      else if (e.key === "+" || e.key === "=") setZoom(state.zoom + 0.1);
      else if (e.key === "-") setZoom(state.zoom - 0.1);
    });
  }

  function onClick(e) {
    var t = e.target;
    if (t === modal || t.classList.contains("v3d-close")) return close();

    var sw = t.closest(".v3d-swatch");
    if (sw) {
      var f = FINISHES[sw.dataset.finish];
      laptop.style.setProperty("--ch-a", f.a); laptop.style.setProperty("--ch-b", f.b);
      modal.querySelectorAll(".v3d-swatch").forEach(function (s) { s.classList.toggle("active", s === sw); });
      return;
    }
    var tab = t.closest(".v3d-tab");
    if (tab) return showTab(tab.dataset.tab);

    var row = t.closest("[data-focus]");
    if (row) return focusPart(row.dataset.focus);

    var wish = t.closest(".v3d-wish");
    if (wish && current) {
      var on = toggleWish(current.id);
      wish.classList.toggle("on", on);
      wish.innerHTML = on ? "&#9829; Saved" : "&#9825; Save";
      return;
    }

    var b = t.closest(".v3d-btn");
    if (!b) return;
    if (b.dataset.mode) setMode(b.dataset.mode);
    if (b.dataset.act === "reset") { setMode("manual"); flyTo(DEFAULT.rx, DEFAULT.ry); }
    if (b.dataset.act === "screen") {
      var off = laptop.classList.toggle("screen-off");
      b.innerHTML = "&#128250; Screen: " + (off ? "Off" : "On");
    }
  }

  /* ---------- 3D state ---------- */
  function draw() {
    laptop.style.transform = "scale(" + state.zoom + ") rotateX(" + state.rx + "deg) rotateY(" + state.ry + "deg)";
  }
  function setZoom(z) {
    state.zoom = clamp(z, 0.6, 1.5);
    modal.querySelector("input").value = Math.round(state.zoom * 100); draw();
  }
  function tick() {
    if (state.mode === "auto" && !state.dragging) { state.ry += 0.6; draw(); }
    state.raf = requestAnimationFrame(tick);
  }
  function setMode(m) {
    state.mode = m;
    modal.querySelectorAll("[data-mode]").forEach(function (b) { b.classList.toggle("active", b.dataset.mode === m); });
  }

  /* smoothly fly the camera to a target angle (shortest way round) */
  function flyTo(rx, ry) {
    cancelAnimationFrame(state.tween);
    var sx = state.rx, sy = state.ry, t0 = performance.now(), dur = 700;
    var dy = ((ry - sy) % 360 + 540) % 360 - 180;
    (function step(now) {
      var k = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
      state.rx = sx + (rx - sx) * e; state.ry = sy + dy * e; draw();
      if (k < 1) state.tween = requestAnimationFrame(step);
    })(t0);
  }

  function focusPart(part) {
    setMode("manual");
    modal.querySelectorAll(".glow").forEach(function (n) { n.classList.remove("glow"); });
    modal.querySelectorAll("[data-focus]").forEach(function (n) { n.classList.toggle("sel", n.dataset.focus === part); });
    laptop.classList.remove("show-hs");
    if (part === "display") {
      flyTo(4, 0); laptop.querySelector(".laptop-lid").classList.add("glow");
    } else {
      flyTo(58, 0); laptop.classList.add("show-hs");
      var hs = laptop.querySelector(".hs-" + part);
      if (hs) hs.classList.add("glow");
    }
  }

  /* ---------- panel ---------- */
  function renderPanel(l) {
    if (!l) { specsEl.style.display = "none"; return; }
    specsEl.style.display = "";
    var off = l.originalPrice ? Math.round((l.originalPrice - l.price) / l.originalPrice * 100) : 0;
    var rows = [
      ["Brand", l.brand], ["Category", l.category],
      ["Processor", l.processor, "cpu"], ["Series", l.processorSeries],
      ["Memory (RAM)", l.ram, "ram"], ["Storage", l.storage, "ssd"],
      ["Display", l.displaySize, "display"], ["Operating System", l.os],
      ["Rating", "★ " + l.rating + " (" + Number(l.reviewsCount).toLocaleString("en-IN") + " reviews)"]
    ].filter(function (r) { return r[1]; });

    var specTable = '<table>' + rows.map(function (r) {
      return r[2]
        ? '<tr class="clickable" data-focus="' + r[2] + '"><th>' + r[0] + '</th><td>' + r[1] + ' <em>&#128269;</em></td></tr>'
        : '<tr><th>' + r[0] + '</th><td>' + r[1] + '</td></tr>';
    }).join("") + '</table><p class="v3d-tip">&#128161; Tap Processor, RAM, Storage or Display to inspect it on the 3D model.</p>';

    var bars = scores(l).map(function (s) {
      return '<div class="v3d-bar"><span>' + s[0] + '</span><div><i style="width:' + s[1] + '%"></i></div><b>' + s[1] + '</b></div>';
    }).join("") + '<p class="v3d-tip">Estimated from processor, RAM, storage, size and price &mdash; a guide, not a benchmark.</p>';

    var opts = (typeof LAPTOPS !== "undefined" ? LAPTOPS : []).filter(function (x) { return x.id !== l.id; })
      .map(function (x) { return '<option value="' + x.id + '">' + x.name + '</option>'; }).join("");
    var cmp = '<select class="v3d-cmp-select"><option value="">Compare with&hellip;</option>' + opts + '</select><div class="v3d-cmp"></div>';

    var saved = wishlist().indexOf(l.id) >= 0;
    specsEl.innerHTML =
      '<div class="v3d-tabs"><button class="v3d-tab active" data-tab="specs">Specs</button>' +
      '<button class="v3d-tab" data-tab="scores">Scores</button><button class="v3d-tab" data-tab="compare">Compare</button>' +
      '<button class="v3d-wish' + (saved ? " on" : "") + '">' + (saved ? "&#9829; Saved" : "&#9825; Save") + '</button></div>' +
      '<div class="v3d-pane" data-pane="specs">' + specTable + '<p class="v3d-desc">' + (l.description || "") + '</p></div>' +
      '<div class="v3d-pane" data-pane="scores" hidden>' + bars + '</div>' +
      '<div class="v3d-pane" data-pane="compare" hidden>' + cmp + '</div>' +
      '<div class="v3d-price"><b>' + inr(l.price) + '</b>' +
      (l.originalPrice ? ' <s>' + inr(l.originalPrice) + '</s> <span>' + off + '% off</span>' : "") + '</div>' +
      '<div class="v3d-buy"><button class="btn btn-outline btn-sm" onclick="addToCart(' + l.id + ", 'laptop', false)\">Add to Cart</button>" +
      '<button class="btn btn-accent btn-sm" onclick="buyNowDirect(' + l.id + ", 'laptop')\">Buy Now</button></div>";
  }

  function showTab(name) {
    specsEl.querySelectorAll(".v3d-tab").forEach(function (t) { t.classList.toggle("active", t.dataset.tab === name); });
    specsEl.querySelectorAll(".v3d-pane").forEach(function (p) { p.hidden = p.dataset.pane !== name; });
  }

  function renderCompare(id) {
    var box = specsEl.querySelector(".v3d-cmp");
    var o = LAPTOPS.find(function (x) { return x.id === id; });
    if (!o) { box.innerHTML = ""; return; }
    var a = current;
    // [label, a value, b value, higherIsBetter]
    var rows = [
      ["Price", a.price, o.price, false, inr], ["Processor", a.processor, o.processor],
      ["RAM", a.ramNum, o.ramNum, true, function (v) { return v + " GB"; }],
      ["Storage", a.storageNum, o.storageNum, true, function (v) { return v + " GB"; }],
      ["Display", a.displaySize, o.displaySize], ["Rating", a.rating, o.rating, true, function (v) { return "★ " + v; }]
    ];
    var sa = scores(a)[0][1], sb = scores(o)[0][1];
    rows.push(["Perf. score", sa, sb, true, String]);
    box.innerHTML = '<table><tr><th></th><th>' + a.name + '</th><th>' + o.name + '</th></tr>' + rows.map(function (r) {
      var f = r[4] || String, wa = "", wb = "";
      if (r[3] !== undefined && r[1] !== r[2]) {
        var aWins = r[3] ? r[1] > r[2] : r[1] < r[2];
        if (aWins) wa = ' class="win"'; else wb = ' class="win"';
      }
      return '<tr><th>' + r[0] + '</th><td' + wa + '>' + f(r[1]) + '</td><td' + wb + '>' + f(r[2]) + '</td></tr>';
    }).join("") + '</table><p class="v3d-tip">Green marks the better value in each row.</p>';
  }

  /* ---------- open / close ---------- */
  function open(src, name, l) {
    if (!modal) build();
    current = l || null;
    renderPanel(l);
    img.src = src; titleEl.textContent = name || "3D View";
    laptop.classList.remove("screen-off", "show-hs");
    laptop.style.removeProperty("--ch-a"); laptop.style.removeProperty("--ch-b");
    modal.querySelectorAll(".glow").forEach(function (n) { n.classList.remove("glow"); });
    modal.querySelectorAll(".v3d-swatch").forEach(function (s, i) { s.classList.toggle("active", i === 0); });
    modal.querySelector('[data-act="screen"]').innerHTML = "&#128250; Screen: On";
    state.rx = DEFAULT.rx; state.ry = DEFAULT.ry; state.zoom = 1;
    modal.querySelector("input").value = 100;
    setMode("auto"); draw();
    laptop.classList.remove("opening"); void laptop.offsetWidth; laptop.classList.add("opening");
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    cancelAnimationFrame(state.raf); tick();
  }

  function close() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
    cancelAnimationFrame(state.raf); cancelAnimationFrame(state.tween);
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
