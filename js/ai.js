// AI 操作逻辑：对手侧自动运营；也供 ?bot=1 挂机调试驱动玩家侧
(function () {
  var root = (typeof GameGlobal !== 'undefined') ? GameGlobal
    : (typeof window !== 'undefined') ? window : globalThis;
  var ZY = root.ZY = root.ZY || {};

  var AI = {};
  var thinkT = 0;

  // 难度：思考间隔越短、失误率越低越强
  var THINK_ITV = 1.15;
  var MISS_RATE = 0.22;

  AI.reset = function () { thinkT = 2.0; };

  function B() { return ZY.Board; }

  // 执行一步最优操作，返回是否有动作
  AI.step = function (S, side) {
    var cells = ZY.Map.buildOf(side);

    // 1. 席内碎片/同级配对合成
    for (var i = 0; i < S.bench.length; i++) {
      for (var j = 0; j < S.bench.length; j++) {
        if (i === j || !S.bench[i] || !S.bench[j]) continue;
        var m = B().tryMerge(S.bench[i], S.bench[j]);
        if (m) {
          S.bench[j] = m;
          S.bench[i] = null;
          if (side === 'p') {
            var bp = B().benchSlotCenter(j);
            ZY.Battle.fx(m.kind === 'g' ? 'summon' : 'ink', bp.x, bp.y);
          }
          return true;
        }
      }
    }

    // 2. 阵地互相合成
    var keys = Object.keys(S.units);
    for (var a = 0; a < keys.length; a++) {
      for (var b = 0; b < keys.length; b++) {
        if (a === b) continue;
        if (B().tryMerge(S.units[keys[a]], S.units[keys[b]])) {
          B().mergeOnBoard(S, side, keys[a], keys[b]);
          return true;
        }
      }
    }

    // 3. 席上单位合到阵地
    for (var i2 = 0; i2 < S.bench.length; i2++) {
      var u = S.bench[i2];
      if (!u) continue;
      for (var c = 0; c < cells.length; c++) {
        var k = cells[c][0] + '_' + cells[c][1];
        var t = S.units[k];
        if (t && B().tryMerge(u, t)) {
          B().placeFromBench(S, side, i2, cells[c][0], cells[c][1]);
          return true;
        }
      }
    }

    // 4. 士兵/武将上阵（碎片留席上等配对；席满时也硬放）
    var emptyBench = 0;
    S.bench.forEach(function (x) { if (!x) emptyBench++; });
    for (var i3 = 0; i3 < S.bench.length; i3++) {
      var u2 = S.bench[i3];
      if (!u2) continue;
      if (u2.kind === 'f' && emptyBench > 1) continue;
      for (var c2 = 0; c2 < cells.length; c2++) {
        var k2 = cells[c2][0] + '_' + cells[c2][1];
        if (!S.units[k2]) {
          B().placeFromBench(S, side, i3, cells[c2][0], cells[c2][1]);
          return true;
        }
      }
    }

    // 5. 征兵（新版返回 5 张卡牌，AI 自动挑一张最佳卡牌入席）
    if (S.mantou >= B().recruitCost(S) && S.bench.indexOf(null) >= 0) {
      var cards = B().recruit(S, false);
      if (!cards || !cards.length) return false;
      // AI 选卡策略：碎片 > 武将 > 士兵 > 铲子（AI 不会用铲子）
      var pick = -1;
      var order = { 'f': 0, 'g': 1, 's': 2, 'shovel': 3 };
      var bestOrder = 99;
      for (var ci = 0; ci < cards.length; ci++) {
        var k = cards[ci].kind;
        var ord = order[k] != null ? order[k] : 9;
        if (ord < bestOrder) { bestOrder = ord; pick = ci; }
      }
      if (pick < 0) pick = 0;
      // 铲子对 AI 无用，转挑第一张非铲子卡
      if (cards[pick].kind === 'shovel') {
        for (var ci2 = 0; ci2 < cards.length; ci2++) {
          if (cards[ci2].kind !== 'shovel') { pick = ci2; break; }
        }
      }
      return B().pickCard(S, cards, pick);
    }
    return false;
  };

  AI.update = function (dt) {
    var G = ZY.G;
    thinkT -= dt;
    if (thinkT > 0) return;
    thinkT = THINK_ITV;
    if (Math.random() < MISS_RATE) return;
    AI.step(G.e, 'e');
  };

  ZY.AI = AI;
})();
