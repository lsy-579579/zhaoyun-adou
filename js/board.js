// 阵地与备战席：征兵、拖拽布阵、同字同级合成、碎片拼武将
// 双方(p/e)各有独立的馒头、备战席、阵地单位、红心
(function () {
  var root = (typeof GameGlobal !== 'undefined') ? GameGlobal
    : (typeof window !== 'undefined') ? window : globalThis;
  var ZY = root.ZY = root.ZY || {};
  var C = ZY.C, R = ZY.R, M_ = function () { return ZY.Map; };

  var B = {};
  var drag = null; // {from:{type:'bench'|'cell', idx|key}, unit, x, y}

  B.newSide = function () {
    return {
      mantou: C.ECON.startMantou,
      recruitCount: 0,
      bench: new Array(C.ECON.benchSize).fill(null),
      units: {},           // 'c_r' -> unit
      hearts: C.ECON.hearts,
      shakeT: 0
    };
  };

  B.reset = function () {
    drag = null;
  };

  function key(c, r) { return c + '_' + r; }
  B.key = key;

  // ---- 单位 ----
  B.makeSoldier = function (ch, lv) {
    return { kind: 's', ch: ch, lv: lv || 1, cd: 0 };
  };
  B.makeFrag = function (ch) {
    return { kind: 'f', ch: ch, cd: 0 };
  };
  B.makeGeneral = function (name) {
    return { kind: 'g', name: name, ch: name, cd: 0 };
  };

  ZY.unitStats = function (u) {
    if (u.kind === 's') {
      var s = C.SOLDIERS[u.ch];
      var m = C.lvMul(u.lv);
      return { dmg: Math.round(s.dmg * m), itv: s.itv, range: s.range, soldier: true };
    }
    if (u.kind === 'g') {
      var g = C.GENERALS[u.name];
      return { dmg: g.dmg, itv: g.itv, range: g.range, skill: g.skill, general: true };
    }
    return { inert: true }; // 碎片不能作战
  };

  // ---- 征兵 ----
  B.recruitCost = function (S) {
    return C.ECON.recruitBase + S.recruitCount * C.ECON.recruitInc;
  };

  function ownedFragChars(S) {
    var own = {};
    S.bench.forEach(function (u) { if (u && u.kind === 'f') own[u.ch] = true; });
    for (var k in S.units) if (S.units[k].kind === 'f') own[S.units[k].ch] = true;
    return own;
  }

  B.recruit = function (S, sideIsPlayer) {
    var cost = B.recruitCost(S);
    if (S.mantou < cost) {
      if (sideIsPlayer) ZY.UI.toast('馒头不足');
      return false;
    }
    var slot = S.bench.indexOf(null);
    if (slot < 0) {
      if (sideIsPlayer) ZY.UI.toast('备战席已满');
      return false;
    }
    S.mantou -= cost;
    S.recruitCount++;
    var roll = Math.random() * 100;
    var unit;
    if (roll < C.RECRUIT_POOL[0].w) {
      var ch = C.SOLDIER_CHARS[(Math.random() * C.SOLDIER_CHARS.length) | 0];
      unit = B.makeSoldier(ch, 1);
    } else {
      // 碎片：优先补全已有单字
      var own = ownedFragChars(S);
      var wants = [];
      for (var oc in own) {
        var pair = C.FRAG_MAP[oc][1];
        if (!own[pair]) wants.push(pair);
      }
      var fc = (wants.length && Math.random() < 0.65)
        ? wants[(Math.random() * wants.length) | 0]
        : C.FRAG_CHARS[(Math.random() * C.FRAG_CHARS.length) | 0];
      unit = B.makeFrag(fc);
    }
    S.bench[slot] = unit;
    if (sideIsPlayer) ZY.sfx('coin');
    return true;
  };

  // ---- 合成判定 ----
  B.tryMerge = function (a, b) {
    if (a.kind === 's' && b.kind === 's' && a.ch === b.ch && a.lv === b.lv && a.lv < C.MAX_LV) {
      return B.makeSoldier(a.ch, a.lv + 1);
    }
    if (a.kind === 'f' && b.kind === 'f' && C.FRAG_MAP[a.ch][1] === b.ch) {
      return B.makeGeneral(C.FRAG_MAP[a.ch][0]);
    }
    return null;
  };

  function afterMerge(S, merged, x, y, isPlayer) {
    if (merged.kind === 'g') {
      ZY.Battle.fx('summon', x, y);
      ZY.Battle.fx('text', x, y - 70, merged.name + '·觉醒！', '#b8860b');
      if (isPlayer) { ZY.sfx('summon'); ZY.adapter.vibrate(); }
    } else {
      ZY.Battle.fx('ink', x, y);
      if (isPlayer) ZY.sfx('merge');
    }
  }

  // ---- AI 可复用的操作原语 ----
  B.placeFromBench = function (S, side, benchIdx, c, r) {
    var Map = M_();
    var t = Map.cellType[key(c, r)];
    if (t !== 'build_' + side) return false;
    var u = S.bench[benchIdx];
    if (!u) return false;
    var target = S.units[key(c, r)];
    if (!target) {
      S.units[key(c, r)] = u;
      S.bench[benchIdx] = null;
      return true;
    }
    var merged = B.tryMerge(u, target);
    if (merged) {
      S.units[key(c, r)] = merged;
      S.bench[benchIdx] = null;
      var p = Map.cellCenter(c, r);
      afterMerge(S, merged, p.x, p.y, side === 'p');
      return true;
    }
    return false;
  };

  B.mergeOnBoard = function (S, side, fromKey, toKey) {
    var a = S.units[fromKey], b = S.units[toKey];
    if (!a || !b) return false;
    var merged = B.tryMerge(a, b);
    if (!merged) return false;
    S.units[toKey] = merged;
    delete S.units[fromKey];
    var cr = toKey.split('_');
    var p = M_().cellCenter(+cr[0], +cr[1]);
    afterMerge(S, merged, p.x, p.y, side === 'p');
    return true;
  };

  // ---- 玩家拖拽 ----
  function benchSlotAt(x, y) {
    var L = ZY.L;
    if (y < L.benchY - L.benchSlot / 2 - 8 || y > L.benchY + L.benchSlot / 2 + 8) return -1;
    for (var i = 0; i < C.ECON.benchSize; i++) {
      var sx = L.benchX + i * (L.benchSlot + L.benchGap) + L.benchSlot / 2;
      if (Math.abs(x - sx) <= L.benchSlot / 2 + L.benchGap / 2) return i;
    }
    return -1;
  }
  B.benchSlotCenter = function (i) {
    var L = ZY.L;
    return { x: L.benchX + i * (L.benchSlot + L.benchGap) + L.benchSlot / 2, y: L.benchY };
  };

  B.onDown = function (x, y) {
    var G = ZY.G, Map = M_();
    var S = G.p;
    var bi = benchSlotAt(x, y);
    if (bi >= 0 && S.bench[bi]) {
      drag = { from: { type: 'bench', idx: bi }, unit: S.bench[bi], x: x, y: y };
      return true;
    }
    var cell = Map.cellAt(x, y);
    if (cell) {
      var k = key(cell.c, cell.r);
      if (Map.cellType[k] === 'build_p' && S.units[k]) {
        drag = { from: { type: 'cell', key: k }, unit: S.units[k], x: x, y: y };
        return true;
      }
    }
    return false;
  };

  B.onMove = function (x, y) {
    if (!drag) return false;
    drag.x = x; drag.y = y;
    return true;
  };

  B.onUp = function (x, y) {
    if (!drag) return false;
    var G = ZY.G, Map = M_();
    var S = G.p;
    var d = drag;
    drag = null;

    var bi = benchSlotAt(x, y);
    var cell = Map.cellAt(x, y);
    var ck = cell ? key(cell.c, cell.r) : null;
    var isBuild = ck && Map.cellType[ck] === 'build_p';

    if (d.from.type === 'bench') {
      if (bi >= 0 && bi !== d.from.idx) {
        // 席位内交换
        var tmp = S.bench[bi];
        S.bench[bi] = d.unit;
        S.bench[d.from.idx] = tmp;
        return true;
      }
      if (isBuild) {
        var target = S.units[ck];
        if (!target) { S.units[ck] = d.unit; S.bench[d.from.idx] = null; ZY.sfx('click'); return true; }
        var merged = B.tryMerge(d.unit, target);
        if (merged) {
          S.units[ck] = merged;
          S.bench[d.from.idx] = null;
          var p = Map.cellCenter(cell.c, cell.r);
          afterMerge(S, merged, p.x, p.y, true);
        }
        return true;
      }
      return true;
    }

    // from cell
    if (bi >= 0) {
      if (!S.bench[bi]) { S.bench[bi] = d.unit; delete S.units[d.from.key]; return true; }
      var m2 = B.tryMerge(d.unit, S.bench[bi]);
      if (m2) {
        S.bench[bi] = m2;
        delete S.units[d.from.key];
        var bp = B.benchSlotCenter(bi);
        afterMerge(S, m2, bp.x, bp.y, true);
      }
      return true;
    }
    if (isBuild && ck !== d.from.key) {
      var t2 = S.units[ck];
      if (!t2) { S.units[ck] = d.unit; delete S.units[d.from.key]; return true; }
      if (!B.mergeOnBoard(S, 'p', d.from.key, ck)) {
        // 交换
        S.units[d.from.key] = t2;
        S.units[ck] = d.unit;
      }
      return true;
    }
    return true;
  };

  B.dragging = function () { return drag; };

  B.eachUnit = function (S, fn) {
    for (var k in S.units) {
      var cr = k.split('_');
      fn(S.units[k], +cr[0], +cr[1], k);
    }
  };

  // ---- 绘制单位牌 ----
  B.drawUnit = function (ctx, u, x, y, size, alpha) {
    var opt = { alpha: alpha };
    if (u.kind === 's') { opt.lv = u.lv; }
    if (u.kind === 'f') { opt.gold = true; }
    if (u.kind === 'g') { opt.gold = true; opt.hl = true; }
    var ch = u.kind === 'g' ? u.name : u.ch;
    if (u.kind === 'g') {
      // 双字武将牌：字号缩小
      ctx.save();
      ctx.globalAlpha = alpha != null ? alpha : 1;
      R.mahjong(ctx, x, y, size, '', opt);
      ctx.fillStyle = '#b8860b';
      R.font(ctx, size * 0.4, true);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ch[0], x, y - size * 0.2);
      ctx.fillText(ch[1], x, y + size * 0.22);
      ctx.restore();
    } else {
      R.mahjong(ctx, x, y, size, ch, opt);
    }
  };

  ZY.Board = B;
})();
