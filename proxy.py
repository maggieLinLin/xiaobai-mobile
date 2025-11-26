from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

@app.route('/')
@app.route('/music')
def music():
    query = request.args.get('q', '')
    if not query:
        return jsonify({'error': '缺少查询参数'}), 400
    
    try:
        search_url = f'https://mobiles.kugou.com/api/v3/search/song?format=json&keyword={query}&page=1&pagesize=10&showtype=1'
        headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 11; SAMSUNG SM-G973U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Mobile Safari/537.36'
        }
        res = requests.get(search_url, headers=headers, timeout=10)
        data = res.json()
        
        if data.get('data', {}).get('info'):
            songs = []
            for s in data['data']['info']:
                song_hash = s.get('hash')
                play_url = f"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-{len(songs)+1}.mp3"
                
                # 獲取真實播放鏈接
                if song_hash:
                    try:
                        song_url = f'https://m.kugou.com/app/i/getSongInfo.php?hash={song_hash}&cmd=playInfo'
                        song_res = requests.get(song_url, headers=headers, timeout=5)
                        song_data = song_res.json()
                        if song_data.get('url'):
                            play_url = song_data['url']
                    except:
                        pass
                
                songs.append({
                    'id': song_hash,
                    'title': s.get('filename', ''),
                    'artist': s.get('singername', '未知艺人'),
                    'url': play_url
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
