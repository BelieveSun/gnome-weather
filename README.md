# 心知/和风天气 GNOME Weather

GNOME Shell 天气扩展，支持 **心知天气 (Seniverse)** 和 **和风天气 (QWeather)** 双数据源。

![GNOME Shell](https://img.shields.io/badge/GNOME_Shell-46%20|%2047%20|%2048-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 功能

- **实时天气** — 面板显示当前温度和天气图标，点击展开详情
- **未来 15 天预报** — 近三天直接展示，15 天预报折叠在子菜单
- **生活指数** — 穿衣、洗车、紫外线、运动等多项指数
- **空气质量** — 和风天气支持实时 AQI 和首要污染物（心知天气不支持）
- **城市搜索** — 设置中搜索并切换城市
- **日历集成** — 在系统日历面板显示当前天气（使用缓存，不额外消耗 API）
- **和风天气彩色 SVG 图标** — 62 个天气图标，按天气类型着色
- **面板位置可配置** — 左侧 / 中间 / 右侧，可指定位置索引
- **API 调用量控制** — 月度调用计数，接近上限自动停止请求

## 数据源对比

| 特性 | 心知天气 | 和风天气 |
|------|---------|---------|
| 实时天气 | ✅ | ✅ |
| 3 天预报 | ✅ (免费) | ✅ |
| 15 天预报 | 需付费 | ✅ |
| 生活指数 | ✅ (6 项免费) | ✅ |
| 空气质量 | ❌ | ✅ |
| 彩色图标 | ✅ (映射) | ✅ (原生) |
| 注册地址 | [seniverse.com](https://www.seniverse.com) | [console.qweather.com](https://console.qweather.com) |

## 安装

### 前置条件

- GNOME Shell 46 / 47 / 48
- `glib-compile-schemas` (通常已预装)

### 部署

```bash
git clone <repo-url> && cd gnome-weather@sungj
chmod +x deploy.sh
./deploy.sh
```

部署脚本会自动：
1. 编译 GSettings schema
2. 复制文件到 `~/.local/share/gnome-shell/extensions/gnome-weather@sungj/`
3. 启用扩展

**重启 GNOME Shell：**
- X11: `Alt+F2` → 输入 `r` → 回车
- Wayland: 注销后重新登录

### 配置

```bash
gnome-extensions prefs gnome-weather@sungj
```

## 配置说明

### 心知天气

1. 在 [seniverse.com](https://www.seniverse.com) 注册账号
2. 创建应用获取 API Key
3. 在扩展设置中选择「心知天气」，填入 API Key

### 和风天气

1. 在 [console.qweather.com](https://console.qweather.com) 注册账号
2. 创建项目 → 添加凭据（选择 API KEY 类型）
3. 在「设置」页面获取你的 **API Host**（形如 `xxx.qweatherapi.com`）
4. 在扩展设置中选择「和风天气」，填入 API Key 和 API Host

> **注意：** 和风天气旧的公共地址 `devapi.qweather.com` 从 2026 年起逐步停用，请使用个人 API Host。

### API 调用量

默认 30 分钟刷新一次，每次 3-5 次 API 调用：

| 刷新间隔 | 每日调用 | 每月调用 |
|---------|---------|---------|
| 15 分钟 | ~384 | ~11,520 |
| 20 分钟 | ~288 | ~8,640 |
| 30 分钟 | ~192 | ~5,760 |
| 60 分钟 | ~96 | ~2,880 |

扩展内置月度计数器，接近 9,500 次自动停止请求（为 10,000 上限留余量）。

## 目录结构

```
gnome-weather@sungj/
├── metadata.json          # 扩展元数据
├── extension.js           # 主逻辑（面板指示器、API 调用、UI）
├── prefs.js               # 设置页面（Adw/GTK4）
├── stylesheet.css          # 样式
├── schemas/               # GSettings schema
├── icons/                 # 和风天气 SVG 彩色图标 (62个)
├── deploy.sh              # 部署脚本
└── README.md
```

## 致谢

- [心知天气](https://www.seniverse.com) — 天气数据 API
- [和风天气](https://www.qweather.com) — 天气数据 API 及 [天气图标](https://icons.qweather.com)（CC BY 4.0）
- [GNOME Shell](https://gitlab.gnome.org/GNOME/gnome-shell) — 桌面环境

## 许可

- 代码: [Apache License 2.0](LICENSE)
- 和风天气图标 (`icons/` 目录): [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) © QWeather
