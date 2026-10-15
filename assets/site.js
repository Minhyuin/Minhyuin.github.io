/* Myuin — 交互脚本
 * 1) 滚动入场（IntersectionObserver，尊重 prefers-reduced-motion）
 * 2) 深色 / 浅色主题切换（localStorage 持久化）
 * 3) 页脚年份
 * 不依赖任何第三方库。
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. 滚动入场 ────────────────────────────────────────── */
  var targets = document.querySelectorAll('.scroll-reveal');

  if (prefersReduced || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // 同一屏内的元素错落 80ms 出现
        var siblings = Array.prototype.slice.call(el.parentNode.children);
        var index = Math.min(siblings.indexOf(el), 6);
        el.style.transitionDelay = (index * 80) + 'ms';
        el.classList.add('is-visible');
        observer.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    targets.forEach(function (el) { observer.observe(el); });
  }

  /* ── 2. 主题切换 ────────────────────────────────────────── */
  var STORAGE_KEY = 'myuin-theme';
  var toggle = document.querySelector('.theme-toggle');
  var media = window.matchMedia('(prefers-color-scheme: dark)');

  function currentTheme() {
    var explicit = root.getAttribute('data-theme');
    if (explicit === 'dark' || explicit === 'light') return explicit;
    return media.matches ? 'dark' : 'light';
  }

  function syncToggle() {
    if (!toggle) return;
    var isDark = currentTheme() === 'dark';
    toggle.setAttribute('aria-pressed', String(isDark));
    toggle.setAttribute('aria-label', isDark ? '切换到浅色主题' : '切换到深色主题');
  }

  if (toggle) {
    syncToggle();
    toggle.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(STORAGE_KEY, next); } catch (e) { /* 忽略 */ }
      syncToggle();
    });
    // 未手动选择时，跟随系统变化
    var onSystemChange = function () {
      if (!root.getAttribute('data-theme')) syncToggle();
    };
    if (media.addEventListener) media.addEventListener('change', onSystemChange);
    else if (media.addListener) media.addListener(onSystemChange);
  }

  /* ── 3. 页脚年份 ────────────────────────────────────────── */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
