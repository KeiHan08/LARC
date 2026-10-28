/* 线代讲义 · 交互脚本 */
(function () {
  "use strict";

  /* ============ 1. KaTeX 多源加载 ============ */
  var KATEX_VERSION = "0.16.11";
  var CDNS = [
    "assets/katex/",
    "https://cdn.jsdelivr.net/npm/katex@" + KATEX_VERSION + "/dist/",
    "https://unpkg.com/katex@" + KATEX_VERSION + "/dist/",
    "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/" + KATEX_VERSION + "/"
  ];

  function loadCSS(href) {
    return new Promise(function (res, rej) {
      var l = document.createElement("link");
      l.rel = "stylesheet"; l.href = href;
      l.onload = res; l.onerror = rej;
      document.head.appendChild(l);
    });
  }
  function loadJS(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  function tryBase(base) {
    return loadCSS(base + "katex.min.css")
      .then(function () { return loadJS(base + "katex.min.js"); })
      .then(function () { return loadJS(base + "contrib/auto-render.min.js"); });
  }

  function renderAll() {
    if (typeof renderMathInElement !== "function") { showWarn(); return; }
    renderMathInElement(document.body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false }
      ],
      throwOnError: false,
      strict: false,
      trust: true,
      macros: {
        "\\dd": "\\mathrm{d}",
        "\\rank": "\\operatorname{rank}",
        "\\tr": "\\operatorname{tr}",
        "\\sgn": "\\operatorname{sgn}"
      }
    });
    document.documentElement.classList.add("math-ready");
  }

  function showWarn() {
    var w = document.getElementById("warnbar");
    if (w) {
      w.classList.add("show");
      w.textContent = "公式渲染库（KaTeX）未能加载：可能是当前网络无法访问 CDN。请联网后刷新，或把 katex 文件夹放到 assets 目录下改为本地引用。数学式仍以 LaTeX 源码形式可读。";
    }
  }

  function bootMath() {
    var i = 0;
    function next() {
      if (i >= CDNS.length) { showWarn(); return; }
      var base = CDNS[i++];
      tryBase(base).then(function () {
        renderAll();
      }).catch(function () { next(); });
    }
    next();
  }

  /* ============ 2. 侧栏（移动端） ============ */
  function bootSidebar() {
    var btn = document.getElementById("menuBtn");
    var sb = document.getElementById("sidebar");
    var scrim = document.getElementById("scrim");
    if (!btn || !sb) return;
    function close() { sb.classList.remove("open"); if (scrim) scrim.classList.remove("show"); }
    btn.addEventListener("click", function () {
      sb.classList.toggle("open");
      if (scrim) scrim.classList.toggle("show");
    });
    if (scrim) scrim.addEventListener("click", close);
    sb.addEventListener("click", function (e) {
      if (e.target.tagName === "A") close();
    });
  }

  /* ============ 3. 阅读进度条 ============ */
  function bootProgress() {
    var bar = document.getElementById("readbar");
    if (!bar) return;
    function upd() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? (h.scrollTop / max) * 100 : 0;
      bar.style.width = Math.min(100, Math.max(0, p)) + "%";
    }
    document.addEventListener("scroll", upd, { passive: true });
    window.addEventListener("resize", upd);
    upd();
  }

  /* ============ 4. 当前模块高亮 ============ */
  function bootScrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll(".navlist a[data-target]"));
    if (!links.length) return;
    var map = {};
    links.forEach(function (a) { map[a.getAttribute("data-target")] = a; });
    var targets = Object.keys(map).map(function (id) { return document.getElementById(id); })
      .filter(Boolean);

    function setActive(id) {
      links.forEach(function (a) { a.classList.remove("active"); });
      if (map[id]) map[id].classList.add("active");
    }
    if ("IntersectionObserver" in window) {
      var visible = {};
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          visible[en.target.id] = en.isIntersecting ? en.intersectionRatio : 0;
        });
        var best = null, bestV = 0;
        Object.keys(visible).forEach(function (k) {
          if (visible[k] > bestV) { bestV = visible[k]; best = k; }
        });
        if (best) setActive(best);
      }, { rootMargin: "-15% 0px -55% 0px", threshold: [0, 0.1, 0.3, 0.6, 1] });
      targets.forEach(function (t) { io.observe(t); });
    }
  }

  /* ============ 5. 模块完成勾选（本地记忆） ============ */
  function bootProgressMemory() {
    var KEY = "linalg.progress." + (document.body.getAttribute("data-page") || "x");
    var boxes = Array.prototype.slice.call(document.querySelectorAll(".std__check input[data-mid]"));
    var state = {};
    try { state = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { state = {}; }

    function paint(id, on) {
      var a = document.querySelector('.navlist a[data-target="' + id + '"]');
      if (a) a.classList.toggle("done", !!on);
    }
    boxes.forEach(function (b) {
      var id = b.getAttribute("data-mid");
      b.checked = !!state[id];
      paint(id, b.checked);
      b.addEventListener("change", function () {
        state[id] = b.checked;
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
        paint(id, b.checked);
      });
    });
  }

  /* ============ 6. 一键展开/收起答案 ============ */
  function bootExpandAll() {
    var btn = document.getElementById("expandAll");
    if (!btn) return;
    var open = false;
    btn.addEventListener("click", function () {
      open = !open;
      Array.prototype.forEach.call(document.querySelectorAll(".ex details"), function (d) {
        d.open = open;
      });
      btn.textContent = open ? "收起全部答案" : "展开全部答案";
    });
  }

  /* ============ 6.5 章节目录折叠：第一次点击进入，第二次点击退出 ============ */
  function bootChapGroups() {
    var heads = document.querySelectorAll(".chapgroup__t");
    Array.prototype.forEach.call(heads, function (t) {
      t.addEventListener("click", function (e) {
        var g = t.parentNode;
        if (!g || !g.classList) return;
        if (g.classList.contains("open")) {
          // 已展开：收起，不跳转
          e.preventDefault();
          g.classList.remove("open");
        } else {
          // 未展开：展开并进入该章
          g.classList.add("open");
        }
      });
    });
  }

  /* ============ 7. 自学 / 刷题 模式切换 ============ */
  function bootMode() {
    var btn = document.getElementById("modeBtn");
    var KEY = "linalg.mode";
    var drill = document.body.classList.contains("mode-drill");
    try {
      var saved = localStorage.getItem(KEY);
      if (saved !== null) drill = saved === "drill";
    } catch (e) {}

    function apply() {
      document.body.classList.toggle("mode-drill", drill);
      if (btn) btn.textContent = drill ? "切到自学模式" : "切到刷题模式";
    }
    apply();
    if (btn) {
      btn.addEventListener("click", function () {
        drill = !drill;
        try { localStorage.setItem(KEY, drill ? "drill" : "study"); } catch (e) {}
        apply();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }

  /* ============ 8. 键盘快捷键 ============ */
  function bootKeys() {
    document.addEventListener("keydown", function (e) {
      if (e.target.matches("input,textarea,select")) return;
      if (e.key === "[" || e.key === "]") {
        var n = document.querySelector(e.key === "]" ? ".std + .std" : null);
        if (n) n.scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bootSidebar();
    bootProgress();
    bootScrollSpy();
    bootProgressMemory();
    bootExpandAll();
    bootChapGroups();
    bootMode();
    bootKeys();
    bootMath();
  });
})();
