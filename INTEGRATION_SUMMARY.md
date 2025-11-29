# 🎵 小白手機音樂播放器 - 反代 API 集成完成

## 整合總結

已成功將 Meting API 反代地址 `https://meting-api-alpha-gilt.vercel.app` 集成到你的音樂搜索應用中。

---

## 🎯 主要改進

### 1️⃣ 搜索功能優化
- **新增**：優先使用 Meting API 反代進行歌曲搜索
- **改進**：支持多個搜索源自動備用
- **優化**：8 秒超時機制，防止請求掛起
- **體驗**：顯示使用的 API 數據來源

**涉及文件**：`app.js` 中的 `searchMusic()` 函數

### 2️⃣ 播放功能改進
- **新增**：通過歌曲 ID 自動獲取播放 URL
- **優化**：修復之前的 URL typo（`ttps://` → `https://`）
- **備用**：智能API備用機制

**涉及文件**：`app.js` 中的 `playSong()` 函數

### 3️⃣ API 配置
反代 API 調用順序：
```
1. Meting API 反代（推薦）
   └─ https://meting-api-alpha-gilt.vercel.app/search?q={query}

2. Meting API 反代 - NetEase 源（備選1）
   └─ https://meting-api-alpha-gilt.vercel.app/search?q={query}&source=netease

3. Cloudflare Worker（備選2）
   └─ https://musiclin.onrender.com/?q={query}
```

---

## 📁 新增文件

### 1. `API_PROXY_README.md`
詳細的 API 配置和使用文檔

### 2. `api-proxy-test.html`
反代 API 測試頁面
- 可直接測試搜索功能
- 查看 API 響應
- 驗證連接狀態

---

## 🚀 快速開始

### 方式 1：使用主應用搜索
1. 打開 `index.html`
2. 點擊音樂播放器上的 🔍 按鈕
3. 輸入歌曲名或歌手名
4. 點擊「搜索」
5. 系統自動使用反代 API 搜索

### 方式 2：測試反代 API
1. 打開 `api-proxy-test.html`
2. 在搜索框輸入關鍵詞
3. 點擊搜索測試
4. 查看搜索結果和 API 信息

---

## 📊 技術細節

### 搜索 API 端點
```
GET https://meting-api-alpha-gilt.vercel.app/search?q={query}
```

**返回格式**：
```json
[
  {
    "id": "歌曲ID",
    "name": "歌曲名稱",
    "artist": "藝術家名",
    "artists": [{"name": "藝術家"}],
    "url": "播放URL",
    "mp3Url": "MP3 URL",
    "pic": "封面圖片",
    "cover": "備用封面"
  }
]
```

### URL 獲取 API 端點
```
GET https://meting-api-alpha-gilt.vercel.app/url?id={songId}
```

---

## ⚙️ 配置修改

### 自定義搜索 API
編輯 `app.js` 中 `searchMusic()` 函數內的 `apis` 數組：

```javascript
const apis = [
    { 
        name: '自定義 API',
        url: `https://your-api.com/search?q=${encodeURIComponent(query)}`,
        parse: (data) => {
            // 自定義解析邏輯
            return data.map(song => ({
                title: song.name,
                artist: song.artist,
                url: song.url,
                id: song.id,
                pic: song.pic
            }));
        }
    }
];
```

### 修改超時時間
在 `playSong()` 函數中查找：
```javascript
const timeoutId = setTimeout(() => controller.abort(), 8000); // 單位：毫秒
```

---

## 🔍 調試信息

### 查看搜索日誌
在瀏覽器開發者工具（F12）的 Console 中查看：

```
嘗試 Meting API 反代（推薦）: https://meting-api-alpha-gilt.vercel.app/search?q=周杰伦
✅ 成功使用 Meting API 反代（推薦），找到 30 首歌曲
```

### API 響應檢查
1. 打開 `api-proxy-test.html`
2. F12 開發者工具
3. 查看 Network 標籤中的請求
4. 檢查 Response 中的 JSON 數據

---

## 🐛 故障排除

### 問題：搜索無結果
**解決方案**：
1. 檢查網絡連接
2. 打開 `api-proxy-test.html` 測試反代 API
3. 嘗試不同的搜索關鍵詞
4. 查看瀏覽器 Console 中的錯誤信息

### 問題：無法播放
**解決方案**：
1. 確認搜索結果中有有效的播放 URL
2. 檢查音樂格式是否支持
3. 檢查瀏覽器 Console 中的錯誤

### 問題：API 超時
**解決方案**：
1. 修改超時時間（8000 毫秒可改為更大值）
2. 檢查網絡連接速度
3. 嘗試使用備用 API

---

## 📝 修改記錄

| 日期 | 改動 | 文件 |
|------|------|------|
| 2025-11-29 | 集成 Meting API 反代 | app.js |
| 2025-11-29 | 添加超時機制和備用 API | app.js |
| 2025-11-29 | 修復 URL typo | app.js |
| 2025-11-29 | 創建 API 測試頁面 | api-proxy-test.html |
| 2025-11-29 | 創建配置文檔 | API_PROXY_README.md |

---

## 📚 相關資源

### 主要文件
- `index.html` - 主應用頁面
- `app.js` - 應用邏輯（包含搜索和播放）
- `css/apps.css` - 搜索結果樣式

### 文檔
- `API_PROXY_README.md` - 詳細 API 配置
- `api-proxy-test.html` - API 測試工具

### 反代服務
- 主服務：`https://meting-api-alpha-gilt.vercel.app`
- 備用服務：`https://musiclin.onrender.com`

---

## ✅ 驗證清單

- [x] 集成 Meting API 反代地址
- [x] 優化搜索函數
- [x] 添加超時保護
- [x] 實現備用機制
- [x] 修復 URL 錯誤
- [x] 添加數據源顯示
- [x] 創建測試頁面
- [x] 編寫使用文檔

---

## 💡 提示

1. **最佳實踐**：始終保留備用 API，以提高可靠性
2. **性能優化**：超時設置不宜過短，建議 5000-10000 毫秒
3. **用戶體驗**：顯示 API 來源讓用戶了解數據來自哪裡
4. **定期測試**：使用 `api-proxy-test.html` 定期檢查 API 狀態

---

**完成日期**：2025 年 11 月 29 日  
**集成版本**：1.0  
**反代 API**：meting-api-alpha-gilt.vercel.app
