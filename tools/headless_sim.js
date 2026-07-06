// 无头数值模拟：玩家侧由 AI.step 以固定频率驱动，验证对战平衡
(function () {
  var ZY = globalThis.ZY;
  var C = ZY.C;

  function runOne(maxSimSeconds, playerItv) {
    ZY.Main.newGame();
    var G = ZY.G;
    var dt = 1 / 30;
    var steps = Math.floor(maxSimSeconds / dt);
    var botAcc = 0;
    var log = [];
    var lastWave = 0;
    var pGenerals = {};

    for (var s = 0; s < steps; s++) {
      if (G.scene !== 'play') break;
      G.time += dt;
      botAcc += dt;
      if (botAcc >= playerItv) { botAcc = 0; ZY.AI.step(G.p, 'p'); }
      ZY.Enemies.update(dt);
      if (G.scene !== 'play') break;
      ZY.Battle.update(dt);
      ZY.AI.update(dt);

      for (var k in G.p.units) if (G.p.units[k].kind === 'g') pGenerals[G.p.units[k].name] = true;

      if (G.wave > lastWave) {
        lastWave = G.wave;
        log.push('  波' + G.wave + ' | t=' + G.time.toFixed(0) + 's 我心=' + G.p.hearts +
          ' 敌心=' + G.e.hearts + ' 馒头=' + G.p.mantou + ' 斩=' + G.kills);
      }
    }
    return {
      ended: G.scene === 'over', win: G.win, wave: G.wave,
      pHearts: G.p.hearts, eHearts: G.e.hearts,
      kills: G.kills, time: G.time.toFixed(0),
      generals: Object.keys(pGenerals), timeline: log
    };
  }

  var RUNS = 12;
  // playerItv=0.5 模拟熟练玩家；1.15+失误 即对手同水平
  print('=== 赵云与阿斗(对战版) 模拟 x' + RUNS + '（玩家=0.5s快手速）===');
  var wins = 0, waves = [];
  for (var r = 1; r <= RUNS; r++) {
    var res = runOne(1500, 0.5);
    wins += res.win ? 1 : 0;
    waves.push(res.wave);
    print('局' + r + ': ' + (res.ended ? (res.win ? '胜' : '负') : '超时') +
      ' | 波=' + res.wave + ' 用时=' + res.time + 's 我心=' + res.pHearts +
      ' 敌心=' + res.eHearts + ' 斩=' + res.kills +
      ' 武将=' + (res.generals.join(',') || '无'));
    if (r === 1) res.timeline.forEach(function (l) { print(l); });
  }
  print('=== 快手速胜率 ' + wins + '/' + RUNS + ' | 波数 ' + waves.join(',') + ' ===');

  print('');
  print('=== 与对手同速（1.15s+同失误率，应五五开）===');
  var wins2 = 0;
  for (var r2 = 1; r2 <= RUNS; r2++) {
    var res2 = runOne(1500, 1.15);
    wins2 += res2.win ? 1 : 0;
    print('局' + r2 + ': ' + (res2.win ? '胜' : '负') + ' | 波=' + res2.wave +
      ' 我心=' + res2.pHearts + ' 敌心=' + res2.eHearts);
  }
  print('=== 同速胜率 ' + wins2 + '/' + RUNS + ' ===');
})();
