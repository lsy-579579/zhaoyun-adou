# 静态部署指南：把游戏放到公网让人扫码/发链接即玩

本项目是**纯前端**（HTML + Canvas + JS + 音效），不需要后端，可以放到**任何**静态托管服务。

## 目录结构（要部署的就是这一份）

```
index.html              ← 浏览器入口
game.js / game.json     ← 微信小游戏入口（部署到网页用不到）
project.config.json     ← 微信开发者工具配置（部署到网页用不到）
js/                     ← 全部游戏逻辑
audio/                  ← 9 个 wav 音效
```

部署后，访问 `https://你的域名/` 即可开始游戏。

---

## 一、最快：Vercel（零配置，2 分钟出链接，国外访问最快）

1. 把整个项目文件夹（不含 `.git`）打成 zip
2. 注册 [vercel.com](https://vercel.com)（用 GitHub 账号一键登录）
3. 主页点 **"Add New → Project" → "Deploy from Folder"**（或直接拖拽 zip）
4. 部署完成后会得到 `https://xxx.vercel.app`，把这个链接发给朋友即可
5. 后续改了代码：在 Vercel 控制台点 Redeploy 就行

## 二、国内访问最快：腾讯云静态网站托管 / 阿里云 OSS / 七牛云

三选一，步骤几乎一样：

1. 开通对象存储（OSS / COS），创建一个公开读 Bucket
2. 把整个项目文件上传到 Bucket 根目录
3. 在控制台开启 **"静态网站托管"**：
   - 默认首页：`index.html`
   - 默认 404：`index.html`（或者留空）
4. 会得到一个形如 `https://xxx-1300000000.cos-website.ap-shanghai.myqcloud.com` 的链接

> ⚠️ 注意：腾讯云 COS 必须把每个 `js/*.js`、`audio/*.wav` 都允许公开读。

## 三、微信云托管（可以挂到公众号菜单里）

1. 进入 [微信云托管](https://cloud.weixin.qq.com)
2. 新建项目 → 选 "静态网站托管"
3. 上传项目根目录文件
4. 绑定自己的备案域名（必须备案）后即可通过 `https://你的域名/` 访问

## 四、GitHub Pages（免费，但要会 git）

```bash
cd wukong-tangseng
git init && git add . && git commit -m init
# 在 github.com 新建仓库，比如 wukong-tangseng
git remote add origin https://github.com/你的用户名/wukong-tangseng.git
git push -u origin main
# 在仓库 Settings → Pages → Source 选 main 分支根目录
# 几分钟后得到 https://你的用户名.github.io/wukong-tangseng
```

## 五、本地预览（给别人发之前自己测一下）

```bash
cd wukong-tangseng
python3 -m http.server 8765
# 浏览器打开 http://127.0.0.1:8765/
```

或 macOS 直接双击 `打开游戏.command`。

---

## 验证部署是否成功

打开部署链接，看到标题「悟空与唐僧」+ 红色「开始游戏」按钮就对了。

然后:
1. 点开始游戏 → 进入战场
2. 点「征兵」→ 出现「刀」/「枪」字牌
3. 把字牌拖到棋盘白格 → 同字合成升级
4. 等 5 秒 → 「贼」字敌人从上方出现，沿路攻击你的守将

如果看到守将有 **3 颗红心** + **金冠** 就对了。

## 常见问题

**Q: 部署后访问是空白页？**
A: 99% 是 `js/` 或 `audio/` 子目录没上传成功。检查文件树是不是完整：`/index.html`、`/js/main.js`、`/audio/merge.wav` 都要在根目录。

**Q: 部署到 OSS 后 `.js` 报错 403？**
A: 把所有 `.js` 文件的 Content-Type 设为 `application/javascript`（OSS 静态托管默认会自动设，如果没有就手动加）。

**Q: 部署到 OSS 后音频播放失败？**
A: 一些 CDN 默认屏蔽 `.wav` 格式，到控制台改用 `.mp3` 或 `.ogg` 即可。简单起见保留 wav 是可以的，只要 CDN 允许通配 `audio/*`。

**Q: 想换成微信/抖音小游戏？**
A: 用微信开发者工具导入整个项目根目录，入口 `game.js`。需要自己的 AppID + 软著/ICP 备案才能上线。详见 README.md。
