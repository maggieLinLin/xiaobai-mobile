@echo off
chcp 65001 >nul
echo =========================================
echo 正在提交到 GitHub...
echo =========================================
cd /d "c:\xiaobai-mobile"
echo.
echo [1/4] 检查 Git 状态...
git status
echo.
echo [2/4] 添加所有文件...
git add .
echo.
echo [3/4] 创建提交...
git commit -m "fix: 修复6个关键Bug - 屏幕适配、头像同步、时间同步、对话重复、API重试、UI同步"
echo.
echo [4/4] 推送到远程仓库...
git push origin main
echo.
echo =========================================
echo 完成！请刷新 GitHub 页面查看更新
echo =========================================
pause
