// 导入所需模块
import { chromium } from 'playwright-chromium';
import cors from 'cors';
import { URL } from 'url';
import axios from 'axios';

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
       parsedUrl.hostname === 'www.dongchedi.com') &&
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

// 使用纯HTTP请求方式提取视频URL
async function extractVideoUrlsWithHttp(url) {
  console.log(`尝试使用纯HTTP请求提取视频URL: ${url}`);
  const videoUrls = [];
  const videoId = url.split('/').pop().split('?')[0];
  
  // 尝试不同的API端点
  const apiEndpoints = [
    `https://www.dongchedi.com/motor/api/video_info/?video_id=${videoId}`,
    `https://www.dongchedi.com/api/video/get_video_play_info/?video_id=${videoId}`,
    `https://www.dongchedi.com/api/vrms/video/get_video_play_info/?video_id=${videoId}`,
    `https://www.dongchedi.com/apis/video/get_video_play_info/?video_id=${videoId}`,
    `https://www.dongchedi.com/apis/vrms/video/get_video_play_info/?video_id=${videoId}`,
    `https://www.dongchedi.com/apis/motor/video_info/?video_id=${videoId}`,
    `https://m.dongchedi.com/apis/video/get_video_play_info/?video_id=${videoId}`,
    `https://m.dongchedi.com/apis/vrms/video/get_video_play_info/?video_id=${videoId}`,
    `https://m.dongchedi.com/apis/motor/video_info/?video_id=${videoId}`
  ];
  
  // 请求头
  const headers = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    'Referer': url,
    'Accept': 'application/json',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };
  
  // 尝试直接获取页面内容
  try {
    console.log(`尝试直接获取页面内容: ${url}`);
    const response = await axios.get(url, { headers });
    const html = response.data;
    
    // 使用多种正则表达式提取视频URL
    const patterns = [
      /"(https?:[^"]+\.mp4[^"]*)"/g,
      /'(https?:[^']+\.mp4[^']*)'/g,
      /url:\s*['"]?(https?:[^'"\s]+\.mp4[^'"\s]*)['"]?/gi,
      /src:\s*['"]?(https?:[^'"\s]+\.mp4[^'"\s]*)['"]?/gi,
      /https?:[^"'\s]+\.mp4[^"'\s]*/g,
      /"(https?:[^"]+\.m3u8[^"]*)"/g,
      /'(https?:[^']+\.m3u8[^']*)'/g,
      /url:\s*['"]?(https?:[^'"\s]+\.m3u8[^'"\s]*)['"]?/gi,
      /src:\s*['"]?(https?:[^'"\s]+\.m3u8[^'"\s]*)['"]?/gi,
      /https?:[^"'\s]+\.m3u8[^"'\s]*/g
    ];
    
    for (const pattern of patterns) {
      const matches = html.match(pattern) || [];
      for (let match of matches) {
        // 清理匹配结果
        match = match.replace(/['"]|url:|src:/gi, '').trim();
        if (match.startsWith('http') && !videoUrls.includes(match)) {
          videoUrls.push(match);
          console.log(`从页面内容中提取到视频URL: ${match}`);
        }
      }
    }
    
    // 尝试提取JSON数据
    const jsonDataRegex = /window\.__APP_DATA__\s*=\s*(\{.*?\});/s;
    const jsonMatch = html.match(jsonDataRegex);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const appData = JSON.parse(jsonMatch[1]);
        const appDataUrls = findVideoUrlsInObject(appData);
        for (const url of appDataUrls) {
          if (!videoUrls.includes(url)) {
            videoUrls.push(url);
            console.log(`从APP_DATA中提取到视频URL: ${url}`);
          }
        }
      } catch (e) {
        console.error('解析APP_DATA时出错:', e);
      }
    }
  } catch (e) {
    console.error(`获取页面内容时出错: ${e.message}`);
  }
  
  // 如果从页面内容中没有提取到视频URL，尝试请求API
  if (videoUrls.length === 0) {
    for (const apiUrl of apiEndpoints) {
      try {
        console.log(`尝试请求API: ${apiUrl}`);
        const response = await axios.get(apiUrl, { headers });
        if (response.data) {
          const apiUrls = findVideoUrlsInObject(response.data);
          for (const url of apiUrls) {
            if (!videoUrls.includes(url)) {
              videoUrls.push(url);
              console.log(`从API响应中提取到视频URL: ${url}`);
            }
          }
        }
      } catch (e) {
        console.error(`请求API时出错: ${e.message}`);
      }
    }
  }
  
  return videoUrls;
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

  // 开始提取视频URL
  console.log(`开始处理URL: ${url}`);
  
  // 初始化视频URL数组
  const videoUrls = [];
  
  // 先尝试使用纯HTTP请求方式提取视频URL
  const httpVideoUrls = await extractVideoUrlsWithHttp(mobileUrl);
  if (httpVideoUrls.length > 0) {
    console.log(`通过HTTP请求成功提取到${httpVideoUrls.length}个视频URL`);
    return res.status(200).json({
      success: true,
      message: '成功获取视频URL',
      data: {
        videoUrls: httpVideoUrls,
        original_url: url,
        mobileUrl: mobileUrl !== url ? mobileUrl : null,
        method: 'http'
      }
    });
  }
  
  // 如果纯HTTP请求方式失败，尝试使用Playwright
  try {
    // 启动浏览器
    console.log('尝试使用Playwright提取视频URL');
    const browser = await chromium.launch({
      headless: true,
    });
    const page = await browser.newPage();
    
    // 收集视频请求
    
    // 监听响应事件
    page.on('response', async (response) => {
      const url = response.url();
      const headers = await response.allHeaders();
      const contentType = headers['content-type'] || '';
      
      if (contentType.includes('video') || url.includes('.mp4') || url.includes('.m3u8')) {
        videoUrls.push(url);
        console.log(`发现视频URL: ${url}`);
      }
      
      // 监听可能包含视频信息的API响应
      if (url.includes('/api/') || url.includes('/apis/')) {
        try {
          const text = await response.text();
          try {
            const json = JSON.parse(text);
            const apiUrls = findVideoUrlsInObject(json);
            for (const apiUrl of apiUrls) {
              if (!videoUrls.includes(apiUrl)) {
                videoUrls.push(apiUrl);
                console.log(`从API响应中找到视频URL: ${apiUrl}`);
              }
            }
          } catch (e) {
            // 不是有效的JSON，忽略
          }
        } catch (e) {
          // 无法获取响应文本，忽略
        }
      }
    });
    
    // 导航到目标页面
    await page.goto(mobileUrl, { waitUntil: 'domcontentloaded' });
    console.log(`页面已加载，当前URL: ${page.url()}`);
    
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
      
      // 尝试提取新的页面状态格式
      if (window.__APP_DATA__) {
        videoData.appData = window.__APP_DATA__;
      }
      
      // 查找MP4相关字符串 - 增加更多匹配模式
      const html = document.documentElement.innerHTML;
      const mp4Patterns = [
        /"(https?:[^"]+\.mp4[^"]*)"/g,
        /'(https?:[^']+\.mp4[^']*)'/g,
        /url:\s*['"]?(https?:[^'"\s]+\.mp4[^'"\s]*)['"]?/gi,
        /src:\s*['"]?(https?:[^'"\s]+\.mp4[^'"\s]*)['"]?/gi,
        /https?:[^"'\s]+\.mp4[^"'\s]*/g
      ];
      
      videoData.mp4Matches = [];
      for (const pattern of mp4Patterns) {
        const matches = html.match(pattern) || [];
        const cleanMatches = matches.map(m => m.replace(/['"]|url:|src:/gi, '').trim());
        videoData.mp4Matches.push(...cleanMatches);
      }
      
      // 查找m3u8相关字符串 - 增加更多匹配模式
      const m3u8Patterns = [
        /"(https?:[^"]+\.m3u8[^"]*)"/g,
        /'(https?:[^']+\.m3u8[^']*)'/g,
        /url:\s*['"]?(https?:[^'"\s]+\.m3u8[^'"\s]*)['"]?/gi,
        /src:\s*['"]?(https?:[^'"\s]+\.m3u8[^'"\s]*)['"]?/gi,
        /https?:[^"'\s]+\.m3u8[^"'\s]*/g
      ];
      
      videoData.m3u8Matches = [];
      for (const pattern of m3u8Patterns) {
        const matches = html.match(pattern) || [];
        const cleanMatches = matches.map(m => m.replace(/['"]|url:|src:/gi, '').trim());
        videoData.m3u8Matches.push(...cleanMatches);
      }
      
      return videoData;
    });
    
    // 提取JavaScript数据中的视频URL
    if (jsData.videoElements) {
      for (const element of jsData.videoElements) {
        if (element.src && !videoUrls.includes(element.src)) {
          videoUrls.push(element.src);
        }
        if (element.currentSrc && !videoUrls.includes(element.currentSrc)) {
          videoUrls.push(element.currentSrc);
        }
      }
    }
    
    // 从mp4Matches和m3u8Matches添加URLs
    if (jsData.mp4Matches) {
      for (const url of jsData.mp4Matches) {
        if (!videoUrls.includes(url)) {
          videoUrls.push(url);
        }
      }
    }
    
    if (jsData.m3u8Matches) {
      for (const url of jsData.m3u8Matches) {
        if (!videoUrls.includes(url)) {
          videoUrls.push(url);
        }
      }
    }
    
    // 递归搜索initialState中的视频URL
    if (jsData.initialState) {
      const stateUrls = findVideoUrlsInObject(jsData.initialState);
      for (const url of stateUrls) {
        if (!videoUrls.includes(url)) {
          videoUrls.push(url);
        }
      }
    }
    
    // 尝试直接从页面URL中提取视频信息
    try {
      console.log('尝试从页面内容中提取视频信息');
      const pageContent = await page.content();
      
      // 查找可能包含视频URL的JSON数据
      const jsonDataRegex = /window\.__APP_DATA__\s*=\s*(\{.*?\});/s;
      const jsonMatch = pageContent.match(jsonDataRegex);
      
      if (jsonMatch && jsonMatch[1]) {
        try {
          const appData = JSON.parse(jsonMatch[1]);
          console.log('找到APP_DATA，正在提取视频URL');
          const appDataUrls = findVideoUrlsInObject(appData);
          for (const url of appDataUrls) {
            if (!videoUrls.includes(url)) {
              videoUrls.push(url);
              console.log(`从APP_DATA中找到视频URL: ${url}`);
            }
          }
        } catch (e) {
          console.error('解析APP_DATA时出错:', e);
        }
      }
    } catch (e) {
      console.error('从页面内容提取视频信息时出错:', e);
    }
    
    // 如果没有找到视频URL，尝试查找特定的视频API
    if (videoUrls.length === 0) {
      const videoId = mobileUrl.split('/').pop().split('?')[0];
      const apiUrls = [
        `https://www.dongchedi.com/motor/api/video_info/?video_id=${videoId}`,
        `https://www.dongchedi.com/api/video/get_video_play_info/?video_id=${videoId}`,
        `https://www.dongchedi.com/api/vrms/video/get_video_play_info/?video_id=${videoId}`,
        `https://www.dongchedi.com/apis/video/get_video_play_info/?video_id=${videoId}`,
        `https://www.dongchedi.com/apis/vrms/video/get_video_play_info/?video_id=${videoId}`,
        `https://www.dongchedi.com/apis/motor/video_info/?video_id=${videoId}`,
        `https://m.dongchedi.com/apis/video/get_video_play_info/?video_id=${videoId}`,
        `https://m.dongchedi.com/apis/vrms/video/get_video_play_info/?video_id=${videoId}`,
        `https://m.dongchedi.com/apis/motor/video_info/?video_id=${videoId}`
      ];
      
      for (const apiUrl of apiUrls) {
        try {
          console.log(`尝试获取API: ${apiUrl}`);
          await page.goto(apiUrl, { waitUntil: 'domcontentloaded' });
          
          // 尝试解析JSON响应
          const textContent = await page.evaluate(() => document.body.textContent);
          try {
            const apiData = JSON.parse(textContent);
            const apiUrls = findVideoUrlsInObject(apiData);
            for (const url of apiUrls) {
              if (!videoUrls.includes(url)) {
                videoUrls.push(url);
                console.log(`从API响应中找到视频URL: ${url}`);
              }
            }
          } catch (e) {
            console.log('无法解析API响应为JSON');
          }
          
          // 如果仍然没有找到视频URL，尝试使用axios直接请求API
          if (videoUrls.length === 0) {
            try {
              console.log(`尝试使用axios请求API: ${apiUrl}`);
              const response = await axios.get(apiUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
                  'Referer': mobileUrl,
                  'Accept': 'application/json'
                }
              });
              
              if (response.data) {
                const axiosUrls = findVideoUrlsInObject(response.data);
                for (const url of axiosUrls) {
                  if (!videoUrls.includes(url)) {
                    videoUrls.push(url);
                    console.log(`从axios API响应中找到视频URL: ${url}`);
                  }
                }
              }
            } catch (e) {
              console.error(`axios请求API时出错: ${e.message}`);
            }
          }
        } catch (e) {
          console.error(`获取API时出错: ${e.message}`);
        }
      }
    }
    
    // 关闭浏览器
    await browser.close();
    
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
          mobileUrl: mobileUrl !== url ? mobileUrl : null
        }
      });
    } else {
      return res.status(404).json({
        success: false,
        message: '未找到视频URL',
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

// 配置API路由，增加请求体大小限制
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};
