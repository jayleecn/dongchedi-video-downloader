# 懂车帝视频下载器

这是一个用于从懂车帝网站下载视频的工具，包含Playwright脚本和Web应用两种使用方式。

## 功能

- 分析懂车帝视频页面并提取视频链接
- 下载视频到本地
- 提供Web界面供用户在线使用

## 项目结构

- `/dongchedi_playwright.py` - 基于Playwright的Python脚本版本
- `/dongchedi-dl-web` - 基于Next.js的Web应用版本

## Playwright脚本版本

### 依赖

- Python 3.6+
- playwright

### 安装

```bash
pip install playwright
playwright install chromium
```

### 使用方法

```bash
python dongchedi_playwright.py <视频URL>
```

#### 示例

```bashhttps://m.dongchedi.com/video/7347637768270381577
python dongchedi_playwright.py 
```

## Web应用版本

Web应用版提供了友好的用户界面，可以直接在浏览器中使用。

### 功能特点

- 支持懂车帝视频链接解析
- 自动将PC版网址转换为移动端网址
- 多种视频源质量选择
- 视频在线预览
- 一键复制下载链接
- 直接下载视频文件
- 响应式设计，支持移动设备

### 本地运行

```bash
cd dongchedi-dl-web
npm install
npm run dev
```

然后在浏览器中访问 http://localhost:3000

### 在线部署

可以部署到Vercel或Cloudflare Pages，详细说明请查看`dongchedi-dl-web/README.md`

## 注意事项

- 脚本版本使用Playwright的无头浏览器模式
- 下载的视频仅供个人学习使用，请勿用于商业用途

## 免责声明

本工具不存储任何视频内容，所有下载内容的版权归原作者所有。使用本工具产生的法律责任由用户自行承担。

## 许可证

MIT
