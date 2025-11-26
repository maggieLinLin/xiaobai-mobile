from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

@app.route('/music')
def music():
    query = request.args.get('q', '')
    if not query:
        return jsonify({'error': '缺少查询参数'}), 400
    
    try:
        url = f'http://mobilecdn.kugou.com/api/v3/search/song?format=json&keyword={query}&page=1&pagesize=10'
        res = requests.get(url, timeout=10)
        data = res.json()
        
        if data.get('status') == 1 and data.get('data', {}).get('info'):
            songs = []
            for i, s in enumerate(data['data']['info'][:10]):
                songs.append({
                    'id': s.get('hash', i),
                    'title': s.get('songname', ''),
                    'artist': s.get('singername', ''),
                    'url': f"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-{i+1}.mp3"
                })
            return jsonify({'code': 200, 'data': songs})
    except Exception as e:
        print(f'API Error: {e}')
    
    # 备用示例数据
    songs = [
        {'id': 1, 'title': query, 'artist': '示例歌手', 'url': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'},
        {'id': 2, 'title': query + ' (原声)', 'artist': '示例歌手', 'url': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'},
        {'id': 3, 'title': query + ' (Live)', 'artist': '示例歌手', 'url': 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'}
    ]
    return jsonify({'code': 200, 'data': songs})

if __name__ == '__main__':
    print('代理服务器运行在 http://localhost:5000')
    app.run(port=5000, debug=True)
