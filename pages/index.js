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
        <title>懂车帝视频查看器 - 轻松查看懂车帝视频</title>
        <meta name="description" content="一个简单易用的懂车帝视频查看工具，支持提取视频链接" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="header">
        <h1>懂车帝视频查看器</h1>
        <p>免费、简单、便捷地查看懂车帝视频</p>
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
            
            <div className="download-instruction">
              <p>请点击"查看视频"后，在视频页面右键选择"另存为"或"保存视频"</p>
            </div>
            
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
          </section>
        )}
      </main>

      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} 懂车帝视频查看器 | 本工具仅用于学习和研究目的</p>
        <p>
          <small>免责声明：本工具不存储任何视频内容，所有内容的版权归原作者所有。请尊重版权并遵守相关法律法规。</small>
        </p>
      </footer>
    </div>
  );
}
