# 網易雲音樂 API 部署指南

## 方法 1：一鍵部署到 Vercel（推薦）

### 步驟：

1. **訪問開源項目**
   ```
   https://github.com/Binaryify/NeteaseCloudMusicApi
   ```

2. **點擊 Deploy to Vercel 按鈕**
   - 在 README 頁面找到 "Deploy to Vercel" 按鈕
   - 點擊按鈕

3. **登入 Vercel**
   - 使用 GitHub 帳號登入
   - 授權 Vercel 訪問你的 GitHub

4. **部署**
   - 項目名稱：`netease-api`（或自定義）
   - 點擊 "Deploy"
   - 等待 1-2 分鐘

5. **獲取 API 網址**
   - 部署完成後會顯示網址，例如：
   ```
   https://netease-api.vercel.app
   ```

6. **更新 app.js**
   - 打開 `app.js`
   - 找到 `const apis = [` 這一行
   - 將第一個 API 的網址改為你的 Vercel 網址：
   ```javascript
   { name: '網易雲 API', url: `https://你的網址.vercel.app/search?keywords=${encodeURIComponent(query)}` }
   ```

## 方法 2：手動部署

### 前置條件：
- Node.js 已安裝
- Git 已安裝
- Vercel CLI 已安裝

### 步驟：

1. **克隆項目**
   ```bash
   git clone https://github.com/Binaryify/NeteaseCloudMusicApi.git
   cd NeteaseCloudMusicApi
   ```

2. **安裝依賴**
   ```bash
   npm install
   ```

3. **本地測試**
   ```bash
   npm start
   ```
   訪問 `http://localhost:3000` 測試

4. **部署到 Vercel**
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

5. **獲取生產環境網址**
   ```bash
   vercel --prod
   ```

## API 使用示例

### 搜索歌曲
```
GET https://你的網址.vercel.app/search?keywords=周杰倫
```

### 獲取歌曲 URL
```
GET https://你的網址.vercel.app/song/url?id=歌曲ID
```

### 獲取歌詞
```
GET https://你的網址.vercel.app/lyric?id=歌曲ID
```

## 注意事項

1. **免費額度**：Vercel 免費版有請求限制
2. **CORS**：API 已配置 CORS，可直接從瀏覽器調用
3. **速度**：首次請求可能較慢（冷啟動），後續請求會快很多
4. **備用 API**：app.js 中已配置 3 個備用 API，確保可用性

## 故障排除

### 問題：部署失敗
- 檢查 Vercel 帳號是否正常
- 重新嘗試部署

### 問題：API 無法訪問
- 檢查網址是否正確
- 嘗試訪問 `https://你的網址.vercel.app` 查看是否在線
- 使用備用 API

### 問題：搜索無結果
- 檢查關鍵詞是否正確
- 嘗試其他關鍵詞
- 查看瀏覽器控制台錯誤信息

## 相關鏈接

- 開源項目：https://github.com/Binaryify/NeteaseCloudMusicApi
- Vercel 官網：https://vercel.com
- API 文檔：https://binaryify.github.io/NeteaseCloudMusicApi
