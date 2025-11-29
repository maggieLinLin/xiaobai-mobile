// Cloudflare Worker - 竞速多个音乐 API
// 部署到: worker-simplejs.maggie930714.workers.dev

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // CORS 预检
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      }
    })
  }

  const url = new URL(request.url)
  const query = url.searchParams.get('q')
  
  if (!query) {
    return jsonResponse({ code: 400, message: '缺少搜索关键词' })
  }

  // 多个备用 API (竞速)
  const apis = [
    {
      name: 'API-1',
      url: `https://api.injahow.cn/meting/?type=search&id=${encodeURIComponent(query)}&source=netease`,
      parse: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          return data.slice(0, 10).map(s => ({
            id: s.id,
            title: s.name || s.title,
            artist: s.artist || s.author || '未知',
            url: s.url
          }))
        }
        return null
      }
    },
    {
      name: 'API-2',
      url: `https://netease-api-production.up.railway.app/search?keywords=${encodeURIComponent(query)}&limit=10`,
      parse: (data) => {
        if (data.result?.songs) {
          return data.result.songs.map(song => ({
            id: song.id,
            title: song.name,
            artist: song.artists?.map(a => a.name).join('/') || '未知',
            url: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`
          }))
        }
        return null
      }
    },
    {
      name: 'Fallback',
      url: null,
      parse: () => {
        // 示例音乐作为最后备选
        return [
          {
            id: 'demo1',
            title: query + ' - 示例歌曲',
            artist: '示例歌手',
            url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
          }
        ]
      }
    }
  ]

  // 竞速: 并行请求所有 API,返回第一个成功的
  const promises = apis.map(async (api) => {
    if (!api.url) {
      // Fallback 直接返回
      return { success: true, songs: api.parse(), source: api.name }
    }
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3秒超时
      
      const res = await fetch(api.url, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!res.ok) {
        return { success: false }
      }
      
      const data = await res.json()
      const songs = api.parse(data)
      
      if (songs && songs.length > 0) {
        return { success: true, songs, source: api.name }
      }
      
      return { success: false }
    } catch (e) {
      return { success: false }
    }
  })

  // 等待第一个成功的响应
  for (const promise of promises) {
    const result = await promise
    if (result.success) {
      return jsonResponse({ 
        code: 200, 
        data: result.songs, 
        source: result.source 
      })
    }
  }

  return jsonResponse({ code: 404, message: '所有 API 均无法访问' })
}

function jsonResponse(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    }
  })
}
