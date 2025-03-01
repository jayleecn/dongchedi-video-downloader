# 懂车帝视频下载器

这是一个基于Next.js的Web应用，用于从懂车帝网站下载视频。

## 功能

- 分析懂车帝视频页面并提取视频链接
- 支持解析懂车帝网站和移动端视频链接
- 在新窗口中查看视频&右键下载视频
- 响应式设计，适配各种设备

## 技术栈

- **前端框架**: Next.js (React)
- **样式**: CSS
- **HTTP请求**: Axios

## 本地运行

### 前提条件

- Node.js 14.0+ 
- npm 或 yarn

### 安装步骤

1. 克隆仓库
   ```bash
   git clone https://github.com/jayleecn/dongchedi-video-downloader.git
   cd dongchedi-video-downloader
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

## 在线部署

可以部署到Vercel或Cloudflare Pages等平台。

## 使用方法

1. 复制懂车帝视频网页链接
2. 粘贴到输入框中，点击"提取视频"
3. 从视频源列表中选择一个源
4. 点击"查看视频"
5. 在视频页面右键选择"另存为"或"保存视频"

## 注意事项

- 视频源质量可能不同，请选择最适合的源
- 兼容PC版和移动版懂车帝链接

## 免责声明

本工具不存储任何视频内容，所有内容的版权归原作者所有。使用本工具产生的法律责任由用户自行承担。

## 许可证

MIT
