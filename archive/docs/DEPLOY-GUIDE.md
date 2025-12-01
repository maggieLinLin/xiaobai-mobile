# 部署音樂 API 到 Vercel - 完整指南

## 方案優勢
✅ **完全免費** - Vercel 免費額度足夠使用
✅ **全球 CDN** - 自動分配最快節點
✅ **零配置** - 自動部署，無需服務器
✅ **HTTPS** - 自動 SSL 證書

## 快速部署步驟

### 1. 註冊 Vercel（1 分鐘）
訪問：https://vercel.com
- 點擊 "Sign Up"
- 使用 GitHub 賬號登錄（推薦）

### 2. 安裝 Vercel CLI（可選）
```bash
npm install -g vercel
```

### 3. 部署方式 A：使用 GitHub（推薦）

#### 3.1 推送代碼到 GitHub
```bash
cd C:\xiaobai-mobile
git add .
git commit -m "添加 Vercel 部署配置"
git push origin main
```

#### 3.2 在 Vercel 導入項目
1. 登錄 https://vercel.com/dashboard
2. 點擊 "Add New..." → "Project"
3. 選擇您的 GitHub 倉庫 `maggieLinLin/xiaobai-mobile`
4. 點擊 "Import"
5. 保持默認設置，點擊 "Deploy"
6. 等待 1-2 分鐘部署完成

#### 3.3 獲取 API 地址
部署完成後會顯示：
```
https://xiaobai-mobile.vercel.app
```

您的音樂 API 地址為：
```
https://xiaobai-mobile.vercel.app/api/search?q=周杰倫
```

### 4. 部署方式 B：使用 CLI
```bash
cd C:\xiaobai-mobile
vercel login
vercel --prod
```

## 更新 app.js 使用新 API

找到 `searchMusic` 函數，將 API 地址改為您的 Vercel 地址：

```javascript
// 在 app.js 中搜索 searchMusic 函數
// 將 API 地址改為：
const apiUrl = 'https://xiaobai-mobile.vercel.app/api/search';
const res = await fetch(`${apiUrl}?q=${encodeURIComponent(query)}`);
```

## 測試部署

### 瀏覽器測試
訪問：
```
https://xiaobai-mobile.vercel.app/api/search?q=周杰倫
```

應該返回：
```json
{
  "code": 200,
  "backend": "API-1",
  "data": [...]
}
```

### 在小白機中測試
1. 打開小白機
2. 點擊音樂搜索
3. 搜索任意歌曲
4. 應該能正常返回結果

## 自定義域名（可選）

### 1. 在 Vercel 添加域名
1. 進入項目設置
2. 點擊 "Domains"
3. 添加您的域名（如 `music.yourdomain.com`）

### 2. 配置 DNS
在您的域名服務商添加 CNAME 記錄：
```
music.yourdomain.com → cname.vercel-dns.com
```

### 3. 更新 app.js
```javascript
const apiUrl = 'https://music.yourdomain.com/api/search';
```

## 監控和日誌

### 查看使用情況
1. 登錄 Vercel Dashboard
2. 選擇項目
3. 點擊 "Analytics" 查看請求統計
4. 點擊 "Logs" 查看實時日誌

### 免費額度
- 每月 100GB 帶寬
- 每月 100 小時執行時間
- 無限請求次數
- 足夠個人和小團隊使用

## 故障排除

### API 返回 503
- 檢查後端 API 是否可用
- 查看 Vercel 日誌確認錯誤

### CORS 錯誤
- 已在代碼中配置 CORS
- 確認使用 HTTPS 訪問

### 部署失敗
- 檢查 `vercel.json` 格式
- 確認 `api/search.js` 文件存在

## 添加更多 API 後端

編輯 `api/search.js`，在 `backends` 數組添加：

```javascript
{
    name: 'API-3',
    url: `https://your-api.com/search?q=${encodeURIComponent(query)}`,
    parser: (data) => {
        // 解析邏輯
        return data.songs;
    }
}
```

保存後自動重新部署。

## 成本估算

**完全免費！**
- Vercel Hobby 計劃永久免費
- 無需信用卡
- 無隱藏費用

## 下一步

1. ✅ 部署到 Vercel
2. ✅ 更新 app.js 使用新 API
3. ✅ 推送到 GitHub
4. ✅ 分享給朋友使用

## 需要幫助？

- Vercel 文檔：https://vercel.com/docs
- GitHub Issues：在您的倉庫提問
