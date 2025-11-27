function initStatusBar() {
    updateTime();
    setInterval(updateTime, 1000);
    updateBattery();
}

function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('status-time').textContent = timeStr;
    
    const timeWidget = document.getElementById('current-time');
    if (timeWidget) timeWidget.textContent = timeStr;
    
    const dateWidget = document.getElementById('current-date');
    if (dateWidget && !state.customDateText) {
        state.customDateText = '欢迎使用小白机';
        dateWidget.value = state.customDateText;
    } else if (dateWidget && dateWidget.value === '') {
        dateWidget.value = state.customDateText || '欢迎使用小白机';
    }
}

function updateBattery() {
    if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
            const level = Math.floor(battery.level * 100);
            const batteryContainer = document.getElementById('status-battery');
            batteryContainer.innerHTML = `
                <div style="position:relative;display:inline-flex;align-items:center;gap:2px">
                    <div style="width:30px;height:14px;border-radius:7px;background:linear-gradient(to right, white ${level}%, #ccc ${level}%);display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:bold;color:#333">${level}</div>
                    ${battery.charging ? '<span style="font-size:10px">⚡</span>' : ''}
                </div>
            `;
        });
    }
}
