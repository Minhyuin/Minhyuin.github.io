/* 粒子标志
 * 把 assets/logo.webp 采样成点阵（按原图颜色归类），
 * 指针靠近时点阵被吸过去、绕着指针打转，离开后弹回原位。
 * 没有依赖；图片没加载成功、或采样失败时，保持 <img> 兜底。
 */
(function () {
  'use strict';

  var canvas = document.querySelector('[data-particles]');
  if (!canvas) return;

  var wrap = canvas.parentElement;
  var imgEl = wrap.querySelector('img');
  var ctx = canvas.getContext('2d');
  if (!imgEl || !ctx) return;

  var SAMPLE = 300;                       // 采样网格边长（正方形）
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var COLOR_VARS = ['--p-red', '--p-blue', '--p-yellow', '--p-grey', '--p-light'];

  /* ── 调色板 ─────────────────────────────────────────────── */

  function hexToRgb(hex) {
    var h = hex.trim().replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var v = parseInt(h, 16);
    if (isNaN(v)) return [136, 136, 136];
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }

  function readPalette() {
    var cs = getComputedStyle(document.documentElement);
    return COLOR_VARS.map(function (name) {
      var css = cs.getPropertyValue(name).trim() || '#888888';
      return { css: css, rgb: hexToRgb(css) };
    });
  }

  function nearest(pal, r, g, b) {
    var best = 0;
    var dist = Infinity;
    for (var i = 0; i < pal.length; i++) {
      var p = pal[i].rgb;
      var d = (p[0] - r) * (p[0] - r) + (p[1] - g) * (p[1] - g) + (p[2] - b) * (p[2] - b);
      if (d < dist) { dist = d; best = i; }
    }
    return best;
  }

  /* ── 采样：把标志变成点 ──────────────────────────────────── */

  var pal = readPalette();

  function sample(target) {
    var buf = document.createElement('canvas');
    buf.width = buf.height = SAMPLE;
    var bctx = buf.getContext('2d', { willReadFrequently: true });
    bctx.drawImage(imgEl, 0, 0, SAMPLE, SAMPLE);

    var data;
    try {
      data = bctx.getImageData(0, 0, SAMPLE, SAMPLE).data;
    } catch (e) {
      return [];                       // 画布被污染（极少见），交给兜底图
    }

    var total = SAMPLE * SAMPLE;
    var ink = 0;
    var i;
    for (i = 0; i < total; i++) if (data[i * 4 + 3] > 96) ink++;
    if (!ink) return [];

    // 期望点数只决定网格步长；每格取一个点，保证分布均匀、不出团块
    var step = Math.max(1.2, SAMPLE / Math.sqrt(target / (ink / total)));
    var pts = [];
    var y, x, xx, yy, x0, y0, x1, y1, pick, seen, k, a;

    for (y = 0; y < SAMPLE; y += step) {
      for (x = 0; x < SAMPLE; x += step) {
        x0 = x | 0; y0 = y | 0;
        x1 = Math.min(Math.ceil(x + step), SAMPLE);
        y1 = Math.min(Math.ceil(y + step), SAMPLE);
        pick = -1; seen = 0;

        for (yy = y0; yy < y1; yy++) {
          for (xx = x0; xx < x1; xx++) {
            k = yy * SAMPLE + xx;
            if (data[k * 4 + 3] > 96) {
              seen++;
              if (Math.random() < 1 / seen) pick = k;   // 蓄水池抽样
            }
          }
        }
        if (pick < 0) continue;

        a = data[pick * 4 + 3];
        pts.push({
          x: ((pick % SAMPLE) + 0.5 + (Math.random() - 0.5) * step * 0.55) / SAMPLE,
          y: (((pick / SAMPLE) | 0) + 0.5 + (Math.random() - 0.5) * step * 0.55) / SAMPLE,
          c: nearest(pal, data[pick * 4], data[pick * 4 + 1], data[pick * 4 + 2]),
          soft: a < 235 ? 1 : 0
        });
      }
    }
    return pts;
  }

  /* ── 场 ─────────────────────────────────────────────────── */

  var n = 0;
  var hxN, hyN, hx, hy, x, y, vx, vy;
  var groups = [];
  var size = 0, dpr = 1, lastW = 0, R = 120, radius = 1.4;
  var fade = 0;
  var still = reduced.matches;
  var visible = true;
  var last = 0;
  var raf = 0;
  var ptr = { x: 0, y: 0, s: 0, active: false };

  // 点数按画布面积定：面积越大越密，密度保持一致
  function targetCount() {
    var s = size || 440;
    return Math.max(1400, Math.min(5200, Math.round((s * s) / 56)));
  }

  function build() {
    pal = readPalette();
    var list = sample(targetCount());
    n = list.length;
    if (!n) return false;

    hxN = new Float32Array(n);
    hyN = new Float32Array(n);
    hx = new Float32Array(n);
    hy = new Float32Array(n);
    x = new Float32Array(n);
    y = new Float32Array(n);
    vx = new Float32Array(n);
    vy = new Float32Array(n);

    var buckets = {};
    for (var i = 0; i < n; i++) {
      hxN[i] = list[i].x;
      hyN[i] = list[i].y;
      var key = list[i].c + '|' + list[i].soft;
      (buckets[key] || (buckets[key] = [])).push(i);
    }

    groups = Object.keys(buckets).map(function (key) {
      var parts = key.split('|');
      var ci = +parts[0];
      return {
        ci: ci,
        css: pal[ci].css,
        alpha: parts[1] === '1' ? 0.55 : 1,   // 抗锯齿边缘淡一点，轮廓更柔
        idx: new Int32Array(buckets[key])
      };
    });
    return true;
  }

  function layout() {
    var rect = canvas.getBoundingClientRect();
    size = Math.max(140, Math.round(rect.width || 440));
    lastW = size;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    R = size * 0.34;
    radius = Math.max(1.05, size * 0.0034);
    fade = still ? 1 : 0;

    for (var i = 0; i < n; i++) {
      hx[i] = hxN[i] * size;
      hy[i] = hyN[i] * size;
      vx[i] = 0;
      vy[i] = 0;
      if (still) {
        x[i] = hx[i];
        y[i] = hy[i];
      } else {
        // 入场：从家附近随机散开，再被弹簧拉回去
        var ang = Math.random() * Math.PI * 2;
        var d = size * (0.16 + Math.random() * 0.40);
        x[i] = hx[i] + Math.cos(ang) * d;
        y[i] = hy[i] + Math.sin(ang) * d;
      }
    }
  }

  function step(dt) {
    var f = Math.min(dt / 16.667, 2);
    var k = 0.05;          // 回位弹簧
    var damp = 0.88;       // 阻尼
    var pull = 2.6;        // 指针吸引力
    var swirl = 0.18;      // 切向分量，让粒子绕着指针转
    var cap = 26;          // 速度上限，防止偶尔一步跳太远
    var R2 = R * R;
    var ps = ptr.s;
    var t = performance.now();
    var i, dx, dy, d2, d, w, ax, ay, sp;

    for (i = 0; i < n; i++) {
      // 极轻的呼吸：整片点阵像在水面下微微起伏
      var wave = Math.sin(t * 0.0006 + (hxN[i] + hyN[i]) * 7) * 1.3;
      ax = (hx[i] + wave - x[i]) * k;
      ay = (hy[i] + wave * 0.6 - y[i]) * k;

      if (ps > 0.002) {
        dx = ptr.x - x[i];
        dy = ptr.y - y[i];
        d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          d = Math.sqrt(d2) || 0.001;
          w = 1 - d / R;
          w = w * w * pull * ps;
          ax += (dx / d) * w - (dy / d) * w * swirl;
          ay += (dy / d) * w + (dx / d) * w * swirl;
        }
      }

      vx[i] = (vx[i] + ax * f) * damp;
      vy[i] = (vy[i] + ay * f) * damp;

      sp = vx[i] * vx[i] + vy[i] * vy[i];
      if (sp > cap * cap) {
        sp = Math.sqrt(sp) / cap;
        vx[i] /= sp;
        vy[i] /= sp;
      }

      x[i] += vx[i] * f;
      y[i] += vy[i] * f;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, size, size);
    var r = radius;
    var d = r * 2;
    for (var g = 0; g < groups.length; g++) {
      var grp = groups[g];
      var idx = grp.idx;
      ctx.fillStyle = grp.css;
      ctx.globalAlpha = grp.alpha * fade;
      for (var j = 0; j < idx.length; j++) {
        var i = idx[j];
        ctx.fillRect(x[i] - r, y[i] - r, d, d);
      }
    }
    ctx.globalAlpha = 1;
  }

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    if (!visible) { last = ts; return; }
    var dt = last ? Math.min(ts - last, 48) : 16.7;
    last = ts;

    ptr.s += ((ptr.active ? 1 : 0) - ptr.s) * Math.min(1, dt / 110);
    step(dt);
    fade = Math.min(1, fade + dt / 420);
    draw();
  }

  function start() {
    if (raf || still) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function repaint() {
    pal = readPalette();
    for (var g = 0; g < groups.length; g++) groups[g].css = pal[groups[g].ci].css;
    if (!raf) draw();
  }

  /* ── 指针 ───────────────────────────────────────────────── */

  function move(e) {
    var rect = canvas.getBoundingClientRect();
    ptr.x = e.clientX - rect.left;
    ptr.y = e.clientY - rect.top;
    ptr.active = true;
  }

  function leave() {
    ptr.active = false;
  }

  var host = wrap.closest('.hero') || wrap;
  host.addEventListener('pointermove', move, { passive: true });
  host.addEventListener('pointerleave', leave, { passive: true });
  host.addEventListener('pointercancel', leave, { passive: true });
  host.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'touch') move(e);
  }, { passive: true });

  // 触摸：只有按在图上才算，避免划过首页滚动时也拖拽粒子
  var touched = false;
  canvas.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') { touched = true; move(e); }
  }, { passive: true });
  canvas.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch' && touched) move(e);
  }, { passive: true });
  function touchEnd() {
    if (touched) { touched = false; ptr.active = false; }
  }
  window.addEventListener('pointerup', touchEnd, { passive: true });
  window.addEventListener('pointercancel', touchEnd, { passive: true });

  /* ── 视口、尺寸、主题 ───────────────────────────────────── */

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (!visible) ptr.active = false;
    }, { rootMargin: '80px' }).observe(canvas);
  }

  if ('ResizeObserver' in window) {
    new ResizeObserver(function () {
      if (!n) return;
      var w = Math.round(canvas.getBoundingClientRect().width);
      if (!w || Math.abs(w - lastW) <= 2) return;
      // 尺寸变化很大时重新采样，让点阵密度保持一致
      var big = Math.abs(w - lastW) / lastW > 0.3;
      layout();
      if (big && build()) {
        layout();
        if (still) draw();
      }
    }).observe(wrap);
  } else {
    window.addEventListener('resize', function () { if (n) layout(); });
  }

  if ('MutationObserver' in window) {
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        if (records[i].attributeName === 'data-theme') { repaint(); return; }
      }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  var dark = window.matchMedia('(prefers-color-scheme: dark)');
  var onScheme = function () { repaint(); };
  if (dark.addEventListener) dark.addEventListener('change', onScheme);
  else if (dark.addListener) dark.addListener(onScheme);

  if (reduced.addEventListener) {
    reduced.addEventListener('change', function () {
      still = reduced.matches;
      if (still) { stop(); layout(); draw(); }
      else { layout(); start(); }
    });
  }

  /* ── 启动 ───────────────────────────────────────────────── */

  function boot() {
    if (!imgEl.naturalWidth) return;        // 图没加载成功，保留 <img>
    layout();
    if (!build()) return;
    layout();
    if (still) draw();
    else start();
    wrap.classList.add('is-live');
    document.dispatchEvent(new CustomEvent('particles:ready', { detail: { count: n } }));
  }

  if (imgEl.complete && imgEl.naturalWidth) boot();
  else imgEl.addEventListener('load', boot, { once: true });

  // 调试用：控制台可查看点数与参数
  window.__myuinParticles = function () {
    return { count: n, size: size, radius: radius, pullRadius: R, still: still, groups: groups.length };
  };
})();
