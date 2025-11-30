// meting-api.js - Meting API 封装（非破坏性）
// 支持多个 API 端点的自动切换和错误处理

(function(){

  // API 配置（可通过 localStorage 自定义）
  const DEFAULT_APIS = [
    'https://meting-api-alpha-gilt.vercel.app/api',
    'https://api.injahow.cn/meting',
    'https://api.example.com/meting' // 备用端点
  ];

  const API_TIMEOUT = 8000; // 8秒超时

  // 从 localStorage 读取自定义 API 配置
  function getApiEndpoints(){
    try{
      const custom = localStorage.getItem('meting_api_endpoints');
      if(custom){
        const parsed = JSON.parse(custom);
        return Array.isArray(parsed) ? parsed : DEFAULT_APIS;
      }
    }catch(e){}
    return DEFAULT_APIS;
  }

  // 保存 API 配置（非破坏性：先备份）
  function saveApiEndpoints(endpoints){
    try{
      const old = localStorage.getItem('meting_api_endpoints');
      if(old) localStorage.setItem(`backup:meting_api_endpoints:${Date.now()}`, old);
      localStorage.setItem('meting_api_endpoints', JSON.stringify(endpoints));
      return true;
    }catch(e){
      console.error('保存 API 配置失败:', e);
      return false;
    }
  }

  // 带超时的 fetch
  function fetchWithTimeout(url, timeout = API_TIMEOUT){
    return Promise.race([
      fetch(url),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('请求超时')), timeout)
      )
    ]);
  }

  // 尝试多个 API 端点（竞速模式）
  async function tryMultipleApis(endpoints, buildUrl){
    const promises = endpoints.map(async (baseUrl) => {
      try{
        const url = buildUrl(baseUrl);
        console.log(`🔍 尝试 API: ${url}`);
        const res = await fetchWithTimeout(url);
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return { success: true, data, baseUrl };
      }catch(e){
        console.warn(`❌ API 失败 (${baseUrl}):`, e.message);
        return { success: false, error: e.message, baseUrl };
      }
    });

    // 竞速：返回第一个成功的结果
    return Promise.race(
      promises.map(p => p.then(result => {
        if(result.success) return result;
        throw result;
      }))
    ).catch(async () => {
      // 如果竞速失败，等待所有请求完成并返回详细错误
      const results = await Promise.all(promises);
      throw new Error('所有 API 端点均失败: ' + JSON.stringify(results.map(r => ({
        api: r.baseUrl,
        error: r.error
      }))));
    });
  }

  function normalizeSongList(raw){
    if(Array.isArray(raw)) return raw;
    if(raw && Array.isArray(raw.data)) return raw.data;
    if(raw && raw.data && Array.isArray(raw.data.data)) return raw.data.data;
    if(raw && Array.isArray(raw.result)) return raw.result;
    return [];
  }

  // 搜索歌曲
  async function searchMusic(keyword, server = 'netease'){
    if(!keyword || typeof keyword !== 'string'){
      throw new Error('搜索关键词无效');
    }

    const endpoints = getApiEndpoints();
    const result = await tryMultipleApis(endpoints, (baseUrl) => {
      const params = new URLSearchParams({
        server,
        type: 'search',
        s: keyword.trim()
      });
      return `${baseUrl}?${params}`;
    });

    console.log(`✅ 搜索成功 (API: ${result.baseUrl}):`, result.data);
    
    const songs = normalizeSongList(result.data);
    if(songs.length === 0){
      throw new Error('API 返回空结果或格式不兼容');
    }

    return songs.map(song => ({
      id: song.id,
      title: song.name || song.title || '未知歌曲',
      artist: song.artist || song.author || '未知歌手',
      album: song.album || '',
      pic: song.pic || song.cover || '',
      url: song.url || '',
      lrc: song.lrc || song.lyric || '',
      source: server,
      api: result.baseUrl
    }));
  }

  // 获取歌曲播放地址
  async function getSongUrl(songId, server = 'netease'){
    if(!songId){
      throw new Error('歌曲 ID 无效');
    }

    const endpoints = getApiEndpoints();
    const result = await tryMultipleApis(endpoints, (baseUrl) => {
      const params = new URLSearchParams({
        server,
        type: 'url',
        id: String(songId)
      });
      return `${baseUrl}?${params}`;
    });

    console.log(`✅ 获取播放地址成功:`, result.data);

    // 返回格式可能是 {url: "..."} 或 直接字符串
    if(typeof result.data === 'string') return result.data;
    if(result.data && result.data.url) return result.data.url;
    
    throw new Error('无法解析播放地址');
  }

  // 获取歌词
  async function getLyric(songId, server = 'netease'){
    if(!songId){
      throw new Error('歌曲 ID 无效');
    }

    const endpoints = getApiEndpoints();
    const result = await tryMultipleApis(endpoints, (baseUrl) => {
      const params = new URLSearchParams({
        server,
        type: 'lyric',
        id: String(songId)
      });
      return `${baseUrl}?${params}`;
    });

    console.log(`✅ 获取歌词成功`);

    // 返回格式可能是字符串或 {lyric: "..."}
    if(typeof result.data === 'string') return result.data;
    if(result.data && result.data.lyric) return result.data.lyric;
    if(result.data && result.data.lrc) return result.data.lrc;

    return '暂无歌词';
  }

  // 获取歌曲详情（综合信息）
  async function getSongDetail(songId, server = 'netease'){
    if(!songId){
      throw new Error('歌曲 ID 无效');
    }

    const endpoints = getApiEndpoints();
    const result = await tryMultipleApis(endpoints, (baseUrl) => {
      const params = new URLSearchParams({
        server,
        type: 'song',
        id: String(songId)
      });
      return `${baseUrl}?${params}`;
    });

    console.log(`✅ 获取歌曲详情成功:`, result.data);
    
    return result.data;
  }

  // Toast 通知
  function showToast(msg, duration = 2000){
    let t = document.getElementById('global-toast');
    if(!t){
      t = document.createElement('div');
      t.id = 'global-toast';
      // 🔝 修改为顶部显示
      t.style = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:10px 16px;border-radius:8px;z-index:10000;transition:opacity .3s,transform .3s;box-shadow:0 2px 12px rgba(0,0,0,0.3);font-size:14px;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = 1;
    t.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(()=> {
      t.style.opacity = 0;
      t.style.transform = 'translateX(-50%) translateY(-10px)';
    }, duration);
  }

  // 搜索并播放第一首歌（快捷方法）
  async function searchAndPlay(keyword, server = 'netease'){
    try{
      showToast('🔍 搜索中...');
      const results = await searchMusic(keyword, server);
      
      if(results.length === 0){
        showToast('❌ 没有找到相关歌曲');
        return null;
      }

      const firstSong = results[0];
      showToast(`🎵 播放: ${firstSong.title} - ${firstSong.artist}`);

      // 如果搜索结果中没有直接的播放地址，需要再获取
      let playUrl = firstSong.url;
      if(!playUrl || playUrl === ''){
        showToast('📡 获取播放地址...');
        playUrl = await getSongUrl(firstSong.id, server);
      }

      // 调用音乐播放器
      if(window.__music_loadAndPlay){
        window.__music_loadAndPlay(playUrl);
      }

      return { song: firstSong, url: playUrl, results };

    }catch(e){
      console.error('搜索播放失败:', e);
      showToast(`❌ ${e.message}`);
      throw e;
    }
  }

  // 暴露全局 API
  window.__meting = {
    // 核心方法
    search: searchMusic,
    getSongUrl,
    getLyric,
    getSongDetail,
    searchAndPlay,

    // 配置管理
    getApiEndpoints,
    saveApiEndpoints,
    
    // 工具方法
    showToast,

    // 版本信息
    version: '1.0.0',
    author: 'Meting API Wrapper'
  };

  console.log('meting-api.js loaded - API endpoints:', getApiEndpoints());

})();

