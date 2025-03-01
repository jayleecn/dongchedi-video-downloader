#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import re
import json
import sys
import time
import asyncio
import requests
import urllib.parse
from playwright.async_api import async_playwright

def convert_to_mobile_url(url):
    """将PC版网址转换为移动端网址"""
    if not url:
        return url
        
    try:
        # 确保URL有协议前缀
        if not url.startswith('http://') and not url.startswith('https://'):
            url = 'https://' + url
            
        # 解析URL
        parsed_url = urllib.parse.urlparse(url)
        hostname = parsed_url.netloc
        
        # 检查是否为PC版网址
        if hostname == 'www.dongchedi.com' or hostname == 'dongchedi.com':
            # 转换为移动端网址
            new_parts = list(parsed_url)
            new_parts[1] = 'm.dongchedi.com'  # 修改hostname
            mobile_url = urllib.parse.urlunparse(new_parts)
            
            print(f"已将PC端链接转换为移动端链接:")
            print(f"原链接: {url}")
            print(f"转换后: {mobile_url}")
            
            return mobile_url
            
        # 已经是移动端网址或其他网址，不做转换
        return url
    except Exception as e:
        print(f"URL转换失败: {e}")
        return url

async def extract_video_url(url):
    """使用Playwright提取视频URL"""
    # 转换为移动端URL
    url = convert_to_mobile_url(url)
    
    print(f"正在分析视频页面: {url}")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # 启用请求拦截，用于捕获网络请求
        client = await page.context.new_cdp_session(page)
        await client.send("Network.enable")
        
        # 收集视频请求
        video_urls = []
        
        async def on_response(response):
            url = response.url
            if any(ext in url for ext in ['.mp4', '.m3u8']):
                print(f"发现视频URL: {url}")
                video_urls.append(url)
            
            # 检查特定的内容类型
            headers = await response.all_headers()
            content_type = headers.get('content-type', '')
            if 'video' in content_type:
                print(f"发现视频响应: {url} (Content-Type: {content_type})")
                video_urls.append(url)
        
        page.on("response", on_response)
        
        # 导航到页面
        print("加载页面中...")
        await page.goto(url, wait_until="domcontentloaded")
        print(f"页面已加载，当前URL: {page.url}")
        
        # 等待页面完全加载
        print("等待页面稳定...")
        await asyncio.sleep(5)
        
        # 执行JavaScript获取VideoURL
        print("执行JavaScript提取数据...")
        js_data = await page.evaluate("""() => {
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
            const mp4Regex = /"(https?:[^"]+\\.mp4[^"]*)"/g;
            const mp4Matches = html.match(mp4Regex) || [];
            videoData.mp4Matches = mp4Matches.map(m => m.replace(/"/g, ''));
            
            // 查找m3u8相关字符串
            const m3u8Regex = /"(https?:[^"]+\\.m3u8[^"]*)"/g;
            const m3u8Matches = html.match(m3u8Regex) || [];
            videoData.m3u8Matches = m3u8Matches.map(m => m.replace(/"/g, ''));
            
            return videoData;
        }""")
        
        # 提取JavaScript数据中的视频URL
        if js_data.get('videoElements'):
            for element in js_data['videoElements']:
                if element.get('src'):
                    video_urls.append(element['src'])
                    print(f"从视频元素中找到URL: {element['src']}")
                if element.get('currentSrc'):
                    video_urls.append(element['currentSrc'])
                    print(f"从视频元素currentSrc中找到URL: {element['currentSrc']}")
        
        if js_data.get('mp4Matches'):
            for url in js_data['mp4Matches']:
                video_urls.append(url)
                print(f"从页面中提取MP4 URL: {url}")
        
        if js_data.get('m3u8Matches'):
            for url in js_data['m3u8Matches']:
                video_urls.append(url)
                print(f"从页面中提取M3U8 URL: {url}")
        
        # 查看页面的初始化状态数据
        if js_data.get('initialState'):
            print("找到initialState数据，递归搜索视频URL...")
            
            def find_urls_in_object(obj, urls=None):
                if urls is None:
                    urls = []
                
                if isinstance(obj, dict):
                    for k, v in obj.items():
                        if isinstance(v, str) and (any(ext in v for ext in ['.mp4', '.m3u8']) and 'http' in v):
                            urls.append(v)
                            print(f"从initialState.{k}中找到URL: {v}")
                        elif isinstance(v, (dict, list)):
                            find_urls_in_object(v, urls)
                elif isinstance(obj, list):
                    for item in obj:
                        if isinstance(item, (dict, list)):
                            find_urls_in_object(item, urls)
                
                return urls
            
            initial_state_urls = find_urls_in_object(js_data['initialState'])
            video_urls.extend(initial_state_urls)
        
        # 如果没有找到视频URL，尝试查找特定的视频API
        if not video_urls and url:
            print("尝试查找视频API...")
            video_id = url.split('/')[-1].split('?')[0]
            api_urls = [
                f"https://www.dongchedi.com/motor/api/video_info/?video_id={video_id}",
                f"https://www.dongchedi.com/api/video/get_video_play_info/?video_id={video_id}",
                f"https://www.dongchedi.com/api/vrms/video/get_video_play_info/?video_id={video_id}",
            ]
            
            for api_url in api_urls:
                try:
                    print(f"尝试获取API: {api_url}")
                    await page.goto(api_url, wait_until="domcontentloaded")
                    
                    # 尝试解析JSON响应
                    try:
                        text_content = await page.evaluate("document.body.textContent")
                        api_data = json.loads(text_content)
                        print(f"API响应: {json.dumps(api_data, indent=2, ensure_ascii=False)[:500]}...")
                        
                        # 递归搜索API响应中的视频URL
                        api_urls = find_urls_in_object(api_data)
                        video_urls.extend(api_urls)
                    except json.JSONDecodeError:
                        print(f"无法解析API响应为JSON")
                except Exception as e:
                    print(f"获取API时出错: {e}")
        
        # 关闭浏览器
        await browser.close()
        
        # 处理结果
        if video_urls:
            # 去重并过滤空值
            video_urls = [url for url in list(dict.fromkeys(video_urls)) if url and url.startswith('http')]
            print(f"\n共找到 {len(video_urls)} 个可能的视频链接:")
            for i, video_url in enumerate(video_urls, 1):
                print(f"{i}. {video_url}")
            return video_urls
        else:
            print("未找到任何视频链接")
            return []

def download_video(url, output_dir='.', filename=None):
    """下载视频"""
    try:
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        if not filename:
            filename = f"dongchedi_{int(time.time())}.mp4"
        
        filepath = os.path.join(output_dir, filename)
        
        print(f"开始下载视频: {url}")
        print(f"保存到: {filepath}")
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Referer': 'https://www.dongchedi.com/',
        }
        
        response = requests.get(url, headers=headers, stream=True)
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

async def main_async():
    if len(sys.argv) < 2:
        print("使用方法: python dongchedi_playwright.py <视频URL> [输出目录] [文件名]")
        return
        
    url = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else '.'
    filename = sys.argv[3] if len(sys.argv) > 3 else None
    
    video_urls = await extract_video_url(url)
    
    if video_urls:
        if len(video_urls) > 1:
            print("\n发现多个视频链接，请选择要下载的视频：")
            for i, url in enumerate(video_urls, 1):
                print(f"{i}. {url}")
            
            selection = input("请输入要下载的视频编号 (默认1): ")
            try:
                index = int(selection) - 1 if selection.strip() else 0
                if 0 <= index < len(video_urls):
                    download_video(video_urls[index], output_dir, filename)
                else:
                    print("无效的选择，使用第一个链接")
                    download_video(video_urls[0], output_dir, filename)
            except ValueError:
                print("无效的输入，使用第一个链接")
                download_video(video_urls[0], output_dir, filename)
        else:
            download_video(video_urls[0], output_dir, filename)
    else:
        print("无法找到视频链接，下载失败")

def main():
    asyncio.run(main_async())

if __name__ == "__main__":
    main()
