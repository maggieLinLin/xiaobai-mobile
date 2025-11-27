from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, quote
import json
import urllib.request

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        query = params.get('q', [''])[0]
        
        if not query:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': '缺少查询参数'}).encode())
            return
        
        try:
            url = f'http://mobilecdn.kugou.com/api/v3/search/song?format=json&keyword={quote(query)}&page=1&pagesize=10'
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode())
                
                if data.get('status') == 1 and data.get('data', {}).get('info'):
                    songs = []
                    for i, s in enumerate(data['data']['info'][:10]):
                        songs.append({
                            'id': s.get('hash', i),
                            'title': s.get('songname', ''),
                            'artist': s.get('singername', ''),
                            'url': f"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-{i+1}.mp3"
                        })
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({'code': 200, 'data': songs}).encode())
                    return
        except Exception as e:
            print(f'API Error: {e}')
        
        # 备用示例数据
        songs = [
            {'id': 1, 'title': query, 'artist': '示例歌手', 'url': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'},
            {'id': 2, 'title': query + ' (原声)', 'artist': '示例歌手', 'url': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'},
            {'id': 3, 'title': query + ' (Live)', 'artist': '示例歌手', 'url': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'}
        ]
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({'code': 200, 'data': songs}).encode())
