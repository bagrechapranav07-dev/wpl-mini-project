/**
 * TechNest real-time 3D laptop (three.js).
 * Builds each catalogue laptop as an actual 3D object from its spec sheet and a per-model profile
 * (size, thickness, colour, logo, keyboard, ports, hinge...). If a downloaded model exists at
 * models/laptops/<slug>.glb (or the laptop's `model3d` field), that file is shown instead.
 *
 * Laptop3D.load() -> Promise (loads three.js once); Laptop3D.create(container) -> view with
 * setLaptop(l), setFinish(hex|null), setScreen(on), setLid(open), highlight(part), frame(rx, ry, zoom).
 */
(function () {
  var CDN = "https://cdn.jsdelivr.net/npm/three@0.128.0/";
  var loading = null;

  function addScript(src) {
    return new Promise(function (ok, fail) {
      var s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = fail;
      document.head.appendChild(s);
    });
  }
  function load() {
    if (!loading) {
      loading = addScript(CDN + "build/three.min.js").then(function () {
        // Optional extras: a failure here only loses .glb support / reflections
        return Promise.all([
          addScript(CDN + "examples/js/loaders/GLTFLoader.js").catch(function () { }),
          addScript(CDN + "examples/js/environments/RoomEnvironment.js").catch(function () { })
        ]);
      });
    }
    return loading;
  }

  /* ---------- per-model profiles (colours taken from the product photos) ---------- */
  // thick = closed thickness (cm), ar = screen aspect ratio, chin = bezel below the screen (cm)
  var BRAND = {
    apple:    { body: "#c9ccd1", keys: "#16171a", metal: 0.6, rough: 0.42, thick: 1.4, ar: 1.54, chin: 1.0, logo: "apple", hinge: "full" },
    dell:     { body: "#c3c6cc", deck: "#1c1d20", keys: "#121314", metal: 0.7, rough: 0.4, thick: 1.6, ar: 1.6, chin: 1.2, logo: "dell" },
    hp:       { body: "#cfd0d2", keys: "#d9dadc", metal: 0.6, rough: 0.45, thick: 1.8, ar: 1.78, chin: 1.6, logo: "hp" },
    lenovo:   { body: "#232427", keys: "#141516", metal: 0.1, rough: 0.7, thick: 1.9, ar: 1.78, chin: 1.6, logo: "lenovo" },
    asus:     { body: "#2a2d33", keys: "#16181c", metal: 0.3, rough: 0.55, thick: 2.4, ar: 1.6, chin: 1.8, logo: "rog" },
    acer:     { body: "#18191b", keys: "#101112", metal: 0.1, rough: 0.6, thick: 2.4, ar: 1.78, chin: 2.0, logo: "acer" },
    msi:      { body: "#2b2c2e", keys: "#131314", metal: 0.4, rough: 0.5, thick: 2.2, ar: 1.78, chin: 1.8, logo: "msi" },
    technest: { body: "#c3c6cc", deck: "#1c1d20", keys: "#121314", metal: 0.7, rough: 0.4, thick: 1.8, ar: 1.6, chin: 1.2, logo: "technest" },
    other:    { body: "#9ca3af", keys: "#1f2937", metal: 0.4, rough: 0.5, thick: 1.9, ar: 1.78, chin: 1.6, logo: "text" }
  };
  var MODELS = [
    [/macbook air/i, { body: "#2e3642", keys: "#111317", thick: 1.13, notch: true }],
    [/macbook pro/i, { body: "#2b2c2f", keys: "#0f1012", thick: 1.55, notch: true, speakers: true }],
    [/xps 13/i,      { thick: 1.4 }],
    [/inspiron.*2-in-1/i, { body: "#c9cbd0", deck: "#c9cbd0", keys: "#202226", thick: 1.8, hinge: "360" }],
    [/pavilion/i,    { body: "#d9d6cf", keys: "#e4e2dd", thick: 1.8, grille: true }],
    [/victus/i,      { body: "#5d5a5c", keys: "#1b1b1d", thick: 2.35, glow: "#e8e8ff", logo: "victus", vents: true }],
    [/rog/i,         { glow: "#38bdf8", lightbar: "#38bdf8", vents: true, thick: 2.6 }],
    [/nitro/i,       { glow: "#ffffff", accent: "#e11d48", vents: true, logo: "nitro" }],
    [/gf63|msi/i,    { glow: "#ef4444", vents: true }],
    [/thinkpad/i,    { body: "#26272b", keys: "#111214", ar: 1.6, chin: 1.0, trackpoint: true, logo: "thinkpad" }],
    [/ideapad/i,     { body: "#1d1e21", thick: 1.99 }],
    [/creator/i,     { thick: 1.8 }]
  ];

  function profile(l) {
    var p = {}, b = BRAND[String(l.brand || "").toLowerCase()] || BRAND.other, k;
    for (k in b) p[k] = b[k];
    MODELS.forEach(function (m) { if (m[0].test(l.name || "")) for (k in m[1]) p[k] = m[1][k]; });
    p.inch = parseFloat(String(l.displaySize || "14").replace(/[^\d.]/g, "")) || 14;
    p.numpad = p.inch >= 15.5 && p.logo !== "apple";
    p.gaming = /gaming/i.test(l.category || "") || !!p.vents;
    return p;
  }

  function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

  /* ---------- small geometry / texture helpers ---------- */
  function col(hex) { return new THREE.Color(hex).convertSRGBToLinear(); }

  // Rounded slab: w (x) by d (z), h tall (y from 0 to h), corner radius r
  function slab(w, d, h, r, bevel) {
    bevel = Math.min(bevel || 0, h / 2.2);
    var s = new THREE.Shape(), x = -w / 2 + bevel, y = -d / 2 + bevel, W = w - 2 * bevel, D = d - 2 * bevel;
    r = Math.max(0.01, Math.min(r - bevel, W / 2, D / 2));
    s.moveTo(x + r, y); s.lineTo(x + W - r, y); s.quadraticCurveTo(x + W, y, x + W, y + r);
    s.lineTo(x + W, y + D - r); s.quadraticCurveTo(x + W, y + D, x + W - r, y + D);
    s.lineTo(x + r, y + D); s.quadraticCurveTo(x, y + D, x, y + D - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    var g = new THREE.ExtrudeGeometry(s, {
      depth: h - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
      bevelSegments: 3, curveSegments: 10
    });
    g.rotateX(-Math.PI / 2); // shape y -> -z, extrude z -> +y
    g.translate(0, bevel, 0);
    return g;
  }

  function canvas(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function tex(c) { var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t; }

  // Flat decal lying on a surface facing +y; top of the picture points to -z (away from the viewer)
  function decalUp(w, d, map, opts) {
    var g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2);
    var m = new THREE.MeshStandardMaterial(Object.assign({ map: map, transparent: true, metalness: 0.5, roughness: 0.4 }, opts || {}));
    return new THREE.Mesh(g, m);
  }

  // Brand mark drawn on a transparent canvas (used on the lid and below the screen)
  function logoCanvas(kind, colour, l) {
    var c = canvas(512, 512), x = c.getContext("2d");
    x.fillStyle = colour; x.strokeStyle = colour; x.textAlign = "center"; x.textBaseline = "middle";
    if (kind === "apple") {
      x.translate(256, 270); x.scale(5.2, 5.2); x.translate(-60, -34);
      x.fill(new Path2D("M60 22c-6-5-17-3-20 6-4 12 4 28 12 29 3 0 5-2 8-2s5 2 8 2c6-1 13-14 11-22-5 1-9-3-9-9-3-3-7-4-10-4z"));
      x.fill(new Path2D("M62 18c1-5 5-8 9-8 0 5-3 9-9 8z"));
    } else if (kind === "dell") {
      x.lineWidth = 22; x.beginPath(); x.arc(256, 256, 200, 0, Math.PI * 2); x.stroke();
      x.font = "900 130px Arial Black, Arial"; x.fillText("DELL", 256, 262);
    } else if (kind === "hp") {
      x.lineWidth = 18; x.beginPath(); x.arc(256, 256, 210, 0, Math.PI * 2); x.stroke();
      x.font = "italic 900 230px Arial"; x.fillText("hp", 256, 240);
    } else if (kind === "rog") {
      x.beginPath(); x.moveTo(70, 300); x.quadraticCurveTo(256, 120, 450, 210); x.quadraticCurveTo(300, 230, 250, 330);
      x.quadraticCurveTo(200, 270, 70, 300); x.fill();
      x.font = "900 70px Arial"; x.fillText("ROG", 256, 420);
    } else if (kind === "msi") {
      x.font = "italic 900 170px Arial Black, Arial"; x.fillText("msi", 256, 256);
    } else if (kind === "victus") {
      x.beginPath(); x.moveTo(90, 170); x.lineTo(422, 170); x.lineTo(256, 360); x.closePath(); x.fill();
    } else if (kind === "nitro" || kind === "acer") {
      x.font = "700 150px Arial"; x.fillText("acer", 256, 256);
    } else if (kind === "thinkpad") {
      x.font = "italic 700 120px Arial"; x.fillText("ThinkPad", 256, 256);
      x.fillStyle = "#e11d48"; x.beginPath(); x.arc(316, 196, 14, 0, Math.PI * 2); x.fill();
    } else if (kind === "lenovo") {
      x.font = "700 120px Arial"; x.fillText("Lenovo", 256, 256);
    } else {
      x.font = "800 100px Arial"; x.fillText(String(kind === "technest" ? "TechNest" : (l.brand || "Laptop")).slice(0, 9), 256, 256);
    }
    return c;
  }

  /* ---------- the view ---------- */
  function create(container) {
    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    container.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    if (THREE.RoomEnvironment) {
      var pm = new THREE.PMREMGenerator(renderer);
      scene.environment = pm.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
    }
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444455, 0.35));
    var key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(30, 60, 40); scene.add(key);
    var rim = new THREE.DirectionalLight(0xbcd2ff, 0.5); rim.position.set(-40, 20, -40); scene.add(rim);

    var camera = new THREE.PerspectiveCamera(30, 1, 1, 1000);
    var tilt = new THREE.Group(), spin = new THREE.Group(), holder = new THREE.Group();
    scene.add(tilt); tilt.add(spin); spin.add(holder);

    var st = { l: null, p: null, lid: null, lidAngle: 0, lidTarget: 108, size: 32, finish: null,
      screenOn: true, screenMat: null, screenTex: null, offTex: null, bezelMat: null, bodyMats: [], markers: {}, glb: null, hl: null, t0: 0 };

    function resize() {
      var w = container.clientWidth || 600, h = container.clientHeight || 400;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(container);
    resize();

    function clear() {
      while (holder.children.length) {
        var o = holder.children.pop();
        o.traverse(function (n) {
          if (n.geometry) n.geometry.dispose();
          if (n.material) [].concat(n.material).forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); });
        });
      }
      st.bodyMats = []; st.markers = {}; st.lid = null; st.glb = null;
    }

    function screenCanvas(l, p, w, h) {
      var c = canvas(1024, Math.round(1024 * h / w)), x = c.getContext("2d");
      x.fillStyle = "#0b0f1a"; x.fillRect(0, 0, c.width, c.height);
      var img = new Image();
      img.onload = function () {
        // cover-fit the wallpaper, then redraw the notch on top
        var s = Math.max(c.width / 560, c.height / 350);
        x.drawImage(img, (c.width - 560 * s) / 2, (c.height - 350 * s) / 2, 560 * s, 350 * s);
        if (p.notch) { x.fillStyle = "#000"; x.beginPath(); x.roundRect ? x.roundRect(c.width / 2 - 70, -20, 140, 52, 14) : x.rect(c.width / 2 - 70, 0, 140, 32); x.fill(); }
        if (st.screenTex) st.screenTex.needsUpdate = true;
      };
      if (typeof laptopScreenDataUrl === "function") img.src = laptopScreenDataUrl(l);
      return c;
    }

    function build(l) {
      clear();
      var p = st.p = profile(l);
      var diag = p.inch * 2.54, sw = diag * p.ar / Math.sqrt(1 + p.ar * p.ar), sh = sw / p.ar;
      var side = p.gaming ? 1.1 : 0.7, top = 1.0;
      var W = sw + 2 * side, L = sh + top + p.chin, D = L;
      var lidT = Math.max(0.45, p.thick * 0.3), Hb = p.thick - lidT, R = Math.min(1.6, W * 0.05);
      st.size = W;

      // without reflections (environment failed to load) metal renders near-black, so tone it down
      var metal = scene.environment ? p.metal : p.metal * 0.3;
      var bodyMat = new THREE.MeshStandardMaterial({ color: col(p.body), metalness: metal, roughness: p.rough });
      var deckMat = p.deck ? new THREE.MeshStandardMaterial({ color: col(p.deck), metalness: metal * 0.5, roughness: 0.6 }) : bodyMat;
      st.bodyMats = [bodyMat].concat(p.deck && p.deck === p.body ? [deckMat] : []);
      var dark = new THREE.MeshStandardMaterial({ color: col("#0a0b0d"), metalness: 0.2, roughness: 0.55 });

      /* base */
      var base = new THREE.Group(); holder.add(base);
      var shell = new THREE.Mesh(slab(W, D, Hb * 0.96, R, 0.12), bodyMat); base.add(shell);
      var deckTop = new THREE.Mesh(slab(W - 0.06, D - 0.06, 0.04, R, 0), deckMat); deckTop.position.y = Hb * 0.96 - 0.02; base.add(deckTop);
      if (p.thick > 1.6) { // gaming / budget bases taper: darker underside
        var under = new THREE.Mesh(slab(W * 0.97, D * 0.95, 0.12, R, 0.04), dark); under.position.y = -0.04; base.add(under);
      }
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (f) {
        var foot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 16), dark);
        foot.position.set(f[0] * (W / 2 - 2.2), -0.05, f[1] * (D / 2 - 2)); base.add(foot);
      });

      // keyboard
      var y0 = Hb + 0.005, cols = 15 + (p.numpad ? 4.4 : 0);
      var kbW = W * (p.numpad ? 0.92 : (p.speakers ? 0.72 : 0.86)), u = kbW / cols, kbBack = -D / 2 + D * (p.numpad ? 0.07 : 0.085);
      var rowsU = [0.6, 1, 1, 1, 1, 1], kbD = rowsU.reduce(function (a, b) { return a + b; }) * u * 0.98;
      var well = new THREE.Mesh(slab(kbW + u * 0.35, kbD + u * 0.3, 0.02, 0.4, 0), new THREE.MeshStandardMaterial({ color: col(p.glow ? "#050506" : "#0c0d10"), roughness: 0.8 }));
      well.position.set(0, y0, kbBack + kbD / 2); base.add(well);
      var ROWS = [
        [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
        [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
        [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25],
        [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75],
        [1, 1, 1, 1.25, 5.25, 1.25, 1, 1, 1, 1, 1]
      ];
      var keys = [];
      var zc = kbBack + u * 0.15;
      ROWS.forEach(function (row, ri) {
        var hU = rowsU[ri], x = -kbW / 2, sum = row.reduce(function (a, b) { return a + b; }), k = 15 / sum;
        row.forEach(function (wU) { keys.push([x + wU * k * u / 2, zc + hU * u / 2, wU * k * u - u * 0.14, hU * u - u * 0.14]); x += wU * k * u; });
        if (p.numpad) for (var n = 0; n < 4; n++) keys.push([-kbW / 2 + (15.4 + n) * u + u / 2, zc + hU * u / 2, u * 0.86, hU * u - u * 0.14]);
        zc += hU * u * 0.98;
      });
      var keyMat = new THREE.MeshStandardMaterial({ color: col(p.keys), roughness: 0.65, metalness: 0.05,
        emissive: p.glow ? col(p.glow) : new THREE.Color(0), emissiveIntensity: p.glow ? 0.06 : 0 });
      var keyGeo = new THREE.BoxGeometry(1, 0.14, 1); keyGeo.translate(0, 0.07, 0);
      var inst = new THREE.InstancedMesh(keyGeo, keyMat, keys.length), mtx = new THREE.Matrix4();
      keys.forEach(function (kk, i) {
        mtx.compose(new THREE.Vector3(kk[0], y0, kk[1]), new THREE.Quaternion(), new THREE.Vector3(kk[2], 1, kk[3]));
        inst.setMatrixAt(i, mtx);
      });
      base.add(inst);
      if (p.glow) { // backlight bleeding between the keys
        var bl = new THREE.Mesh(new THREE.PlaneGeometry(kbW, kbD), new THREE.MeshBasicMaterial({ color: col(p.glow), transparent: true, opacity: 0.35 }));
        bl.rotation.x = -Math.PI / 2; bl.position.set(0, y0 + 0.03, kbBack + kbD / 2); base.add(bl);
      }
      if (p.trackpoint) {
        var tp = new THREE.Mesh(new THREE.CylinderGeometry(u * 0.16, u * 0.16, 0.22, 16), new THREE.MeshStandardMaterial({ color: col("#e11d48"), roughness: 0.9 }));
        tp.position.set(-kbW / 2 + 7.1 * u, y0 + 0.12, kbBack + u * 0.15 + (0.6 + 3) * u * 0.98); // between G, H and B base.add(tp);
      }
      if (p.speakers || p.grille) { // speaker grilles: either side of the keys (MacBook Pro) or above them (Pavilion)
        var dots = canvas(256, 512), dx = dots.getContext("2d"); dx.fillStyle = "#000";
        for (var gy = 6; gy < 512; gy += 12) for (var gx = 6; gx < 256; gx += 12) { dx.beginPath(); dx.arc(gx, gy, 3, 0, 7); dx.fill(); }
        if (p.speakers) {
          [-1, 1].forEach(function (s) {
            var g = decalUp((W - kbW) / 2 - 1.4, kbD, tex(dots), { opacity: 0.6, color: 0x000000 });
            g.position.set(s * (kbW / 2 + ((W - kbW) / 2) / 2), y0 + 0.01, kbBack + kbD / 2); base.add(g);
          });
        } else {
          var g2 = decalUp(kbW, u * 0.9, tex(dots), { opacity: 0.35, color: 0x000000 });
          g2.position.set(0, y0 + 0.01, kbBack - u * 0.2); base.add(g2);
        }
      }
      // trackpad
      var front = kbBack + kbD + u * 0.5, room = D / 2 - front - 0.9;
      var tpW = p.logo === "apple" ? W * (p.speakers ? 0.42 : 0.4) : W * 0.3, tpD = Math.min(room, tpW * 0.62);
      var pad = new THREE.Mesh(slab(tpW, tpD, 0.03, 0.5, 0), new THREE.MeshStandardMaterial({ color: col(p.deck || p.body), metalness: p.metal * 0.6, roughness: 0.3 }));
      pad.position.set(p.numpad ? -u * 2 : 0, y0, front + tpD / 2 + (room - tpD) * 0.3);
      var padEdge = new THREE.Mesh(slab(tpW + 0.12, tpD + 0.12, 0.015, 0.55, 0), dark);
      padEdge.position.copy(pad.position); padEdge.position.y -= 0.004; base.add(padEdge); base.add(pad);
      if (p.trackpoint) {
        [-1, 0, 1].forEach(function (i) {
          var b = new THREE.Mesh(new THREE.BoxGeometry(tpW / 3 - 0.15, 0.05, 0.9), new THREE.MeshStandardMaterial({ color: col("#16171a"), roughness: 0.7 }));
          b.position.set(pad.position.x + i * tpW / 3, y0 + 0.03, front - 0.25); base.add(b);
          var stripe = new THREE.Mesh(new THREE.BoxGeometry(tpW / 3 - 0.5, 0.06, 0.08), new THREE.MeshBasicMaterial({ color: col("#e11d48") }));
          stripe.position.set(b.position.x, y0 + 0.035, front - 0.25); base.add(stripe);
        });
      }
      if (p.accent) { // Nitro-style red trims
        var trim = new THREE.Mesh(new THREE.BoxGeometry(W * 0.6, 0.05, 0.08), new THREE.MeshBasicMaterial({ color: col(p.accent) }));
        trim.position.set(0, Hb * 0.5, D / 2 + 0.01); base.add(trim);
      }
      if (p.lightbar) {
        var lb = new THREE.Mesh(new THREE.BoxGeometry(W * 0.94, 0.12, 0.1), new THREE.MeshBasicMaterial({ color: col(p.lightbar) }));
        lb.position.set(0, 0.12, D / 2 + 0.02); base.add(lb);
      }
      // ports on both sides
      var portMat = new THREE.MeshStandardMaterial({ color: col("#050505"), roughness: 0.9 });
      var portSet = p.logo === "apple" ? [[0.9, 0.3], [0.9, 0.3], [0.5, 0.5]] : [[0.9, 0.3], [1.3, 0.5], [1.5, 0.55], [0.6, 0.6]];
      [-1, 1].forEach(function (s, si) {
        var z = -D / 2 + 3;
        portSet.slice(si ? 1 : 0).forEach(function (pt) {
          var m = new THREE.Mesh(new THREE.BoxGeometry(0.1, Math.min(pt[1], Hb * 0.5), pt[0]), portMat);
          m.position.set(s * (W / 2 + 0.01), Hb * 0.45, z + pt[0] / 2); base.add(m); z += pt[0] + 0.7;
        });
      });
      if (p.vents) { // rear exhaust vents
        [-1, 1].forEach(function (s) {
          for (var v = 0; v < 11; v++) {
            var sl = new THREE.Mesh(new THREE.BoxGeometry(0.22, Hb * 0.55, 0.05), dark);
            sl.position.set(s * (W / 2 - 1.5 - v * 0.45), Hb * 0.45, -D / 2 - 0.02); base.add(sl);
          }
        });
      }

      /* hotspot markers for "inspect this part" */
      [["cpu", 0, -D * 0.18, "#38bdf8"], ["ram", -W * 0.25, -D * 0.05, "#22c55e"], ["ssd", W * 0.25, -D * 0.05, "#f59e0b"]].forEach(function (h) {
        var m = new THREE.Mesh(new THREE.BoxGeometry(W * 0.16, 0.25, D * 0.12), new THREE.MeshBasicMaterial({ color: col(h[3]), transparent: true, opacity: 0.0, depthTest: false }));
        m.position.set(h[1], Hb + 0.5, h[2]); m.renderOrder = 5; base.add(m); st.markers[h[0]] = m;
      });

      /* lid: pivots on the hinge at the back edge of the base */
      var gap = 0.2; // clearance so the keys don't poke through the closed lid
      var hinge = new THREE.Group(); hinge.position.set(0, Hb + gap, -D / 2 + 0.35); holder.add(hinge);
      var lid = new THREE.Group(); hinge.add(lid);
      var lidShell = new THREE.Mesh(slab(W, L, lidT, R, 0.1), bodyMat); lidShell.position.z = L / 2; lid.add(lidShell);
      st.bezelMat = new THREE.MeshStandardMaterial({ color: col("#050608"), roughness: 0.25, metalness: 0.1, emissive: new THREE.Color(0) });
      var bezel = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.25, L - 0.25), st.bezelMat);
      bezel.geometry.rotateX(Math.PI / 2); bezel.position.set(0, -0.005, L / 2); lid.add(bezel);
      st.screenTex = tex(screenCanvas(l, p, sw, sh));
      var off = canvas(16, 16), ox = off.getContext("2d"); ox.fillStyle = "#06070a"; ox.fillRect(0, 0, 16, 16); st.offTex = tex(off);
      st.screenMat = new THREE.MeshBasicMaterial({ map: st.screenOn ? st.screenTex : st.offTex, toneMapped: false });
      var scr = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), st.screenMat);
      scr.geometry.rotateX(Math.PI / 2); scr.position.set(0, -0.01, p.chin + sh / 2); lid.add(scr);
      var cam = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), new THREE.MeshBasicMaterial({ color: 0x1e293b }));
      cam.geometry.rotateX(Math.PI / 2); cam.position.set(0, -0.012, L - top / 2); lid.add(cam);
      if (p.logo !== "apple") { // small brand mark on the chin
        var cl = Math.min(2.6, p.chin * 1.8);
        var chinLogo = new THREE.Mesh(new THREE.PlaneGeometry(cl, cl), new THREE.MeshBasicMaterial({ map: tex(logoCanvas(p.logo, "#9aa0a8", l)), transparent: true }));
        chinLogo.geometry.rotateX(Math.PI / 2); chinLogo.position.set(0, -0.012, p.chin / 2); lid.add(chinLogo);
      }
      // brand logo on the back of the lid, readable from behind when open
      var big = /^(apple|dell|hp|rog|msi|victus|nitro|acer)$/.test(p.logo);
      var lsz = big ? Math.min(W, L) * (p.logo === "victus" ? 0.28 : 0.22) : W * 0.26;
      var logoCol = p.logo === "msi" ? "#dc2626" : (p.logo === "apple" || p.logo === "dell" ? "#e5e7eb" : "#a1a1aa");
      var back = new THREE.Mesh(new THREE.PlaneGeometry(lsz, lsz),
        new THREE.MeshStandardMaterial({ map: tex(logoCanvas(p.logo, logoCol, l)), transparent: true, metalness: 0.9, roughness: 0.15 }));
      back.geometry.rotateX(Math.PI / 2); back.geometry.rotateZ(Math.PI);
      if (big) back.position.set(0, lidT + 0.01, L / 2);
      else back.position.set(W / 2 - lsz * 0.7, lidT + 0.01, L - lsz * 0.45);
      lid.add(back);
      // hinges
      var hMat = new THREE.MeshStandardMaterial({ color: col(p.hinge === "360" ? "#d4d6da" : p.body), metalness: 0.9, roughness: 0.3 });
      if (p.hinge === "full" || p.hinge === "360" || !p.hinge) {
        var spans = p.hinge === "full" ? [[0, W * 0.8]] : [[-W * 0.3, W * 0.12], [W * 0.3, W * 0.12]];
        spans.forEach(function (sp) {
          var h = new THREE.Mesh(new THREE.CylinderGeometry(lidT * 0.55, lidT * 0.55, sp[1], 20), hMat);
          h.rotation.z = Math.PI / 2; h.position.set(sp[0], Hb + gap, -D / 2 + 0.35); holder.add(h);
        });
      }
      st.lid = hinge; st.lidAngle = 0; st.lidTarget = 108;
      holder.position.set(0, -L * 0.4, -L * 0.05);
      // the room reflections wash dark finishes out to grey, so keep them subtle
      holder.traverse(function (n) { if (n.material && n.material.isMeshStandardMaterial) n.material.envMapIntensity = 0.45; });
      applyFinish();
    }

    function fitGlb(obj) {
      var box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      var s = 32 / Math.max(size.x, size.z, 0.001);
      obj.scale.setScalar(s); obj.position.set(-c.x * s, -box.min.y * s - size.y * s * 0.4, -c.z * s);
      st.size = 32; holder.position.set(0, 0, 0);
    }

    function setLaptop(l) {
      st.l = l; build(l);
      var url = l.model3d || ("models/laptops/" + slug(l.name) + ".glb");
      if (!THREE.GLTFLoader) return;
      // only swap in a downloaded model when the file actually exists
      fetch(url, { method: "HEAD" }).then(function (r) {
        if (!r.ok || st.l !== l) return;
        new THREE.GLTFLoader().load(url, function (g) {
          if (st.l !== l) return;
          clear(); st.glb = g.scene; fitGlb(g.scene); holder.add(g.scene);
        });
      }).catch(function () { });
    }

    function applyFinish() {
      st.bodyMats.forEach(function (m) { m.color.copy(col(st.finish || st.p.body)); });
    }

    function highlight(part) {
      st.hl = part || null; st.t0 = performance.now();
      Object.keys(st.markers).forEach(function (k) { st.markers[k].material.opacity = 0; });
      if (st.bezelMat) st.bezelMat.emissive.setHex(0);
    }

    function frame(rx, ry, zoom) {
      if (st.lid) {
        st.lidAngle += (st.lidTarget - st.lidAngle) * 0.08;
        st.lid.rotation.x = -st.lidAngle * Math.PI / 180;
      }
      if (st.hl) {
        var pulse = 0.55 + 0.35 * Math.sin((performance.now() - st.t0) / 180);
        if (st.hl === "display") { if (st.bezelMat) st.bezelMat.emissive.copy(col("#38bdf8")).multiplyScalar(pulse * 0.6); }
        else if (st.markers[st.hl]) st.markers[st.hl].material.opacity = pulse;
      }
      tilt.rotation.x = rx * Math.PI / 180;
      spin.rotation.y = ry * Math.PI / 180;
      camera.position.set(0, 0, st.size * 2.3 / (zoom || 1));
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    }

    return {
      setLaptop: setLaptop,
      setFinish: function (hex) { st.finish = hex; if (st.p) applyFinish(); },
      setScreen: function (on) { st.screenOn = on; if (st.screenMat) { st.screenMat.map = on ? st.screenTex : st.offTex; st.screenMat.needsUpdate = true; } },
      setLid: function (open) { st.lidTarget = open ? 108 : 0; },
      replayOpen: function () { st.lidAngle = 0; st.lidTarget = 108; },
      highlight: highlight,
      frame: frame,
      resize: resize
    };
  }

  window.Laptop3D = { load: load, create: create, slug: slug };
})();
