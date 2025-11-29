# 開源音樂 API 項目推薦

## 🔥 推薦項目（按推薦度排序）

### 1. ⭐ Meting API（最簡單）
**GitHub**: https://github.com/metowolf/Meting  
**特點**: 支持網易雲、QQ音樂、酷狗等多平台，PHP 項目  
**部署難度**: ⭐ 極簡單

#### Vercel 一鍵部署（推薦）
1. Fork 倉庫：https://github.com/xizeyoupan/Meting-API
2. 訪問 https://vercel.com/new
3. 導入你 Fork 的倉庫
4. 點擊 Deploy
5. 獲得 URL：`https://你的項目名.vercel.app`

**使用方式**:
```
https://你的域名.vercel.app/api?server=netease&type=search&id=周杰倫
```

---

### 2. ⭐⭐⭐ NeteaseCloudMusicApi（最強大）
**GitHub**: https://github.com/Binaryify/NeteaseCloudMusicApi  
**特點**: 網易雲音樂完整 API，Node.js 項目，功能最全  
**部署難度**: ⭐⭐ 簡單

#### Vercel 部署
1. Fork 倉庫：https://github.com/Binaryify/NeteaseCloudMusicApi
2. 訪問 https://vercel.com/new
3. 導入倉庫
4. 點擊 Deploy
5. 獲得 URL：`https://你的項目名.vercel.app`

**使用方式**:
```
https://你的域名.vercel.app/search?keywords=周杰倫&limit=10
```

---

### 3. ⭐⭐ QQ 音樂 API
**GitHub**: https://github.com/jsososo/QQMusicApi  
**特點**: QQ 音樂 API，Node.js 項目  
**部署難度**: ⭐⭐ 簡單

#### Vercel 部署
1. Fork 倉庫：https://github.com/jsososo/QQMusicApi
2. 訪問 https://vercel.com/new
3. 導入倉庫
4. 點擊 Deploy

---

## 🚀 最快部署方案（推薦）

### 方案 A：使用 Vercel 部署 Meting API

1. **訪問**: https://github.com/xizeyoupan/Meting-API
2. **點擊**: 右上角 "Fork" 按鈕
3. **訪問**: https://vercel.com/new
4. **登錄**: 使用 GitHub 帳號登錄
5. **導入**: 選擇你剛 Fork 的 Meting-API 倉庫
6. **部署**: 點擊 "Deploy" 按鈕
7. **等待**: 1-2 分鐘部署完成
8. **獲取**: 你的 API 地址（例如：`https://meting-api-xxx.vercel.app`）

### 方案 B：使用 Railway 部署 NeteaseCloudMusicApi

1. **訪問**: https://railway.app/
2. **登錄**: 使用 GitHub 帳號
3. **新建項目**: New Project → Deploy from GitHub repo
4. **選擇**: Binaryify/NeteaseCloudMusicApi
5. **部署**: 自動部署
6. **獲取**: 你的 API 地址

---

## 📝 部署後如何使用

### 測試 API 是否工作
在瀏覽器訪問：
```
https://你的域名.vercel.app/search?keywords=周杰倫
```

如果返回 JSON 數據，說明成功！

### 更新 app.js
部署成功後，告訴我你的 API 地址，我會幫你更新代碼。

---

## 🎯 推薦組合策略

**最佳方案**: 部署 2-3 個不同的 API，實現競速和備用

1. **主 API**: Vercel 部署 NeteaseCloudMusicApi
2. **備用 API 1**: Vercel 部署 Meting API  
3. **備用 API 2**: Railway 部署 NeteaseCloudMusicApi

這樣即使一個掛了，其他的還能用！

---

## ⚡ 快速開始（5分鐘）

### 最簡單的方法：
1. 訪問 https://vercel.com/new
2. 用 GitHub 登錄
3. 點擊 "Add New..." → "Project"
4. 搜索 "NeteaseCloudMusicApi"
5. 選擇 Binaryify/NeteaseCloudMusicApi
6. 點擊 "Deploy"
7. 等待部署完成
8. 複製你的 URL 告訴我

我會立即幫你更新代碼！
