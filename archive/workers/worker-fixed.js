// Cloudflare Worker - CORS 完全修复版
// 支持本地文件访问 (origin: null)
// 复制这段代码到 Cloudflare Workers: worker-simplejs.maggie930714.workers.dev

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const query = url.searchParams.get('q')
  
  // CORS 预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400'
      }
    })
  }
  
  if (!query) {
    return jsonResponse({ code: 400, message: '缺少搜索关键词' })
  }

  // 多 API 竞速
  const apis = [
    {
      name: 'Netease-Vercel',
      url: `https://linlin-black.vercel.app/search?keywords=${encodeURIComponent(query)}&limit=10`,
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
      name: 'Netease-API',
      url: `https://netease-cloud-music-api-rouge-six.vercel.app/search?keywords=${encodeURIComponent(query)}&limit=10`,
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
      name: 'Meting',
      url: `https://api.injahow.cn/meting/?type=search&id=${encodeURIComponent(query)}&source=netease`,
      parse: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          return data.map(s => ({
            id: s.id,
            title: s.name || s.title,
            artist: s.artist || s.author || '未知',
            url: s.url
          }))
        }
        return null
      }
    }
  ]

  // 竞速逻辑：谁先返回有效结果就用谁
  const promises = apis.map(api => 
    fetch(api.url, { 
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    .then(res => res.json())
    .then(data => {
      const songs = api.parse(data)
      if (songs && songs.length > 0) {
        return { success: true, songs, source: api.name }
      }
      return { success: false }
    })
    .catch(() => ({ success: false }))
  )

  const results = await Promise.all(promises)
  const winner = results.find(r => r.success)
  
  if (winner) {
    return jsonResponse({ code: 200, data: winner.songs, source: winner.source })
  }
  
  return jsonResponse({ code: 404, message: '未找到歌曲' })
}

function jsonResponse(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    }
  })
}
