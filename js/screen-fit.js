// ✅ 终极自适应方案：绝对定位+动态缩放
function fitScreen() {
    const phone = document.getElementById('phone-frame');
    if (!phone) return;
    
    // 1. 定义手机原始尺寸
    const baseWidth = 375;
    const baseHeight = 812;
    
    // 2. 获取浏览器视窗尺寸
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    
    // 3. 设定边距 (留一点呼吸空间)
    const margin = 20;
    
    // 4. 计算宽和高的缩放比例
    const scaleX = (winWidth - margin * 2) / baseWidth;
    const scaleY = (winHeight - margin * 2) / baseHeight;
    
    // 5. 取较小的值作为最终缩放比 (确保手机完全放入画面)
    let scale = Math.min(scaleX, scaleY);
    
    // (可选) 限制最大放大倍率，避免在大屏幕上太大
    scale = Math.min(scale, 1.5);
    
    // 限制最小缩放比，避免太小
    scale = Math.max(scale, 0.3);
    
    // 6. 核心修复：同时应用 居中位移 + 缩放
    phone.style.transform = `translate(-50%, -50%) scale(${scale})`;
    
    console.log(`[ScreenFit] 窗口: ${winWidth}x${winHeight}, 缩放比: ${scale.toFixed(3)}`);
}

// 监听各种事件确保执行
window.addEventListener('resize', fitScreen);
window.addEventListener('load', fitScreen);
window.addEventListener('DOMContentLoaded', fitScreen);

// 立即执行一次
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fitScreen);
} else {
    fitScreen();
}

// 防止某些浏览器加载慢，延迟再执行一次
setTimeout(fitScreen, 100);
setTimeout(fitScreen, 500);
