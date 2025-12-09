# GitHub 上传指南

## 当前需要上传的更改

以下文件已被修改，需要提交到 GitHub：

1. ✅ `css/phone.css` - 手机高度改为 667px
2. ✅ `js/home.js` - 日历橘线逻辑改为显示选中日期
3. ✅ `js/app-complete.js` - 同步日历橘线逻辑
4. ✅ `css/home.css` - CSS 类名更新
5. ✅ `FINAL_UPDATE.md` - 更新文档
6. ✅ `UPDATE_SUMMARY.md` - 更新文档
7. ✅ `RESPONSIVE_FIX.md` - 更新文档

## 手动上传步骤

### 方法1：使用命令行（推荐）

1. **打开 PowerShell 或 CMD**
   - 按 `Win + R`
   - 输入 `powershell` 或 `cmd`
   - 按 Enter

2. **切换到项目目录**
   ```powershell
   cd C:\xiaobai-mobile
   ```

3. **检查当前状态**
   ```powershell
   git status
   ```

4. **添加所有更改的文件**
   ```powershell
   git add css/phone.css js/home.js js/app-complete.js css/home.css FINAL_UPDATE.md UPDATE_SUMMARY.md RESPONSIVE_FIX.md
   ```
   或者添加所有更改：
   ```powershell
   git add -A
   ```

5. **提交更改**
   ```powershell
   git commit -m "更新：缩短手机高度至667px，修改日历橘线逻辑显示选中日期"
   ```

6. **推送到 GitHub**
   ```powershell
   git push origin main
   ```

### 方法2：使用批处理文件

1. **双击运行**
   - `push_to_github.bat` (Windows 批处理文件)
   - 或 `push_to_github.ps1` (PowerShell 脚本)

### 方法3：使用 GitHub Desktop（如果有安装）

1. 打开 GitHub Desktop
2. 选择 `xiaobai-mobile` 仓库
3. 查看更改的文件
4. 填写提交信息：`更新：缩短手机高度至667px，修改日历橘线逻辑显示选中日期`
5. 点击 "Commit to main"
6. 点击 "Push origin"

## 如果推送失败

### 问题1：需要身份验证

GitHub 现在要求使用 Personal Access Token 而不是密码。

**解决方法：**

1. **创建 Personal Access Token**
   - 访问：https://github.com/settings/tokens
   - 点击 "Generate new token" → "Generate new token (classic)"
   - 选择权限：至少勾选 `repo`
   - 生成并复制 token

2. **使用 Token 推送**
   ```powershell
   git push origin main
   ```
   当提示输入密码时，输入您的 Personal Access Token

3. **或者配置 Git Credential Manager**
   ```powershell
   git config --global credential.helper manager-core
   ```

### 问题2：网络连接问题

- 检查网络连接
- 尝试使用 VPN（如果在某些地区）
- 检查防火墙设置

### 问题3：权限问题

- 确认您有该仓库的写入权限
- 检查远程仓库地址是否正确：
  ```powershell
  git remote -v
  ```
  应该显示：`https://github.com/maggieLinLin/xiaobai-mobile.git`

## 验证上传成功

推送成功后，访问以下链接查看：
https://github.com/maggieLinLin/xiaobai-mobile

检查最新的提交是否包含您的更改。

## 快速命令（复制粘贴）

```powershell
cd C:\xiaobai-mobile
git add -A
git commit -m "更新：缩短手机高度至667px，修改日历橘线逻辑显示选中日期"
git push origin main
```

## 需要帮助？

如果遇到问题，请检查：
1. Git 是否正确安装：`git --version`
2. 是否在正确的目录：`pwd` (PowerShell) 或 `cd` (CMD)
3. 远程仓库配置：`git remote -v`
4. 当前分支：`git branch`

