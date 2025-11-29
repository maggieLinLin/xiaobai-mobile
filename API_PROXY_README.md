# 音樂搜索反代 API 配置說明

## 概述
已成功集成 Meting API 反代地址到音樂搜索功能中。反代服務地址為：`https://meting-api-alpha-gilt.vercel.app`

## 功能更新

### 1. 歌曲搜索功能
**文件**: `app.js` - `searchMusic()` 函數

#### 特性
- ✅ 優先使用 Meting API 反代進行歌曲搜索
- ✅ 支持多個搜索源（默認搜索 + NetEase 源）
- ✅ 智能備用機制：如果主 API 失敗，自動嘗試 Cloudflare Worker
- ✅ 8 秒超時保護，防止請求掛起
- ✅ 顯示搜索結果來源信息

#### API 調用順序
1. **Meting API 反代**（推薦）
   - 端點: `https://meting-api-alpha-gilt.vercel.app/search?q={query}`
   - 優點：穩定性高，返回結果豐富

2. **Meting API 反代 - NetEase 源**
   - 端點: `https://meting-api-alpha-gilt.vercel.app/search?q={query}&source=netease`
   - 優點：針對網易音樂源的優化搜索

3. **Cloudflare Worker 備用**（備選）
   - 端點: `https://musiclin.onrender.com/?q={query}`
   - 用途：主 API 失敗時自動回退

### 2. 歌曲播放功能
**文件**: `app.js` - `playSong()` 函數

#### 特性
- ✅ 優先使用 Meting API 反代獲取播放 URL
- ✅ 支持使用歌曲 ID 自動獲取播放鏈接
- ✅ 備用機制：Cloudflare Worker 作為備選方案

#### URL 獲取邏輯
```
如果有直接 URL → 直接播放
如果只有 ID 但無 URL:
  1. 嘗試 Meting API 反代: /url?id={id}
  2. 如果失敗 → 嘗試 Cloudflare Worker
  3. 成功獲取 URL → 播放
```

## 使用方式

### 搜索音樂
1. 點擊音樂播放器上的 🔍 搜索按鈕
2. 在搜索框輸入歌曲名稱或歌手名
3. 點擊「搜索」按鈕
4. 系統將自動嘗試反代 API
5. 選擇搜索結果進行播放

### 查看日誌
在瀏覽器開發者工具的 Console 中可以查看：
- 正在嘗試的 API 源
- 搜索成功/失敗信息
- 使用的數據來源

## 配置

### 反代 API 地址
主反代地址：`https://meting-api-alpha-gilt.vercel.app`

### 修改搜索 API（進階）
在 `app.js` 的 `searchMusic()` 函數中修改 `apis` 數組：

```javascript
const apis = [
    { 
        name: '自定義 API 名稱',
        url: `https://your-api-endpoint.com/search?q=${encodeURIComponent(query)}`,
        parse: (data) => {
            // 自定義解析邏輯
            return [];
        }
    },
    // ... 其他 API
];
```

## 故障排除

### 搜索無結果
1. 檢查網絡連接
2. 嘗試不同的搜索關鍵詞
3. 使用「添加音樂」功能上傳本地文件
4. 手動輸入完整的音樂 URL

### 無法播放
1. 確認搜索結果中有有效的播放 URL
2. 檢查音樂文件格式是否支持（MP3, WAV 等）
3. 查看瀏覽器控制台中的錯誤信息

## 性能優化
- 搜索超時設置：8 秒
- 自動重試機制：支持多個 API 來源
- 結果缓存：瀏覽器自動緩存搜索結果

## 相關文件
- `app.js` - 主要應用邏輯
- `index.html` - HTML 結構和搜索模態框
- `css/apps.css` - 搜索結果樣式

## 更新日誌
- ✅ 2025-11-29：集成 Meting API 反代地址
- ✅ 優化搜索函數和播放 URL 獲取邏輯
- ✅ 添加數據來源顯示
- ✅ 改進錯誤處理和用戶提示
