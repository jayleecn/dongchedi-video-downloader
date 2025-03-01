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
    
    try {
      // 显示原始URL和可能的转换结果
      setOriginalUrl(url);
      
      const response = await fetch('/api/getVideoUrl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      const data = await response.json();
      
      // 如果URL被转换了，显示转换通知
      if (data.convertedUrl && data.convertedUrl !== url) {
        setConvertedUrl(data.convertedUrl);
      }
      
      if (data.success && data.data.videoUrls.length > 0) {
        const urls = data.data.videoUrls;
        setVideoUrls(urls);
        
        // 自动选择第一个视频URL
        setSelectedVideoUrl(urls[0]);
      } else {
        setError('未找到视频URL，请确认链接正确且视频可访问');
      }
    } catch (err) {
      setError(err.message || '处理请求时出错');
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

      <main>
        <section className="form">
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="video-url">视频链接</label>
              <input
                id="video-url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="粘贴懂车帝视频链接，例如: https://www.dongchedi.com/video/7347637768270381577"
                disabled={loading}
              />
              <small className="input-note">支持PC端和移动端链接</small>
            </div>
            
            <button 
              type="submit" 
              className="button" 
              disabled={loading}
            >
              {loading ? '处理中...' : '提取视频'}
            </button>
          </form>
        </section>

        {loading && (
          <div className="loading">
            <p>正在处理请求，请稍候...</p>
          </div>
        )}
        
        {error && (
          <div className="error">
            <p>{error}</p>
          </div>
        )}
        
        {/* URL转换通知 */}
        {convertedUrl && (
          <div className="url-conversion-notice">
            <p>
              <span className="conversion-label">链接已自动转换:</span>
              <span className="original-url">{originalUrl}</span>
              <span className="arrow">→</span>
              <span className="converted-url">{convertedUrl}</span>
            </p>
          </div>
        )}
        
        {videoUrls.length > 0 && (
          <section className="results">
            <h2>视频源列表</h2>
            <p>我们找到了 {videoUrls.length} 个可能的视频源。请选择一个视频源查看。</p>
            <div className="video-sources">
              <div className="video-sources-list">
                {videoUrls.map((videoUrl, index) => (
                  <div 
                    key={index} 
                    className={`video-source-item ${selectedVideoUrl === videoUrl ? 'active' : ''}`}
                    onClick={() => handleSelectVideoUrl(videoUrl)}
                  >
                    <div className="video-source-info">
                      <span className="source-index">源 {index + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedVideoUrl && (
                <div className="selected-url-container">
                  <div className="selected-video-url">
                    <p className="url-text">{selectedVideoUrl}</p>
                    <div className="selected-video-actions">
                      <button
                        className="button"
                        onClick={() => openVideoInNewTab(selectedVideoUrl)}
                      >
                        查看视频
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="download-instruction">
              <p>请点击"查看视频"后，在视频页面右键选择"另存为"或"保存视频"</p>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} 懂车帝视频下载器 | 本工具仅用于学习和研究目的</p>
        <p>
          <small>免责声明：本工具不存储任何视频内容，所有内容的版权归原作者所有。请尊重版权并遵守相关法律法规。</small>
        </p>
      </footer>

      <style jsx global>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        html, body {
          font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
          font-size: 16px;
          line-height: 1.4;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 10px 15px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
        }
        
        .header h1 {
          font-size: 1.8rem;
          margin-bottom: 5px;
          color: #1a73e8;
        }
        
        .header p {
          color: #666;
          font-size: 0.9rem;
        }
        
        main {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        
        .form {
          margin-bottom: 10px;
        }
        
        .form form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        
        .input-group label {
          font-weight: 500;
          font-size: 0.9rem;
        }
        
        .input-group input {
          padding: 8px 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .input-note {
          font-size: 0.8rem;
          color: #666;
        }
        
        .button {
          background: #1a73e8;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .button:hover {
          background: #1558b7;
        }
        
        .loading, .error {
          padding: 8px 10px;
          border-radius: 4px;
          margin-bottom: 10px;
        }
        
        .loading {
          background: #f0f7ff;
          color: #1a73e8;
        }
        
        .error {
          background: #fef2f2;
          color: #dc2626;
        }
        
        .url-conversion-notice {
          background: #f0f9ff;
          padding: 8px 10px;
          border-radius: 4px;
          margin-bottom: 10px;
          font-size: 0.85rem;
        }
        
        .conversion-label {
          font-weight: 500;
          margin-right: 5px;
        }
        
        .original-url, .converted-url {
          font-family: monospace;
          word-break: break-all;
        }
        
        .arrow {
          margin: 0 5px;
          color: #666;
        }
        
        .results {
          margin-bottom: 10px;
        }
        
        .results h2 {
          font-size: 1.2rem;
          margin-bottom: 5px;
        }
        
        .results > p {
          font-size: 0.9rem;
          margin-bottom: 8px;
          color: #444;
        }
        
        .video-sources {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .video-sources-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 8px;
        }
        
        .video-source-item {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .video-source-item:hover {
          border-color: #1a73e8;
        }
        
        .video-source-item.active {
          border-color: #1a73e8;
          background: #f0f7ff;
        }
        
        .source-index {
          font-weight: 500;
        }
        
        .selected-url-container {
          margin-top: 5px;
        }
        
        .selected-video-url {
          padding: 8px;
          background: #f5f5f5;
          border-radius: 4px;
        }
        
        .url-text {
          font-family: monospace;
          word-break: break-all;
          font-size: 0.85rem;
          margin-bottom: 8px;
        }
        
        .selected-video-actions {
          display: flex;
          justify-content: center;
        }
        
        .download-instruction {
          margin-top: 8px;
          font-size: 0.85rem;
          color: #666;
          font-style: italic;
        }
        
        .footer {
          margin-top: 15px;
          padding-top: 10px;
          border-top: 1px solid #eee;
          font-size: 0.8rem;
          color: #666;
          text-align: center;
        }
        
        .footer p {
          margin-bottom: 5px;
        }
        
        @media (max-width: 600px) {
          .header h1 {
            font-size: 1.5rem;
          }
          
          .container {
            padding: 8px;
          }
          
          .video-sources-list {
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          }
        }
      `}</style>
    </div>
  );
}
