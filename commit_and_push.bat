@echo off
chcp 65001 >nul
echo =========================================
echo 正在提交到 GitHub...
echo =========================================
cd /d "c:\xiaobai-mobile"
echo.
echo [1/5] 检查 Git 状态...
git status
echo.
echo [2/5] 添加所有文件...
git add .
echo.
echo [3/5] 创建提交...
git commit -m "fix: 投影仪模式屏幕适配 + 6个关键Bug修复

- 投影仪模式：固定375x812尺寸，CSS Transform整体缩放，彻底解决滚动条问题
- Bug 1: 屏幕适配修复（自动缩放，无滚动条）
- Bug 2: 头像同步修复（实时更新聊天室）
- Bug 3: 时间同步修复（Prompt注入现实时间）
- Bug 4: 对话重复修复（模式切换检测）
- Bug 5: API错误修复（重试机制，最多3次）
- Bug 6: UI同步修复（DOM元素完整填充）

修改文件：
- css/base.css: overflow:hidden + Flex居中
- css/phone.css: 固定尺寸 + visibility:hidden
- js/main.js: fitScreen()数学缩放函数
- js/linee.js: 头像同步、API重试、UI同步
- js/ai-core.js: 时间同步、防重复对话"
echo.
echo [4/5] 推送到远程仓库...
git push origin main
echo.
echo [5/5] 完成！
echo =========================================
echo 请访问: https://github.com/maggieLinLin/xiaobai-mobile
echo 刷新页面查看更新
echo =========================================
pause
