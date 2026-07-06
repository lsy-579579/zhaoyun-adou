// 平台适配层：微信(wx) / 抖音(tt) / 浏览器 统一为同一套接口
(function () {
  var root = (typeof GameGlobal !== 'undefined') ? GameGlobal
    : (typeof globalThis !== 'undefined') ? globalThis
    : (typeof window !== 'undefined') ? window : this;
  var ZY = root.ZY = root.ZY || {};
  root.ZYRoot = root;

  var env = 'web';
  var api = null;
  if (typeof wx !== 'undefined' && wx.createCanvas) { env = 'wx'; api = wx; }
  else if (typeof tt !== 'undefined' && tt.createCanvas) { env = 'tt'; api = tt; }

  var DW = 750; // 设计宽度固定 750，高度随屏幕比例变化
  var A = {
    env: env,
    DW: DW,
    DH: 1334,
    canvas: null,
    ctx: null,
    scale: 1,
    listeners: { down: [], move: [], up: [] },
    hasScreen: false
  };

  function emit(type, x, y) {
    var arr = A.listeners[type];
    for (var i = 0; i < arr.length; i++) arr[i](x, y);
  }

  A.on = function (type, fn) { A.listeners[type].push(fn); };

  function initMiniGame() {
    var canvas = api.createCanvas();
    var info;
    try { info = api.getWindowInfo ? api.getWindowInfo() : api.getSystemInfoSync(); }
    catch (e) { info = api.getSystemInfoSync(); }
    var sw = info.screenWidth, sh = info.screenHeight;
    var dpr = Math.min(info.pixelRatio || 2, 2);
    canvas.width = sw * dpr;
    canvas.height = sh * dpr;
    var s = canvas.width / DW;
    A.canvas = canvas;
    A.ctx = canvas.getContext('2d');
    A.ctx.setTransform(s, 0, 0, s, 0, 0);
    A.scale = s;
    A.DH = canvas.height / s;
    var toDesign = DW / sw;
    api.onTouchStart(function (e) {
      var t = e.touches[0]; if (t) emit('down', t.clientX * toDesign, t.clientY * toDesign);
    });
    api.onTouchMove(function (e) {
      var t = e.touches[0]; if (t) emit('move', t.clientX * toDesign, t.clientY * toDesign);
    });
    api.onTouchEnd(function (e) {
      var t = e.changedTouches && e.changedTouches[0];
      emit('up', t ? t.clientX * toDesign : 0, t ? t.clientY * toDesign : 0);
    });
    api.onTouchCancel && api.onTouchCancel(function () { emit('up', -1, -1); });
    A.hasScreen = true;
  }

  function initWeb() {
    if (typeof document === 'undefined') return; // node 环境仅跑逻辑
    var canvas = document.getElementById('cv');
    if (!canvas) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      var cssH = window.innerHeight;
      var cssW = Math.min(window.innerWidth, Math.max(360, Math.floor(cssH * 0.56)));
      canvas.style.width = cssW + 'px';
      canvas.style.height = cssH + 'px';
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
      var s = canvas.width / DW;
      A.ctx = canvas.getContext('2d');
      A.ctx.setTransform(s, 0, 0, s, 0, 0);
      A.scale = s;
      A.DH = canvas.height / s;
      if (ZY.onResize) ZY.onResize();
    }
    resize();
    window.addEventListener('resize', resize);
    A.canvas = canvas;
    A.hasScreen = true;

    function pos(ev) {
      var rect = canvas.getBoundingClientRect();
      var cx = (ev.touches && ev.touches[0]) ? ev.touches[0].clientX : ev.clientX;
      var cy = (ev.touches && ev.touches[0]) ? ev.touches[0].clientY : ev.clientY;
      if (ev.changedTouches && ev.changedTouches[0] && cx === undefined) {
        cx = ev.changedTouches[0].clientX; cy = ev.changedTouches[0].clientY;
      }
      return [(cx - rect.left) * (DW / rect.width), (cy - rect.top) * (DW / rect.width)];
    }
    var pressed = false;
    canvas.addEventListener('mousedown', function (e) { pressed = true; var p = pos(e); emit('down', p[0], p[1]); });
    window.addEventListener('mousemove', function (e) { if (pressed) { var p = pos(e); emit('move', p[0], p[1]); } });
    window.addEventListener('mouseup', function (e) { if (pressed) { pressed = false; var p = pos(e); emit('up', p[0], p[1]); } });
    canvas.addEventListener('touchstart', function (e) { e.preventDefault(); var p = pos(e); emit('down', p[0], p[1]); }, { passive: false });
    canvas.addEventListener('touchmove', function (e) { e.preventDefault(); var p = pos(e); emit('move', p[0], p[1]); }, { passive: false });
    canvas.addEventListener('touchend', function (e) {
      e.preventDefault();
      var t = e.changedTouches[0];
      var rect = canvas.getBoundingClientRect();
      emit('up', (t.clientX - rect.left) * (DW / rect.width), (t.clientY - rect.top) * (DW / rect.width));
    }, { passive: false });
  }

  if (env === 'web') initWeb(); else initMiniGame();

  A.raf = function (fn) {
    if (typeof requestAnimationFrame !== 'undefined') return requestAnimationFrame(fn);
    return setTimeout(function () { fn(Date.now()); }, 16);
  };

  A.storageGet = function (key) {
    try {
      if (api) return api.getStorageSync(key) || null;
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    } catch (e) {}
    return null;
  };
  A.storageSet = function (key, val) {
    try {
      if (api) api.setStorageSync(key, val);
      else if (typeof localStorage !== 'undefined') localStorage.setItem(key, val);
    } catch (e) {}
  };

  A.createOffCanvas = function (w, h) {
    var c;
    if (api && api.createCanvas) c = api.createCanvas();
    else if (typeof document !== 'undefined') c = document.createElement('canvas');
    else return null;
    c.width = w; c.height = h;
    return c;
  };

  // 震动反馈（可选能力）
  A.vibrate = function () {
    try { if (api && api.vibrateShort) api.vibrateShort({ type: 'light' }); } catch (e) {}
  };

  ZY.adapter = A;
})();
