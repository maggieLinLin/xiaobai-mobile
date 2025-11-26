from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from ytmusicapi import YTMusic

app = Flask(__name__)
CORS(app)
ytmusic = YTMusic()

@app.route('/')
@app.route('/music')
def music():
    query = request.args.get('q', '')
    if not query:
        return jsonify({'error': '缺少查询参数'}), 400
    
    try:
        results = ytmusic.search(query, filter='songs', limit=10)
        songs = []
        for s in results:
            video_id = s.get('videoId')
            if video_id:
                songs.append({
                    'id': video_id,
                    'title': s.get('title', ''),
                    'artist': ', '.join([a.get('name', '') for a in s.get('artists', [])]) if s.get('artists') else '未知艺人',
                    'url': f'https://www.youtube.com/watch?v={video_id}'
                })
        if songs:
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
