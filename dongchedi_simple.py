#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import re
import json
import sys
import requests
from bs4 import BeautifulSoup

def get_video_info(url):
    """获取视频信息"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.dongchedi.com/',
    }
    
    print(f"正在获取页面: {url}")
    
    try:
        # 获取页面内容
        response = requests.get(url, headers=headers, allow_redirects=True)
        print(f"HTTP状态码: {response.status_code}")
        print(f"最终URL: {response.url}")
        
        # 保存页面源码
        with open('page_source.html', 'w', encoding='utf-8') as f:
            f.write(response.text)
        print("已保存页面源码到 page_source.html")
        
        # 查找视频URL
        video_urls = []
        
        # 尝试方法1: 使用正则表达式查找视频链接
        print("方法1: 使用正则表达式查找视频链接...")
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
            matches = re.findall(pattern, response.text)
            for match in matches:
                video_url = match.replace('\\u002F', '/').replace('\\', '')
                video_urls.append(video_url)
                print(f"找到视频URL (模式 {pattern}): {video_url}")
        
        # 尝试方法2: 使用BeautifulSoup解析
        print("方法2: 使用BeautifulSoup解析...")
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 查找所有video标签
        video_tags = soup.find_all('video')
        for video in video_tags:
            if video.has_attr('src'):
                src = video['src']
                if src and (src.endswith('.mp4') or '.mp4?' in src):
                    video_urls.append(src)
                    print(f"从video标签找到URL: {src}")
        
        # 查找所有source标签
        source_tags = soup.find_all('source')
        for source in source_tags:
            if source.has_attr('src'):
                src = source['src']
                if src and (src.endswith('.mp4') or '.mp4?' in src):
                    video_urls.append(src)
                    print(f"从source标签找到URL: {src}")
        
        # 尝试方法3: 查找JavaScript变量中的视频信息
        print("方法3: 查找JavaScript变量中的视频信息...")
        script_tags = soup.find_all('script')
        for script in script_tags:
            script_text = script.string
            if script_text:
                # 查找可能包含视频信息的JavaScript变量
                js_patterns = [
                    r'var\s+videoInfo\s*=\s*({.*?});',
                    r'var\s+videoData\s*=\s*({.*?});',
                    r'window\.__INITIAL_STATE__\s*=\s*({.*?});\s*</script>',
                    r'window\.initialState\s*=\s*({.*?});\s*</script>',
                ]
                
                for js_pattern in js_patterns:
                    js_matches = re.findall(js_pattern, script_text, re.DOTALL)
                    for js_match in js_matches:
                        try:
                            print(f"找到可能的JavaScript数据: {js_match[:200]}...")
                            # 尝试从JavaScript数据中提取视频URL
                            video_patterns = [
                                r'"url"\s*:\s*"([^"]*?\.mp4[^"]*?)"',
                                r'"playUrl"\s*:\s*"([^"]*?\.mp4[^"]*?)"',
                                r'"videoUrl"\s*:\s*"([^"]*?\.mp4[^"]*?)"',
                            ]
                            for v_pattern in video_patterns:
                                v_matches = re.findall(v_pattern, js_match)
                                for v_match in v_matches:
                                    video_url = v_match.replace('\\u002F', '/').replace('\\', '')
                                    video_urls.append(video_url)
                                    print(f"从JavaScript数据中找到视频URL: {video_url}")
                        except Exception as e:
                            print(f"处理JavaScript数据时出错: {e}")
        
        # 尝试方法4: 访问视频API
        print("方法4: 尝试访问视频API...")
        video_id = url.split('/')[-1].split('?')[0]
        print(f"视频ID: {video_id}")
        
        api_urls = [
            f"https://www.dongchedi.com/motor/api/video_info/?video_id={video_id}",
            f"https://m.dongchedi.com/motor/api/video_info/?video_id={video_id}",
            f"https://www.dongchedi.com/api/article/get_video_info_by_id/?video_id={video_id}",
        ]
        
        for api_url in api_urls:
            try:
                print(f"尝试API: {api_url}")
                api_response = requests.get(api_url, headers=headers)
                if api_response.status_code == 200:
                    api_data = api_response.json()
                    print(f"API响应: {json.dumps(api_data, indent=2, ensure_ascii=False)[:500]}...")
                    
                    # 打印完整响应到文件
                    with open(f'api_response_{api_url.split("/")[-1]}.json', 'w', encoding='utf-8') as f:
                        json.dump(api_data, f, ensure_ascii=False, indent=2)
                    
                    # 递归搜索API响应中的视频URL
                    def extract_urls(obj, found_urls=None):
                        if found_urls is None:
                            found_urls = []
                        
                        if isinstance(obj, dict):
                            for k, v in obj.items():
                                if isinstance(v, str) and any(ext in v for ext in ['.mp4', '.m3u8']) and ('http' in v):
                                    found_urls.append(v)
                                    print(f"从API响应中找到URL ({k}): {v}")
                                elif isinstance(v, (dict, list)):
                                    extract_urls(v, found_urls)
                        elif isinstance(obj, list):
                            for item in obj:
                                if isinstance(item, (dict, list)):
                                    extract_urls(item, found_urls)
                        
                        return found_urls
                    
                    found_urls = extract_urls(api_data)
                    for url in found_urls:
                        if url not in video_urls:
                            video_urls.append(url)
                else:
                    print(f"API状态码: {api_response.status_code}")
            except Exception as e:
                print(f"API请求失败: {e}")
        
        # 打印结果
        if video_urls:
            # 移除重复URL并过滤掉空URL
            video_urls = [url for url in list(dict.fromkeys(video_urls)) if url]
            print(f"\n共找到 {len(video_urls)} 个可能的视频链接:")
            for i, video_url in enumerate(video_urls, 1):
                print(f"{i}. {video_url}")
            return video_urls
        else:
            print("未找到任何视频链接")
            return []
            
    except Exception as e:
        print(f"发生错误: {e}")
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

def main():
    if len(sys.argv) < 2:
        print("使用方法: python dongchedi_simple.py <视频URL> [输出目录] [文件名]")
        return
        
    url = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else '.'
    filename = sys.argv[3] if len(sys.argv) > 3 else None
    
    video_urls = get_video_info(url)
    
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

if __name__ == "__main__":
    import time  # 导入time模块用于生成文件名
    main()
