// 导入所需模块
import https from 'https';
import http from 'http';
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
    // 更新正则表达式以匹配更多可能的视频URL格式
    if ((obj.includes('.mp4') || obj.includes('.m3u8') || obj.includes('/video/') || obj.includes('videoconvert')) && 
        obj.startsWith('http')) {
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

// 使用Node.js的http/https模块发送请求
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const defaultOptions = {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://m.dongchedi.com/',
      },
      timeout: 10000
    };
    
    const requestOptions = { ...defaultOptions, ...options };
    
    const req = protocol.request(url, requestOptions, (res) => {
      // 处理重定向
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        const location = res.headers.location;
        if (location) {
          // 确保location是完整URL
          const redirectUrl = location.startsWith('http') 
            ? location 
            : new URL(location, parsedUrl).toString();
          
          console.log(`重定向到: ${redirectUrl}`);
          return makeRequest(redirectUrl, options)
            .then(resolve)
            .catch(reject);
        }
      }
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({ 
          statusCode: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
    
    req.end();
  });
}

// 从HTML中提取视频URL
function extractVideoUrlsFromHtml(html) {
  const urls = [];
  
  // 提取更多格式的视频链接
  const videoRegexPatterns = [
    /"(https?:\/\/[^"]*\.mp4[^"]*)"/gi,
    /"(https?:\/\/[^"]*\.m3u8[^"]*)"/gi,
    /video_url["']?\s*:\s*["']?(https?:\/\/[^"',]+)/gi,
    /play_url["']?\s*:\s*["']?(https?:\/\/[^"',]+)/gi,
    /url["']?\s*:\s*["']?(https?:\/\/[^"',]+\.mp4[^"',]*)/gi,
    /url["']?\s*:\s*["']?(https?:\/\/[^"',]+\.m3u8[^"',]*)/gi,
    /src["']?\s*[:=]\s*["']?(https?:\/\/[^"',]+\.mp4[^"',]*)/gi,
    /src["']?\s*[:=]\s*["']?(https?:\/\/[^"',]+\.m3u8[^"',]*)/gi,
    /"hd"\s*:\s*{[^}]*"url"\s*:\s*"(https?:\/\/[^"]+)"/gi,
    /"sd"\s*:\s*{[^}]*"url"\s*:\s*"(https?:\/\/[^"]+)"/gi,
  ];
  
  for (const regex of videoRegexPatterns) {
    let match;
    while ((match = regex.exec(html)) !== null) {
      if (match[1] && !urls.includes(match[1])) {
        // 清理URL（有时URL可能包含转义字符）
        let url = match[1].replace(/\\u002F/g, '/').replace(/\\/g, '');
        urls.push(url);
      }
    }
  }
  
  return urls;
}

// 使用axios获取视频URL
async function getVideoInfoWithAxios(url) {
  try {
    console.log(`使用axios请求: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://m.dongchedi.com/',
      },
      timeout: 10000,
      maxRedirects: 5,
    });
    
    return response.data;
  } catch (error) {
    console.error(`Axios请求失败: ${error.message}`);
    return null;
  }
}

// 直接从API获取视频URL (使用多种方法)
async function getVideoUrlFromAPI(videoId) {
  // 2024版本的API端点
  const apiUrls = [
    `https://m.dongchedi.com/apis/video/get_video_play_info/?video_id=${videoId}`,
    `https://m.dongchedi.com/apis/motor/video/info/?id=${videoId}`,
    `https://m.dongchedi.com/api/video/get_video_play_info/?video_id=${videoId}`,
    `https://www.dongchedi.com/motor/apis/video/info/?id=${videoId}`,
    `https://www.dongchedi.com/motor/api/video_info/?video_id=${videoId}`,
    `https://www.dongchedi.com/api/video/get_video_play_info/?video_id=${videoId}`
  ];
  
  let allVideoUrls = [];
  
  // 尝试所有API端点
  for (const apiUrl of apiUrls) {
    try {
      console.log(`尝试API: ${apiUrl}`);
      
      // 使用两种不同的请求方法
      const response = await makeRequest(apiUrl);
      
      if (response.statusCode === 200) {
        try {
          const data = JSON.parse(response.data);
          const videoUrls = findVideoUrlsInObject(data);
          allVideoUrls = [...allVideoUrls, ...videoUrls];
          
          if (allVideoUrls.length > 0) {
            console.log(`通过API找到${allVideoUrls.length}个视频URL`);
            break;  // 找到了视频URL，跳出循环
          }
        } catch (e) {
          console.log(`API响应不是有效的JSON: ${e.message}`);
        }
      } else {
        console.log(`API请求失败，状态码: ${response.statusCode}`);
        
        // 尝试使用axios作为备用方法
        const axiosData = await getVideoInfoWithAxios(apiUrl);
        if (axiosData) {
          const videoUrls = findVideoUrlsInObject(axiosData);
          allVideoUrls = [...allVideoUrls, ...videoUrls];
          
          if (allVideoUrls.length > 0) {
            console.log(`通过axios找到${allVideoUrls.length}个视频URL`);
            break;
          }
        }
      }
    } catch (e) {
      console.error(`API请求出错: ${e.message}`);
    }
  }
  
  return allVideoUrls;
}

// 直接从HTML页面获取视频URL
async function getVideoUrlFromHTML(url) {
  try {
    console.log(`尝试从HTML页面获取视频URL: ${url}`);
    
    // 使用两种方法获取页面
    let html = null;
    
    // 方法1: 使用原生http/https
    try {
      const response = await makeRequest(url);
      if (response.statusCode === 200) {
        html = response.data;
      }
    } catch (error) {
      console.log(`原生HTTP请求失败: ${error.message}`);
    }
    
    // 方法2: 如果原生http/https失败，尝试使用axios
    if (!html) {
      try {
        const axiosData = await getVideoInfoWithAxios(url);
        if (axiosData) {
          if (typeof axiosData === 'string') {
            html = axiosData;
          } else {
            html = JSON.stringify(axiosData);
          }
        }
      } catch (error) {
        console.log(`Axios请求失败: ${error.message}`);
      }
    }
    
    if (html) {
      const urls = extractVideoUrlsFromHtml(html);
      
      if (urls.length > 0) {
        console.log(`从HTML找到${urls.length}个视频URL`);
        return urls;
      } else {
        console.log('在HTML中未找到视频URL');
      }
    } else {
      console.log('未能获取HTML内容');
    }
  } catch (e) {
    console.error(`HTML请求出错: ${e.message}`);
  }
  
  return [];
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
  let currentUrl = mobileUrl;

  // 开始提取视频URL
  console.log(`开始处理URL: ${url}`);
  console.log(`转换后URL: ${mobileUrl}`);
  
  try {
    // 1. 提取视频ID
    const videoId = mobileUrl.split('/').pop().split('?')[0];
    console.log(`提取的视频ID: ${videoId}`);
    
    // 2. 尝试多种方法获取视频URL
    let videoUrls = [];
    
    // 方法1: 从API获取
    const apiUrls = await getVideoUrlFromAPI(videoId);
    videoUrls = [...videoUrls, ...apiUrls];
    
    // 方法2: 从HTML页面获取
    if (videoUrls.length === 0) {
      const htmlUrls = await getVideoUrlFromHTML(mobileUrl);
      videoUrls = [...videoUrls, ...htmlUrls];
    }
    
    // 方法3: 尝试PC版网址
    if (videoUrls.length === 0 && url !== mobileUrl) {
      console.log('尝试从PC版网址获取视频');
      const pcHtmlUrls = await getVideoUrlFromHTML(url);
      videoUrls = [...videoUrls, ...pcHtmlUrls];
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
          convertedUrl: currentUrl !== url ? currentUrl : null
        }
      });
    } else {
      // 生成用于诊断的所有信息
      const diagnosticInfo = {
        videoId,
        apisTried: [
          `https://m.dongchedi.com/apis/video/get_video_play_info/?video_id=${videoId}`,
          `https://m.dongchedi.com/apis/motor/video/info/?id=${videoId}`,
          `https://m.dongchedi.com/api/video/get_video_play_info/?video_id=${videoId}`,
          `https://www.dongchedi.com/motor/apis/video/info/?id=${videoId}`,
          `https://www.dongchedi.com/motor/api/video_info/?video_id=${videoId}`,
          `https://www.dongchedi.com/api/video/get_video_play_info/?video_id=${videoId}`
        ],
        mobileUrl,
        originalUrl: url
      };
      
      console.log('未找到视频URL，诊断信息:', JSON.stringify(diagnosticInfo, null, 2));
      
      return res.status(404).json({
        success: false,
        message: '未找到视频URL，请确认链接正确且视频可访问',
        data: { 
          original_url: url,
          diagnostic: diagnosticInfo
        }
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
