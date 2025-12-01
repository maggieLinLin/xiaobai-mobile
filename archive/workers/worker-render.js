// Cloudflare Worker - 使用 Render 部署的 API
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
  const id = url.searchParams.get('id')
  
  // 获取播放链接
  if (id) {
    try {
      const res = await fetch(`https://neteasecloudmusicapi-idy4.onrender.com/song/url?id=${id}`)
      const data = await res.json()
      if (data.code === 200 && data.data?.[0]?.url) {
        return jsonResponse({ code: 200, url: data.data[0].url })
      }
      return jsonResponse({ code: 404, message: '无法获取播放链接' })
    } catch (error) {
      return jsonResponse({ code: 500, message: error.message })
    }
  }
  
  // 搜索歌曲
  if (!query) {
    return jsonResponse({ code: 400, message: '缺少搜索关键词' })
  }

  try {
    const res = await fetch(`https://neteasecloudmusicapi-idy4.onrender.com/search?keywords=${encodeURIComponent(query)}`)
    const data = await res.json()
    
    if (data.code === 200 && data.result?.songs?.length > 0) {
      const songs = data.result.songs.slice(0, 10).map(s => ({
        id: s.id,
        title: s.name,
        artist: s.artists?.map(a => a.name).join('/') || '未知',
        album: s.album?.name || '',
        duration: Math.floor(s.duration / 1000)
      }))
      return jsonResponse({ code: 200, data: songs })
    }
    
    return jsonResponse({ code: 404, message: '未找到歌曲' })
  } catch (error) {
    return jsonResponse({ code: 500, message: error.message })
  }
}

function jsonResponse(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  })
}
