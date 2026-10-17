# minhyuin.github.io

Myuin 的个人主页 —— 轮腿机器人、嵌入式电控与具身智能。

线上地址：<https://minhyuin.github.io>

## 技术形态

纯静态站点，零构建、零运行时依赖：

| 文件 | 说明 |
|------|------|
| `index.html` | 单页结构（Hero / 关于 / 项目 / 技术栈 / 联系） |
| `assets/site.css` | 全部样式：设计 Token、深浅色主题、响应式 |
| `assets/site.js` | 滚动入场、主题切换、页脚年份（原生 JS，无依赖） |
| `assets/particles.js` | 首页右侧的粒子头像：把 GitHub 头像采样成点阵，鼠标靠近时吸附位移 |
| `assets/fonts/` | 本地字体（Lora / Poppins / JetBrains Mono，SIL OFL 1.1） |
| `assets/favicon.svg` | 站点图标 |
| `.nojekyll` | 关闭 GitHub Pages 的 Jekyll 处理，加快发布 |

推送到 `main` 分支后由 GitHub Pages 直接发布，无需 Actions。

## 本地预览

```powershell
# 任选一种
python -m http.server 8080
npx serve .
```

然后打开 <http://localhost:8080>。直接双击 `index.html` 也能看，只是字体和相对路径用 `file://` 打开时表现略有差异，建议用本地服务器。

## 设计语言

参考 [anthropic-style-cn](https://github.com/TartSlayer/anthropic-style-cn) 的 Anthropic 风格中文前端规范：

- 暖米色底 `#ECE9E0`，唯一强调色橙 `#D97757`，深色区块 `#141413`
- Lora（标题 / 正文衬线）+ Poppins（UI 无衬线）混排，中文回落到霞鹜文楷 / 楷体 / 宋体
- 区块节奏：米色 Hero → 浅色关于 → 深色项目 → 米色技术栈 → 深色页脚
- 跟随系统的深浅色模式，右上角可手动切换
- 动效只作用于 `transform` / `opacity`，并尊重 `prefers-reduced-motion`

## 字体许可

`assets/fonts/` 中的 woff2 字体来自 Google Fonts / JetBrains，均为 SIL Open Font License 1.1，可自由分发与商用：<https://scripts.sil.org/OFL>

## 首页的粒子头像

首页右栏的点阵来自 GitHub 头像，**不做本地副本**：`index.html` 里那个 `<img>` 直接指向

```
https://avatars.githubusercontent.com/u/85868520?s=1024
```

`u/85868520` 是 Minhyuin 的账号 id（`gh api users/Minhyuin --jq .id` 可查）。这个地址永远返回当前头像，CDN 带 `Cache-Control: max-age=300`，所以换完头像 5 分钟内站点就会跟上，不需要改代码、不需要重新 commit。

`assets/particles.js` 把这张图缩到 512×512 逐格采样，每格随机取一个像素作为粒子的“归位点”，颜色取原图并量化到 8×8×8 的桶（约 80–110 组），每组一次 `fillStyle` 批量绘制。

- 鼠标进入画布附近时，半径 `R` 内的粒子被吸向指针并绕其轻微旋涡，离开后靠弹簧回位，回位过程带阻尼
- 头像是方图，采样时用 `DISC` 裁成圆形；想保留方形把 `DISC` 改成 `false`
- 点数按画布面积推算（桌面约 `w²/16`、触屏约 `w²/22`，2600–16000 之间），点径由实际点距推出（`半径 ≈ 点距 × 0.30`），所以画布多大、点阵都保持同样的疏密；宽度变化超过 30% 时重新采样
- 画布按 `devicePixelRatio` 渲染（最高 3×），高分屏上点边缘不会糊
- 空闲时（没在交互、入场动画放完）降到隔帧绘制，省一半光栅化；鼠标一动立刻恢复逐帧
- 尊重 `prefers-reduced-motion`：只绘制静态点阵，不做吸附与入场动画

兜底与限制：

- `<img>` 带 `crossorigin="anonymous"`，GitHub 头像 CDN 返回 `Access-Control-Allow-Origin: *`，满足 canvas 读像素的要求
- 若网络或代理把 CORS 头抹掉，`getImageData` 会失败，此时**保留 `<img>` 直接显示头像**，只是没有粒子
- 若头像完全加载不出来（离线、账号改名），脚本会隐藏整个标志并让 hero 退回单栏
- 没有 JS 时同样由 `<img>` 显示头像

要调手感：`layout()` 里的 `R = size * 0.34` 是吸附半径、`radius` 由点距推出（想更细改 `pitch * 0.30` 这个系数）、点数公式是 `size * size / 16`（触屏 `/ 22`）；`step()` 里的 `k` 是回位弹簧、`damp` 是阻尼、`swirl` 是绕指针的切向分量。

## 内容维护

- 首页标题与一句话简介：编辑 `index.html` 中 `#top` 下的 `.hero-copy`（`h1.hero-title` 与 `p.hero-lede`）
- 关于：编辑 `#about` 下的 `.about-copy`；右侧名片编辑 `.about-card` 里的 `<dl class="card-list">`
- 项目卡片：编辑 `index.html` 中 `#projects` 下的 `<li class="project-card">`
- 技术栈标签：编辑 `#skills` 下的 `<ul class="chips">`
- 联系方式：编辑 `#contact` 区块；邮箱默认未公开，需要时自行添加
- 头像：**不用管**，直接改 GitHub 账号头像即可，站点在 5 分钟内同步；换账号时改 `index.html` 里 `hero-mark-img` 的 `u/<id>`
