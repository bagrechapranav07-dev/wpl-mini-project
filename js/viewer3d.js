/**
 * TechNest 3D Viewer — click a laptop image to open an interactive 3D laptop.
 * Features: auto/manual rotation, zoom, finish colours, screen on/off,
 * spec hotspots (click a spec to fly the camera to that part), estimated
 * score bars, side-by-side compare, wishlist and keyboard controls.
 */
(function () {
  var DEFAULT = { rx: 26, ry: -25 };
  var FINISHES = [
    { name: "Original" },
    { name: "Silver", a: "#d5dae6", b: "#a3abbd" },
    { name: "Space Gray", a: "#6b7285", b: "#3c4254" },
    { name: "Midnight", a: "#2c3550", b: "#161c30" },
    { name: "Rose Gold", a: "#e8c9c1", b: "#c29a92" },
    { name: "Gold", a: "#e6d3a3", b: "#b79f62" }
  ];
  var gl = null, glPending = null; // three.js view (js/laptop3d.js); the CSS laptop is the fallback
  var modal, laptop, img, titleEl, specsEl, xstack, state, current = null, step = 0, playing = true, xTimer = 0, view = "model", LAST = 9;

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
      '    <div class="v3d-views"><button class="v3d-view active" data-view="model">&#128187; 3D Model</button>' +
      '      <button class="v3d-view" data-view="asm">&#9881; See Assembly</button></div>' +
      '    <div class="v3d-pm">' +
      '    <div class="v3d-stage v3d-mstage"><div class="v3d-gl"></div>' +
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
      '      <button class="v3d-btn" data-act="lid">&#128187; Close Lid</button>' +
      '      <label class="v3d-zoom">Zoom <input type="range" min="60" max="150" value="100"></label>' +
      '    </div>' +
      '    <div class="v3d-finish"><span>Finish:</span></div>' +
      '    <p class="v3d-hint">Drag to rotate &bull; arrow keys turn it &bull; +/&minus; zoom &bull; click a spec to inspect that part</p>' +
      '    </div>' +
      '    <div class="v3d-xwrap" hidden>' +
      '      <div class="v3d-xhead"><b>&#9881; How it is assembled <small>(watch it being built)</small></b>' +
      '      </div>' +
      '      <div class="v3d-steps"><div class="v3d-step-cap"></div><div class="v3d-dots"></div>' +
      '        <div class="v3d-step-btns"><button class="v3d-btn" data-act="sprev">&#9198; Back</button>' +
      '        <button class="v3d-btn active" data-act="splay">&#9208; Pause</button>' +
      '        <button class="v3d-btn" data-act="snext">Next &#9197;</button>' +
      '        <button class="v3d-btn" data-act="srestart">&#8635; Restart</button></div></div>' +
      '      <div class="v3d-parts-title">Components used (tap one to jump to it)</div><ul class="v3d-parts"></ul>' +
      '      <div class="v3d-stage v3d-xstage"><div class="xv-scene"><div class="xv-stack" id="vxStack">' +
      '        <div class="xv-layer xv-case" data-step="1" style="--i:0"><span class="xv-screw"></span><span class="xv-screw s2"></span><span class="xv-screw s3"></span><span class="xv-screw s4"></span></div>' +
      '        <div class="xv-layer xv-bat" data-step="2" style="--i:1"><div class="xv-img" data-x="bat"></div></div>' +
      '        <div class="xv-layer xv-board" data-step="3" style="--i:2">' +
      '          <div class="xv-chip xc-cpu" data-step="4" data-x="cpu" style="left:105px;top:50px;width:78px"></div>' +
      '          <div class="xv-chip xc-ram" data-step="5" data-x="ram" style="left:12px;top:132px;width:110px"></div>' +
      '          <div class="xv-chip xc-ssd" data-step="6" data-x="ssd" style="left:180px;top:135px;width:120px"></div>' +
      '        </div>' +
      '        <div class="xv-layer xv-kb" data-step="7" style="--i:3"><div class="xv-img" data-x="kb"></div></div>' +
      '        <div class="xv-layer xv-lid" data-step="8" style="--i:4"><img alt=""></div>' +
      '      </div></div></div>' +
      '      <ul class="xv-legend">' +
      '        <li data-l="lid"><i style="background:#ec4899"></i>Display</li><li data-l="kb"><i style="background:#38bdf8"></i>Keyboard</li>' +
      '        <li data-l="board"><i style="background:#22c55e"></i>Motherboard</li><li data-l="bat"><i style="background:#f59e0b"></i>Battery</li>' +
      '        <li data-l="case"><i style="background:#94a3b8"></i>Bottom case</li></ul>' +
      '    </div>' +
      '  </div><div class="v3d-specs"></div></div>' +
      '</div>';
    document.body.appendChild(modal);
    laptop = modal.querySelector(".v3d-laptop");
    img = modal.querySelector("img");
    titleEl = modal.querySelector(".v3d-title");
    specsEl = modal.querySelector(".v3d-specs");
    xstack = modal.querySelector("#vxStack");
    state = { mode: "auto", rx: DEFAULT.rx, ry: DEFAULT.ry, zoom: 1, dragging: false, raf: 0, lx: 0, ly: 0, tween: 0 };

    var fin = modal.querySelector(".v3d-finish");
    FINISHES.forEach(function (f, i) {
      var b = document.createElement("button");
      b.className = "v3d-swatch" + (i === 0 ? " active" : "");
      b.title = f.name; b.dataset.finish = i;
      b.style.background = f.a ? "linear-gradient(135deg," + f.a + "," + f.b + ")" : "conic-gradient(#2e3642 0 25%,#c9ccd1 0 50%,#5d5a5c 0 75%,#d9d6cf 0)";
      fin.appendChild(b);
    });

    modal.addEventListener("click", onClick);
    if (window.Laptop3D) {
      Laptop3D.load().then(function () {
        gl = Laptop3D.create(modal.querySelector(".v3d-gl"));
        modal.querySelector(".v3d-mstage").classList.add("gl-on");
        if (glPending) { gl.setLaptop(glPending); glPending = null; }
        draw();
      }).catch(function (e) { console.warn("3D engine unavailable, using CSS laptop", e); });
    }
    modal.querySelectorAll(".xv-legend li").forEach(function (li) {
      li.addEventListener("mouseenter", function () { xstack.classList.add("focus-" + li.dataset.l); });
      li.addEventListener("mouseleave", function () { xstack.classList.remove("focus-" + li.dataset.l); });
    });
    specsEl.addEventListener("change", function (e) {
      if (e.target.classList.contains("v3d-cmp-select")) renderCompare(parseInt(e.target.value, 10));
    });
    modal.querySelector("input").addEventListener("input", function (e) { state.zoom = e.target.value / 100; draw(); });

    modal.querySelectorAll(".v3d-stage").forEach(function (stage) {
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
    });

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
      [laptop, xstack].forEach(function (n) {
        if (f.a) { n.style.setProperty("--ch-a", f.a); n.style.setProperty("--ch-b", f.b); }
        else { n.style.removeProperty("--ch-a"); n.style.removeProperty("--ch-b"); }
      });
      if (gl) gl.setFinish(f.a || null);
      modal.querySelectorAll(".v3d-swatch").forEach(function (s) { s.classList.toggle("active", s === sw); });
      return;
    }
    var vw = t.closest(".v3d-view");
    if (vw) return setView(vw.dataset.view);
    var pr = t.closest(".v3d-part[data-step]");
    if (pr) { playing = false; updatePlayBtn(); return setStep(+pr.dataset.step); }
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
    if (b.dataset.act === "splay") { playing = !playing; updatePlayBtn(); }
    if (b.dataset.act === "snext") { playing = false; updatePlayBtn(); setStep(Math.min(step + 1, LAST)); }
    if (b.dataset.act === "sprev") { playing = false; updatePlayBtn(); setStep(Math.max(step - 1, 0)); }
    if (b.dataset.act === "srestart") { playing = true; updatePlayBtn(); setStep(0); }
    if (b.dataset.act === "reset") { setMode("manual"); flyTo(DEFAULT.rx, DEFAULT.ry); }
    if (b.dataset.act === "screen") {
      var off = laptop.classList.toggle("screen-off");
      if (gl) gl.setScreen(!off);
      b.innerHTML = "&#128250; Screen: " + (off ? "Off" : "On");
    }
    if (b.dataset.act === "lid") {
      var shut = b.classList.toggle("shut");
      if (gl) gl.setLid(!shut);
      b.innerHTML = "&#128187; " + (shut ? "Open Lid" : "Close Lid");
    }
  }

  /* ---------- 3D state ---------- */
  function draw() {
    if (gl) gl.frame(state.rx, state.ry, state.zoom);
    else laptop.style.transform = "scale(" + (state.zoom * 0.8) + ") rotateX(" + (-state.rx) + "deg) rotateY(" + state.ry + "deg)";
    xstack.style.transform = "scale(" + state.zoom + ") rotateX(" + clamp(40 + state.rx * 0.8, 20, 88) + "deg) rotateZ(" + (state.ry + 25) + "deg)";
  }
  function setZoom(z) {
    state.zoom = clamp(z, 0.6, 1.5);
    modal.querySelector("input").value = Math.round(state.zoom * 100); draw();
  }
  function tick() {
    if (state.mode === "auto" && !state.dragging) state.ry += 0.6;
    draw(); // every frame: the 3D lid and highlight animations need it
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
    if (gl) gl.highlight(part);
    xstack.classList.remove("focus-lid", "focus-board");
    playing = false; updatePlayBtn(); setStep(LAST - 1);
    xstack.classList.add(part === "display" ? "focus-lid" : "focus-board");
    var xc = xstack.querySelector(part === "display" ? ".xv-lid" : ".xc-" + part);
    if (xc) xc.classList.add("glow");
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

  /* ---------- assembly view ---------- */
  var STEP_NAMES = [
    "Press Play to watch it being built",
    "Bottom case &mdash; the base of the laptop",
    "Battery &mdash; powers the laptop",
    "Motherboard &mdash; connects everything together",
    "Processor &mdash; %CPU%, the brain",
    "Memory &mdash; %RAM% GB RAM, short-term memory",
    "Storage &mdash; %SSD% SSD, keeps your files",
    "Keyboard &mdash; typing and trackpad",
    "Display &mdash; the screen",
    "Done! Your laptop is assembled"
  ];

  function updatePlayBtn() {
    var b = modal.querySelector('[data-act="splay"]');
    b.innerHTML = playing ? "&#9208; Pause" : "&#9654; Play";
    b.classList.toggle("active", playing);
  }

  function setView(v) {
    view = v;
    modal.querySelectorAll(".v3d-view").forEach(function (b) { b.classList.toggle("active", b.dataset.view === v); });
    modal.querySelector(".v3d-pm").hidden = v !== "model";
    modal.querySelector(".v3d-xwrap").hidden = v !== "asm";
    if (v === "asm") { playing = true; updatePlayBtn(); setStep(0); }
  }

  /* step 0 = nothing fitted, 1..8 = parts fitted one by one, 9 = closed up */
  function setStep(n) {
    step = n;
    xstack.style.setProperty("--gap", (n >= LAST ? 4 : 52) + "px");
    xstack.querySelectorAll("[data-step]").forEach(function (el) {
      var s = +el.dataset.step;
      el.classList.toggle("out", s > n);
      el.classList.toggle("now", s === n && n < LAST);
    });
    var l = current || {}, cap = STEP_NAMES[n]
      .replace("%CPU%", l.processor || "processor").replace("%RAM%", l.ramNum || 8).replace("%SSD%", storageLabel(l));
    modal.querySelector(".v3d-step-cap").innerHTML = "<b>Step " + n + " / " + LAST + "</b> &mdash; " + cap;
    var dots = modal.querySelector(".v3d-dots");
    if (!dots.children.length) for (var i = 0; i <= LAST; i++) dots.appendChild(document.createElement("i"));
    Array.prototype.forEach.call(dots.children, function (d, i) { d.classList.toggle("on", i <= n); });
    modal.querySelectorAll(".v3d-part[data-step]").forEach(function (r) {
      var s = +r.dataset.step;
      r.classList.toggle("done", s <= n); r.classList.toggle("cur", s === n && n < LAST);
    });
  }

  function renderParts(l) {
    var rows = [
      [1, "Bottom case", "Metal base / chassis"], [2, "Battery", "Rechargeable Li-ion"],
      [3, "Motherboard", (l.brand || "") + " main board"], [4, "Processor (CPU)", l.processor],
      [5, "Memory (RAM)", l.ram || ((l.ramNum || 8) + " GB")], [6, "Storage (SSD)", l.storage || storageLabel(l)],
      [7, "Keyboard", "Keys + trackpad"], [8, "Display", (l.displaySize || "") + " screen"]
    ];
    if (l.os) rows.push([0, "Software", l.os]);
    modal.querySelector(".v3d-parts").innerHTML = rows.map(function (r) {
      return '<li class="v3d-part"' + (r[0] ? ' data-step="' + r[0] + '"' : "") + '><i></i><b>' + r[1] + "</b><span>" + r[2] + "</span></li>";
    }).join("");
  }

  function stepTimer() {
    clearInterval(xTimer);
    var wait = 0;
    xTimer = setInterval(function () {
      if (view !== "asm" || !playing) return;
      if (step >= LAST) { if (++wait < 2) return; wait = 0; return setStep(0); }
      wait = 0; setStep(step + 1);
    }, 2600);
  }

  function svg(w, h, body) { return '<svg viewBox="0 0 ' + w + " " + h + '" xmlns="http://www.w3.org/2000/svg">' + body + "</svg>"; }
  function storageLabel(l) { var n = l.storageNum || 256; return n >= 1024 ? (n / 1024) + " TB" : n + " GB"; }
  function partSvg(kind, l) {
    var i, j, r, q;
    if (kind === "cpu") {
      var w = String(l.processor || "CPU").split(" "), a = w[0].toUpperCase(), b = w.slice(1).join(" ").slice(0, 10), pins = "";
      for (i = 0; i < 8; i++) { var p = 22 + i * 10; pins += '<rect x="' + p + '" y="6" width="4" height="8" fill="#c9a24b"/><rect x="' + p + '" y="86" width="4" height="8" fill="#c9a24b"/><rect x="6" y="' + (p - 8) + '" width="8" height="4" fill="#c9a24b"/><rect x="86" y="' + (p - 8) + '" width="8" height="4" fill="#c9a24b"/>'; }
      return svg(100, 100, '<rect x="12" y="12" width="76" height="76" rx="6" fill="#1f2937" stroke="#64748b" stroke-width="2"/>' + pins + '<rect x="26" y="26" width="48" height="48" rx="4" fill="#94a3b8"/><text x="50" y="48" text-anchor="middle" font-size="10" font-weight="800" fill="#0f172a">' + a + '</text><text x="50" y="62" text-anchor="middle" font-size="9" font-weight="800" fill="#0f172a">' + b + "</text>");
    }
    if (kind === "ram") {
      var c = "", g = "";
      for (i = 0; i < 4; i++) c += '<rect x="' + (20 + i * 38) + '" y="18" width="30" height="26" rx="2" fill="#111827"/>';
      for (j = 0; j < 20; j++) g += '<rect x="' + (8 + j * 7) + '" y="56" width="4" height="10" fill="#d4af37"/>';
      return svg(160, 80, '<rect x="4" y="8" width="152" height="60" rx="4" fill="#15803d"/>' + c + g + '<text x="80" y="55" text-anchor="middle" font-size="11" font-weight="800" fill="#fff">' + (l.ramNum || 8) + " GB RAM</text>");
    }
    if (kind === "ssd") return svg(160, 70, '<rect x="14" y="10" width="136" height="42" rx="4" fill="#1e3a8a"/><rect x="26" y="16" width="30" height="30" rx="2" fill="#0f172a"/><rect x="62" y="16" width="30" height="30" rx="2" fill="#0f172a"/><rect x="98" y="20" width="44" height="22" rx="2" fill="#e2e8f0"/><text x="120" y="35" text-anchor="middle" font-size="9" font-weight="800" fill="#0f172a">' + storageLabel(l) + '</text><rect x="4" y="14" width="10" height="34" fill="#d4af37"/>');
    if (kind === "kb") {
      var k = "";
      for (r = 0; r < 4; r++) for (q = 0; q < 12; q++) k += '<rect x="' + (8 + q * 12) + '" y="' + (8 + r * 14) + '" width="10" height="11" rx="2" fill="#e2e8f0"/>';
      return svg(160, 70, '<rect x="2" y="2" width="156" height="66" rx="6" fill="#1e293b"/>' + k);
    }
    return svg(150, 80, '<rect x="6" y="14" width="130" height="52" rx="6" fill="#065f46" stroke="#34d399" stroke-width="2"/><rect x="136" y="30" width="10" height="20" rx="2" fill="#34d399"/><text x="70" y="45" text-anchor="middle" font-size="11" font-weight="800" fill="#d1fae5">LI-ION BATTERY</text>');
  }
  function renderXv(l, src) {
    modal.querySelector(".v3d-views").style.display = l ? "" : "none";
    if (!l) return;
    xstack.querySelectorAll("[data-x]").forEach(function (n) { n.innerHTML = partSvg(n.dataset.x, l); });
    xstack.querySelector(".xv-lid img").src = src;
    xstack.style.removeProperty("--ch-a"); xstack.style.removeProperty("--ch-b");
    xstack.classList.remove("focus-lid", "focus-board", "focus-kb", "focus-bat", "focus-case");
  }

  /* ---------- open / close ---------- */
  function open(src, name, l) {
    if (!modal) build();
    // the screen shows a wallpaper, never the product photo itself
    if (l && typeof laptopScreenDataUrl === "function") src = laptopScreenDataUrl(l);
    var model = l || { brand: "TechNest", name: "TechNest Laptop", displaySize: '15.6"', category: "Professional" };
    if (gl) { gl.setLaptop(model); gl.highlight(null); gl.setFinish(null); gl.setScreen(true); } else glPending = model;
    var lidBtn = modal.querySelector('[data-act="lid"]');
    lidBtn.classList.remove("shut"); lidBtn.innerHTML = "&#128187; Close Lid";
    current = l || null;
    if (typeof applyBrandLogoToLaptop === "function") applyBrandLogoToLaptop(laptop, l ? l.brand : "TechNest");
    renderPanel(l);
    img.src = src; titleEl.textContent = name || "3D View";
    laptop.classList.remove("screen-off", "show-hs");
    laptop.style.removeProperty("--ch-a"); laptop.style.removeProperty("--ch-b");
    modal.querySelectorAll(".glow").forEach(function (n) { n.classList.remove("glow"); });
    modal.querySelectorAll(".v3d-swatch").forEach(function (s, i) { s.classList.toggle("active", i === 0); });
    modal.querySelector('[data-act="screen"]').innerHTML = "&#128250; Screen: On";
    state.rx = DEFAULT.rx; state.ry = DEFAULT.ry; state.zoom = 1;
    modal.querySelector("input").value = 100;
    renderXv(l, src); renderParts(l || {}); setView("model");
    setMode("auto"); draw();
    stepTimer();
    laptop.classList.remove("opening"); void laptop.offsetWidth; laptop.classList.add("opening");
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
    cancelAnimationFrame(state.raf); tick();
  }

  function close() {
    modal.classList.remove("open");
    document.body.style.overflow = "";
    cancelAnimationFrame(state.raf); cancelAnimationFrame(state.tween); clearInterval(xTimer);
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
