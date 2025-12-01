addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
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

  const apis = [
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
    },
    {
      name: 'Railway',
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
    }
  ]

  for (const api of apis) {
    try {
      const res = await fetch(api.url, { 
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      
      if (res.ok) {
        const data = await res.json()
        const songs = api.parse(data)
        
        if (songs && songs.length > 0) {
          return jsonResponse({ code: 200, data: songs, source: api.name })
        }
      }
    } catch (e) {
      console.log(`${api.name} failed:`, e.message)
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
