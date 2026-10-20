/** Admin dashboard: left sidebar navigation (one section shown at a time). */
(function () {
  var sections = document.querySelectorAll(".admin-section");
  var links = document.querySelectorAll("[data-nav]");

  function show(name) {
    if (!document.querySelector('[data-section="' + name + '"]')) name = "overview";
    sections.forEach(function (s) { s.classList.toggle("active", s.dataset.section === name); });
    links.forEach(function (a) { a.classList.toggle("active", a.dataset.nav === name); });
    document.getElementById("adminSidebar").classList.remove("open");
    window.scrollTo({ top: 0 });
  }

  links.forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var name = a.dataset.nav;
      history.replaceState(null, "", "#" + name);
      show(name);
    });
  });
  window.addEventListener("hashchange", function () { show(location.hash.slice(1)); });
  show(location.hash.slice(1));

  /* keep sidebar badges in sync with the metric cards filled in by admin.js */
  [["metricTotalOrders", "sbOrders"], ["metricTotalMessages", "sbMessages"], ["metricTotalRepairs", "sbRepairs"]].forEach(function (p) {
    var src = document.getElementById(p[0]), dst = document.getElementById(p[1]);
    if (!src || !dst) return;
    function sync() { dst.textContent = src.textContent; dst.style.display = src.textContent.trim() === "0" ? "none" : ""; }
    new MutationObserver(sync).observe(src, { childList: true, characterData: true, subtree: true });
    sync();
  });

  /* mobile menu button */
  var btn = document.createElement("button");
  btn.className = "admin-menu-btn"; btn.innerHTML = "&#9776; Menu";
  btn.onclick = function () { document.getElementById("adminSidebar").classList.toggle("open"); };
  document.querySelector(".admin-main").prepend(btn);
})();
