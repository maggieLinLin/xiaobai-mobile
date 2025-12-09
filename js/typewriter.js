/**
 * 打字机效果 (Typewriter Effect)
 * 用于模拟AI逐字输出文本的视觉效果
 */

/**
 * 打字机效果核心函数
 * @param {HTMLElement} element - 要显示文字的元素
 * @param {string} text - 要显示的文本
 * @param {number} speed - 打字速度(ms/字)
 * @param {function} onComplete - 完成后的回调
 */
async function typeWriter(element, text, speed = 30, onComplete) {
    if (!element || !text) {
        console.warn('⚠️ typeWriter: 缺少元素或文本');
        if (onComplete) onComplete();
        return;
    }
    
    element.innerHTML = ''; // 清空内容
    
    // 添加打字游标
    element.classList.add('typing-cursor');
    
    let i = 0;
    while (i < text.length) {
        // 检查是否是 HTML 标签的开始
        if (text[i] === '<') {
            const tagEnd = text.indexOf('>', i);
            if (tagEnd !== -1) {
                // 完整插入 HTML 标签
                element.innerHTML += text.slice(i, tagEnd + 1);
                i = tagEnd + 1;
                continue;
            }
        }
        
        // 普通文字逐字追加
        element.innerHTML += text[i];
        i++;
        
        // 自动滚动到底部
        const chatArea = document.getElementById('chat-messages-container');
        if (chatArea) {
            chatArea.scrollTop = chatArea.scrollHeight;
        }
        
        // 延迟
        await new Promise(r => setTimeout(r, speed));
    }
    
    // 移除打字游标
    element.classList.remove('typing-cursor');
    
    // 执行完成回调
    if (onComplete) {
        onComplete();
    }
}

/**
 * 快速显示文本(跳过打字效果)
 * @param {HTMLElement} element - 要显示文字的元素
 * @param {string} text - 要显示的文本
 */
function skipTyping(element, text) {
    if (!element) return;
    element.classList.remove('typing-cursor');
    element.innerHTML = text;
}

// 导出到全局
window.typeWriter = typeWriter;
window.skipTyping = skipTyping;

console.log('✅ 打字机效果已加载');


