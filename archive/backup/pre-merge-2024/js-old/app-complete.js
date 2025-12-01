// 全局状态
const state = {
    currentPage: 0,
    currentTheme: 'cinnamoroll',
    apiConfig: { url: '', key: '', model: '', temperature: 0.7 },
    chatHistory: [],
    memos: {},
    customCSS: '',
    wallpaper: '',
    frameColor: '#333333',
    fontStyle: 'system',
    music: { current: null, playlist: [], favorites: [], isPlaying: false },
    selectedDate: null,
    calendarDate: null,
    customDateText: '',
    customFont: '',
    enableSystemRole: false,
    minimaxConfig: { groupId: '', apiKey: '', ttsModel: '' },
    savedApiConfigs: [],
    savedTtsConfigs: []
};

// 初始化
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

});

// 加载保存的状态
function loadState() {
    const saved = localStorage.getItem('xiaobai-state');
    if (saved) {
        Object.assign(state, JSON.parse(saved));
    }
}

// 保存状态
function saveState() {
    localStorage.setItem('xiaobai-state', JSON.stringify(state));
}

// 状态栏
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

// 主屏幕
function initHomeScreen() {
    const homePages = document.getElementById('home-pages');
    const dots = document.querySelectorAll('.dot');
    let startX = 0, isDragging = false;

    // 触摸事件
    homePages.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
    });

    homePages.addEventListener('touchend', e => {
        const endX = e.changedTouches[0].clientX;
        const diff = startX - endX;
        if (Math.abs(diff) > 50) {
            if (diff > 0 && state.currentPage < 1) state.currentPage++;
            else if (diff < 0 && state.currentPage > 0) state.currentPage--;
            homePages.style.transform = `translateX(-${state.currentPage * 50}%)`;
            dots.forEach((dot, i) => dot.classList.toggle('active', i === state.currentPage));
        }
    });

    // 鼠标事件
    homePages.addEventListener('mousedown', e => {
        startX = e.clientX;
        isDragging = true;
    });

    homePages.addEventListener('mouseup', e => {
        if (!isDragging) return;
        isDragging = false;
        const diff = startX - e.clientX;
        if (Math.abs(diff) > 50) {
            if (diff > 0 && state.currentPage < 1) state.currentPage++;
            else if (diff < 0 && state.currentPage > 0) state.currentPage--;
            homePages.style.transform = `translateX(-${state.currentPage * 50}%)`;
            dots.forEach((dot, i) => dot.classList.toggle('active', i === state.currentPage));
        }
    });

    // 下拉打开设置
    const homeScreen = document.getElementById('home-screen');
    const pullHint = document.getElementById('pull-hint');
    let startY = 0, isPulling = false;

    homeScreen.addEventListener('mousedown', e => {
        startY = e.clientY;
        isPulling = true;
        if (pullHint) pullHint.style.display = 'none';
    });

    homeScreen.addEventListener('mousemove', e => {
        if (isPulling && e.clientY - startY > 100) {
            openSettings();
            isPulling = false;
        }
    });

    homeScreen.addEventListener('mouseup', () => {
        isPulling = false;
    });

    homeScreen.addEventListener('touchstart', e => {
        startY = e.touches[0].clientY;
        isPulling = true;
        if (pullHint) pullHint.style.display = 'none';
    });

    homeScreen.addEventListener('touchmove', e => {
        if (isPulling && e.touches[0].clientY - startY > 100) {
            openSettings();
            isPulling = false;
        }
    });

    homeScreen.addEventListener('touchend', () => {
        isPulling = false;
    });

    // 灵动岛点击也可打开
    const notch = document.getElementById('notch');
    if (notch) {
        notch.style.cursor = 'pointer';
        notch.onclick = openSettings;
    }

    renderMiniCalendar();
}

function renderMiniCalendar() {
    const widget = document.getElementById('calendar-widget');
    if (!widget) return;
    if (!state.calendarDate) state.calendarDate = new Date();
    const date = new Date(state.calendarDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date().toISOString().split('T')[0];
    
    let html = `<div style="padding:5px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <button id="cal-prev" style="border:none;background:none;font-size:14px;cursor:pointer;padding:5px">◀</button>
            <div style="font-size:11px;font-weight:bold">${year}年${month + 1}月</div>
            <button id="cal-next" style="border:none;background:none;font-size:14px;cursor:pointer;padding:5px">▶</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;font-size:8px;text-align:center">
            <div style="font-weight:bold">S</div><div style="font-weight:bold">M</div><div style="font-weight:bold">T</div><div style="font-weight:bold">W</div><div style="font-weight:bold">T</div><div style="font-weight:bold">F</div><div style="font-weight:bold">S</div>`;
    
    for (let i = 0; i < firstDay; i++) html += '<div></div>';
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dateStr === today;
        const hasMemo = state.memos[dateStr];
        const bgColor = isToday ? 'background:#007AFF !important;color:white !important;font-weight:bold !important;' : '';
        const border = hasMemo ? 'border:1px solid #FF9500;' : '';
        html += `<div style="padding:4px 2px;text-align:center;border-radius:4px;cursor:pointer;font-size:9px;${bgColor}${border}" class="cal-day" data-date="${dateStr}">${day}</div>`;
    }
    
    html += '</div></div>';
    widget.innerHTML = html;
    
    const todayMemoWidget = document.getElementById('today-memo-widget');
    if (todayMemoWidget) {
        const memo = state.memos[today];
        todayMemoWidget.textContent = memo && memo.trim() ? memo : '今天没有任务';
    }
    
    const prevBtn = document.getElementById('cal-prev');
    const nextBtn = document.getElementById('cal-next');
    
    if (prevBtn) {
        prevBtn.onclick = (e) => {
            e.stopPropagation();
            state.calendarDate = new Date(date.setMonth(date.getMonth() - 1));
            renderMiniCalendar();
            saveState();
        };
    }
    
    if (nextBtn) {
        nextBtn.onclick = (e) => {
            e.stopPropagation();
            state.calendarDate = new Date(date.setMonth(date.getMonth() + 1));
            renderMiniCalendar();
            saveState();
        };
    }
    
    widget.querySelectorAll('.cal-day').forEach(el => {
        el.onclick = (e) => {
            e.stopPropagation();
            state.selectedDate = el.dataset.date;
            openApp('calendar-app');
            selectDate(el.dataset.date);
        };
    });
}

// 设置页面
function initSettings() {
    document.getElementById('close-settings').onclick = closeSettings;
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
        };
    });
    
    document.getElementById('temperature').oninput = e => {
        document.getElementById('temp-value').textContent = e.target.value;
    };
    
    document.getElementById('apply-font-url').onclick = applyFontURL;
    document.getElementById('font-upload').onchange = uploadFont;
    document.getElementById('apply-font-file').onclick = () => {
        const fileInput = document.getElementById('font-upload');
        if (fileInput.files.length > 0) {
            uploadFont({ target: fileInput });
        } else {
            alert('请先选择字体文件');
        }
    };
    document.getElementById('reset-font').onclick = resetFont;
    document.getElementById('fetch-tts-models').onclick = fetchTTSModels;
    document.getElementById('save-api-config').onclick = saveApiConfig;
    document.getElementById('load-api-config').onclick = loadSelectedApiConfig;
    document.getElementById('delete-api-config').onclick = deleteSelectedApiConfig;
    document.getElementById('save-tts-config').onclick = saveTtsConfig;
    document.getElementById('load-tts-config').onclick = loadSelectedTtsConfig;
    document.getElementById('delete-tts-config').onclick = deleteSelectedTtsConfig;
    document.getElementById('export-all-data').onclick = exportAllData;
    document.getElementById('import-all-data').onclick = importAllData;
    document.getElementById('clear-all-data').onclick = clearAllData;
    
    renderApiConfigList();
    renderTtsConfigList();
    
    // API 设置
    const apiUrl = document.getElementById('api-url');
    const apiKey = document.getElementById('api-key');
    const temperature = document.getElementById('temperature');
    const tempValue = document.getElementById('temp-value');
    const enableSystemRole = document.getElementById('enable-system-role');
    const minimaxGroupId = document.getElementById('minimax-group-id');
    const minimaxApiKey = document.getElementById('minimax-api-key');
    
    if (apiUrl) apiUrl.value = state.apiConfig.url;
    if (apiKey) apiKey.value = state.apiConfig.key;
    if (temperature) temperature.value = state.apiConfig.temperature;
    if (tempValue) tempValue.textContent = state.apiConfig.temperature;
    if (enableSystemRole) enableSystemRole.checked = state.enableSystemRole;
    if (minimaxGroupId) minimaxGroupId.value = state.minimaxConfig.groupId;
    if (minimaxApiKey) minimaxApiKey.value = state.minimaxConfig.apiKey;
    
    if (state.customFont) {
        const style = document.getElementById('custom-font');
        const isUrl = state.customFont.startsWith('http');
        const fontFormat = state.customFontFormat || 'truetype';
        
        if (style) {
            if (isUrl) {
                style.textContent = `
                    @font-face {
                        font-family: 'CustomFont';
                        src: url('${state.customFont}') format('${fontFormat}');
                        font-display: swap;
                    }
                    body, body *, #phone-frame, #phone-frame * {
                        font-family: 'CustomFont', -apple-system, BlinkMacSystemFont, sans-serif !important;
                    }
                `;
            } else {
                style.textContent = `
                    @font-face {
                        font-family: 'CustomFont';
                        src: url('${state.customFont}') format('${fontFormat}');
                        font-display: swap;
                    }
                    body, body *, #phone-frame, #phone-frame * {
                        font-family: 'CustomFont', -apple-system, BlinkMacSystemFont, sans-serif !important;
                    }
                `;
            }
        }
        const fontUrlInput = document.getElementById('font-url');
        if (fontUrlInput) fontUrlInput.value = state.customFont;
    }
    
    document.getElementById('save-api').onclick = saveAPI;
    document.getElementById('fetch-models').onclick = fetchModels;
    document.getElementById('export-api').onclick = exportAPI;
    document.getElementById('import-api').onclick = importAPI;
    
    // 主题
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.onclick = () => applyTheme(btn.dataset.theme);
    });
    
    // 美化
    const wallpaperUpload = document.getElementById('wallpaper-upload');
    const frameColor = document.getElementById('frame-color');
    const fontStyle = document.getElementById('font-style');
    
    if (wallpaperUpload) wallpaperUpload.onchange = uploadWallpaper;
    if (frameColor) {
        frameColor.value = state.frameColor;
        frameColor.onchange = e => {
            state.frameColor = e.target.value;
            document.getElementById('phone-frame').style.borderColor = e.target.value;
            saveState();
        };
    }
    if (fontStyle) {
        fontStyle.value = state.fontStyle;
        fontStyle.onchange = e => {
            state.fontStyle = e.target.value;
            document.body.className = state.fontStyle === 'cute' ? 'font-cute' : state.fontStyle === 'elegant' ? 'font-elegant' : '';
            saveState();
        };
    }
    
    document.getElementById('toggle-fullscreen').onclick = toggleFullscreen;
    
    // CSS
    document.getElementById('custom-css').value = state.customCSS;
    document.getElementById('apply-css').onclick = applyCustomCSS;
    
    // 套装
    document.getElementById('export-theme').onclick = exportTheme;
    document.getElementById('import-theme').onclick = importTheme;
    document.getElementById('clear-beauty-data').onclick = clearBeautyData;
}

function clearBeautyData() {
    if (!confirm('确定清除所有美化数据？\n\n将恢复为默认主题和壁纸')) return;
    state.wallpaper = '';
    state.frameColor = '#78B9DC';
    state.customCSS = '';
    state.customFont = '';
    state.customFontFormat = '';
    state.currentTheme = 'cinnamoroll';
    saveState();
    alert('美化数据已清除，即将刷新页面');
    location.reload();
}

function openSettings() {
    console.log('打开设置页面');
    const settingsPage = document.getElementById('settings-page');
    if (settingsPage) {
        settingsPage.classList.remove('hidden');
        settingsPage.classList.add('show');
        console.log('设置页面已显示');
    } else {
        console.error('找不到设置页面元素');
    }
}

function closeSettings() {
    document.getElementById('settings-page').classList.remove('show');
}

function saveAPI() {
    state.apiConfig.url = document.getElementById('api-url').value.trim();
    state.apiConfig.key = document.getElementById('api-key').value.trim();
    state.apiConfig.temperature = parseFloat(document.getElementById('temperature').value);
    const select = document.getElementById('model-select');
    if (select.value) state.apiConfig.model = select.value;
    state.enableSystemRole = document.getElementById('enable-system-role').checked;
    state.minimaxConfig.groupId = document.getElementById('minimax-group-id').value.trim();
    state.minimaxConfig.apiKey = document.getElementById('minimax-api-key').value.trim();
    const ttsSelect = document.getElementById('tts-model-select');
    if (ttsSelect.value) state.minimaxConfig.ttsModel = ttsSelect.value;
    saveState();
    alert('API 配置已保存');
}

function saveApiConfig() {
    const name = document.getElementById('api-config-name').value.trim();
    if (!name) return alert('请输入配置名称');
    
    const config = {
        name,
        url: document.getElementById('api-url').value.trim(),
        key: document.getElementById('api-key').value.trim(),
        model: document.getElementById('model-select').value,
        temperature: parseFloat(document.getElementById('temperature').value)
    };
    
    state.savedApiConfigs.push(config);
    saveState();
    renderSavedConfigs();
    document.getElementById('api-config-name').value = '';
    alert('配置已保存');
}

function renderApiConfigList() {
    const select = document.getElementById('api-config-list');
    select.innerHTML = '';
    if (state.savedApiConfigs.length === 0) {
        select.innerHTML = '<option disabled>暂无配置</option>';
        return;
    }
    state.savedApiConfigs.forEach((cfg, idx) => {
        const option = document.createElement('option');
        option.value = idx;
        option.textContent = `${cfg.name} - ${cfg.url}`;
        select.appendChild(option);
    });
}

function loadSelectedApiConfig() {
    const select = document.getElementById('api-config-list');
    const idx = select.value;
    if (idx === '' || idx === null) return alert('请先选择一个配置');
    const cfg = state.savedApiConfigs[idx];
    document.getElementById('api-url').value = cfg.url;
    document.getElementById('api-key').value = cfg.key;
    document.getElementById('temperature').value = cfg.temperature;
    document.getElementById('temp-value').textContent = cfg.temperature;
    if (cfg.model) document.getElementById('model-select').value = cfg.model;
    alert(`已加载: ${cfg.name}`);
}

function deleteSelectedApiConfig() {
    const select = document.getElementById('api-config-list');
    const idx = select.value;
    if (idx === '' || idx === null) return alert('请先选择一个配置');
    if (!confirm('确定删除该配置？')) return;
    state.savedApiConfigs.splice(idx, 1);
    saveState();
    renderApiConfigList();
}

function saveTtsConfig() {
    const name = document.getElementById('tts-config-name').value.trim();
    if (!name) return alert('请输入配置名称');
    const config = {
        name,
        groupId: document.getElementById('minimax-group-id').value.trim(),
        apiKey: document.getElementById('minimax-api-key').value.trim(),
        model: document.getElementById('tts-model-select').value
    };
    state.savedTtsConfigs.push(config);
    saveState();
    renderTtsConfigList();
    document.getElementById('tts-config-name').value = '';
    alert('配置已保存');
}

function renderTtsConfigList() {
    const select = document.getElementById('tts-config-list');
    select.innerHTML = '';
    if (state.savedTtsConfigs.length === 0) {
        select.innerHTML = '<option disabled>暂无配置</option>';
        return;
    }
    state.savedTtsConfigs.forEach((cfg, idx) => {
        const option = document.createElement('option');
        option.value = idx;
        option.textContent = `${cfg.name} - ${cfg.groupId}`;
        select.appendChild(option);
    });
}

function loadSelectedTtsConfig() {
    const select = document.getElementById('tts-config-list');
    const idx = select.value;
    if (idx === '' || idx === null) return alert('请先选择一个配置');
    const cfg = state.savedTtsConfigs[idx];
    document.getElementById('minimax-group-id').value = cfg.groupId;
    document.getElementById('minimax-api-key').value = cfg.apiKey;
    if (cfg.model) document.getElementById('tts-model-select').value = cfg.model;
    alert(`已加载: ${cfg.name}`);
}

function deleteSelectedTtsConfig() {
    const select = document.getElementById('tts-config-list');
    const idx = select.value;
    if (idx === '' || idx === null) return alert('请先选择一个配置');
    if (!confirm('确定删除该配置？')) return;
    state.savedTtsConfigs.splice(idx, 1);
    saveState();
    renderTtsConfigList();
}

async function fetchTTSModels() {
    const groupId = document.getElementById('minimax-group-id').value.trim();
    const apiKey = document.getElementById('minimax-api-key').value.trim();
    if (!groupId || !apiKey) return alert('请先输入 Minimax Group ID 和 API Key');
    
    const btn = document.getElementById('fetch-tts-models');
    btn.textContent = '加载中...';
    btn.disabled = true;
    
    try {
        alert('Minimax TTS 模型拉取功能开发中，当前使用默认模型');
        const select = document.getElementById('tts-model-select');
        select.innerHTML = '<option value="speech-01">speech-01</option><option value="speech-02">speech-02</option>';
    } finally {
        btn.textContent = '拉取语音模型';
        btn.disabled = false;
    }
}

function exportAllData() {
    const data = JSON.stringify(state, null, 2);
    download('xiaobai-all-data.json', data);
    alert('全机数据已导出');
}

function importAllData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const data = JSON.parse(ev.target.result);
                Object.assign(state, data);
                saveState();
                alert('全机数据已导入，即将刷新页面');
                location.reload();
            } catch (e) {
                alert('导入失败: ' + e.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function clearAllData() {
    if (!confirm('确定清除所有本机数据？此操作不可恢复！')) return;
    if (!confirm('再次确认：真的要清除全部数据？')) return;
    localStorage.clear();
    alert('数据已清除，即将刷新页面');
    location.reload();
}

async function fetchModels() {
    const url = document.getElementById('api-url').value.trim();
    const key = document.getElementById('api-key').value.trim();
    if (!url || !key) return alert('请先输入 API 地址和密钥');
    
    const btn = document.getElementById('fetch-models');
    btn.textContent = '加载中...';
    btn.disabled = true;
    
    try {
        const apiUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        const res = await fetch(`${apiUrl}/v1/models`, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        const select = document.getElementById('model-select');
        
        if (data.data && Array.isArray(data.data)) {
            select.innerHTML = '<option value="">选择模型</option>' + 
                data.data.map(m => `<option value="${m.id}">${m.id}</option>`).join('');
            alert(`成功加载 ${data.data.length} 个模型`);
        } else {
            throw new Error('无效的响应格式');
        }
    } catch (e) {
        console.error('Fetch models error:', e);
        alert('获取模型失败: ' + e.message + '\n\n请检查:\n1. API地址是否正确\n2. API密钥是否有效\n3. 网络连接是否正常');
    } finally {
        btn.textContent = '拉取模型';
        btn.disabled = false;
    }
}

function exportAPI() {
    const data = JSON.stringify(state.apiConfig, null, 2);
    download('api-config.json', data);
}

function importAPI() {
    const input = document.getElementById('hidden-file-input');
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = ev => {
            state.apiConfig = JSON.parse(ev.target.result);
            saveState();
            location.reload();
        };
        reader.readAsText(file);
    };
    input.click();
}

function applyTheme(theme) {
    state.currentTheme = theme;
    const themes = {
        cinnamoroll: { 
            colors: ['#E0F4FF', '#ACD6EC', '#78B9DC'],
            wallpaper: 'https://img.heliar.top/file/1764165229742_Screenshot_20251126_214520_rednote.jpg',
            borderColor: '#78B9DC'
        },
        hellokitty: { 
            colors: ['#FFFFFF', '#F0BDCC', '#EE5D5E'],
            wallpaper: 'https://img.heliar.top/file/1764165426446_Screenshot_20251126_215642_rednote.jpg',
            borderColor: '#EE5D5E'
        },
        kuromi: { 
            colors: ['#DCC9FF', '#B399E1', '#8C63C0'],
            wallpaper: 'https://img.heliar.top/file/1764165640672_Screenshot_20251126_220027_rednote.jpg',
            borderColor: '#8C63C0'
        },
        mymelody: { 
            colors: ['#FCD4E2', '#F4ABC3', '#EB88AA'],
            wallpaper: 'https://img.heliar.top/file/1764165501686_Screenshot_20251126_215741_rednote.jpg',
            borderColor: '#EB88AA'
        }
    };
    const frame = document.getElementById('phone-frame');
    const t = themes[theme];
    
    if (t.wallpaper) {
        frame.style.background = `url('${t.wallpaper}') center/cover`;
        frame.style.backgroundImage = `url('${t.wallpaper}')`;
        frame.style.backgroundSize = 'cover';
        frame.style.backgroundPosition = 'center';
    } else {
        frame.style.background = `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]}, ${t.colors[2]})`;
        frame.style.backgroundImage = '';
    }
    
    frame.style.borderColor = t.borderColor;
    state.frameColor = t.borderColor;
    document.getElementById('frame-color').value = t.borderColor;
    
    saveState();
}

function applyFontURL() {
    const url = document.getElementById('font-url').value.trim();
    if (!url) return alert('请输入字体 URL');
    
    const style = document.getElementById('custom-font');
    const fontFormat = url.endsWith('.woff2') ? 'woff2' : url.endsWith('.woff') ? 'woff' : 'truetype';
    
    style.textContent = `
        @font-face {
            font-family: 'CustomFont';
            src: url('${url}') format('${fontFormat}');
            font-display: swap;
        }
        body, body *, #phone-frame, #phone-frame * {
            font-family: 'CustomFont', -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
    `;
    
    const previewText = document.getElementById('preview-text');
    previewText.style.fontFamily = 'CustomFont';
    
    state.customFont = url;
    state.customFontFormat = fontFormat;
    saveState();
    
    alert('字体 URL 已设置！\n\n请稍等几秒让字体加载。');
}

function uploadFont(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        const fontData = ev.target.result;
        const style = document.getElementById('custom-font');
        const fontFormat = file.name.endsWith('.woff2') ? 'woff2' : file.name.endsWith('.woff') ? 'woff' : 'truetype';
        style.textContent = `@font-face{font-family:'CustomFont';src:url('${fontData}') format('${fontFormat}')}body,body *,#phone-frame,#phone-frame *{font-family:'CustomFont',-apple-system,sans-serif!important}`;
        
        const previewText = document.getElementById('preview-text');
        const testFont = new FontFace('CustomFont', `url(${fontData})`);
        testFont.load().then(() => {
            document.fonts.add(testFont);
            previewText.style.fontFamily = 'CustomFont';
            alert('字体上传成功！预览框已更新');
        }).catch(() => {
            alert('字体加载失败');
        });
        
        state.customFont = fontData;
        state.customFontFormat = fontFormat;
        saveState();
    };
    reader.readAsDataURL(file);
}

function resetFont() {
    document.getElementById('custom-font').textContent = '';
    document.getElementById('preview-text').style.fontFamily = '';
    document.getElementById('font-url').value = '';
    state.customFont = '';
    saveState();
    alert('已恢复默认字体');
}

function uploadWallpaper(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = ev => {
        state.wallpaper = ev.target.result;
        document.getElementById('phone-frame').style.backgroundImage = `url(${state.wallpaper})`;
        document.getElementById('phone-frame').style.backgroundSize = 'cover';
        saveState();
    };
    reader.readAsDataURL(file);
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        document.getElementById('phone-frame').style.border = 'none';
        document.getElementById('phone-frame').style.borderRadius = '0';
    } else {
        document.exitFullscreen();
        document.getElementById('phone-frame').style.border = '12px solid ' + state.frameColor;
        document.getElementById('phone-frame').style.borderRadius = '40px';
    }
}

function applyCustomCSS() {
    state.customCSS = document.getElementById('custom-css').value;
    document.getElementById('custom-style').textContent = state.customCSS;
    saveState();
}

function exportTheme() {
    const theme = {
        theme: state.currentTheme,
        wallpaper: state.wallpaper,
        frameColor: state.frameColor,
        fontStyle: state.fontStyle,
        customCSS: state.customCSS
    };
    download('theme.json', JSON.stringify(theme, null, 2));
}

function importTheme() {
    const input = document.getElementById('hidden-theme-input');
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = ev => {
            const theme = JSON.parse(ev.target.result);
            Object.assign(state, theme);
            saveState();
            location.reload();
        };
        reader.readAsText(file);
    };
    input.click();
}

// 应用
function initApps() {
    document.querySelectorAll('.app-icon').forEach(icon => {
        icon.onclick = () => {
            const app = icon.dataset.app;
            if (app === 'developing') {
                alert('功能开发中...');
            } else if (app === 'linee') {
                openApp('linee-app');
            }
        };
    });
    
    const dateWidget = document.getElementById('current-date');
    if (dateWidget) {
        dateWidget.addEventListener('input', () => {
            state.customDateText = dateWidget.value;
            saveState();
        });
        dateWidget.addEventListener('blur', () => {
            state.customDateText = dateWidget.value;
            saveState();
        });
    }
    
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeApp();
        };
    });
    
    // Linee 聊天
    document.querySelector('.chat-item').onclick = () => {
        document.getElementById('linee-app').classList.add('hidden');
        document.getElementById('chat-window').classList.remove('hidden');
    };
    
    document.getElementById('send-btn').onclick = sendMessage;
    document.getElementById('chat-input').onkeypress = e => {
        if (e.key === 'Enter') sendMessage();
    };
}

function openApp(appId) {
    document.getElementById('home-screen').style.display = 'none';
    const app = document.getElementById(appId);
    app.classList.remove('hidden');
    
    const backBtn = app.querySelector('.back-btn');
    if (backBtn) {
        backBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Back button clicked');
            closeApp();
        };
    }
}

function closeApp() {
    console.log('closeApp called');
    document.querySelectorAll('.app-window').forEach(w => {
        w.classList.add('hidden');
        console.log('Hiding:', w.id);
    });
    const homeScreen = document.getElementById('home-screen');
    if (homeScreen) {
        homeScreen.style.display = 'block';
        console.log('Home screen shown');
    }
}

async function sendMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    addMessage('user', text);
    input.value = '';
    
    if (!state.apiConfig.url || !state.apiConfig.key) {
        addMessage('ai', '请先在设置中配置 API');
        return;
    }
    
    try {
        const res = await fetch(`${state.apiConfig.url}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.apiConfig.key}`
            },
            body: JSON.stringify({
                model: state.apiConfig.model,
                messages: [{ role: 'user', content: text }],
                temperature: state.apiConfig.temperature
            })
        });
        const data = await res.json();
        const reply = data.choices[0].message.content;
        addMessage('ai', reply);
    } catch (e) {
        addMessage('ai', '发送失败: ' + e.message);
    }
}

function addMessage(role, text) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerHTML = `<div class="message-bubble">${text}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// 日历
function initCalendar() {
    document.getElementById('save-memo').onclick = saveMemo;
    renderFullCalendar();
}

function renderFullCalendar() {
    const container = document.getElementById('calendar-full');
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    let html = `<div style="padding:10px"><h3 style="margin-bottom:15px">${year}年${month + 1}月</h3><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px">`;
    html += '<div style="text-align:center;font-weight:bold;padding:8px;font-size:12px">日</div><div style="text-align:center;font-weight:bold;padding:8px;font-size:12px">一</div><div style="text-align:center;font-weight:bold;padding:8px;font-size:12px">二</div><div style="text-align:center;font-weight:bold;padding:8px;font-size:12px">三</div><div style="text-align:center;font-weight:bold;padding:8px;font-size:12px">四</div><div style="text-align:center;font-weight:bold;padding:8px;font-size:12px">五</div><div style="text-align:center;font-weight:bold;padding:8px;font-size:12px">六</div>';
    
    for (let i = 0; i < firstDay; i++) html += '<div></div>';
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = date === today;
        const hasMemo = state.memos[date];
        const classes = `calendar-day ${isToday ? 'today' : ''} ${hasMemo ? 'has-memo' : ''}`;
        html += `<div class="${classes}" data-date="${date}">${day}</div>`;
    }
    
    html += '</div></div>';
    container.innerHTML = html;
    
    document.querySelectorAll('.calendar-day').forEach(el => {
        el.onclick = () => selectDate(el.dataset.date);
    });
}

function selectDate(date) {
    state.selectedDate = date;
    const memoTitle = document.getElementById('memo-date-title');
    const memoInput = document.getElementById('memo-input');
    const memoArea = document.getElementById('memo-area');
    
    if (memoTitle) memoTitle.textContent = `${date} 备忘录`;
    if (memoInput) memoInput.value = state.memos[date] || '';
    if (memoArea) memoArea.style.display = 'block';
    
    document.querySelectorAll('.calendar-day').forEach(el => {
        el.style.background = el.dataset.date === date ? '#007AFF' : '';
        el.style.color = el.dataset.date === date ? 'white' : '';
    });
}

function saveMemo() {
    const date = state.selectedDate || new Date().toISOString().split('T')[0];
    const text = document.getElementById('memo-input').value;
    state.memos[date] = text;
    saveState();
    renderFullCalendar();
    renderMiniCalendar();
    alert('备忘录已保存');
}

// 音乐
function initMusic() {
    const musicPlay = document.getElementById('music-play');
    const musicPrev = document.getElementById('music-prev');
    const musicNext = document.getElementById('music-next');
    const musicFav = document.getElementById('music-fav');
    const musicAdd = document.getElementById('music-add');
    const musicSearch = document.getElementById('music-search');
    const musicList = document.getElementById('music-list');
    const doSearch = document.getElementById('do-search');
    const searchInput = document.getElementById('music-search-input');
    const confirmAdd = document.getElementById('confirm-add-music');
    const player = document.getElementById('music-player');
    
    if (musicPlay) musicPlay.onclick = (e) => { e.stopPropagation(); e.preventDefault(); togglePlay(); };
    if (musicPrev) musicPrev.onclick = (e) => { e.stopPropagation(); e.preventDefault(); prevSong(); };
    if (musicNext) musicNext.onclick = (e) => { e.stopPropagation(); e.preventDefault(); nextSong(); };
    if (musicFav) musicFav.onclick = (e) => { e.stopPropagation(); e.preventDefault(); toggleFavorite(); };
    if (musicAdd) musicAdd.onclick = (e) => { e.stopPropagation(); e.preventDefault(); openApp('add-music-modal'); };
    if (musicSearch) musicSearch.onclick = (e) => { e.stopPropagation(); e.preventDefault(); openApp('music-search-modal'); };
    if (musicList) musicList.onclick = (e) => { e.stopPropagation(); e.preventDefault(); openApp('music-fav-modal'); };
    if (doSearch) doSearch.onclick = searchMusic;
    if (confirmAdd) confirmAdd.onclick = addCustomMusic;
    if (searchInput) searchInput.onkeypress = e => { if (e.key === 'Enter') searchMusic(); };
    
    if (player) {
        player.ontimeupdate = updateProgress;
        player.onended = () => { nextSong(); };
    }
}

function addCustomMusic() {
    let title = document.getElementById('add-music-title').value.trim();
    let artist = document.getElementById('add-music-artist').value.trim();
    const url = document.getElementById('add-music-url').value.trim();
    const fileInput = document.getElementById('add-music-file');
    const file = fileInput.files[0];
    
    if (!url && !file) {
        alert('请输入链接或上传文件');
        return;
    }
    
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const song = {
                id: Date.now(),
                title: title || file.name.replace(/\.[^/.]+$/, ''),
                artist: artist || '未知歌手',
                url: e.target.result
            };
            state.music.playlist.push(song);
            saveState();
            playSong(song);
            closeApp();
            clearAddMusicForm();
            alert('添加成功！');
        };
        reader.readAsDataURL(file);
    } else {
        const song = {
            id: Date.now(),
            title: title || '未命名歌曲',
            artist: artist || '未知歌手',
            url: url
        };
        state.music.playlist.push(song);
        saveState();
        playSong(song);
        closeApp();
        clearAddMusicForm();
        alert('添加成功！');
    }
}

function clearAddMusicForm() {
    document.getElementById('add-music-title').value = '';
    document.getElementById('add-music-artist').value = '';
    document.getElementById('add-music-url').value = '';
    document.getElementById('add-music-file').value = '';
}

function updateProgress() {
    const player = document.getElementById('music-player');
    const fill = document.getElementById('progress-fill');
    const currentTime = document.getElementById('current-time');
    const totalTime = document.getElementById('total-time');
    
    if (!player || !fill) return;
    
    const percent = (player.currentTime / player.duration) * 100;
    fill.style.width = percent + '%';
    
    if (currentTime) currentTime.textContent = formatTime(player.currentTime);
    if (totalTime) totalTime.textContent = formatTime(player.duration);
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + (secs < 10 ? '0' : '') + secs;
}

function togglePlay() {
    const player = document.getElementById('music-player');
    const btn = document.getElementById('music-play');
    const vinyl = document.querySelector('.music-vinyl');
    if (!player || !btn) return;
    
    if (state.music.isPlaying) {
        player.pause();
        btn.textContent = '\u25b6';
        state.music.isPlaying = false;
        if (vinyl) vinyl.classList.remove('playing');
    } else {
        player.play().catch(() => {});
        btn.textContent = '\u23f8';
        state.music.isPlaying = true;
        if (vinyl) vinyl.classList.add('playing');
    }
}

function prevSong() {
    if (state.music.playlist.length === 0) return;
    const idx = state.music.playlist.findIndex(s => s === state.music.current);
    const prev = idx > 0 ? state.music.playlist[idx - 1] : state.music.playlist[state.music.playlist.length - 1];
    playSong(prev);
}

function nextSong() {
    if (state.music.playlist.length === 0) return;
    const idx = state.music.playlist.findIndex(s => s === state.music.current);
    const next = idx < state.music.playlist.length - 1 ? state.music.playlist[idx + 1] : state.music.playlist[0];
    playSong(next);
}

function toggleFavorite() {
    if (!state.music.current) return;
    const idx = state.music.favorites.findIndex(s => s.id === state.music.current.id);
    if (idx >= 0) {
        state.music.favorites.splice(idx, 1);
        document.getElementById('music-fav').textContent = '\u2661';
    } else {
        state.music.favorites.push(state.music.current);
        document.getElementById('music-fav').textContent = '\u2665';
    }
    saveState();
}

function toggleLyric() {
    const lyric = document.getElementById('lyric-float');
    lyric.classList.toggle('hidden');
}

async function searchMusic() {
    const query = document.getElementById('music-search-input').value;
    const platform = document.getElementById('music-platform').value;
    if (!query) return alert('请输入搜索关键词');
    
    const results = document.getElementById('search-results');
    results.innerHTML = '<div style="padding:20px;text-align:center">正在搜索...</div>';
    
    try {
        let songs = [];
        
        try {
            const res = await fetch(`https://web-production-b3dd5.up.railway.app/music?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data.code === 200 && data.data) {
                songs = data.data;
            }
        } catch (e) {
            console.error('Music API error:', e);
        }
        
        if (songs.length === 0) {
            results.innerHTML = '<div style="padding:20px;text-align:center">未找到结果</div>';
            return;
        }
        
        let html = '';
        songs.forEach(song => {
            html += `<div class="song-item" data-song='${JSON.stringify(song).replace(/'/g, "&apos;")}'>
                <div style="font-weight:bold">${song.title}</div>
                <div style="font-size:12px;color:#666">${song.artist}</div>
            </div>`;
        });
        results.innerHTML = html;
        
        document.querySelectorAll('.song-item').forEach(el => {
            el.onclick = () => {
                const song = JSON.parse(el.dataset.song.replace(/&apos;/g, "'"));
                playSong(song);
                closeApp();
            };
        });
    } catch (e) {
        console.error('Search error:', e);
        results.innerHTML = `<div style="padding:20px;text-align:center;color:red">搜索失败: ${e.message}<br>请检查网络连接或尝试其他平台</div>`;
    }
}

function playSong(song) {
    state.music.current = song;
    document.querySelector('.music-title').textContent = song.title;
    document.querySelector('.music-artist').textContent = song.artist;
    document.getElementById('lyric-text').textContent = song.title + ' - ' + song.artist;
    
    const player = document.getElementById('music-player');
    if (song.url) {
        player.src = song.url;
        player.play().then(() => {
            document.getElementById('music-play').textContent = '\u23f8';
            state.music.isPlaying = true;
        }).catch(e => {
            alert('播放失败: ' + e.message);
        });
    }
    
    if (!state.music.playlist.some(s => s.id === song.id)) {
        state.music.playlist.push(song);
    }
    
    const isFav = state.music.favorites.some(s => s.id === song.id);
    document.getElementById('music-fav').textContent = isFav ? '\u2665' : '\u2661';
    
    saveState();
}

// 工具函数
function download(filename, text) {
    const a = document.createElement('a');
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
    a.download = filename;
    a.click();
}
