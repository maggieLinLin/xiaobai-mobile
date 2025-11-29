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

  // 返回测试数据
  const testSongs = [
    {
      id: '123456',
      title: query + ' - 测试歌曲1',
      artist: '测试歌手',
      url: 'https://music.163.com/song/media/outer/url?id=123456.mp3'
    },
    {
      id: '789012',
      title: query + ' - 测试歌曲2',
      artist: '测试歌手2',
      url: 'https://music.163.com/song/media/outer/url?id=789012.mp3'
    }
  ]

  return jsonResponse({ code: 200, data: testSongs, source: 'test' })
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
