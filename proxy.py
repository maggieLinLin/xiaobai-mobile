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
        search_url = f'https://s.music.163.com/search/get/?src=lofter&type=1&filterDj=false&limit=10&offset=0&s={query}'
        res = requests.get(search_url, timeout=10)
        data = res.json()
        
        if data.get('result', {}).get('songs'):
            songs = []
            for s in data['result']['songs']:
                song_id = s.get('id')
                # 獲取真實播放鏈接
                play_url = f'http://music.163.com/song/media/outer/url?id={song_id}'
                try:
                    play_res = requests.get(play_url, allow_redirects=True, timeout=5)
                    real_url = play_res.url
                except:
                    real_url = f"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-{len(songs)+1}.mp3"
                
                songs.append({
                    'id': song_id,
                    'title': s.get('name', ''),
                    'artist': s.get('artists', [{}])[0].get('name', '未知艺人'),
                    'url': real_url
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
