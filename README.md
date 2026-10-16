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

## 内容维护

- 首页标题与一句话简介：编辑 `index.html` 中 `#top` 下的 `.hero-copy`（`h1.hero-title` 与 `p.hero-lede`）
- 关于：编辑 `#about` 下的 `.about-copy`；右侧名片编辑 `.about-card` 里的 `<dl class="card-list">`
- 项目卡片：编辑 `index.html` 中 `#projects` 下的 `<li class="project-card">`
- 技术栈标签：编辑 `#skills` 下的 `<ul class="chips">`
- 联系方式：编辑 `#contact` 区块；邮箱默认未公开，需要时自行添加
