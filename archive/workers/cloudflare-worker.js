// Cloudflare Worker 音樂 API 反代
// 部署到 Cloudflare Workers 後可免費使用

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const query = url.searchParams.get('q')
  
  if (!query) {
    return new Response(JSON.stringify({ code: 400, message: '缺少搜索關鍵詞' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }

  // 使用網易雲音樂 API
  const apiUrl = `https://netease-cloud-music-api-rouge-six.vercel.app/search?keywords=${encodeURIComponent(query)}&limit=10`
  
  try {
    const response = await fetch(apiUrl)
    const data = await response.json()
    
    if (data.result && data.result.songs) {
      const songs = data.result.songs.map(song => ({
        id: song.id,
        title: `${song.name} - ${song.artists[0].name}`,
        artist: song.artists.map(a => a.name).join('/'),
        url: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`
      }))
      
      return new Response(JSON.stringify({ code: 200, data: songs }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }
    
    return new Response(JSON.stringify({ code: 404, message: '未找到歌曲' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ code: 500, message: error.message }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
}
