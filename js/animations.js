/** TechNest animations: scroll reveal, counters, particles, ripple, cart bump. */
(function () {
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return;

  /* Scroll reveal (works for cards added later by the catalogue script) */
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add("reveal-in");
      io.unobserve(en.target);
    });
  }, { threshold: 0.12 }) : null;

  function watch(el, i) {
    if (!io || el.dataset.rv) return;
    el.dataset.rv = 1;
    el.classList.add("reveal");
    el.style.animationDelay = (i % 4) * 90 + "ms";
    io.observe(el);
  }
  function scan() {
    document.querySelectorAll(".product-card, .feature-card, .service-card, .section-title").forEach(watch);
  }
  document.addEventListener("DOMContentLoaded", function () {
    scan();
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });

    /* Counting hero stats */
    document.querySelectorAll(".hero-stat-num").forEach(function (el) {
      var m = el.textContent.match(/^(\d+)(.*)$/);
      if (!m) return;
      var target = +m[1], suffix = m[2], t0 = performance.now(), dur = 1600;
      (function step(now) {
        var k = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(target * e) + (k < 1 ? "" : suffix);
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });

    /* Floating particles behind the hero */
    var hero = document.querySelector(".hero");
    if (hero) {
      var box = document.createElement("div");
      box.className = "particles";
      for (var i = 0; i < 18; i++) {
        var p = document.createElement("span");
        p.style.left = Math.random() * 100 + "%";
        p.style.width = p.style.height = 4 + Math.random() * 8 + "px";
        p.style.animationDuration = 8 + Math.random() * 10 + "s";
        p.style.animationDelay = -Math.random() * 12 + "s";
        box.appendChild(p);
      }
      hero.insertBefore(box, hero.firstChild);
    }

    /* Cart badge bump when the number changes */
    document.querySelectorAll(".cart-badge-count").forEach(function (b) {
      new MutationObserver(function () {
        b.classList.remove("bump"); void b.offsetWidth; b.classList.add("bump");
      }).observe(b, { childList: true, characterData: true, subtree: true });
    });
  });

  /* Button ripple */
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".btn, .v3d-btn");
    if (!b) return;
    var r = b.getBoundingClientRect(), s = Math.max(r.width, r.height);
    var d = document.createElement("span");
    d.className = "ripple";
    d.style.cssText = "width:" + s + "px;height:" + s + "px;left:" + (e.clientX - r.left - s / 2) + "px;top:" + (e.clientY - r.top - s / 2) + "px";
    if (getComputedStyle(b).position === "static") b.style.position = "relative";
    b.style.overflow = "hidden";
    b.appendChild(d);
    setTimeout(function () { d.remove(); }, 650);
  });

  /* Scroll progress bar, back-to-top, navbar state */
  document.addEventListener("DOMContentLoaded", function () {
    var bar = document.createElement("div"); bar.className = "scroll-progress";
    var top = document.createElement("button"); top.className = "to-top"; top.innerHTML = "&uarr;"; top.setAttribute("aria-label", "Back to top");
    top.onclick = function () { window.scrollTo({ top: 0, behavior: "smooth" }); };
    document.body.append(bar, top);
    var header = document.querySelector(".header");
    function onScroll() {
      var h = document.documentElement, max = h.scrollHeight - h.clientHeight;
      bar.style.width = (max > 0 ? h.scrollTop / max * 100 : 0) + "%";
      top.classList.toggle("show", h.scrollTop > 500);
      if (header) header.classList.toggle("scrolled", h.scrollTop > 20);
      var panel = document.querySelector(".hero-img-panel");
      if (panel && h.scrollTop < 800) panel.style.translate = "0 " + (h.scrollTop * 0.08) + "px";
    }
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  });

  /* 3D tilt + glare on product cards */
  document.addEventListener("mousemove", function (e) {
    var card = e.target.closest && e.target.closest(".product-card");
    if (!card) return;
    var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    card.style.transform = "perspective(900px) rotateY(" + ((x - 0.5) * 8) + "deg) rotateX(" + ((0.5 - y) * 8) + "deg) translateY(-8px)";
    card.style.setProperty("--mx", x * 100 + "%"); card.style.setProperty("--my", y * 100 + "%");
  });
  document.addEventListener("mouseout", function (e) {
    var card = e.target.closest && e.target.closest(".product-card");
    if (card && !card.contains(e.relatedTarget)) card.style.transform = "";
  });

  /* Fly-to-cart + toast */
  function toast(msg) {
    var t = document.createElement("div"); t.className = "tn-toast"; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add("out"); }, 2000);
    setTimeout(function () { t.remove(); }, 2500);
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("button[onclick*='addToCart']");
    if (!b) return;
    var src = b.closest(".product-card") ? b.closest(".product-card").querySelector(".product-img-wrap img")
            : document.querySelector(".v3d-modal.open .v3d-lid img, .v3d-modal.open .laptop-lid img");
    var cart = document.querySelector(".header-cart-link");
    toast("Added to cart ✓");
    if (!src || !cart) return;
    var s = src.getBoundingClientRect(), c = cart.getBoundingClientRect();
    var fly = document.createElement("img"); fly.src = src.src; fly.className = "fly-img";
    fly.style.cssText = "left:" + s.left + "px;top:" + s.top + "px;width:" + s.width + "px;height:" + s.height + "px";
    document.body.appendChild(fly);
    requestAnimationFrame(function () {
      fly.style.transform = "translate(" + (c.left + c.width / 2 - s.left - s.width / 2) + "px," + (c.top + c.height / 2 - s.top - s.height / 2) + "px) scale(0.05)";
      fly.style.opacity = "0.2";
    });
    setTimeout(function () { fly.remove(); }, 900);
  });
})();
