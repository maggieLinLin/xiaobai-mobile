// Cloudflare Worker v2 - 多 API 備用版本
// 複製這段代碼替換 Cloudflare Workers 中的內容

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const query = url.searchParams.get('q')
  
  // CORS 處理
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  }
  
  if (!query) {
    return jsonResponse({ code: 400, message: '缺少搜索關鍵詞' })
  }

  // 嘗試多個 API
  const apis = [
    {
      name: 'Netease',
      url: `https://netease-cloud-music-api-rouge-six.vercel.app/search?keywords=${encodeURIComponent(query)}&limit=10`,
      parse: (data) => {
        if (data.result && data.result.songs) {
          return data.result.songs.map(song => ({
            id: song.id,
            title: song.name,
            artist: song.artists.map(a => a.name).join('/'),
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
            artist: s.artist || s.author,
            url: s.url
          }))
        }
        return null
      }
    }
  ]

  for (const api of apis) {
    try {
      const res = await fetch(api.url, { 
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      const data = await res.json()
      const songs = api.parse(data)
      
      if (songs && songs.length > 0) {
        return jsonResponse({ code: 200, data: songs, source: api.name })
      }
    } catch (e) {
      console.log(`${api.name} failed:`, e.message)
    }
  }
  
  return jsonResponse({ code: 404, message: '所有 API 均無法訪問' })
}

function jsonResponse(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })
}
