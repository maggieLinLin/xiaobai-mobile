// 複製這段代碼到 Cloudflare Workers

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const query = url.searchParams.get('q')
  
  // 處理 CORS
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

  try {
    // 嘗試網易雲音樂 API
    const res = await fetch(`https://netease-cloud-music-api-rouge-six.vercel.app/search?keywords=${encodeURIComponent(query)}&limit=10`)
    const data = await res.json()
    
    if (data.result && data.result.songs) {
      const songs = data.result.songs.map(song => ({
        id: song.id,
        title: song.name,
        artist: song.artists.map(a => a.name).join('/'),
        url: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`
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
