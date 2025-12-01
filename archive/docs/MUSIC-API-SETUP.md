# 小白機音樂 API 競速代理 - 使用說明

## 方案概述

這個競速代理服務會**並行請求多個音樂 API**，並返回**最快成功**的結果，大幅提升搜索速度和成功率。

## 快速開始

### 1. 安裝依賴

```bash
cd C:\xiaobai-mobile
npm install
```

### 2. 啟動代理服務

```bash
npm start
```

或使用自動重啟（開發模式）：
```bash
npm run dev
```

### 3. 測試服務

在瀏覽器訪問：
```
http://localhost:4000/search?q=周杰倫
```

### 4. 修改小白機配置

將 `app.js` 中的音樂搜索 API 改為本地代理：

```javascript
// 原來的代碼（第 1100 行左右）
const res = await fetch(`https://web-production-b3dd5.up.railway.app/music?q=${encodeURIComponent(query)}`);

// 改為
const res = await fetch(`http://localhost:4000/search?q=${encodeURIComponent(query)}`);
```

## 配置的 API 後端

1. **API-1**: Railway 部署的音樂 API
2. **API-2**: Meting API (網易雲音樂)
3. **API-3**: Cyril Studio 音樂 API

## 工作原理

1. 收到搜索請求後，**同時向所有後端發起請求**
2. 使用 `Promise.any()` 返回**第一個成功**的結果
3. 自動取消其他未完成的請求
4. 記錄每個 API 的響應時間和成功率

## 優勢

- ✅ **速度快**：並行請求，返回最快結果
- ✅ **穩定性高**：一個 API 失敗不影響整體
- ✅ **易擴展**：輕鬆添加更多 API 後端
- ✅ **本地運行**：無需部署到服務器

## 添加更多 API

編輯 `music-proxy-server.js`，在 `BACKENDS` 數組中添加：

```javascript
{
    name: 'API-4',
    search: (query) => `https://your-api.com/search?q=${encodeURIComponent(query)}`,
    parser: (data) => {
        // 解析 API 返回的數據格式
        return data.songs.map(s => ({
            id: s.id,
            title: s.name,
            artist: s.artist,
            url: s.playUrl
        }));
    }
}
```

## 部署到服務器（可選）

### 使用 PM2 保持運行

```bash
npm install -g pm2
pm2 start music-proxy-server.js --name music-proxy
pm2 save
pm2 startup
```

### 使用 Docker

創建 `Dockerfile`：
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY music-proxy-server.js ./
EXPOSE 4000
CMD ["node", "music-proxy-server.js"]
```

構建並運行：
```bash
docker build -t music-proxy .
docker run -d -p 4000:4000 music-proxy
```

## 監控和日誌

服務會在控制台輸出：
- ✓ 成功的 API 和響應時間
- ✗ 失敗的 API 和錯誤原因
- 🔍 每次搜索的關鍵詞

## 故障排除

### 所有 API 都失敗
- 檢查網絡連接
- 確認 API 地址是否可訪問
- 查看控制台錯誤信息

### 端口被占用
修改 `music-proxy-server.js` 中的 `PORT` 變量

### CORS 錯誤
服務已配置 CORS，如仍有問題，檢查瀏覽器控制台

## 性能優化建議

1. **添加 Redis 緩存**：緩存熱門搜索結果
2. **使用 CDN**：加速音頻文件訪問
3. **負載均衡**：運行多個代理實例
4. **健康檢查**：定期檢測 API 可用性

## 注意事項

⚠️ 此服務僅供個人學習和研究使用
⚠️ 請遵守各音樂平台的服務條款
⚠️ 商業使用前請獲得相應授權
