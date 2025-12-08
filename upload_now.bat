@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ====================================
echo 正在上传到 GitHub...
echo ====================================
echo.

echo [1] 添加所有文件...
git add -A
echo.

echo [2] 查看状态...
git status
echo.

echo [3] 提交更改...
git commit -m "修复所有自适应和居中问题 - CSS版本v10

✅ 修复缓存 - 所有CSS版本号更新到v10
✅ 居中代码 - phone.css + responsive.css
✅ 桌面端 - 375x667px 居中显示
✅ 手机端 - 自适应填充 比例375:667
✅ 其他 - 头像关联 + 设置页面全屏"
echo.

echo [4] 推送到 GitHub...
git push origin main
echo.

echo ====================================
if %errorlevel% equ 0 (
    echo ✅ 上传成功！
) else (
    echo ❌ 上传失败
)
echo ====================================
echo.

echo [5] 查看最近提交...
git log --oneline -3
echo.

pause
