# 音乐 API 部署教程

## 方案选择

### 🆓 免费方案(推荐)

#### 1. Render.com (最简单)
- ✅ 完全免费
- ✅ 不需要信用卡
- ✅ 自动 HTTPS
- ❌ 15分钟无请求会休眠

#### 2. Railway.app
- ✅ 每月 $5 免费额度
- ✅ 不休眠
- ❌ 需要信用卡验证

#### 3. Vercel
- ✅ 完全免费
- ✅ 全球 CDN
- ❌ 有时会被墙

---

## 📋 Render.com 部署步骤

### 1. Fork 项目
1. 访问: https://github.com/Binaryify/NeteaseCloudMusicApi
2. 点击 **Fork**

### 2. 注册 Render
1. 访问: https://render.com
2. 用 GitHub 登录

### 3. 创建服务
1. 点击 **New +** → **Web Service**
2. 选择 `NeteaseCloudMusicApi` 仓库
3. 配置:
   ```
   Name: netease-music-api
   Region: Singapore
   Branch: master
   Build Command: npm install
   Start Command: node app.js
   Instance Type: Free
   ```
4. 点击 **Create Web Service**

### 4. 等待部署
- 需要 5-10 分钟
- 完成后获得网址: `https://xxx.onrender.com`

### 5. 测试
```
https://你的网址.onrender.com/search?keywords=周杰伦&limit=10
```

---

## 🔧 更新 Cloudflare Worker

部署成功后,更新 Worker 代码:

```javascript
const apis = [
  {
    name: 'My-Render-API',
    url: `https://你的网址.onrender.com/search?keywords=${encodeURIComponent(query)}&limit=10`,
    parse: (data) => {
      if (data.result?.songs) {
        return data.result.songs.map(song => ({
          id: song.id,
          title: song.name,
          artist: song.artists?.map(a => a.name).join('/') || '未知',
          url: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3`
        }))
      }
      return null
    }
  }
]
```

---

## ⚠️ 注意事项

1. **Render 免费版会休眠**
   - 15分钟无请求会休眠
   - 第一次请求需要等待 30 秒唤醒
   - 解决方法: 使用 UptimeRobot 定时 ping

2. **版权问题**
   - 仅供个人学习使用
   - 不要商业化或大规模使用

3. **API 限制**
   - 网易云可能会限制 IP
   - 建议配置多个备用 API

---

## 🎯 下一步

部署成功后:
1. 把 Render 网址告诉我
2. 我帮你更新 Cloudflare Worker
3. 测试小白机音乐搜索功能

---

## 💡 其他方案

### Railway.app 部署
```bash
# 需要 Railway CLI
npm i -g @railway/cli
railway login
railway init
railway up
```

### Vercel 部署
```bash
# 需要 Vercel CLI
npm i -g vercel
vercel login
vercel
```

---

## 📞 需要帮助?

遇到问题请提供:
1. 部署平台(Render/Railway/Vercel)
2. 错误截图或日志
3. 你的网址
