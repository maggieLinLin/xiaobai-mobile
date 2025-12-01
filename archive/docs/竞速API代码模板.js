// 競速 API 代碼模板
// 部署完 API 後，用你的 URL 替換下面的地址

async function searchMusic() {
    const query = document.getElementById('music-search-input').value.trim();
    if (!query) return alert('请输入搜索关键词');
    
    const results = document.getElementById('search-results');
    results.innerHTML = '<div style="padding:20px;text-align:center">正在搜索...</div>';
    
    // ⚠️ 替換為你部署的 API 地址
    const YOUR_API_1 = 'https://你的vercel項目1.vercel.app';
    const YOUR_API_2 = 'https://你的vercel項目2.vercel.app';
    const YOUR_API_3 = 'https://你的railway項目.up.railway.app';
    
    const apis = [
        // API 1: NeteaseCloudMusicApi (Vercel)
        { 
            name: 'My Netease API 1', 
            url: `${YOUR_API_1}/search?keywords=${encodeURIComponent(query)}&limit=10`,
            parse: (data) => {
                if (data.result && data.result.songs) {
                    return data.result.songs.map(song => ({
                        id: song.id,
                        title: song.name,
                        artist: song.artists.map(a => a.name).join('/'),
                        url: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`
                    }));
                }
                return [];
            }
        },
        // API 2: Meting API (Vercel)
        { 
            name: 'My Meting API', 
            url: `${YOUR_API_2}/api?server=netease&type=search&id=${encodeURIComponent(query)}`,
            parse: (data) => {
                if (Array.isArray(data)) {
                    return data.map(s => ({
                        id: s.id,
                        title: s.name || s.title,
                        artist: s.artist || s.author,
                        url: s.url
                    }));
                }
                return [];
            }
        },
        // API 3: NeteaseCloudMusicApi (Railway)
        { 
            name: 'My Netease API 2', 
            url: `${YOUR_API_3}/search?keywords=${encodeURIComponent(query)}&limit=10`,
            parse: (data) => {
                if (data.result && data.result.songs) {
                    return data.result.songs.map(song => ({
                        id: song.id,
                        title: song.name,
                        artist: song.artists.map(a => a.name).join('/'),
                        url: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`
                    }));
                }
                return [];
            }
        }
    ];
    
    try {
        // 競速模式：同時請求所有 API，誰快用誰
        const promises = apis.map(api => 
            fetch(api.url, { method: 'GET', mode: 'cors' })
                .then(res => res.json())
                .then(data => ({ api, data }))
                .catch(e => ({ api, error: e }))
        );
        
        // 等待第一個成功的響應
        for (const promise of promises) {
            const result = await promise;
            if (!result.error) {
                const songs = result.api.parse(result.data);
                if (songs.length > 0) {
                    console.log(`✅ 成功使用 ${result.api.name}`);
                    displayResults(songs);
                    return;
                }
            }
        }
        
        // 所有 API 都失敗
        results.innerHTML = '<div style="padding:20px;text-align:center;color:#ff6b6b">所有 API 均無法訪問<br><br>建議：<br>1. 檢查 API 是否部署成功<br>2. 使用本地音樂文件<br>3. 手動輸入音樂 URL</div>';
    } catch (e) {
        console.error('Search error:', e);
        results.innerHTML = `<div style="padding:20px;text-align:center;color:red">搜索失敗: ${e.message}</div>`;
    }
}

function displayResults(songs) {
    const results = document.getElementById('search-results');
    let html = '';
    songs.forEach(song => {
        html += `<div class="song-item" data-song='${JSON.stringify(song).replace(/'/g, "&apos;")}'>
            <div style="font-weight:bold">${song.title}</div>
            <div style="font-size:12px;color:#666">${song.artist}</div>
        </div>`;
    });
    results.innerHTML = html;
    
    document.querySelectorAll('.song-item').forEach(el => {
        el.onclick = () => {
            const song = JSON.parse(el.dataset.song.replace(/&apos;/g, "'"));
            playSong(song);
            closeApp();
        };
    });
}
