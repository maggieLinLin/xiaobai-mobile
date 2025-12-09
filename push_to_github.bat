@echo off
chcp 65001 >nul
echo ========================================
echo 正在上传到 GitHub...
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] 检查 Git 状态...
git status --short
echo.

echo [2/4] 添加所有更改的文件...
git add css/phone.css js/home.js js/app-complete.js css/home.css FINAL_UPDATE.md UPDATE_SUMMARY.md RESPONSIVE_FIX.md
if %errorlevel% neq 0 (
    echo 错误：添加文件失败
    pause
    exit /b 1
)
echo 文件已添加到暂存区
echo.

echo [3/4] 提交更改...
git commit -m "更新：缩短手机高度至667px，修改日历橘线逻辑显示选中日期"
if %errorlevel% neq 0 (
    echo 警告：提交可能失败或没有更改需要提交
)
echo.

echo [4/4] 推送到 GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo 推送失败！
    echo 可能的原因：
    echo 1. 需要身份验证（GitHub Personal Access Token）
    echo 2. 网络连接问题
    echo 3. 远程仓库权限问题
    echo ========================================
    pause
    exit /b 1
) else (
    echo.
    echo ========================================
    echo 推送成功！
    echo ========================================
)

echo.
echo 完成！按任意键退出...
pause >nul

