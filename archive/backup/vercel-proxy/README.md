# Vercel 音乐 API 代理

多后端竞速代理，自动选择最快的响应。

## 部署步骤

### 1. 上传到 GitHub

```bash
cd vercel-proxy
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/maggieLinLin/vercel-music-proxy.git
git push -u origin main
```

### 2. 部署到 Vercel

1. 访问 https://vercel.com/new
2. Import 你的 GitHub 仓库
3. 添加环境变量：
   ```
   UPSTREAMS=https://neteasecloudmusicapi-idy4.onrender.com
   ```
4. Deploy

### 3. 测试

```
https://你的域名.vercel.app/api/search?keywords=周杰伦
```

## 环境变量

- `UPSTREAMS`: 后端 API 地址，多个用逗号分隔
  ```
  UPSTREAMS=https://api1.com,https://api2.com,https://api3.com
  ```

## 使用

所有请求转发到 `/api/*`：

```
/api/search?keywords=周杰伦
→ https://你的后端/search?keywords=周杰伦

/api/song/url?id=123
→ https://你的后端/song/url?id=123
```

## 限制

- 最大响应体积：5MB
- 超时时间：3.5秒
- 适合：搜索、metadata
- 不适合：大文件、音频流
