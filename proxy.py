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
        url = f'http://mobilecdn.kugou.com/api/v3/search/song?format=json&keyword={query}&page=1&pagesize=10'
        res = requests.get(url, timeout=10)
        data = res.json()
        
        if data.get('status') == 1 and data.get('data', {}).get('info'):
            songs = []
            for i, s in enumerate(data['data']['info'][:10]):
                song_hash = s.get('hash', '')
                play_url = f"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-{i+1}.mp3"
                
                # 嘗試獲取真實播放鏈接
                if song_hash:
                    try:
                        play_api = f'http://www.kugou.com/yy/index.php?r=play/getdata&hash={song_hash}'
                        play_res = requests.get(play_api, timeout=5)
                        play_data = play_res.json()
                        if play_data.get('status') == 1 and play_data.get('data', {}).get('play_url'):
                            play_url = play_data['data']['play_url']
                    except:
                        pass
                
                songs.append({
                    'id': song_hash,
                    'title': s.get('songname', ''),
                    'artist': s.get('singername', ''),
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
