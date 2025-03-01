import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videoUrls, setVideoUrls] = useState([]);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [convertedUrl, setConvertedUrl] = useState('');
  
  // 表单提交处理
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!url) {
      setError('请输入懂车帝视频链接');
      return;
    }
    
    if (!url.includes('dongchedi.com')) {
      setError('请输入有效的懂车帝视频链接');
      return;
    }
    
    fetchVideoUrl(url);
  };
  
  // 获取视频URL
  const fetchVideoUrl = async (url) => {
    setLoading(true);
    setError('');
    setVideoUrls([]);
    setSelectedVideoUrl('');
    setConvertedUrl('');
    
    try {
      // 显示原始URL
      setOriginalUrl(url);
      
      const response = await fetch('/api/getVideoUrl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      const data = await response.json();
      
      if (data.success && data.data.videoUrls && data.data.videoUrls.length > 0) {
        const urls = data.data.videoUrls;
        setVideoUrls(urls);
        
        // 自动选择第一个视频URL
        setSelectedVideoUrl(urls[0]);
        
        // 如果URL被转换了，显示转换通知
        if (data.data.convertedUrl) {
          setConvertedUrl(data.data.convertedUrl);
        }
      } else {
        setError(data.message || '未找到视频URL，请确认链接正确且视频可访问');
      }
    } catch (err) {
      console.error('API请求出错:', err);
      setError('处理请求时出错，请稍后再试');
    } finally {
      setLoading(false);
    }
  };
  
  // 在新窗口中查看视频
  const openVideoInNewTab = (url) => {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };
  
  // 选择视频URL
  const handleSelectVideoUrl = (url) => {
    setSelectedVideoUrl(url);
  };

  // 判断视频类型
  const isMP4 = (url) => url.toLowerCase().includes('.mp4');
  const isM3U8 = (url) => url.toLowerCase().includes('.m3u8');
  
  return (
    <div className="container">
      <Head>
        <title>懂车帝视频下载器 - 免费下载懂车帝视频</title>
        <meta name="description" content="一个简单易用的懂车帝视频下载工具，支持提取视频链接" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="header">
        <h1>懂车帝视频下载器</h1>
        <p>免费、简单、便捷地下载懂车帝视频</p>
      </header>

      <main className="main">
        <section className="urlInput">
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="请输入懂车帝视频链接 (例如: https://www.dongchedi.com/video/xxx)"
              className="urlInput_field"
            />
            <button type="submit" disabled={loading} className="urlInput_button">
              {loading ? '处理中...' : '提取视频'}
            </button>
          </form>
          
          {error && <p className="error">{error}</p>}
          
          {originalUrl && convertedUrl && (
            <div className="urlConverter">
              <p>原始链接已被转换以获取视频</p>
              <p>原始链接: <span className="urlText">{originalUrl}</span></p>
              <p>转换链接: <span className="urlText">{convertedUrl}</span></p>
            </div>
          )}
        </section>
        
        {videoUrls.length > 0 && (
          <section className="videoUrlList">
            <h2>可用视频源</h2>
            <p className="tip">请选择一个视频源，然后点击"查看视频"。查看视频后可右键保存。</p>
            
            <div className="videoUrlOptions">
              {videoUrls.map((videoUrl, index) => (
                <div 
                  key={index} 
                  className={`videoUrlOption ${selectedVideoUrl === videoUrl ? 'selected' : ''}`}
                  onClick={() => handleSelectVideoUrl(videoUrl)}
                >
                  <div className="videoUrlOption_inner">
                    <span className="videoUrlOption_index">{index + 1}</span>
                    <div className="videoUrlOption_info">
                      <span className="videoUrlOption_type">
                        {isMP4(videoUrl) 
                          ? 'MP4 视频' 
                          : isM3U8(videoUrl)
                            ? 'M3U8 流媒体'
                            : '未知格式'}
                      </span>
                      <span className="videoUrlOption_url">{videoUrl.substring(0, 50)}...</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {selectedVideoUrl && (
              <div className="selectedVideo">
                <h3>已选择视频源</h3>
                <p className="selectedVideoUrl">{selectedVideoUrl}</p>
                <div className="videoActions">
                  <button 
                    className="openVideo"
                    onClick={() => openVideoInNewTab(selectedVideoUrl)}
                  >
                    查看视频
                  </button>
                  <p className="downloadTip">视频打开后，请右键点击视频并选择"另存为..."或"下载视频"</p>
                </div>
              </div>
            )}
          </section>
        )}
        
        <section className="instructions">
          <h2>使用说明</h2>
          <ol>
            <li>输入懂车帝视频页面的链接（支持PC端和移动端链接）</li>
            <li>点击"提取视频"按钮</li>
            <li>从提取到的视频源中选择一个</li>
            <li>点击"查看视频"按钮在新窗口中打开视频</li>
            <li>在视频页面右键点击视频，选择"另存为..."或"下载视频"选项保存视频</li>
          </ol>
        </section>
      </main>

      <footer className="footer">
        <p>本工具仅供个人学习使用，请尊重版权并合法使用视频内容</p>
        <p>&copy; {new Date().getFullYear()} 懂车帝视频下载器 | <a href="https://github.com/jayleecn/dongchedi-video-downloader" target="_blank" rel="noopener noreferrer">GitHub</a></p>
      </footer>

      <style jsx>{`
        .container {
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 0 20px;
        }
        
        .header {
          text-align: center;
          margin: 40px 0;
        }
        
        .header h1 {
          margin-bottom: 10px;
          color: #1a73e8;
        }
        
        .main {
          margin-bottom: 60px;
        }
        
        .urlInput {
          margin-bottom: 30px;
        }
        
        .urlInput form {
          display: flex;
          margin-bottom: 15px;
        }
        
        .urlInput_field {
          flex: 1;
          padding: 12px 15px;
          border: 1px solid #ddd;
          border-radius: 4px 0 0 4px;
          font-size: 16px;
        }
        
        .urlInput_button {
          background: #1a73e8;
          color: white;
          border: none;
          padding: 0 20px;
          border-radius: 0 4px 4px 0;
          cursor: pointer;
          font-weight: bold;
          transition: background 0.2s;
        }
        
        .urlInput_button:hover {
          background: #0d65d9;
        }
        
        .urlInput_button:disabled {
          background: #999;
          cursor: not-allowed;
        }
        
        .error {
          color: #d32f2f;
          margin-top: 10px;
        }
        
        .urlConverter {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 4px;
          margin-top: 15px;
          font-size: 14px;
        }
        
        .urlText {
          word-break: break-all;
          font-family: monospace;
          background: #eee;
          padding: 2px 4px;
          border-radius: 3px;
        }
        
        .videoUrlList {
          margin-bottom: 30px;
        }
        
        .tip {
          color: #666;
          margin-bottom: 15px;
        }
        
        .videoUrlOptions {
          margin-bottom: 20px;
        }
        
        .videoUrlOption {
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-bottom: 10px;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        
        .videoUrlOption:hover {
          border-color: #1a73e8;
        }
        
        .videoUrlOption.selected {
          border-color: #1a73e8;
          background: #f0f7ff;
        }
        
        .videoUrlOption_inner {
          display: flex;
          padding: 15px;
          align-items: center;
        }
        
        .videoUrlOption_index {
          font-weight: bold;
          margin-right: 15px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1a73e8;
          color: white;
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .videoUrlOption_info {
          overflow: hidden;
        }
        
        .videoUrlOption_type {
          display: block;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .videoUrlOption_url {
          display: block;
          color: #666;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .selectedVideo {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 4px;
        }
        
        .selectedVideo h3 {
          margin-top: 0;
          margin-bottom: 10px;
        }
        
        .selectedVideoUrl {
          word-break: break-all;
          font-family: monospace;
          background: #eee;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 15px;
          font-size: 14px;
        }
        
        .videoActions {
          text-align: center;
        }
        
        .openVideo {
          background: #4caf50;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .openVideo:hover {
          background: #388e3c;
        }
        
        .downloadTip {
          margin-top: 10px;
          color: #666;
          font-size: 14px;
        }
        
        .instructions {
          background: #f9f9f9;
          padding: 20px;
          border-radius: 4px;
        }
        
        .instructions h2 {
          margin-top: 0;
        }
        
        .instructions ol {
          padding-left: 20px;
        }
        
        .instructions li {
          margin-bottom: 10px;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
        
        .footer a {
          color: #1a73e8;
          text-decoration: none;
        }
        
        .footer a:hover {
          text-decoration: underline;
        }
        
        @media (max-width: 600px) {
          .urlInput form {
            flex-direction: column;
          }
          
          .urlInput_field {
            border-radius: 4px;
            margin-bottom: 10px;
          }
          
          .urlInput_button {
            border-radius: 4px;
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
}
