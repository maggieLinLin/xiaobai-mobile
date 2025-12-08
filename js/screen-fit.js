// ✅ 终极自适应方案：绝对定位+动态缩放（无限制版）
function fitScreen() {
    const phone = document.getElementById('phone-frame');
    if (!phone) return;
    
    // 1. 定义手机原始尺寸
    const baseWidth = 390;
    const baseHeight = 844;
    
    // 2. 获取浏览器视窗尺寸
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    
    // 3. 设定极限边距 (只留一点点缝隙，让它尽量大)
    // 如果你想贴边，可以设为 0
    const verticalPadding = 20;   // 上下各留 10px
    const horizontalPadding = 20; // 左右各留 10px
    
    // 4. 计算宽和高的缩放比例
    // 逻辑：(视窗大小 - 边距) / 手机原始大小
    const scaleX = (winWidth - horizontalPadding) / baseWidth;
    const scaleY = (winHeight - verticalPadding) / baseHeight;
    
    // 5. 取较小的值作为最终缩放比 (这是为了保持手机比例不变形)
    // ★★★ 关键修改：移除了所有 Math.min(..., 1.0) 的限制 ★★★
    // 这允许 scale 变成 1.5, 2.0 甚至更大，只要屏幕塞得下
    let scale = Math.min(scaleX, scaleY);
    
    // 6. 应用缩放
    phone.style.transform = `translate(-50%, -50%) scale(${scale})`;
    
    // 7. (可选) 让字体看起来锐利一点
    // 当缩放比例很大时，某些浏览器字体会模糊，这行有助于改善
    phone.style.backfaceVisibility = 'hidden'; 
    
    console.log(`[ScreenFit] 视窗: ${winWidth}x${winHeight}, 强制缩放比: ${scale.toFixed(2)}`);
}

// 监听各种事件确保执行
window.addEventListener('resize', fitScreen);
window.addEventListener('load', fitScreen);
window.addEventListener('DOMContentLoaded', fitScreen);

// 暴力循环检测：确保它一定会变大
// 有时候浏览器会在加载瞬间把 window.innerHeight 算错，所以多算几次
let attempts = 0;
const interval = setInterval(() => {
    fitScreen();
    attempts++;
    if (attempts > 5) clearInterval(interval);
}, 200);
