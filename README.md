# 悟空与唐僧 · 文字合成塔防

以西游记「西天取经」为背景的文字合成策略塔防小游戏：**上下分屏对称对战 + 沿路寻径塔防 + 麻将牌字块 + 武将碎片拼字**。纯 Canvas 手写引擎，零第三方依赖，一套代码同时支持 **微信小游戏**、**抖音小游戏** 和 **网页浏览器**。

## 玩法

- 战场为 8×10 格地图，上半场是**对手 AI**，下半场是你，中间山脊分隔
- 每波敌军（贼/匪/盗/寇，每 5 波 BOSS「牛」魔王）同时进攻双方，沿各自的 S 形土路冲向守将
- 守将只有 **3 颗红心**，漏过一个敌人掉一颗，先掉光的一方落败
- 点「征兵」（花馒头）抽字牌进**备战席**，拖到路边**白色空地**布阵
- 四大基础兵种平行成长：**刀**（近战快攻）/ **枪**（中距）/ **弓**（远程速射）/ **骑**（重击），同字同级二合一升级（最高 5 级）
- 征兵可能抽到**金色武将单字碎片**（悟/空/八/戒/沙/僧/唐/三/白/龙）——碎片不能作战、纯占格子，拼齐姓名才觉醒：**悟空**（贯穿）、**八戒**（范围眩晕）、**沙僧**（斩杀）、**唐三**（超远速射）、**白龙**（全军增伤）
- 5 种地图随机切换：火焰山 / 流沙河 / 盘丝洞 / 水帘洞 / 女儿国
- 撑过 10 波或先耗光对手红心即胜利

## 本地运行

```bash
# 方式一：直接双击打开 index.html（file:// 协议可玩）
# 方式二：起个静态服务器
python3 -m http.server 8765
# 浏览器打开 http://localhost:8765/index.html
# 挂机调试模式（AI 代打）：index.html?bot=1
```

## 目录结构

```
game.js                    小游戏入口（require 各模块）
game.json                  小游戏配置（竖屏）
project.config.json        微信开发者工具项目配置
project.douyin.config.json 抖音开发者工具项目配置（使用时重命名覆盖）
index.html                 浏览器调试入口
js/
  adapter.js               平台适配层（wx / tt / 浏览器统一接口）
  config.js                数值配置（兵种、武将、敌人、经济、波次）
  map.js                   地图（8×10 格、5 种布局随机、可建造格、上下镜像）
  render.js                渲染（宣纸、地砖、土路、麻将牌、红心金冠）
  audio.js                 音效播放（InnerAudioContext / HTMLAudio）
  board.js                 备战席、征兵、拖拽布阵、合成、碎片拼武将
  enemies.js               敌军沿路寻径、双方同波、漏怪扣心
  battle.js                自动索敌、弹道、武将技、特效
  ai.js                    对手 AI（也驱动 ?bot=1 挂机调试）
  rank.js                  玩家段位（11 级 × 5 阶 × 5 星）
  ui.js                    开始界面、HUD、暂停、胜负结算
  main.js                  布局、地图绘制、主循环、场景状态机
audio/                     程序生成的 WAV 音效
sim/                       无头模拟器（数据驱动平衡调优）
tools/
  gen_audio.py             重新生成音效：python3 tools/gen_audio.py
```

## 发布到微信小游戏

1. 在 [微信公众平台](https://mp.weixin.qq.com/) 注册 **小游戏** 账号，拿到 AppID
2. 下载 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)，选择「导入项目」，目录选本项目根目录
3. 把 `project.config.json` 里的 `appid` 从 `touristappid` 改成你的 AppID
4. 工具内预览/真机调试确认无误后，点「上传」
5. 在 mp.weixin.qq.com 后台提交版本审核（需要完成软著/备案等资质要求），审核通过后发布

## 发布到抖音小游戏

1. 在 [抖音开放平台](https://developer.open-douyin.com/) 注册小游戏，拿到 `tt` 开头的 AppID
2. 下载「抖音开发者工具」，导入本项目根目录
3. 把 `project.douyin.config.json` 重命名为 `project.config.json`（先备份微信版），填入你的 AppID
4. 预览确认后上传、提交审核

> 两个平台的 API（`wx.*` / `tt.*`）已由 `js/adapter.js` 和 `js/audio.js` 自动识别适配，业务代码无需改动。

## 数值调优

改 `js/config.js` 即可调整兵种/敌人/经济数值。改完跑无头模拟验证平衡：

```bash
node sim/run.js <rank> <subLevel> <stars> <N>   # 指定段位跑 N 局
node sim/sweep.js                                 # 11 段位批量扫描
```

AI 难度曲线随玩家段位提升（思考更快/失误更少/抽卡运气更好），已通过 11000 局模拟调至每段位胜率 40%~60%。
