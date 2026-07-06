// 诊断：同速对打时双方阵地战力发展对比
(function () {
  var ZY = globalThis.ZY;

  function power(S) {
    var total = 0, n = 0;
    for (var k in S.units) {
      var st = ZY.unitStats(S.units[k]);
      if (!st.inert) { total += st.dmg / st.itv; n++; }
    }
    return { dps: Math.round(total), n: n };
  }

  ZY.Main.newGame();
  var G = ZY.G;
  var dt = 1 / 30;
  var botAcc = 0;
  for (var s = 0; s < 30 * 400; s++) {
    if (G.scene !== 'play') break;
    G.time += dt;
    botAcc += dt;
    if (botAcc >= 1.15) { botAcc = 0; ZY.AI.step(G.p, 'p'); }
    ZY.Enemies.update(dt);
    if (G.scene !== 'play') break;
    ZY.Battle.update(dt);
    ZY.AI.update(dt);
    if (s % (30 * 20) === 0) {
      var pp = power(G.p), pe = power(G.e);
      var pEn = 0, eEn = 0;
      G.enemies.forEach(function (e) { if (e.side === 'p') pEn++; else eEn++; });
      print('t=' + G.time.toFixed(0) + 's 波' + G.wave +
        ' | 我: dps=' + pp.dps + ' 单位=' + pp.n + ' 席=' + G.p.bench.filter(Boolean).length + ' 馒头=' + G.p.mantou + ' 心=' + G.p.hearts + ' 场上敌=' + pEn +
        ' | 敌: dps=' + pe.dps + ' 单位=' + pe.n + ' 席=' + G.e.bench.filter(Boolean).length + ' 馒头=' + G.e.mantou + ' 心=' + G.e.hearts + ' 场上敌=' + eEn);
    }
  }
  print('结束: ' + (G.win ? '胜' : '负') + ' 我心=' + G.p.hearts + ' 敌心=' + G.e.hearts + ' 波=' + G.wave);
})();
