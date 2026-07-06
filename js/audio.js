// 音效：小游戏端用 InnerAudioContext，浏览器端用 HTMLAudio
(function () {
  var root = (typeof GameGlobal !== 'undefined') ? GameGlobal
    : (typeof window !== 'undefined') ? window : globalThis;
  var ZY = root.ZY = root.ZY || {};

  var api = null;
  if (typeof wx !== 'undefined' && wx.createInnerAudioContext) api = wx;
  else if (typeof tt !== 'undefined' && tt.createInnerAudioContext) api = tt;

  var NAMES = ['merge', 'shoot', 'hit', 'coin', 'summon', 'boss', 'win', 'lose', 'click'];
  var pool = {};
  var enabled = true;

  NAMES.forEach(function (n) {
    var src = 'audio/' + n + '.wav';
    var list = [];
    var poolSize = (n === 'shoot' || n === 'hit') ? 3 : 1;
    for (var i = 0; i < poolSize; i++) {
      try {
        var a;
        if (api) { a = api.createInnerAudioContext(); a.src = src; }
        else if (typeof Audio !== 'undefined') { a = new Audio(src); }
        if (a) { a.volume = 0.5; list.push(a); }
      } catch (e) {}
    }
    pool[n] = { list: list, idx: 0 };
  });

  var lastPlay = {};
  ZY.sfx = function (name) {
    if (!enabled) return;
    var p = pool[name];
    if (!p || !p.list.length) return;
    var now = Date.now();
    if (lastPlay[name] && now - lastPlay[name] < 45) return; // 限流
    lastPlay[name] = now;
    var a = p.list[p.idx];
    p.idx = (p.idx + 1) % p.list.length;
    try {
      if (a.stop && api) { a.stop(); a.play(); }
      else { a.currentTime = 0; a.play().catch(function () {}); }
    } catch (e) {}
  };

  ZY.sfxToggle = function () { enabled = !enabled; return enabled; };
  ZY.sfxEnabled = function () { return enabled; };
})();
