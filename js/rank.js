// 玩家段位：11 级 × 5 阶 × 5 星（满 5 星后再通关一次升下一阶）
(function () {
  var root = (typeof GameGlobal !== 'undefined') ? GameGlobal
    : (typeof window !== 'undefined') ? window : globalThis;
  var ZY = root.ZY = root.ZY || {};
  var C = ZY.C, A = ZY.adapter;

  var KEY = 'zy_rank_v1';

  function load() {
    var raw = A.storageGet(KEY);
    if (!raw) { var d0 = { rank: 0, subLevel: 1, stars: 0 }; d0.rankName = getRankName(d0); return d0; }
    try {
      var d = JSON.parse(raw);
      if (typeof d.rank !== 'number') d.rank = 0;
      if (typeof d.subLevel !== 'number' || d.subLevel < 1) d.subLevel = 1;
      if (typeof d.stars !== 'number') d.stars = 0;
      d.rankName = getRankName(d);
      return d;
    } catch (e) {
      var de = { rank: 0, subLevel: 1, stars: 0 };
      de.rankName = getRankName(de);
      return de;
    }
  }

  function save(d) { A.storageSet(KEY, JSON.stringify(d)); }

  function clamp(d) {
    var maxRank = C.RANKS.length - 1;
    if (d.rank > maxRank) d.rank = maxRank;
    if (d.rank < 0) d.rank = 0;
    if (!d.subLevel || d.subLevel < 1) d.subLevel = 1;
    if (d.subLevel > C.SUB_LEVELS_PER_RANK) d.subLevel = C.SUB_LEVELS_PER_RANK;
    if (d.stars < 0) d.stars = 0;
    if (d.stars > C.STARS_PER_RANK) d.stars = C.STARS_PER_RANK;
    return d;
  }

  function getRankName(d) {
    var rankName = C.RANKS[Math.min(d.rank, C.RANKS.length - 1)] || C.RANKS[0];
    var subIdx = Math.min(Math.max(d.subLevel || 1, 1), C.SUB_LEVELS_PER_RANK) - 1;
    return rankName + '·' + C.SUB_LEVELS[subIdx];
  }

  // 是否已满级（最高阶最高星）
  function isMaxed(d) {
    return d.rank === C.RANKS.length - 1
      && d.subLevel === C.SUB_LEVELS_PER_RANK
      && d.stars >= C.STARS_PER_RANK;
  }

  // 通关调用：返回 {promoted, rank, subLevel, stars, rankName, newRankName}
  // 规则：未满星 +1 星；满星后再赢一次 → 升下一阶（阶满则升下一级）
  function promoteOnWin() {
    var d = clamp(load());
    var promoted = false;
    var oldRank = d.rank;
    var oldSubLevel = d.subLevel;

    if (d.stars >= C.STARS_PER_RANK) {
      // 已满星，本次通关触发升阶
      d.stars = 0;
      if (d.subLevel < C.SUB_LEVELS_PER_RANK) {
        d.subLevel += 1;
        promoted = true;
      } else if (d.rank < C.RANKS.length - 1) {
        d.subLevel = 1;
        d.rank += 1;
        promoted = true;
      } else {
        // 已满级，维持满星
        d.subLevel = C.SUB_LEVELS_PER_RANK;
        d.stars = C.STARS_PER_RANK;
      }
    } else {
      d.stars += 1;
    }

    clamp(d);
    save(d);
    return {
      promoted: promoted,
      rank: d.rank,
      subLevel: d.subLevel,
      stars: d.stars,
      rankName: getRankName({ rank: oldRank, subLevel: oldSubLevel }),
      newRankName: getRankName(d)
    };
  }

  // 调试用（保留 API）
  function reset() { A.storageSet(KEY, JSON.stringify({ rank: 0, subLevel: 1, stars: 0 })); }

  ZY.Rank = { load: load, getRankName: getRankName, isMaxed: isMaxed, promoteOnWin: promoteOnWin, reset: reset };
})();
