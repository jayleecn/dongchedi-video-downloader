# 懂车帝视频查看器 (Web版)

这是一个基于Next.js开发的网页应用，允许用户轻松查看懂车帝平台的视频。

## 功能特点

- 简洁易用的用户界面
- 支持解析懂车帝网站和移动端视频链接
- 自动提取视频地址
- 支持在新窗口中查看视频
- 响应式设计，适配各种设备

## 技术栈

- **前端框架**: Next.js (React)
- **样式**: CSS
- **HTTP请求**: Axios

## 本地开发

### 前提条件

- Node.js 14.0+ 
- npm 或 yarn

### 安装步骤

1. 克隆仓库
   ```bash
   git clone https://github.com/jayleecn/dongchedi-video-downloader.git
   cd dongchedi-video-downloader/dongchedi-dl-web
   ```

2. 安装依赖
   ```bash
   npm install
   # 或
   yarn install
   ```

3. 启动开发服务器
   ```bash
   npm run dev
   # 或
   yarn dev
   ```

4. 在浏览器中打开 [http://localhost:3000](http://localhost:3000)

## 使用方法

1. 复制懂车帝视频网页链接
2. 粘贴到输入框中，点击"提取视频"
3. 从视频源列表中选择一个源
4. 点击"查看视频"
5. 在视频页面右键选择"另存为"或"保存视频"
