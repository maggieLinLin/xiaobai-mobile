// 音樂 API 競速代理服務
// 使用方法：node music-proxy-server.js
// 然後在小白機中將音樂搜索 API 指向 http://localhost:4000

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// 多個音樂 API 後端配置
const BACKENDS = [
    {
        name: 'API-1',
        search: (query) => `https://web-production-b3dd5.up.railway.app/music?q=${encodeURIComponent(query)}`,
        parser: (data) => data.code === 200 && data.data ? data.data : null
    },
    {
        name: 'API-2',
        search: (query) => `https://api.injahow.cn/meting/?type=search&id=${encodeURIComponent(query)}&source=netease`,
        parser: (data) => Array.isArray(data) ? data.map(s => ({
            id: s.id,
            title: s.name || s.title,
            artist: s.artist || s.author,
            url: s.url
        })) : null
    },
    {
        name: 'API-3',
        search: (query) => `https://music.cyrilstudio.top/search?keywords=${encodeURIComponent(query)}`,
        parser: (data) => data.result?.songs ? data.result.songs.map(s => ({
            id: s.id,
            title: s.name,
            artist: s.artists?.[0]?.name || '未知',
            url: `https://music.cyrilstudio.top/song/url?id=${s.id}`
        })) : null
    }
];

// 並行請求並返回最快的結果
async function raceRequest(query) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const promises = BACKENDS.map(async (backend) => {
        try {
            const startTime = Date.now();
            const response = await fetch(backend.search(query), {
                signal: controller.signal,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            const songs = backend.parser(data);
            const latency = Date.now() - startTime;
            
            if (songs && songs.length > 0) {
                console.log(`✓ ${backend.name} 成功 (${latency}ms, ${songs.length} 首)`);
                return { backend: backend.name, songs, latency };
            }
            throw new Error('No results');
        } catch (error) {
            console.log(`✗ ${backend.name} 失敗: ${error.message}`);
            throw error;
        }
    });

    try {
        const result = await Promise.any(promises);
        clearTimeout(timeout);
        return result;
    } catch (error) {
        clearTimeout(timeout);
        throw new Error('所有 API 均失敗');
    }
}

// 搜索端點
app.get('/search', async (req, res) => {
    const query = req.query.q || req.query.keywords;
    
    if (!query) {
        return res.status(400).json({ error: '缺少搜索關鍵詞' });
    }

    console.log(`\n🔍 搜索: "${query}"`);

    try {
        const result = await raceRequest(query);
        res.json({
            code: 200,
            backend: result.backend,
            latency: result.latency,
            data: result.songs
        });
    } catch (error) {
        console.error('搜索失敗:', error.message);
        res.status(503).json({
            code: 503,
            error: error.message,
            suggestion: '請嘗試使用本地音樂文件或手動輸入 URL'
        });
    }
});

// 健康檢查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', backends: BACKENDS.length });
});

app.listen(PORT, () => {
    console.log(`\n🎵 音樂 API 競速代理已啟動`);
    console.log(`📡 監聽端口: ${PORT}`);
    console.log(`🔗 測試地址: http://localhost:${PORT}/search?q=周杰倫`);
    console.log(`\n配置的後端 API: ${BACKENDS.map(b => b.name).join(', ')}\n`);
});
