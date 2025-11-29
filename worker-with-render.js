// Cloudflare Worker - 使用你的 Render API
// 部署到: worker-simplejs.maggie930714.workers.dev

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

  try {
    // 使用你的 Render API
    const res = await fetch(`https://netease-music-api.onrender.com/search?keywords=${encodeURIComponent(query)}&limit=10`, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    
    if (!res.ok) {
      return jsonResponse({ code: res.status, message: 'API 请求失败' })
    }
    
    const data = await res.json()
    
    if (data.result?.songs) {
      const songs = data.result.songs.map(song => ({
        id: song.id,
        title: song.name,
        artist: song.artists?.map(a => a.name).join('/') || '未知',
        url: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`
      }))
      
      return jsonResponse({ code: 200, data: songs, source: 'Render' })
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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    }
  })
}
