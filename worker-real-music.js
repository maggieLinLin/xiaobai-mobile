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
    const res = await fetch(`https://api.injahow.cn/meting/?type=search&id=${encodeURIComponent(query)}&source=netease`, {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    
    if (!res.ok) {
      return jsonResponse({ code: res.status, message: 'API 请求失败' })
    }
    
    const data = await res.json()
    
    if (Array.isArray(data) && data.length > 0) {
      const songs = data.map(s => ({
        id: s.id,
        title: s.name || s.title,
        artist: s.artist || s.author || '未知',
        url: s.url
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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    }
  })
}
