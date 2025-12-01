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

  // 使用免费音乐库作为示例
  const songs = [
    {
      id: '1',
      title: query + ' - 示例歌曲 1',
      artist: '示例歌手',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
    },
    {
      id: '2',
      title: query + ' - 示例歌曲 2',
      artist: '示例歌手',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
    },
    {
      id: '3',
      title: query + ' - 示例歌曲 3',
      artist: '示例歌手',
      url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
    }
  ]

  return jsonResponse({ 
    code: 200, 
    data: songs,
    message: '由于音乐 API 不稳定，当前返回示例音乐。建议使用「添加音乐」功能上传本地音乐文件或输入音乐 URL。'
  })
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
