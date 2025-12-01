// Vercel Serverless Function - 音樂搜索 API
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    
    const query = req.query.q || req.query.keywords;
    if (!query) return res.status(400).json({ error: '缺少搜索關鍵詞' });

    const backends = [
        {
            name: 'API-1',
            url: `https://web-production-b3dd5.up.railway.app/music?q=${encodeURIComponent(query)}`,
            parser: (data) => data.code === 200 && data.data ? data.data : null
        },
        {
            name: 'API-2',
            url: `https://api.injahow.cn/meting/?type=search&id=${encodeURIComponent(query)}&source=netease`,
            parser: (data) => Array.isArray(data) ? data.map(s => ({
                id: s.id, title: s.name || s.title, artist: s.artist || s.author, url: s.url
            })) : null
        }
    ];

    const promises = backends.map(async (backend) => {
        try {
            const response = await fetch(backend.url, { 
                signal: AbortSignal.timeout(5000),
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            const songs = backend.parser(data);
            if (songs && songs.length > 0) return { backend: backend.name, songs };
            throw new Error('No results');
        } catch (error) {
            throw error;
        }
    });

    try {
        const result = await Promise.any(promises);
        res.json({ code: 200, backend: result.backend, data: result.songs });
    } catch (error) {
        res.status(503).json({ code: 503, error: '所有 API 均失敗' });
    }
}
