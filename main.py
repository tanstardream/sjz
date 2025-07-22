import requests
from bs4 import BeautifulSoup
import os
import urllib.parse
from pathlib import Path
import time
import re
from concurrent.futures import ThreadPoolExecutor, as_completed

def create_output_directory(base_dir="scraped_content"):
    """创建输出目录"""
    Path(base_dir).mkdir(exist_ok=True)
    return base_dir

def download_file(url, local_path, headers):
    """下载单个文件"""
    try:
        local_dir = Path(local_path).parent
        local_dir.mkdir(parents=True, exist_ok=True)
        
        response = requests.get(url, headers=headers, timeout=30, stream=True)
        response.raise_for_status()
        
        with open(local_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"下载完成: {local_path}")
        return True
    except Exception as e:
        print(f"下载失败 {url}: {e}")
        return False

def extract_resources(soup, base_url):
    """提取HTML中的所有资源链接"""
    resources = set()
    
    # CSS文件
    for link in soup.find_all('link', rel='stylesheet'):
        if link.get('href'):
            resources.add(('css', link.get('href')))
    
    # JavaScript文件
    for script in soup.find_all('script', src=True):
        resources.add(('js', script.get('src')))
    
    # 图片文件
    for img in soup.find_all('img', src=True):
        resources.add(('img', img.get('src')))
    
    # 音频文件
    for audio in soup.find_all('audio'):
        for source in audio.find_all('source', src=True):
            resources.add(('audio', source.get('src')))
    
    # 视频文件
    for video in soup.find_all('video'):
        for source in video.find_all('source', src=True):
            resources.add(('video', source.get('src')))
    
    # 背景图片和其他CSS资源
    style_content = ""
    for style in soup.find_all('style'):
        if style.string:
            style_content += style.string
    
    # 查找CSS中的url()资源
    css_urls = re.findall(r'url\(["\']?([^"\']+)["\']?\)', style_content)
    for css_url in css_urls:
        resources.add(('css_resource', css_url))
    
    return resources

def download_resources(base_url, resources, output_dir, headers):
    """下载所有资源文件"""
    downloaded = []
    failed = []
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_resource = {}
        
        for resource_type, resource_url in resources:
            if resource_url.startswith('//'):
                full_url = 'https:' + resource_url
            elif resource_url.startswith('http'):
                full_url = resource_url
            else:
                full_url = urllib.parse.urljoin(base_url, resource_url)
            
            # 确定本地文件路径
            parsed_url = urllib.parse.urlparse(resource_url)
            local_path = Path(output_dir) / parsed_url.path.lstrip('/')
            
            # 如果没有文件扩展名，根据类型添加
            if not local_path.suffix:
                if resource_type == 'css':
                    local_path = local_path.with_suffix('.css')
                elif resource_type == 'js':
                    local_path = local_path.with_suffix('.js')
            
            future = executor.submit(download_file, full_url, local_path, headers)
            future_to_resource[future] = (resource_type, resource_url, full_url, local_path)
        
        for future in as_completed(future_to_resource):
            resource_type, resource_url, full_url, local_path = future_to_resource[future]
            try:
                success = future.result()
                if success:
                    downloaded.append((resource_type, resource_url, local_path))
                else:
                    failed.append((resource_type, resource_url, full_url))
            except Exception as e:
                failed.append((resource_type, resource_url, full_url))
                print(f"资源下载异常 {full_url}: {e}")
    
    return downloaded, failed

def save_content(content, filename, output_dir):
    """保存内容到文件"""
    filepath = Path(output_dir) / filename
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"保存文件: {filepath}")

def scrape_website_complete(url, output_dir):
    """完整爬取网站内容和所有资源"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        print(f"正在获取主页面: {url}")
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        response.encoding = response.apparent_encoding
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        # 保存原始HTML
        save_content(response.text, "page.html", output_dir)
        
        # 提取并保存文本内容
        text_content = soup.get_text(separator='\n', strip=True)
        save_content(text_content, "content.txt", output_dir)
        
        # 提取标题和基本信息
        title = soup.title.string if soup.title else "无标题"
        info = f"网站标题: {title}\n网址: {url}\n爬取时间: {time.strftime('%Y-%m-%d %H:%M:%S')}\n"
        save_content(info, "info.txt", output_dir)
        
        print(f"主页面爬取完成，标题: {title}")
        
        # 提取所有资源链接
        print("正在分析页面资源...")
        resources = extract_resources(soup, url)
        print(f"发现 {len(resources)} 个资源文件")
        
        if resources:
            print("开始下载资源文件...")
            downloaded, failed = download_resources(url, resources, output_dir, headers)
            
            print(f"\n下载结果:")
            print(f"成功下载: {len(downloaded)} 个文件")
            if failed:
                print(f"下载失败: {len(failed)} 个文件")
                for resource_type, resource_url, full_url in failed:
                    print(f"  - {resource_type}: {resource_url}")
            
            # 保存下载报告
            report = f"资源下载报告\n"
            report += f"总资源数: {len(resources)}\n"
            report += f"下载成功: {len(downloaded)}\n"
            report += f"下载失败: {len(failed)}\n\n"
            
            if downloaded:
                report += "成功下载的文件:\n"
                for resource_type, resource_url, local_path in downloaded:
                    report += f"  [{resource_type}] {resource_url} -> {local_path}\n"
            
            if failed:
                report += "\n下载失败的文件:\n"
                for resource_type, resource_url, full_url in failed:
                    report += f"  [{resource_type}] {resource_url} ({full_url})\n"
            
            save_content(report, "download_report.txt", output_dir)
        
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"网络请求错误: {e}")
        return False
    except Exception as e:
        print(f"爬取过程中发生错误: {e}")
        return False
def main():
    url = "https://sanjiaozhou.fanstey.cn/"
    output_dir = create_output_directory()
    
    print(f"开始完整爬取网站: {url}")
    success = scrape_website_complete(url, output_dir)
    
    if success:
        print(f"\n爬取完成！所有文件已保存到 {output_dir} 文件夹")
    else:
        print("爬取失败！")

if __name__ == "__main__":
    main()
