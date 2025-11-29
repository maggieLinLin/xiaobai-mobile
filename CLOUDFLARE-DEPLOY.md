# Cloudflare Workers 部署指南

## 方法 1：網頁部署（最簡單）

### 步驟：
1. 訪問 https://workers.cloudflare.com/
2. 註冊/登錄 Cloudflare 帳號（免費）
3. 點擊「Create a Service」
4. 輸入服務名稱（例如：music-api）
5. 點擊「Create Service」
6. 點擊「Quick Edit」
7. 刪除所有代碼，複製 `cloudflare-worker.js` 的內容粘貼進去
8. 點擊「Save and Deploy」
9. 複製你的 Worker URL（格式：https://music-api.你的用戶名.workers.dev）

### 使用：
將 app.js 中的 API URL 替換為你的 Worker URL：
```javascript
const apis = [
    { name: 'Cloudflare Worker', url: `https://music-api.你的用戶名.workers.dev?q=${encodeURIComponent(query)}` }
];
```

---

## 方法 2：使用公共 API（無需部署）

直接使用以下免費 API：

### 選項 A - 網易雲音樂公共 API
```javascript
const apis = [
    { 
        name: 'Netease API', 
        url: `https://netease-cloud-music-api-rouge-six.vercel.app/search?keywords=${encodeURIComponent(query)}&limit=10`,
        parser: (data) => {
            if (data.result && data.result.songs) {
                return data.result.songs.map(song => ({
                    id: song.id,
                    title: song.name,
                    artist: song.artists.map(a => a.name).join('/'),
                    url: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`
                }));
            }
            return [];
        }
    }
];
```

### 選項 B - QQ 音樂 API
```javascript
const apis = [
    { 
        name: 'QQ Music API', 
        url: `https://api.qq.jsososo.com/search?key=${encodeURIComponent(query)}&pageSize=10`,
        parser: (data) => {
            if (data.data && data.data.list) {
                return data.data.list.map(song => ({
                    id: song.songmid,
                    title: song.songname,
                    artist: song.singer.map(s => s.name).join('/'),
                    url: `https://api.qq.jsososo.com/song/url?id=${song.songmid}`
                }));
            }
            return [];
        }
    }
];
```

---

## 推薦方案

**最簡單**：直接使用方法 2 的公共 API（無需部署）
**最穩定**：部署 Cloudflare Worker（免費且快速）

---

## 免費額度
- Cloudflare Workers：每天 100,000 次請求（免費）
- 無需信用卡
- 全球 CDN 加速
