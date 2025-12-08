# 设置编码为 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "正在上传到 GitHub..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

# 检查 Git 状态
Write-Host "[1/4] 检查 Git 状态..." -ForegroundColor Yellow
$status = git status --short
if ($status) {
    Write-Host $status
} else {
    Write-Host "没有未提交的更改" -ForegroundColor Gray
}
Write-Host ""

# 添加文件
Write-Host "[2/4] 添加更改的文件..." -ForegroundColor Yellow
$files = @(
    "css/phone.css",
    "js/home.js", 
    "js/app-complete.js",
    "css/home.css",
    "FINAL_UPDATE.md",
    "UPDATE_SUMMARY.md",
    "RESPONSIVE_FIX.md"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        git add $file
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file (文件不存在)" -ForegroundColor Red
    }
}
Write-Host ""

# 提交
Write-Host "[3/4] 提交更改..." -ForegroundColor Yellow
$commitMsg = "更新：缩短手机高度至667px，修改日历橘线逻辑显示选中日期"
git commit -m $commitMsg
if ($LASTEXITCODE -eq 0) {
    Write-Host "提交成功！" -ForegroundColor Green
} else {
    Write-Host "提交失败或没有更改需要提交" -ForegroundColor Yellow
}
Write-Host ""

# 推送
Write-Host "[4/4] 推送到 GitHub..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "推送成功！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "查看更新: https://github.com/maggieLinLin/xiaobai-mobile" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "推送失败！" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "可能的原因：" -ForegroundColor Yellow
    Write-Host "1. 需要身份验证（GitHub Personal Access Token）" -ForegroundColor Yellow
    Write-Host "2. 网络连接问题" -ForegroundColor Yellow
    Write-Host "3. 远程仓库权限问题" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请检查 Git 配置或手动执行推送" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "按任意键退出..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
