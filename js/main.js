// 📱 自动缩放手机以适应屏幕
function resizePhone() {
    const phone = document.getElementById('phone-frame');
    const container = document.getElementById('phone-container');
    if (!phone || !container) return;
    
    const padding = window.innerWidth <= 768 ? 10 : 20;
    const baseWidth = 375;
    const baseHeight = 812;
    
    const windowWidth = window.innerWidth - (padding * 2);
    const windowHeight = window.innerHeight - (padding * 2);
    
    const scaleX = windowWidth / baseWidth;
    const scaleY = windowHeight / baseHeight;
    const scale = Math.min(scaleX, scaleY, 1);
    
    phone.style.transform = `scale(${scale})`;
    
    const scaledHeight = baseHeight * scale;
    const scaledWidth = baseWidth * scale;
    container.style.height = `${scaledHeight}px`;
    container.style.width = `${scaledWidth}px`;
}

window.addEventListener('resize', resizePhone);
window.addEventListener('load', resizePhone);
window.addEventListener('orientationchange', resizePhone);

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
    resizePhone();
});
