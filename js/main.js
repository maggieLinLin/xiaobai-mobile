// ✅ 投影仪模式：数学缩放函数（强制全屏适配）
function fitScreen() {
    const phone = document.getElementById('phone-frame');
    if (!phone) return;
    
    // 1. 定义设计稿原始尺寸（不可更改）
    const baseWidth = 375;
    const baseHeight = 812;
    
    // 2. 获取当前视窗的可视尺寸
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    
    // 3. 设定边距（Padding）以免贴边太难看
    const padding = 20;
    const availableWidth = winWidth - (padding * 2);
    const availableHeight = winHeight - (padding * 2);
    
    // 4. 计算缩放比例（取宽高比中较小的那个，确保完全放入）
    const scaleX = availableWidth / baseWidth;
    const scaleY = availableHeight / baseHeight;
    const scale = Math.min(scaleX, scaleY); // 保持比例
    
    // 5. 应用缩放（限制最大放大倍率为 1.2，避免糊掉）
    const finalScale = Math.min(scale, 1.2);
    
    phone.style.transform = `scale(${finalScale})`;
    
    // 6. 显示手机（避免闪烁）
    phone.style.visibility = 'visible';
    
    console.log(`[ScreenFit] Scale applied: ${finalScale.toFixed(2)} (${winWidth}x${winHeight})`);
}

// 监听事件
window.addEventListener('resize', fitScreen);
window.addEventListener('load', fitScreen);
window.addEventListener('orientationchange', () => {
    setTimeout(fitScreen, 100); // 延迟执行，等待方向变化完成
});

// 防止某些浏览器加载延迟，强制执行一次
setTimeout(fitScreen, 100);

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initStatusBar();
    initHomeScreen();
    initSettings();
    initApps();
    initCalendar();
    initMusic();
    if (!state.wallpaper) {
        applyTheme(state.currentTheme);
    }
    fitScreen(); // 使用新的函数名
});
