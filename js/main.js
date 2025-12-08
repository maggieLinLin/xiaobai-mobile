// ✅ 投影仪模式：安全缩放函数（强制全屏适配 + 错误处理）
function fitScreen() {
    try {
        const phone = document.getElementById('phone-frame') || document.querySelector('#phone-frame');
        if (!phone) {
            console.error('[ScreenFit] 找不到 #phone-frame 元素！');
            return;
        }
        
        // 1. 定义原始尺寸（不可更改）
        const baseWidth = 375;
        const baseHeight = 812;
        
        // 2. 获取视窗尺寸（增加保底值，防止除以0）
        const winWidth = window.innerWidth || document.documentElement.clientWidth || 375;
        const winHeight = window.innerHeight || document.documentElement.clientHeight || 812;
        
        // 3. 计算边距
        const padding = 20;
        const availableWidth = winWidth - (padding * 2);
        const availableHeight = winHeight - (padding * 2);
        
        // 4. 计算比例（确保有效）
        if (availableWidth <= 0 || availableHeight <= 0) {
            console.warn('[ScreenFit] 视窗尺寸异常，使用默认缩放');
            phone.style.transform = 'scale(1)';
            return;
        }
        
        const scaleX = availableWidth / baseWidth;
        const scaleY = availableHeight / baseHeight;
        let scale = Math.min(scaleX, scaleY);
        
        // 5. 限制最大倍率（可选，这里设为1.5）
        scale = Math.min(scale, 1.5);
        
        // 6. 应用缩放
        phone.style.transform = `scale(${scale})`;
        
        // 7. 强制显示（双重保险）
        phone.style.visibility = 'visible';
        phone.style.display = 'block';
        
        console.log(`[ScreenFit] 视窗: ${winWidth}x${winHeight}, 缩放比: ${scale.toFixed(2)}`);
        
    } catch (e) {
        console.error('[ScreenFit] 缩放计算发生错误，已重置为原始大小', e);
        // 如果出错，至少让手机显示出来（1倍大小）
        const phone = document.getElementById('phone-frame') || document.querySelector('#phone-frame');
        if (phone) {
            phone.style.transform = 'scale(1)';
            phone.style.visibility = 'visible';
            phone.style.display = 'block';
        }
    }
}

// ✅ 多重触发，确保一定执行
window.addEventListener('resize', fitScreen);
document.addEventListener('DOMContentLoaded', fitScreen); // DOM 准备好就执行
window.addEventListener('load', fitScreen); // 全部资源加载完再执行一次
window.addEventListener('orientationchange', () => {
    setTimeout(fitScreen, 100); // 延迟执行，等待方向变化完成
});

// ✅ 防止某些浏览器加载延迟，强制执行多次
setTimeout(fitScreen, 50);
setTimeout(fitScreen, 100);
setTimeout(fitScreen, 300);

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
