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
    // 确保日历显示当前月
    state.calendarDate = null;
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

// ---------- 工具：格式化本地日期為 YYYY-MM-DD ----------
function localDateKey(date = new Date()){
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/* ---------- localStorage key helper ---------- */
function noteKey(dateKey){
  return `note:${dateKey}`;
}

/* ---------- 儲存 / 讀取記事（強一致性版） ----------
   存入 JSON: { content: string, updatedAt: number }
   刪除時 removeItem。所有讀取都直接從 localStorage 讀取（無 memory cache）。
------------------------------------------------------------------ */
function saveNoteForDate(dateKey, content){
  const trimmed = (content || '').trim();
  const k = noteKey(dateKey);

  if(trimmed === ''){
    // 刪除資料（而非存空字串），避免舊值殘留
    localStorage.removeItem(k);
    // 通知同分頁與跨分頁：在 localStorage 上寫一個變動指示器（storage event 在同分頁不會觸發，所以同時 dispatch custom event）
    localStorage.setItem('_last_note_update', JSON.stringify({dateKey, action: 'remove', updatedAt: Date.now()}));
    // cleanup the indicator quickly to avoid polluting storage (optional)
    setTimeout(() => {
      try{ localStorage.removeItem('_last_note_update'); } catch(e){}
    }, 50);
    // dispatch custom event for same-tab listeners
    window.dispatchEvent(new CustomEvent('notes-updated', {detail:{dateKey, action:'remove'}}));
  } else {
    const payload = { content: content, updatedAt: Date.now() };
    localStorage.setItem(k, JSON.stringify(payload));
    // also signal last update for cross-tab listeners
    localStorage.setItem('_last_note_update', JSON.stringify({dateKey, action: 'save', updatedAt: payload.updatedAt}));
    setTimeout(() => {
      try{ localStorage.removeItem('_last_note_update'); } catch(e){}
    }, 50);
    window.dispatchEvent(new CustomEvent('notes-updated', {detail:{dateKey, action:'save'}}));
  }

  // 立即更新 calendar 樣式與主頁 task box（讀取真正儲存的內容以避免 race）
  // 注意：不要使用任何舊的 in-memory 資料，直接呼叫 loadNoteForDate
  const currentStored = loadNoteForDate(dateKey, true); // true 表示回傳完整 payload（含 updatedAt）
  // 如果是今天，強制更新主頁
  if(dateKey === localDateKey(new Date())){
    if(!currentStored){
      updateTaskBox('');
    } else {
      updateTaskBox(currentStored.content || '');
    }
  }
  applyHasNoteClass(dateKey);
}

/* loadNoteForDate 支援兩種回傳：
   - loadNoteForDate(dateKey) => returns content string (or '')
   - loadNoteForDate(dateKey, true) => returns payload object {content, updatedAt} 或 null
*/
function loadNoteForDate(dateKey, raw = false){
  const k = noteKey(dateKey);
  const s = localStorage.getItem(k);
  if(!s) return raw ? null : '';
  try{
    const obj = JSON.parse(s);
    if(raw) return obj;
    return obj && obj.content ? obj.content : '';
  } catch(e){
    // 若 parse 失敗（舊格式或損壞），當作空並移除以免再次出錯
    console.warn('note parse error for', k, e);
    localStorage.removeItem(k);
    return raw ? null : '';
  }
}

/* ---------- applyHasNoteClass: 根據 localStorage 實際資料決定 day 是否有記事 ---------- */
function applyHasNoteClass(dateKey){
  const el = document.querySelector(`#calendar .day[data-date="${dateKey}"]`);
  if(!el) return;
  const has = !!loadNoteForDate(dateKey); // 直接從 localStorage 讀取
  el.classList.toggle('has-note', has);
}

/* ---------- 儲存按鈕（或 blur 時） ---------- */
/* ---------- 儲存按鈕（或 blur 時） ---------- */
let currentEditingDate = localDateKey(new Date()); // current editing target

/* ---------- 自動保存（debounce）: 若使用者停止輸入 X ms 後自動儲存，避免每鍵入都寫入 */
let autoSaveTimer = null;
const AUTO_SAVE_DELAY = 800; // ms

function scheduleAutoSave(){
  if(autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    if(currentEditingDate){
      // 在儲存前取得目前 textarea 的最新值
      saveNoteForDate(currentEditingDate, taskBox.value);
    }
    autoSaveTimer = null;
  }, AUTO_SAVE_DELAY);
}

/* ---------- 更新主頁任務框（空內容時要顯示 placeholder） ---------- */
const taskBox = document.getElementById('today-memo-widget');

function updateTaskBox(content){
  const trimmed = (content || '').trim();
  if(trimmed === ''){
    taskBox.value = '';
    taskBox.placeholder = '今天没有任务';
  } else {
    taskBox.placeholder = '';
    taskBox.value = content;
  }
  // 立即調整高度（且確保不出現滾動）
  adjustTaskBoxHeight();
}

/* ---------- 自適應高度（最多 5 行；絕對不顯示垂直捲軸） ---------- */
function adjustTaskBoxHeight(){
  // 強制隱藏垂直捲軸（視覺上絕不出現）
  taskBox.style.overflowY = 'hidden';

  const style = window.getComputedStyle(taskBox);
  let lineHeightPx = parseFloat(style.lineHeight);
  if(isNaN(lineHeightPx)){
    const fontSize = parseFloat(style.fontSize) || 14;
    lineHeightPx = fontSize * 1.2;
  }
  const maxLines = 5;
  const maxHeight = lineHeightPx * maxLines + parseFloat(style.paddingTop || 0) + parseFloat(style.paddingBottom || 0);

  // 先讓高度自適（避免因為固定高度而拿不到 scrollHeight）
  taskBox.style.height = 'auto';
  const needed = taskBox.scrollHeight;

  // 設定高度為需要或最大值（但不顯示捲軸）
  taskBox.style.height = Math.min(needed, maxHeight) + 'px';
}

/* ---------- 計算 textarea 行數（用以判斷是否阻止換行） ---------- */
function countLinesInTextarea(t){
  // using scrollHeight / lineHeight to approximate lines
  const style = window.getComputedStyle(t);
  let lineHeightPx = parseFloat(style.lineHeight);
  if(isNaN(lineHeightPx)){
    const fontSize = parseFloat(style.fontSize) || 14;
    lineHeightPx = fontSize * 1.2;
  }
  const padding = (parseFloat(style.paddingTop || 0) + parseFloat(style.paddingBottom || 0));
  const lines = Math.round((t.scrollHeight - padding) / lineHeightPx);
  return lines;
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
    
    // 初始化任务框
    const todayMemoWidget = document.getElementById('today-memo-widget');
    const todayKey = localDateKey(new Date());
    const todayNote = loadNoteForDate(todayKey);
    updateTaskBox(todayNote);
    adjustTaskBoxHeight();
    
    // 保存按鈕與事件綁定
    const saveTaskButton = document.getElementById('save-task');
    if (saveTaskButton) {
        saveTaskButton.addEventListener('click', () => {
            saveNoteForDate(currentEditingDate, taskBox.value);
        });
    }

    // 添加自我适应高度，阻止超過5行的換行，自動保存
    if (todayMemoWidget) {
        todayMemoWidget.addEventListener('input', () => {
            adjustTaskBoxHeight();
            scheduleAutoSave(); // 自動保存（debounce 800ms）
        });
        todayMemoWidget.addEventListener('keydown', (e) => {
            if(e.key === 'Enter'){
                const lines = countLinesInTextarea(todayMemoWidget);
                if(lines >= 5){
                    e.preventDefault();
                }
            }
        });
        // 失去焦點時保存
        todayMemoWidget.addEventListener('blur', () => {
            if(currentEditingDate){
                saveNoteForDate(currentEditingDate, taskBox.value);
            }
        });
    }
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
    const today = localDateKey(new Date()); // 使用本地日期
    
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
        if (memo && memo.trim()) {
            updateTaskBox(memo);
        } else {
            updateTaskBox('');
        }
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
            const memo = loadNoteForDate(el.dataset.date);
            updateTaskBox(memo || '');
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
    const today = localDateKey(new Date()); // 使用本地時間格式
    
    let html = `<div style="padding:10px"><h3 style="margin-bottom:15px">${year}年${month + 1}月</h3><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px">`;
    html += '<div style="text-align:center;font-weight:bold;padding:8px;font-size:12px">日</div><div style="text-align:center;font-weight:bold;padding:8px;font-size:12px">一</div><div style="text-align:center;font-weight:bold;padding:8px;font-size:12px">二</div><div style="text-align:center;font-weight:bold;padding:8px;font-size:12px">三</div><div style="text-align:center;font-weight:bold;padding:8px;font-size:12px">四</div><div style="text-align:center;font-weight:bold;padding:8px;font-size:12px">五</div><div style="text-align:center;font-weight:bold;padding:8px;font-size:12px">六</div>';
    
    for (let i = 0; i < firstDay; i++) html += '<div></div>';
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = date === today;
        const note = loadNoteForDate(date); // 检查是否有記事
        const hasMemo = note && note.trim();
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
    if (memoInput) memoInput.value = loadNoteForDate(date) || '';
    if (memoArea) memoArea.style.display = 'block';
    
    document.querySelectorAll('.calendar-day').forEach(el => {
        el.style.background = el.dataset.date === date ? '#007AFF' : '';
        el.style.color = el.dataset.date === date ? 'white' : '';
    });
}

function saveMemo() {
    const date = state.selectedDate || localDateKey(new Date());
    const text = document.getElementById('memo-input').value;
    saveNoteForDate(date, text);
    // 更新今日任务框如果保存的是今天
    const todayKey = localDateKey(new Date());
    if (date === todayKey) {
        updateTaskBox(text);
    }
    renderFullCalendar();
    renderMiniCalendar();
    alert('备忘录已保存');
}

// 音乐
function initMusic() {
    const musicPlay = document.getElementById('music-play');
    const musicPrev = document.getElementById('music-prev');
    const musicNext = document.getElementById('music-next');
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
    if (musicAdd) musicAdd.onclick = (e) => { e.stopPropagation(); e.preventDefault(); openApp('add-music-modal'); };
    if (musicSearch) musicSearch.onclick = (e) => { e.stopPropagation(); e.preventDefault(); openApp('music-search-modal'); };
    if (musicList) musicList.onclick = (e) => { e.stopPropagation(); e.preventDefault(); showPlaylist(); };
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

function showPlaylist() {
    openApp('music-fav-modal');
    const list = document.getElementById('fav-list');
    if (state.music.playlist.length === 0) {
        list.innerHTML = '<div style="padding:20px;text-align:center;color:#999">歌單為空<br><br>使用搜索或添加功能來添加歌曲</div>';
        return;
    }
    let html = '';
    state.music.playlist.forEach((song, idx) => {
        const isPlaying = state.music.current && state.music.current.id === song.id;
        html += `<div class="song-item" style="${isPlaying ? 'background:rgba(102,126,234,0.1);' : ''}" data-idx="${idx}">
            <div style="font-weight:bold">${song.title} ${isPlaying ? '🎵' : ''}</div>
            <div style="font-size:12px;color:#666">${song.artist}</div>
        </div>`;
    });
    list.innerHTML = html;
    document.querySelectorAll('#fav-list .song-item').forEach(el => {
        el.onclick = () => {
            const idx = parseInt(el.dataset.idx);
            playSong(state.music.playlist[idx]);
            closeApp();
        };
    });
}

function toggleLyric() {
    const lyric = document.getElementById('lyric-float');
    lyric.classList.toggle('hidden');
}

async function searchMusic() {
    const query = document.getElementById('music-search-input').value.trim();
    if (!query) return alert('请输入搜索关键词');
    
    const results = document.getElementById('search-results');
    results.innerHTML = '<div style="padding:20px;text-align:center">正在搜索...</div>';
    
    // 優先使用 Meting API 反代 /api 端點格式，支援更好的搜索結果
    const apis = [
        { 
            name: 'Meting API 反代 - NetEase', 
            url: `https://meting-api-alpha-gilt.vercel.app/api?server=netease&type=search&s=${encodeURIComponent(query)}`,
            parse: (data) => {
                try {
                    // 處理 {"source":"netease","results":[...]} 格式
                    let songs = [];
                    if (data && data.results && Array.isArray(data.results)) {
                        songs = data.results;
                    } else if (data && data.data && Array.isArray(data.data)) {
                        // 備用格式 {"data":[...]}
                        songs = data.data;
                    } else {
                        console.error('未知的數據格式:', data);
                        return [];
                    }
                    
                    return songs.filter(song => song && song.name).map(song => ({
                        title: song.name || '未知歌曲',
                        artist: song.artist || '未知歌手',
                        url: song.url || song.mp3Url || '',
                        id: song.id || '',
                        pic: song.pic || song.cover || ''
                    }));
                } catch (e) {
                    console.error('NetEase 解析錯誤:', e);
                }
                return [];
            }
        },
        { 
            name: 'Meting API 反代 - NetEase (備用)', 
            url: `https://meting-api-alpha-gilt.vercel.app/api?server=netease&type=search&s=${encodeURIComponent(query)}&limit=50`,
            parse: (data) => {
                try {
                    let songs = [];
                    if (data && data.results && Array.isArray(data.results)) {
                        songs = data.results;
                    } else if (data && data.data && Array.isArray(data.data)) {
                        songs = data.data;
                    } else {
                        return [];
                    }
                    
                    return songs.filter(song => song && song.name).map(song => ({
                        title: song.name || '未知歌曲',
                        artist: song.artist || '未知歌手',
                        url: song.url || song.mp3Url || '',
                        id: song.id || '',
                        pic: song.pic || song.cover || ''
                    }));
                } catch (e) {
                    console.error('NetEase 備用解析錯誤:', e);
                }
                return [];
            }
        },
        {
            name: 'YesPlayMusic API - 網易',
            url: `https://music-api.vercel.app/search?keywords=${encodeURIComponent(query)}&limit=30`,
            parse: (data) => {
                try {
                    if (data && data.result && data.result.songs && Array.isArray(data.result.songs)) {
                        return data.result.songs.map(song => ({
                            title: song.name || '未知歌曲',
                            artist: song.artists?.map(a => a.name).join(' / ') || '未知歌手',
                            url: '',
                            id: song.id || '',
                            pic: song.album?.picUrl || ''
                        }));
                    }
                } catch (e) {
                    console.error('YesPlayMusic 解析錯誤:', e);
                }
                return [];
            }
        }
    ];
    
    try {
        let songs = [];
        let successApi = null;
        let errorMessages = [];
        
        for (const api of apis) {
            try {
                console.log(`🔍 嘗試 ${api.name}: ${api.url}`);
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 增加到 15 秒
                
                const res = await fetch(api.url, { 
                    method: 'GET', 
                    mode: 'cors',
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0'
                    },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                console.log(`📊 ${api.name} 響應狀態: ${res.status}`);
                
                if (!res.ok && res.status !== 200) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                
                let data;
                try {
                    data = await res.json();
                } catch (jsonErr) {
                    console.error(`❌ JSON 解析失敗: ${api.name}`);
                    throw new Error(`JSON 解析失敗`);
                }
                
                console.log(`📦 ${api.name} 數據:`, data);
                
                if (data) {
                    songs = api.parse(data);
                    console.log(`✅ ${api.name} 解析結果: ${songs.length} 首歌曲`);
                }
                
                if (songs && songs.length > 0) {
                    successApi = api.name;
                    console.log(`🎉 成功: ${api.name} 找到 ${songs.length} 首歌曲`);
                    break;
                }
            } catch (e) {
                const errorMsg = `${api.name}: ${e.message}`;
                errorMessages.push(errorMsg);
                console.error(`❌ ${errorMsg}`);
            }
        }
        
        if (songs.length === 0) {
            console.error(`❌ 所有 API 均失敗:`, errorMessages);
            results.innerHTML = `<div style="padding:20px;text-align:center;color:#ff6b6b">
                <div style="margin-bottom:10px">所有 API 均無法訪問</div>
                <div style="font-size:12px;color:#999;margin-bottom:15px">
                    ${errorMessages.map(e => `• ${e}`).join('<br>')}
                </div>
                <div style="border-top:1px solid #f0f0f0;padding-top:15px">
                    <div style="margin-bottom:8px"><strong>建議：</strong></div>
                    1. 檢查網絡連接<br>
                    2. 使用「添加音樂」功能上傳本地文件<br>
                    3. 手動輸入音樂 URL<br>
                    4. 稍後重試（API 可能暫時不可用）
                </div>
            </div>`;
            return;
        }
        
        console.log(`✅ 成功使用 ${successApi}，找到 ${songs.length} 首歌曲`);
        
        let html = `<div style="padding:10px;font-size:11px;color:#999;text-align:right">數據來源: ${successApi}</div>`;
        songs.forEach(song => {
            html += `<div class="song-item" data-song='${JSON.stringify(song).replace(/'/g, "&apos;")}'>
                <div style="font-weight:bold">${song.title}</div>
                <div style="font-size:12px;color:#666">${song.artist}</div>
            </div>`;
        });
        results.innerHTML = html;
        
        document.querySelectorAll('.song-item').forEach(el => {
            el.onclick = async () => {
                const song = JSON.parse(el.dataset.song.replace(/&apos;/g, "'"));
                await playSong(song);
                closeApp();
            };
        });
    } catch (e) {
        console.error('Search error:', e);
        results.innerHTML = `<div style="padding:20px;text-align:center;color:red">搜索失敗: ${e.message}<br><br>請嘗試：<br>1. 使用「添加音樂」功能上傳本地文件<br>2. 手動輸入音樂 URL<br>3. 重新搜索</div>`;
    }
}

async function playSong(song) {
    state.music.current = song;
    document.querySelector('.music-title').textContent = song.title;
    document.querySelector('.music-artist').textContent = song.artist;
    document.getElementById('lyric-text').textContent = song.title + ' - ' + song.artist;
    
    const player = document.getElementById('music-player');
    
    try {
        // 如果沒有 URL，需要調用 API 獲取播放鏈接
        if (!song.url || song.url.trim() === '') {
            console.log('🔍 動態獲取播放鏈接...');
            
            // 使用 type=song 獲取完整歌曲信息（包含播放鏈接）
            const url = `https://meting-api-alpha-gilt.vercel.app/api?type=song&id=${song.id}`;
            console.log('📡 獲取歌曲信息:', url);
            
            const res = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            
            if (!res.ok) {
                throw new Error(`無法獲取播放鏈接: HTTP ${res.status}`);
            }
            
            const data = await res.json();
            console.log('📦 歌曲數據:', data);
            
            // 從響應中提取播放鏈接
            if (data && data.url) {
                song.url = data.url;
                console.log('✅ 獲得播放鏈接:', song.url);
            } else {
                throw new Error('響應中找不到播放鏈接');
            }
            
            if (!song.url) {
                throw new Error('無法找到有效的播放鏈接');
            }
        }
        
        // 現在有 URL，開始播放
        if (song.url) {
            console.log('🎵 開始播放:', song.url);
            
            // 嘗試多種方式播放
            let playSuccess = false;
            
            // 方式1: 直接設置 src
            player.src = song.url;
            
            // 方式2: 使用 blob 和 createObjectURL (如果方式1失敗)
            const tryBlobPlay = async () => {
                if (playSuccess) return;
                
                try {
                    console.log('嘗試 blob 播放方式...');
                    const res = await fetch(song.url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0',
                            'Referer': 'https://music.163.com/'
                        }
                    });
                    
                    if (!res.ok) {
                        console.log('fetch 失敗: HTTP ' + res.status);
                        return;
                    }
                    
                    const blob = await res.blob();
                    console.log('✅ 獲得 blob:', blob.size, 'bytes');
                    
                    const blobUrl = URL.createObjectURL(blob);
                    player.src = blobUrl;
                    
                    player.play().then(() => {
                        console.log('✅ blob 播放成功');
                        playSuccess = true;
                        document.getElementById('music-play').textContent = '\u23f8';
                        state.music.isPlaying = true;
                    }).catch(e => {
                        console.error('blob 播放失敗:', e);
                    });
                } catch (e) {
                    console.error('blob 方式出錯:', e);
                }
            };
            
            // 監聽播放器事件
            const canplayHandler = () => {
                console.log('✅ 可以播放');
                playSuccess = true;
                player.removeEventListener('error', errorHandler);
                document.getElementById('music-play').textContent = '\u23f8';
                state.music.isPlaying = true;
            };
            
            const errorHandler = () => {
                console.error('播放器錯誤:', player.error?.code);
                player.removeEventListener('canplay', canplayHandler);
                
                // 錯誤時，延遲後嘗試 blob 方式
                setTimeout(() => tryBlobPlay(), 500);
            };
            
            player.addEventListener('canplay', canplayHandler, { once: true });
            player.addEventListener('error', errorHandler, { once: true });
            
            // 嘗試播放
            const playPromise = player.play();
            if (playPromise) {
                playPromise.then(() => {
                    console.log('✅ 播放開始');
                    playSuccess = true;
                    player.removeEventListener('error', errorHandler);
                }).catch(e => {
                    console.error('play() 失敗:', e);
                    // 自動降級到 blob 方式
                    setTimeout(() => tryBlobPlay(), 500);
                });
            }
        } else {
            alert('無法獲取播放鏈接，請稍後重試');
        }
    } catch (e) {
        console.error('獲取播放鏈接出錯:', e);
        alert('獲取播放鏈接失敗: ' + e.message + '\n\n請稍後重試');
    }
    
    if (!state.music.playlist.some(s => s.id === song.id)) {
        state.music.playlist.push(song);
    }
    
    saveState();
}

/* ---------- 同分頁 / 跨分頁同步機制 ---------- */
/* 1) 同分頁：我們在 save/remove 時會 dispatch 自訂事件 'notes-updated' */
window.addEventListener('notes-updated', (e) => {
  const { dateKey, action } = e.detail || {};
  if(!dateKey) return;
  applyHasNoteClass(dateKey);
  // 若更新的正好是 currentEditingDate 或今天，重新載入內容以保證一致
  if(dateKey === currentEditingDate || dateKey === localDateKey(new Date())){
    const payload = loadNoteForDate(dateKey, true);
    updateTaskBox(payload ? payload.content : '');
  }
});

/* 2) 跨分頁：監聽 storage 事件（其他分頁在 localStorage 改動時會觸發） */
window.addEventListener('storage', (ev) => {
  // 我們使用 _last_note_update 作為變動指示器
  if(ev.key === '_last_note_update' && ev.newValue){
    try{
      const info = JSON.parse(ev.newValue);
      const { dateKey } = info;
      if(!dateKey) return;
      applyHasNoteClass(dateKey);
      if(dateKey === currentEditingDate || dateKey === localDateKey(new Date())){
        const payload = loadNoteForDate(dateKey, true);
        updateTaskBox(payload ? payload.content : '');
      }
    } catch(e){
      console.warn('storage event parse error', e);
    }
  }
});

/* ---------- 最後啟動 ---------- */
document.addEventListener('DOMContentLoaded', () => {
    // 加入同步機制但不初始化所有函数，因為已經在其他地方初始化了
});

// 工具函数
function download(filename, text) {
    const a = document.createElement('a');
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
    a.download = filename;
    a.click();
}
