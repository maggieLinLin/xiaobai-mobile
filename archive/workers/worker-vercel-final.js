// Cloudflare Worker - 直接使用 Render API
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
  
  // 获取播放链接 - 直接返回网易云外链
  if (id) {
    return jsonResponse({ 
      code: 200, 
      url: `https://music.163.com/song/media/outer/url?id=${id}.mp3` 
    })
  }
  
  // 搜索歌曲
  if (!query) {
    return jsonResponse({ code: 400, message: '缺少搜索关键词' })
  }

  try {
    // 直接调用 Render API，60秒超时
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)
    
    const res = await fetch(
      `https://neteasecloudmusicapi-idy4.onrender.com/search?keywords=${encodeURIComponent(query)}`,
      { signal: controller.signal }
    )
    clearTimeout(timeout)
    
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
    if (error.name === 'AbortError') {
      return jsonResponse({ code: 504, message: 'Render 正在唤醒，请30秒后重试' })
    }
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
