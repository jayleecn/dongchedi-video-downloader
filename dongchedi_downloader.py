#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import re
import time
import json
import sys
import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup

class DongCheDiDownloader:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Referer': 'https://www.dongchedi.com/',
        }
        
    def get_video_info(self, url):
        """获取视频信息和下载链接"""
        print(f"正在分析视频页面: {url}")
        
        # 设置Chrome选项
        chrome_options = Options()
        chrome_options.add_argument('--headless')  # 无头模式
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument(f'user-agent={self.headers["User-Agent"]}')
        chrome_options.add_argument('--enable-logging')
        chrome_options.add_argument('--log-level=0')
        chrome_options.add_argument('--enable-network-logging')
        
        driver = webdriver.Chrome(options=chrome_options)
        
        try:
            driver.get(url)
            print("页面加载完成，等待视频元素...")
            time.sleep(5)  # 增加等待时间
            
            # 打印当前URL，以防有重定向
            print(f"当前页面URL: {driver.current_url}")
            
            # 尝试方法1: 查找可能的视频元素
            video_urls = []
            print("方法1: 查找视频元素...")
            video_elements = driver.find_elements(By.TAG_NAME, 'video')
            if video_elements:
                for video in video_elements:
                    src = video.get_attribute('src')
                    if src and (src.endswith('.mp4') or '.mp4?' in src):
                        video_urls.append(src)
                        print(f"从视频元素找到URL: {src}")
            
            # 尝试方法2: 使用Beautiful Soup解析页面源码
            if not video_urls:
                print("方法2: 使用Beautiful Soup解析页面...")
                page_source = driver.page_source
                soup = BeautifulSoup(page_source, 'lxml')
                
                # 查找所有video标签
                video_tags = soup.find_all('video')
                for video in video_tags:
                    if video.has_attr('src'):
                        src = video['src']
                        if src and (src.endswith('.mp4') or '.mp4?' in src):
                            video_urls.append(src)
                            print(f"从Beautiful Soup找到URL: {src}")
                
                # 查找所有source标签
                source_tags = soup.find_all('source')
                for source in source_tags:
                    if source.has_attr('src'):
                        src = source['src']
                        if src and (src.endswith('.mp4') or '.mp4?' in src):
                            video_urls.append(src)
                            print(f"从source标签找到URL: {src}")
            
            # 尝试方法3: 从页面源码中查找视频链接
            if not video_urls:
                print("方法3: 从页面源码中查找视频链接模式...")
                page_source = driver.page_source
                
                # 打印一部分页面源码
                print(f"页面源码片段: {page_source[:500]}...")
                
                # 尝试查找所有可能的视频链接模式
                patterns = [
                    r'"url":"(https?://[^"]*?\.mp4[^"]*?)"',
                    r'"playUrl":"(https?://[^"]*?\.mp4[^"]*?)"',
                    r'"videoUrl":"(https?://[^"]*?\.mp4[^"]*?)"',
                    r'"video_url":"(https?://[^"]*?\.mp4[^"]*?)"',
                    r'"main_url":"(https?://[^"]*?\.mp4[^"]*?)"',
                    r'"url": ?"(https?://[^"]*?\.mp4[^"]*?)"',
                    r'"url":\s*"([^"]*?\.mp4[^"]*?)"',  # 更宽松的模式
                    r'src=["\']([^"\']*?\.mp4[^"\']*?)["\']',
                    r'<video[^>]*src=["\']([^"\']*?\.mp4[^"\']*?)["\']',
                    # 增加m3u8模式
                    r'"url":"(https?://[^"]*?\.m3u8[^"]*?)"',
                    r'"playUrl":"(https?://[^"]*?\.m3u8[^"]*?)"',
                    r'"videoUrl":"(https?://[^"]*?\.m3u8[^"]*?)"'
                ]
                
                for pattern in patterns:
                    matches = re.findall(pattern, page_source)
                    for match in matches:
                        video_url = match.replace('\\u002F', '/').replace('\\', '')
                        video_urls.append(video_url)
                        print(f"从源码找到URL (模式 {pattern}): {video_url}")
            
            # 尝试方法4: 执行JavaScript查找window对象中的视频信息
            if not video_urls:
                print("方法4: 从JavaScript对象中提取视频信息...")
                js_objects = [
                    'window.__INITIAL_STATE__',
                    'window.INITIAL_STATE',
                    'window.initialState',
                    'window.dynamicLoad',
                    'window.nuxt',
                    'window.pageData',
                    'window.videoData',
                    'window.__VIDEO_DATA__'
                ]
                
                for obj_name in js_objects:
                    print(f"检查 {obj_name}...")
                    try:
                        result = driver.execute_script(f"return JSON.stringify({obj_name});")
                        if result and result != "null" and result != "undefined":
                            print(f"找到 {obj_name} 数据!")
                            # 尝试查找里面的视频URL
                            try:
                                js_data = json.loads(result)
                                print(f"{obj_name} 数据前500字符: {json.dumps(js_data, indent=2, ensure_ascii=False)[:500]}...")
                                
                                # 递归搜索URL
                                def find_urls(obj, urls=None):
                                    if urls is None:
                                        urls = []
                                    
                                    if isinstance(obj, dict):
                                        for k, v in obj.items():
                                            # 检查键名是否包含关键字
                                            if any(keyword in k.lower() for keyword in ['url', 'video', 'play', 'mp4', 'm3u8', 'src']):
                                                if isinstance(v, str) and (('.mp4' in v) or ('.m3u8' in v)):
                                                    urls.append(v)
                                                    print(f"从 {obj_name}.{k} 找到URL: {v}")
                                            
                                            # 继续递归搜索
                                            if isinstance(v, (dict, list)):
                                                find_urls(v, urls)
                                    elif isinstance(obj, list):
                                        for item in obj:
                                            if isinstance(item, (dict, list)):
                                                find_urls(item, urls)
                                    
                                    return urls
                                
                                found_urls = find_urls(js_data)
                                for url in found_urls:
                                    if url not in video_urls:
                                        video_urls.append(url)
                            except json.JSONDecodeError as e:
                                print(f"{obj_name} JSON解析失败: {e}")
                    except Exception as e:
                        print(f"获取 {obj_name} 时出错: {e}")
            
            # 尝试方法5: 捕获网络请求
            if not video_urls:
                print("方法5: 分析网络请求...")
                # 捕获网络日志
                logs = driver.get_log('performance')
                for log in logs:
                    try:
                        # 解析日志
                        log_data = json.loads(log['message'])
                        message = log_data.get('message', {})
                        if message.get('method') == 'Network.responseReceived':
                            response = message.get('params', {}).get('response', {})
                            url = response.get('url', '')
                            mime_type = response.get('mimeType', '')
                            
                            # 检查是否为视频相关的请求
                            if (('.mp4' in url or '.m3u8' in url) or 
                                ('video' in mime_type) or 
                                ('stream' in mime_type)):
                                print(f"从网络请求找到视频URL: {url}")
                                video_urls.append(url)
                    except:
                        continue
                    
            # 方法6: 尝试使用直接的REST API请求
            if not video_urls:
                print("方法6: 尝试使用直接的API请求...")
                video_id = url.split('/')[-1].split('?')[0]
                print(f"视频ID: {video_id}")
                
                api_urls = [
                    f"https://www.dongchedi.com/motor/api/video_info/?video_id={video_id}",
                    f"https://m.dongchedi.com/motor/api/video_info/?video_id={video_id}"
                ]
                
                for api_url in api_urls:
                    try:
                        print(f"尝试API: {api_url}")
                        api_response = requests.get(api_url, headers=self.headers)
                        api_data = api_response.json()
                        print(f"API响应: {json.dumps(api_data, indent=2, ensure_ascii=False)[:500]}...")
                        
                        # 递归搜索API响应中的视频URL
                        found_urls = self.extract_urls_from_json(api_data)
                        for url in found_urls:
                            if url not in video_urls:
                                video_urls.append(url)
                                print(f"从API响应找到URL: {url}")
                    except Exception as e:
                        print(f"API请求失败: {e}")
            
            # 如果找到视频URL，打印结果
            if video_urls:
                # 移除重复项并过滤掉空URL
                video_urls = [url for url in list(set(video_urls)) if url]
                print(f"\n共找到 {len(video_urls)} 个可能的视频链接:")
                for i, url in enumerate(video_urls, 1):
                    print(f"{i}. {url}")
                
                return video_urls
            else:
                print("未找到视频链接！")
                # 如果所有方法都失败，打印完整的页面源码以便调试
                with open('page_source.html', 'w', encoding='utf-8') as f:
                    f.write(driver.page_source)
                print("已保存完整的页面源码到 page_source.html 文件")
                return []
                
        except Exception as e:
            print(f"获取视频信息时出错: {e}")
            return []
        finally:
            driver.quit()
    
    def extract_urls_from_json(self, obj, urls=None):
        """递归提取JSON中的视频URL"""
        if urls is None:
            urls = []
        
        if isinstance(obj, dict):
            for k, v in obj.items():
                # 检查键名是否包含关键字
                if any(keyword in k.lower() for keyword in ['url', 'video', 'play', 'mp4', 'm3u8', 'src']):
                    if isinstance(v, str) and (('.mp4' in v) or ('.m3u8' in v)):
                        urls.append(v)
                        print(f"从JSON.{k}找到URL: {v}")
                
                # 继续递归搜索
                if isinstance(v, (dict, list)):
                    self.extract_urls_from_json(v, urls)
        elif isinstance(obj, list):
            for item in obj:
                if isinstance(item, (dict, list)):
                    self.extract_urls_from_json(item, urls)
        
        return urls
    
    def download_video(self, url, output_dir='.', filename=None):
        """下载视频"""
        try:
            if not os.path.exists(output_dir):
                os.makedirs(output_dir)
                
            if not filename:
                filename = f"dongchedi_{int(time.time())}.mp4"
            
            filepath = os.path.join(output_dir, filename)
            
            print(f"开始下载视频: {url}")
            print(f"保存到: {filepath}")
            
            response = requests.get(url, headers=self.headers, stream=True)
            total_size = int(response.headers.get('content-length', 0))
            block_size = 1024  # 1 Kibibyte
            downloaded = 0
            
            with open(filepath, 'wb') as f:
                for data in response.iter_content(block_size):
                    downloaded += len(data)
                    f.write(data)
                    
                    # 显示下载进度
                    done = int(50 * downloaded / total_size) if total_size > 0 else 0
                    sys.stdout.write(f"\r[{'=' * done}{' ' * (50 - done)}] {downloaded}/{total_size} bytes")
                    sys.stdout.flush()
            
            print(f"\n视频下载完成: {filepath}")
            return filepath
        except Exception as e:
            print(f"下载视频时出错: {e}")
            return None

def main():
    if len(sys.argv) < 2:
        print("使用方法: python dongchedi_downloader.py <视频URL> [输出目录] [文件名]")
        return
        
    url = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else '.'
    filename = sys.argv[3] if len(sys.argv) > 3 else None
    
    downloader = DongCheDiDownloader()
    video_urls = downloader.get_video_info(url)
    
    if video_urls:
        if len(video_urls) > 1:
            print("\n发现多个视频链接，请选择要下载的视频：")
            for i, url in enumerate(video_urls, 1):
                print(f"{i}. {url}")
            
            selection = input("请输入要下载的视频编号 (默认1): ")
            try:
                index = int(selection) - 1 if selection.strip() else 0
                if 0 <= index < len(video_urls):
                    downloader.download_video(video_urls[index], output_dir, filename)
                else:
                    print("无效的选择，使用第一个链接")
                    downloader.download_video(video_urls[0], output_dir, filename)
            except ValueError:
                print("无效的输入，使用第一个链接")
                downloader.download_video(video_urls[0], output_dir, filename)
        else:
            downloader.download_video(video_urls[0], output_dir, filename)
    else:
        print("无法找到视频链接，下载失败")

if __name__ == "__main__":
    main()
