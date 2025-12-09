@echo off
chcp 65001 >nul
echo ====================================
echo 上传所有修改到 GitHub
echo ====================================
echo.

cd /d "%~dp0"

echo [1/5] 检查当前状态...
git status
echo.

echo [2/5] 添加所有修改的文件...
git add css/phone.css css/base.css css/settings.css css/home.css css/responsive.css js/linee.js
git add *.md
echo ✅ 文件已添加
echo.

echo [3/5] 查看将要提交的更改...
git status
echo.

echo [4/5] 提交更改...
git commit -m "修复所有自适应显示问题 - 完整版

✅ 桌面端
- 375x667px 原始尺寸
- 完美居中显示
- 组件不挤压

✅ 手机端
- 自适应填充屏幕
- 保持 375:667 比例
- 边距 16px，显示更大

✅ 居中对齐
- 使用 flexbox 居中
- position: fixed 容器
- 所有设备完美居中

✅ 其他修复
- 聊天室头像关联本地图片
- 设置页面全屏显示
- 移除所有冲突代码"
echo ✅ 更改已提交
echo.

echo [5/5] 推送到 GitHub...
git push origin main
echo.

if %errorlevel% equ 0 (
    echo ====================================
    echo ✅ 成功上传到 GitHub!
    echo ====================================
) else (
    echo ====================================
    echo ❌ 上传失败，请检查错误信息
    echo ====================================
)

pause

