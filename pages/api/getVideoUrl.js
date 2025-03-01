// 导入所需模块
import { chromium } from 'playwright-chromium';
import cors from 'cors';
import { URL } from 'url';

// CORS中间件初始化
const corsMiddleware = cors({
  methods: ['POST', 'GET', 'OPTIONS'],
  origin: '*',
});

// 处理CORS的工具函数
function runCorsMiddleware(req, res) {
  return new Promise((resolve, reject) => {
    corsMiddleware(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

// 验证URL是否为有效的懂车帝视频链接
function isValidDongchediUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return (
      (parsedUrl.hostname === 'm.dongchedi.com' || 
       parsedUrl.hostname === 'www.dongchedi.com' ||
       parsedUrl.hostname === 'dongchedi.com') &&
      parsedUrl.pathname.includes('/video/')
    );
  } catch (e) {
    return false;
  }
}

// 递归搜索对象中的视频URL
function findVideoUrlsInObject(obj, urls = []) {
  if (!obj) return urls;
  
  if (typeof obj === 'string') {
    if ((obj.includes('.mp4') || obj.includes('.m3u8')) && obj.startsWith('http')) {
      if (!urls.includes(obj)) {
        urls.push(obj);
      }
    }
    return urls;
  }
  
  if (Array.isArray(obj)) {
    for (const item of obj) {
      findVideoUrlsInObject(item, urls);
    }
    return urls;
  }
  
  if (typeof obj === 'object') {
    for (const key in obj) {
      findVideoUrlsInObject(obj[key], urls);
    }
    return urls;
  }
  
  return urls;
}

// 转换PC网址为移动端网址
function convertToMobileUrl(inputUrl) {
  if (!inputUrl) return inputUrl;
  
  try {
    // 确保URL有协议前缀
    let processedUrl = inputUrl;
    if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
      processedUrl = 'https://' + processedUrl;
    }
    
    // 解析URL
    const urlObj = new URL(processedUrl);
    const hostname = urlObj.hostname;
    
    // 检查是否为PC版网址
    if (hostname === 'www.dongchedi.com' || hostname === 'dongchedi.com') {
      // 转换为移动端网址
      urlObj.hostname = 'm.dongchedi.com';
      return urlObj.toString();
    }
    
    // 已经是移动端网址或其他网址，不做转换
    return processedUrl;
  } catch (e) {
    // URL解析出错，返回原始输入
    console.error('URL转换失败:', e);
    return inputUrl;
  }
}

// 使用fetch API获取视频链接（Vercel环境备用方案）
async function getVideoUrlWithFetch(url) {
  try {
    const videoId = url.split('/').pop().split('?')[0];
    const apiUrls = [
      `https://www.dongchedi.com/motor/api/video_info/?video_id=${videoId}`,
      `https://www.dongchedi.com/api/video/get_video_play_info/?video_id=${videoId}`,
      `https://m.dongchedi.com/api/video/get_video_play_info/?video_id=${videoId}`,
    ];
    
    let allVideoUrls = [];
    
    for (const apiUrl of apiUrls) {
      try {
        console.log(`使用fetch尝试API: ${apiUrl}`);
        const response = await fetch(apiUrl);
        const data = await response.json();
        const videoUrls = findVideoUrlsInObject(data);
        allVideoUrls = [...allVideoUrls, ...videoUrls];
      } catch (e) {
        console.log(`fetch API失败: ${apiUrl}, 错误: ${e.message}`);
      }
    }
    
    // 移除重复项
    return [...new Set(allVideoUrls)].filter(url => url && url.startsWith('http'));
  } catch (e) {
    console.error('使用fetch获取视频URL失败:', e);
    return [];
  }
}

// 主API处理函数
export default async function handler(req, res) {
  // 处理CORS
  await runCorsMiddleware(req, res);

  // 只接受POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: '只支持POST请求' 
    });
  }

  // 获取并验证URL
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ 
      success: false, 
      message: '请提供视频URL' 
    });
  }

  if (!isValidDongchediUrl(url)) {
    return res.status(400).json({ 
      success: false, 
      message: '请提供有效的懂车帝视频URL' 
    });
  }

  // 转换PC网址为移动端网址
  const mobileUrl = convertToMobileUrl(url);
  let convertedUrl = mobileUrl;

  // 开始提取视频URL
  console.log(`开始处理URL: ${url}`);
  
  try {
    // 尝试使用fetch API获取视频链接（Vercel环境可能更稳定）
    console.log('尝试使用fetch API获取视频链接');
    let videoUrls = await getVideoUrlWithFetch(mobileUrl);
    
    // 如果fetch API无法获取视频链接，尝试使用Playwright
    if (videoUrls.length === 0) {
      console.log('Fetch API无法获取视频链接，尝试使用Playwright');
      try {
        // 配置Playwright以适应Vercel环境
        const browser = await chromium.launch({
          headless: true,
          // 为Vercel环境添加额外的Chromium args
          args: [
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu'
          ]
        });
        
        const page = await browser.newPage();
        
        // 收集视频请求
        const playwrightUrls = [];
        
        // 监听响应事件
        page.on('response', async (response) => {
          const url = response.url();
          const headers = await response.allHeaders();
          const contentType = headers['content-type'] || '';
          
          if (contentType.includes('video') || url.includes('.mp4') || url.includes('.m3u8')) {
            playwrightUrls.push(url);
            console.log(`发现视频URL: ${url}`);
          }
        });
        
        // 导航到目标页面
        await page.goto(mobileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log(`页面已加载，当前URL: ${page.url()}`);
        
        // 页面加载可能导致URL变化，记录最终URL
        convertedUrl = page.url();
        
        // 等待页面稳定
        await page.waitForTimeout(5000);
        
        // 执行JavaScript提取视频URL
        const jsData = await page.evaluate(() => {
          const videoData = {};
          
          // 尝试提取video元素
          const videoElements = document.querySelectorAll('video');
          videoData.videoElements = Array.from(videoElements).map(v => ({
            src: v.src,
            currentSrc: v.currentSrc,
            poster: v.poster
          }));
          
          // 尝试提取页面状态
          if (window.__INITIAL_STATE__) {
            videoData.initialState = window.__INITIAL_STATE__;
          }
          
          // 查找MP4相关字符串
          const html = document.documentElement.innerHTML;
          const mp4Regex = /"(https?:[^"]+\.mp4[^"]*)"/g;
          const mp4Matches = html.match(mp4Regex) || [];
          videoData.mp4Matches = mp4Matches.map(m => m.replace(/"/g, ''));
          
          // 查找m3u8相关字符串
          const m3u8Regex = /"(https?:[^"]+\.m3u8[^"]*)"/g;
          const m3u8Matches = html.match(m3u8Regex) || [];
          videoData.m3u8Matches = m3u8Matches.map(m => m.replace(/"/g, ''));
          
          return videoData;
        });
        
        // 提取JavaScript数据中的视频URL
        if (jsData.videoElements) {
          for (const element of jsData.videoElements) {
            if (element.src && !playwrightUrls.includes(element.src)) {
              playwrightUrls.push(element.src);
            }
            if (element.currentSrc && !playwrightUrls.includes(element.currentSrc)) {
              playwrightUrls.push(element.currentSrc);
            }
          }
        }
        
        // 从mp4Matches和m3u8Matches添加URLs
        if (jsData.mp4Matches) {
          for (const url of jsData.mp4Matches) {
            if (!playwrightUrls.includes(url)) {
              playwrightUrls.push(url);
            }
          }
        }
        
        if (jsData.m3u8Matches) {
          for (const url of jsData.m3u8Matches) {
            if (!playwrightUrls.includes(url)) {
              playwrightUrls.push(url);
            }
          }
        }
        
        // 递归搜索initialState中的视频URL
        if (jsData.initialState) {
          const stateUrls = findVideoUrlsInObject(jsData.initialState);
          for (const url of stateUrls) {
            if (!playwrightUrls.includes(url)) {
              playwrightUrls.push(url);
            }
          }
        }
        
        // 如果没有找到视频URL，尝试查找特定的视频API
        if (playwrightUrls.length === 0) {
          const videoId = mobileUrl.split('/').pop().split('?')[0];
          const apiUrls = [
            `https://www.dongchedi.com/motor/api/video_info/?video_id=${videoId}`,
            `https://www.dongchedi.com/api/video/get_video_play_info/?video_id=${videoId}`,
            `https://m.dongchedi.com/api/video/get_video_play_info/?video_id=${videoId}`,
          ];
          
          for (const apiUrl of apiUrls) {
            try {
              console.log(`尝试获取API: ${apiUrl}`);
              await page.goto(apiUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
              
              // 尝试解析JSON响应
              const textContent = await page.evaluate(() => document.body.textContent);
              try {
                const apiData = JSON.parse(textContent);
                const apiUrls = findVideoUrlsInObject(apiData);
                for (const url of apiUrls) {
                  if (!playwrightUrls.includes(url)) {
                    playwrightUrls.push(url);
                  }
                }
              } catch (e) {
                console.log('无法解析API响应为JSON');
              }
            } catch (e) {
              console.error(`获取API时出错: ${e.message}`);
            }
          }
        }
        
        // 关闭浏览器
        await browser.close();
        
        // 合并两种方法的结果
        videoUrls = [...videoUrls, ...playwrightUrls];
      } catch (playwrightError) {
        console.error('Playwright处理失败:', playwrightError);
        // 即使Playwright失败，我们仍然有可能从fetch API获取了一些URL
      }
    }
    
    // 过滤并去重URL
    const filteredUrls = [...new Set(videoUrls)]
      .filter(url => url && url.startsWith('http'));
    
    if (filteredUrls.length > 0) {
      return res.status(200).json({
        success: true,
        message: '成功获取视频URL',
        data: {
          videoUrls: filteredUrls,
          original_url: url,
          convertedUrl: convertedUrl !== url ? convertedUrl : null
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: '未找到视频URL，请确认链接正确且视频可访问',
        data: { original_url: url }
      });
    }
    
  } catch (error) {
    console.error('处理视频URL时出错:', error);
    return res.status(500).json({
      success: false,
      message: '服务器处理视频时出错',
      error: error.message
    });
  }
}

// 配置API路由，增加请求体大小限制和超时时间
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    responseLimit: false,
  },
  maxDuration: 60, // 为Vercel设置最大函数执行时间（秒）
};
