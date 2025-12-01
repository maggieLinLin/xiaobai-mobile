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

/* ---------- 鑑別 helpers ---------- */
function parseStoredNote(raw){
  try{ return JSON.parse(raw); } catch(e){ return null; }
}

/* ---------- 儲存 / 讀取記事（強一致性版） ----------
   存入 JSON: { content: string, updatedAt: number }
   刪除時 removeItem。所有讀取都直接從 localStorage 讀取（無 memory cache）。
------------------------------------------------------------------ */
/* 強化 save: 寫入 payload 並立即 dispatch event + set indicator */
function saveNoteForDate(dateKey, content){
  const trimmed = (content || '').trim();
  const key = noteKey(dateKey);
  if(trimmed === ''){
    localStorage.removeItem(key);
    const info = { dateKey, action:'remove', updatedAt: Date.now() };
    localStorage.setItem('_last_note_update', JSON.stringify(info));
    // quick cleanup
    setTimeout(()=> localStorage.removeItem('_last_note_update'), 50);
    window.dispatchEvent(new CustomEvent('notes-updated', {detail: info}));
    // 立即 process to update UI (synchronous)
    processNoteUpdate(dateKey);
    return;
  }
  const payload = { content, updatedAt: Date.now() };
  localStorage.setItem(key, JSON.stringify(payload));
  const info = { dateKey, action:'save', updatedAt: payload.updatedAt };
  localStorage.setItem('_last_note_update', JSON.stringify(info));
  setTimeout(()=> localStorage.removeItem('_last_note_update'), 50);
  window.dispatchEvent(new CustomEvent('notes-updated', {detail: info}));
  // 立即 process to ensure UI sync (avoid waiting for event loop scheduling)
  processNoteUpdate(dateKey);
}

function loadNoteForDate(dateKey, raw = false){
  const s = localStorage.getItem(noteKey(dateKey));
  if(!s) return raw ? null : '';
  const obj = parseStoredNote(s);
  if(!obj) return raw ? null : '';
  return raw ? obj : (obj.content || '');
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

/* ---------- 強制把內容寫入 task box（絕對同步顯示） ---------- */
function forceUpdateTaskBox(content){
  // 直接操作 DOM，避免舊記憶體或 render 覆蓋
  const normalized = (content || '').trim();
  if(normalized === ''){
    taskBox.value = '';
    taskBox.placeholder = '今天沒有任務';
  } else {
    taskBox.placeholder = '';
    taskBox.value = content;
  }

  // 立即調整高度（並保證沒有垂直捲軸）
  adjustTaskBoxHeight();

  // 確保瀏覽器已經套用 DOM 變更（防止下一步 render 覆蓋時看不到）
  // 用 microtask 與 rAF 做雙保險：先 microtask，再一個 rAF
  Promise.resolve().then(() => {
    requestAnimationFrame(() => {
      // 重新觸發任何需要被同步的 UI handler（例如 has-note 樣式）
      // 如果有需要，也可以 dispatch 一個輕量事件給其他模組
      window.dispatchEvent(new CustomEvent('taskbox-updated', {detail:{value: taskBox.value}}));
    });
  });
}

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

    // 🔒 關鍵：渲染前先保護當前任務欄的實時狀態
    // 獲取當前任務欄的最新值（來自localStorage）
    const todayKey = localDateKey(new Date());
    const currentTask = loadNoteForDate(todayKey, true); // 獲取payload

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

    // 🚫 移除導致覆蓋的舊邏輯
    // const todayMemoWidget = document.getElementById('today-memo-widget');
    // if (todayMemoWidget) {
    //     const memo = state.memos[today];
    //     if (memo && memo.trim()) {
    //         updateTaskBox(memo);
    //     } else {
    //         updateTaskBox('');
    //     }
    // }

    const prevBtn = document.getElementById('cal-prev');
    const nextBtn = document.getElementById('cal-next');

    if (prevBtn) {
        prevBtn.onclick = (e) => {
            e.stopPropagation();
            state.calendarDate = new Date(date.setMonth(date.getMonth() - 1));
            renderMiniCalendar();
            saveState();
            // 渲染後立即恢復任務欄狀態（防覆蓋）
            forceUpdateTaskBox(currentTask ? currentTask.content : '');
        };
    }

    if (nextBtn) {
        nextBtn.onclick = (e) => {
            e.stopPropagation();
            state.calendarDate = new Date(date.setMonth(date.getMonth() + 1));
            renderMiniCalendar();
            saveState();
            // 渲染後立即恢復任務欄狀態（防覆蓋）
            forceUpdateTaskBox(currentTask ? currentTask.content : '');
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

    // 🔒 渲染完後立即強制同步當前任務欄（確保補償任何覆蓋）
    // 使用微任務確保在所有同步DOM操作完成後執行
    Promise.resolve().then(() => forceUpdateTaskBox(currentTask ? currentTask.content : ''));
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
                initLineeApp();
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

    // 檢查是否有日曆應用正在關閉，如果是，恢復任務欄
    const calendarApp = document.getElementById('calendar-app');
    const isClosingCalendar = calendarApp && !calendarApp.classList.contains('hidden');

    document.querySelectorAll('.app-window').forEach(w => {
        w.classList.add('hidden');
        console.log('Hiding:', w.id);
    });

    const homeScreen = document.getElementById('home-screen');
    if (homeScreen) {
        homeScreen.style.display = 'block';
        console.log('Home screen shown');

        // 如果剛剛關閉了日曆應用，強制恢復今天的任務欄狀態
        if (isClosingCalendar) {
            console.log('📅 日曆應用已關閉，強制恢復任務欄狀態');
            const todayKey = localDateKey(new Date());
            processNoteUpdate(todayKey);
        }
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
                    // 處理標準 Meting API 響應格式
                    let songs = [];
                    if (data && Array.isArray(data)) {
                        // 如果數據是直接的歌曲數組
                        songs = data;
                    } else if (data && data.data && Array.isArray(data.data)) {
                        // 如果數據在 data 字段中
                        songs = data.data;
                    } else if (data && data.results && Array.isArray(data.results)) {
                        // 如果數據在 results 字段中
                        songs = data.results;
                    } else {
                        console.error('未知的數據格式:', data);
                        return [];
                    }

                    return songs.filter(song => song && song.name).map(song => ({
                        title: song.name || '未知歌曲',
                        artist: song.artist || '未知歌手',
                        url: song.url || '',
                        id: song.id || '',
                        pic: song.pic || '',
                        lyric_id: song.lyric_id || ''  // 支持歌詞 ID
                    }));
                } catch (e) {
                    console.error('NetEase 解析錯誤:', e);
                }
                return [];
            }
        },
        {
            name: 'Meting API 反代 - 擴展搜索',
            url: `https://meting-api-alpha-gilt.vercel.app/api?server=netease&type=search&s=${encodeURIComponent(query)}&limit=50&quality=high`,
            parse: (data) => {
                try {
                    // 同樣處理標準格式，但增加更高品質搜索
                    let songs = [];
                    if (data && Array.isArray(data)) {
                        songs = data;
                    } else if (data && data.data && Array.isArray(data.data)) {
                        songs = data.data;
                    } else if (data && data.results && Array.isArray(data.results)) {
                        songs = data.results;
                    } else {
                        console.error('擴展搜索未知數據格式:', data);
                        return [];
                    }

                    return songs.filter(song => song && song.name).map(song => ({
                        title: song.name || '未知歌曲',
                        artist: song.artist || '未知歌手',
                        url: song.url || '',
                        id: song.id || '',
                        pic: song.pic || '',
                        lyric_id: song.lyric_id || ''
                    }));
                } catch (e) {
                    console.error('NetEase 擴展搜索解析錯誤:', e);
                }
                return [];
            }
        },
        {
            name: 'YesPlayMusic API - 網易',
            url: `https://music-api.vercel.app/search?keywords=${encodeURIComponent(query)}&limit=40`,
            parse: (data) => {
                try {
                    // 處理 YesPlayMusic 格式
                    if (data && data.result && data.result.songs && Array.isArray(data.result.songs)) {
                        return data.result.songs.map(song => ({
                            title: song.name || '未知歌曲',
                            artist: song.artists?.map(a => a.name).join(' / ') || '未知歌手',
                            url: '',  // YesPlayMusic 需要單獨獲取
                            id: song.id || '',
                            pic: song.album?.picUrl || '',
                            lyric_id: ''
                        }));
                    }
                } catch (e) {
                    console.error('YesPlayMusic 解析錯誤:', e);
                }
                return [];
            }
        },
        {
            name: 'A Player API - 備用',
            url: `https://api.a-player.net/search?term=${encodeURIComponent(query)}&limit=30`,
            parse: (data) => {
                try {
                    // 處理 A Player 格式作為最終備用
                    if (data && data.songs && Array.isArray(data.songs)) {
                        return data.songs.map(song => ({
                            title: song.title || '未知歌曲',
                            artist: song.artist || '未知歌手',
                            url: song.url || '',
                            id: song.id || Date.now().toString(),
                            pic: song.cover || '',
                            lyric_id: ''
                        }));
                    }
                } catch (e) {
                    console.error('A Player 解析錯誤:', e);
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

/* processNoteUpdate: 所有事件統一呼叫這裡以確保立即同步 UI */
function processNoteUpdate(dateKey){
  // 直接讀 localStorage（不要用 memory cache）
  const payload = loadNoteForDate(dateKey, true); // payload 或 null
  // 更新 calendar 樣式
  applyHasNoteClass(dateKey);
  // 如果是當前編輯日或今天，強制更新主頁
  const todayKey = localDateKey(new Date());
  if(dateKey === currentEditingDate || dateKey === todayKey){
    // 若 payload 為 null => empty => show placeholder（使用強制同步版本）
    forceUpdateTaskBox(payload ? payload.content : '');
  }
}

/* 同分頁監聽（來自 dispatchEvent）*/
window.addEventListener('notes-updated', (e) => {
  try{
    const info = e.detail || {};
    if(!info.dateKey) return;
    // process immediately
    processNoteUpdate(info.dateKey);
  }catch(err){ console.warn('notes-updated handler err', err); }
});

/* 跨分頁監聽（storage event）*/
window.addEventListener('storage', (ev) => {
  if(!ev) return;
  if(ev.key === '_last_note_update' && ev.newValue){
    try{
      const info = JSON.parse(ev.newValue);
      if(info && info.dateKey){
        processNoteUpdate(info.dateKey);
      }
    } catch(e){ console.warn('storage parse err', e); }
  }
});

/* ---------- Linee App Functions ---------- */
let lineeInitialized = false;
const lineeFriends = [
    { name: "Alice", status: "Work hard, play hard", avatar: "A" },
    { name: "Bob", status: "Available", avatar: "B" },
    { name: "Charlie", status: "At the gym", avatar: "C" },
    { name: "David", status: "Sleeping...", avatar: "D" },
    { name: "Eve", status: "Coding LINEE", avatar: "E" }
];

const lineeGroups = [
    { name: "Family", count: 4, avatar: "F" },
    { name: "Work Team", count: 12, avatar: "W" }
];

const mockChats = [
    { id: '1', name: '妈妈', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mom&backgroundColor=ffdfbf', lastMessage: '今晚回家吃饭吗？做了你最爱的红烧肉。', timestamp: '11:45', unreadCount: 2, isGroup: false, isPinned: true },
    { id: '2', name: '工作群组 (产品部)', avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Work', lastMessage: 'Jason: @All 这里的UI需要再调整一下，参考Linee的设计规范。', timestamp: '11:30', unreadCount: 15, isGroup: true, isPinned: true },
    { id: '3', name: 'Alice', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice', lastMessage: '好的，明天见！', timestamp: '昨天', unreadCount: 0, isGroup: false, isMuted: true },
    { id: '4', name: '周末篮球小队', avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Ball', lastMessage: '大明: 这周日谁有空？老地方见。', timestamp: '昨天', unreadCount: 5, isGroup: true },
    { id: '5', name: 'LINEE Official', avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=LO&backgroundColor=A0D8EF', lastMessage: '欢迎使用 LINEE！查看最新版本功能介绍。', timestamp: '星期一', unreadCount: 1, isGroup: false },
    { id: '6', name: 'Jason', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jason', lastMessage: '文件已经发送到你邮箱了，请查收。', timestamp: '星期一', unreadCount: 0, isGroup: false },
    { id: '7', name: '快递代收', avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=Box', lastMessage: '您的包裹已到达丰巢柜。', timestamp: '2023/10/25', unreadCount: 0, isGroup: false },
    { id: '8', name: '小美', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mimi', lastMessage: '[图片]', timestamp: '2023/10/24', unreadCount: 0, isGroup: false },
    { id: '9', name: '设计交流群', avatar: 'https://api.dicebear.com/7.x/identicon/svg?seed=Design', lastMessage: '有没有人有比较好的无版权图库推荐？', timestamp: '2023/10/20', unreadCount: 0, isGroup: true, isMuted: true }
];

let currentChatId = null;
let chatMessages = {};

function renderChatList() {
    const list = document.getElementById('linee-chat-list');
    if (!list) return;
    
    list.innerHTML = mockChats.map(chat => `
        <div onclick="openChatRoom('${chat.id}', '${chat.name}')" style="display: flex; align-items: center; padding: 12px 16px; background: #FFFFFF; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='#FFFFFF'">
            <div style="position: relative; flex-shrink: 0; margin-right: 16px;">
                <img src="${chat.avatar}" alt="${chat.name}" style="width: 52px; height: 52px; object-fit: cover; border: 1px solid #F3F4F6; border-radius: ${chat.isGroup ? '16px' : '50%'};" />
                ${!chat.isGroup ? '<div style="position: absolute; bottom: 0; right: 0; width: 14px; height: 14px; background: #10B981; border: 2px solid #FFFFFF; border-radius: 50%;"></div>' : ''}
            </div>
            <div style="flex: 1; min-width: 0; border-bottom: 1px solid #F9FAFB; padding-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                    <div style="display: flex; align-items: center; gap: 4px; overflow: hidden;">
                        <h3 style="font-size: 16px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${chat.name}</h3>
                        ${chat.isMuted ? '<ion-icon name="notifications-off-outline" style="font-size: 12px; color: #9CA3AF;"></ion-icon>' : ''}
                    </div>
                    <span style="font-size: 11px; color: #9CA3AF; flex-shrink: 0; margin-left: 8px;">${chat.timestamp}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <p style="font-size: 13px; color: #6B7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 8px;">${chat.lastMessage}</p>
                    <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                        ${chat.isPinned ? '<ion-icon name="pin" style="font-size: 12px; color: #D1D5DB; transform: rotate(45deg);"></ion-icon>' : ''}
                        ${chat.unreadCount > 0 ? `<span style="display: flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 6px; font-size: 10px; font-weight: 700; color: #FFFFFF; background: #A0D8EF; border-radius: 9px;">${chat.unreadCount > 99 ? '99+' : chat.unreadCount}</span>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function initLineeApp() {
    if (lineeInitialized) return;
    lineeInitialized = true;

    renderLineeFriends();
    renderLineeGroups();

    // Add button popover
    const btnAdd = document.getElementById('linee-btn-add');
    const popover = document.getElementById('linee-add-popover');
    
    if (btnAdd && popover) {
        btnAdd.onclick = (e) => {
            e.stopPropagation();
            popover.classList.toggle('hidden');
        };

        document.addEventListener('click', (e) => {
            if (!btnAdd.contains(e.target) && !popover.contains(e.target)) {
                popover.classList.add('hidden');
            }
        });
    }

    // Modal triggers
    const optAddFriend = document.getElementById('linee-opt-add-friend');
    const optAddGroup = document.getElementById('linee-opt-add-group');
    
    if (optAddFriend) {
        optAddFriend.onclick = () => {
            popover.classList.add('hidden');
            document.getElementById('linee-modal-add-friend').classList.remove('hidden');
        };
    }

    if (optAddGroup) {
        optAddGroup.onclick = () => {
            popover.classList.add('hidden');
            document.getElementById('linee-modal-add-group').classList.remove('hidden');
        };
    }

    // Persona cards
    document.querySelectorAll('#linee-app-content .linee-card').forEach(card => {
        card.onclick = () => {
            document.querySelectorAll('#linee-app-content .linee-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        };
    });

    // Nav items
    document.querySelectorAll('#linee-app-content .linee-nav-item').forEach(item => {
        item.onclick = () => {
            const tab = item.dataset.tab;
            document.querySelectorAll('#linee-app-content .linee-nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            // Switch tabs
            document.getElementById('linee-tab-home').style.display = tab === 'home' ? 'block' : 'none';
            document.getElementById('linee-tab-chats').style.display = tab === 'chats' ? 'block' : 'none';
            document.getElementById('linee-tab-steps').style.display = tab === 'steps' ? 'block' : 'none';
            
            if (tab === 'chats') renderChatList();
            if (tab === 'steps') {
                if (!window.stepsInitialized) {
                    initStepsApp();
                    window.stepsInitialized = true;
                }
                navigateSteps('home');
            }
        };
    });
    
    // Initialize Steps app
    initStepsApp();
    window.stepsInitialized = true;
}

function renderLineeFriends() {
    const list = document.getElementById('linee-friends-list');
    const count = document.getElementById('linee-friend-count');
    if (!list || !count) return;
    
    list.innerHTML = '';
    lineeFriends.forEach(f => {
        const item = document.createElement('div');
        item.className = 'linee-friend-item';
        item.innerHTML = `
            <div class="linee-friend-avatar">${f.avatar}</div>
            <div class="linee-friend-info">
                <div class="linee-friend-name">${f.name}</div>
                <div class="linee-friend-status">${f.status}</div>
            </div>
        `;
        list.appendChild(item);
    });
    count.textContent = `(${lineeFriends.length})`;
}

function renderLineeGroups() {
    const list = document.getElementById('linee-groups-list');
    const count = document.getElementById('linee-group-count');
    if (!list || !count) return;
    
    list.innerHTML = '';
    lineeGroups.forEach(g => {
        const item = document.createElement('div');
        item.className = 'linee-friend-item';
        item.innerHTML = `
            <div class="linee-friend-avatar" style="background:#E8F6FA;color:#A0D8EF;">${g.avatar}</div>
            <div class="linee-friend-info">
                <div class="linee-friend-name">${g.name}</div>
                <div class="linee-friend-status">${g.count} users</div>
            </div>
        `;
        list.appendChild(item);
    });
    count.textContent = `(${lineeGroups.length})`;
}

function toggleLineeList(listId, header) {
    const list = document.getElementById(listId);
    const group = header.parentElement;
    
    list.classList.toggle('hidden');
    group.classList.toggle('expanded');
}

function closeLineeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

function confirmLineeAddFriend() {
    const input = document.getElementById('linee-new-friend-name');
    const name = input.value.trim();
    if (name) {
        const newFriend = { name, status: "New Friend", avatar: name[0].toUpperCase() };
        lineeFriends.push(newFriend);
        
        const newChat = {
            id: 'chat_' + Date.now(),
            name: name,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
            lastMessage: '开始聊天吧！',
            timestamp: '刚刚',
            unreadCount: 0,
            isGroup: false
        };
        mockChats.unshift(newChat);
        
        renderLineeFriends();
        renderChatList();
        input.value = '';
        closeLineeModal('linee-modal-add-friend');
    }
}

function confirmLineeAddGroup() {
    const input = document.getElementById('linee-new-group-name');
    const name = input.value.trim();
    if (name) {
        lineeGroups.push({ name, count: 1, avatar: name[0].toUpperCase() });
        renderLineeGroups();
        input.value = '';
        closeLineeModal('linee-modal-add-group');
    }
}

/* ---------- 最後啟動 ---------- */
document.addEventListener('DOMContentLoaded', () => {
    // 加入同步機制但不初始化所有函数，因為已經在其他地方初始化了
});

// Make functions global for onclick handlers
window.toggleLineeList = toggleLineeList;
window.closeLineeModal = closeLineeModal;
window.confirmLineeAddFriend = confirmLineeAddFriend;
window.confirmLineeAddGroup = confirmLineeAddGroup;

/* ---------- Linee 個人設定頁功能 ---------- */
let lineePersonaCards = [
    { name: '我的名字', status: '设定状态消息...', settings: '', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', active: true },
    null,
    null
];

function initLineeProfileSettings() {
    const profileClickable = document.getElementById('linee-profile-clickable');
    if (profileClickable) {
        profileClickable.onclick = openLineeProfileSettings;
    }
    
    const saved = localStorage.getItem('linee-persona-cards');
    if (saved) {
        lineePersonaCards = JSON.parse(saved);
    }
}

let currentEditingSlot = 0;

function openLineeProfileSettings() {
    document.getElementById('linee-app').classList.add('hidden');
    document.getElementById('linee-profile-settings').classList.remove('hidden');
    
    const activeIndex = lineePersonaCards.findIndex(c => c && c.active);
    currentEditingSlot = activeIndex !== -1 ? activeIndex : 0;
    const activeCard = lineePersonaCards[currentEditingSlot];
    
    if (activeCard) {
        document.getElementById('linee-edit-name').value = activeCard.name;
        document.getElementById('linee-edit-status-input').value = activeCard.status;
        document.getElementById('linee-edit-settings').value = activeCard.settings || '';
        document.getElementById('linee-edit-avatar').src = activeCard.avatar;
    }
    
    renderPersonaCards();
}

function closeLineeProfileSettings() {
    document.getElementById('linee-profile-settings').classList.add('hidden');
    document.getElementById('linee-app').classList.remove('hidden');
}

function changeLineeAvatar() {
    const seeds = ['Felix', 'Aneka', 'Bella', 'Charlie', 'David', 'Emma', 'Frank', 'Grace'];
    const randomSeed = seeds[Math.floor(Math.random() * seeds.length)];
    const newAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`;
    document.getElementById('linee-edit-avatar').src = newAvatar;
}

function saveLineeProfile() {
    const name = document.getElementById('linee-edit-name').value.trim();
    const status = document.getElementById('linee-edit-status-input').value.trim();
    const settings = document.getElementById('linee-edit-settings').value.trim();
    const avatar = document.getElementById('linee-edit-avatar').src;
    
    if (!name) return alert('請輸入名字');
    
    // 保存到當前編輯的卡槽
    const wasActive = lineePersonaCards[currentEditingSlot] && lineePersonaCards[currentEditingSlot].active;
    lineePersonaCards[currentEditingSlot] = { name, status, settings, avatar, active: wasActive };
    
    localStorage.setItem('linee-persona-cards', JSON.stringify(lineePersonaCards));
    
    if (wasActive) updateLineeMainProfile();
    renderPersonaCards();
    
    alert('已保存至卡槽 ' + (currentEditingSlot + 1) + '！');
}

function selectPersonaCard(slot) {
    currentEditingSlot = slot;
    const card = lineePersonaCards[slot];
    
    if (!card) {
        document.getElementById('linee-edit-name').value = '新人物';
        document.getElementById('linee-edit-status-input').value = '設定狀態...';
        document.getElementById('linee-edit-settings').value = '';
        changeLineeAvatar();
    } else {
        lineePersonaCards.forEach((c, i) => { if (c) c.active = (i === slot); });
        document.getElementById('linee-edit-name').value = card.name;
        document.getElementById('linee-edit-status-input').value = card.status;
        document.getElementById('linee-edit-settings').value = card.settings || '';
        document.getElementById('linee-edit-avatar').src = card.avatar;
        localStorage.setItem('linee-persona-cards', JSON.stringify(lineePersonaCards));
        updateLineeMainProfile();
    }
    renderPersonaCards();
}

function renderPersonaCards() {
    const grid = document.querySelector('.linee-persona-cards-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    lineePersonaCards.forEach((card, index) => {
        const div = document.createElement('div');
        
        if (card) {
            div.className = `linee-persona-card ${card.active ? 'active' : ''} ${currentEditingSlot === index ? 'editing' : ''}`;
            div.setAttribute('data-slot', index);
            div.onclick = () => selectPersonaCard(index);
            div.innerHTML = `
                <div class="linee-persona-card-avatar">
                    <img src="${card.avatar}" alt="">
                </div>
                <div class="linee-persona-card-info">
                    <div class="linee-persona-card-name">${card.name}</div>
                    <div class="linee-persona-card-status">${card.status}</div>
                </div>
                <div class="linee-persona-card-active">✓</div>
            `;
        } else {
            div.className = `linee-persona-card linee-persona-card-empty ${currentEditingSlot === index ? 'editing' : ''}`;
            div.setAttribute('data-slot', index);
            div.onclick = () => selectPersonaCard(index);
            div.innerHTML = `
                <div class="linee-persona-card-empty-icon">+</div>
                <div class="linee-persona-card-empty-text">空卡槽</div>
            `;
        }
        
        grid.appendChild(div);
    });
}

function updateLineeMainProfile() {
    const activeCard = lineePersonaCards.find(c => c && c.active);
    if (!activeCard) return;
    
    const nameEl = document.getElementById('linee-display-name');
    const statusEl = document.getElementById('linee-display-status');
    const avatarEl = document.getElementById('linee-display-avatar');
    
    if (nameEl) nameEl.textContent = activeCard.name;
    if (statusEl) statusEl.textContent = activeCard.status;
    if (avatarEl) avatarEl.src = activeCard.avatar;
}

// 初始化時調用
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLineeProfileSettings);
} else {
    initLineeProfileSettings();
}

// Make functions global
window.openLineeProfileSettings = openLineeProfileSettings;
window.closeLineeProfileSettings = closeLineeProfileSettings;
window.changeLineeAvatar = changeLineeAvatar;
window.saveLineeProfile = saveLineeProfile;
window.selectPersonaCard = selectPersonaCard;

/* ========== Steps (足跡) App Functions ========== */
let stepsState = {
    view: 'home',
    worlds: [],
    selectedWorldId: null,
    selectedCharId: null,
    deleteMode: false,
    selectedDeleteIds: new Set()
};

let stepsDB = null;

function initStepsDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('StepsDatabase', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            stepsDB = request.result;
            resolve(stepsDB);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('maps')) {
                db.createObjectStore('maps', { keyPath: 'worldId' });
            }
            if (!db.objectStoreNames.contains('footprints')) {
                db.createObjectStore('footprints', { keyPath: 'id' });
            }
        };
    });
}

function saveMapToDB(worldId, mapSvg) {
    if (!stepsDB) return;
    const transaction = stepsDB.transaction(['maps'], 'readwrite');
    const store = transaction.objectStore('maps');
    store.put({ worldId, mapSvg, timestamp: Date.now() });
}

function getMapFromDB(worldId) {
    return new Promise((resolve) => {
        if (!stepsDB) return resolve(null);
        const transaction = stepsDB.transaction(['maps'], 'readonly');
        const store = transaction.objectStore('maps');
        const request = store.get(worldId);
        request.onsuccess = () => resolve(request.result?.mapSvg || null);
        request.onerror = () => resolve(null);
    });
}

function saveFootprintToDB(charId, footprintData) {
    if (!stepsDB) return;
    const transaction = stepsDB.transaction(['footprints'], 'readwrite');
    const store = transaction.objectStore('footprints');
    store.put({ id: charId, ...footprintData });
}

function getFootprintFromDB(charId) {
    return new Promise((resolve) => {
        if (!stepsDB) return resolve(null);
        const transaction = stepsDB.transaction(['footprints'], 'readonly');
        const store = transaction.objectStore('footprints');
        const request = store.get(charId);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
    });
}

async function initStepsApp() {
    await initStepsDB();
    
    const saved = localStorage.getItem('steps-worlds');
    if (saved) {
        stepsState.worlds = JSON.parse(saved);
    }
    
    // Event listeners
    const addBtn = document.getElementById('steps-add-btn');
    if (addBtn) addBtn.onclick = () => navigateSteps('create_world');
    document.getElementById('steps-delete-btn').onclick = toggleStepsDeleteMode;
    document.getElementById('create-back-btn').onclick = () => navigateSteps('home');
    document.getElementById('create-save-btn').onclick = saveWorld;
    document.getElementById('create-generate-btn').onclick = generateMap;
    document.getElementById('charlist-back-btn').onclick = () => navigateSteps('home');
    document.getElementById('charlist-menu-btn').onclick = toggleCharlistMenu;
    document.getElementById('chardetail-back-btn').onclick = () => navigateSteps('char_list', stepsState.selectedWorldId);
    
    // Input validation
    document.getElementById('create-name').oninput = validateCreateForm;
    document.getElementById('create-desc').oninput = validateCreateForm;
    document.getElementById('create-landmarks').oninput = validateCreateForm;
    
    renderStepsHome();
}

function navigateSteps(view, worldId = null, charId = null) {
    stepsState.view = view;
    stepsState.selectedWorldId = worldId;
    stepsState.selectedCharId = charId;
    
    document.getElementById('steps-home-view').style.display = view === 'home' ? 'flex' : 'none';
    document.getElementById('steps-create-view').style.display = view === 'create_world' ? 'flex' : 'none';
    document.getElementById('steps-charlist-view').style.display = view === 'char_list' ? 'flex' : 'none';
    document.getElementById('steps-chardetail-view').style.display = view === 'char_detail' ? 'flex' : 'none';
    
    if (view === 'home') renderStepsHome();
    else if (view === 'create_world') resetCreateForm();
    else if (view === 'char_list') renderCharList();
    else if (view === 'char_detail') renderCharDetail();
}

function renderStepsHome() {
    const container = document.getElementById('steps-worlds-container');
    const hint = document.getElementById('steps-hint');
    const deleteBtn = document.getElementById('steps-delete-btn');
    const addBtn = document.getElementById('steps-add-btn');
    const header = document.querySelector('#steps-home-view > div:first-child');
    
    if (stepsState.deleteMode) {
        header.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <button onclick="toggleStepsDeleteMode()" style="color: #6B7280; font-weight: 600; font-size: 14px; background: none; border: none; cursor: pointer;">取消</button>
                <span style="font-weight: 800; color: #333; font-size: 20px;">已选择 ${stepsState.selectedDeleteIds.size} 项</span>
                <button onclick="confirmDeleteWorlds()" style="color: #EF4444; font-weight: 700; font-size: 14px; background: none; border: none; cursor: pointer; ${stepsState.selectedDeleteIds.size === 0 ? 'opacity: 0.5;' : ''}" ${stepsState.selectedDeleteIds.size === 0 ? 'disabled' : ''}>删除</button>
            </div>
        `;
        hint.textContent = '点击卡片进行多选';
    } else {
        header.innerHTML = `
            <h1 id="steps-header-title" style="font-size: 20px; font-weight: 800; color: #333; letter-spacing: -0.5px;">足迹</h1>
            <div style="display: flex; gap: 12px;">
                <button id="steps-delete-btn" class="linee-icon-btn" style="color: ${stepsState.worlds.length === 0 ? '#D1D5DB' : '#9CA3AF'};" ${stepsState.worlds.length === 0 ? 'disabled' : ''} onclick="toggleStepsDeleteMode()"><ion-icon name="trash-outline"></ion-icon></button>
                <button id="steps-add-btn" class="linee-icon-btn" style="background: rgba(160,216,239,0.1); color: #A0D8EF;" onclick="navigateSteps('create_world')"><ion-icon name="add" style="--ionicon-stroke-width: 60px;"></ion-icon></button>
            </div>
        `;
        hint.textContent = stepsState.worlds.length > 0 ? '← 滑动选择世界观 →' : '';
    }
    
    if (stepsState.worlds.length === 0) {
        container.innerHTML = '<div style="width: 100%; text-align: center; color: #9CA3AF; padding: 40px 0;">暂无世界观，点击右上角 + 新增</div>';
        return;
    }
    
    container.innerHTML = stepsState.worlds.map(world => {
        const isSelected = stepsState.selectedDeleteIds.has(world.id);
        return `
            <div onclick="handleWorldCardClick('${world.id}')" style="scroll-snap-align: center; flex-shrink: 0; width: 280px; height: 420px; background: #FFFFFF; border-radius: 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); border: ${isSelected ? '2px solid #A0D8EF' : '1px solid #F3F4F6'}; overflow: hidden; display: flex; flex-direction: column; cursor: pointer; transition: all 0.2s; position: relative; ${stepsState.deleteMode ? 'transform: scale(0.95);' : ''}">
                ${stepsState.deleteMode ? `<div style="position: absolute; top: 16px; right: 16px; z-index: 10; width: 24px; height: 24px; border-radius: 50%; border: 2px solid ${isSelected ? '#A0D8EF' : '#9CA3AF'}; background: ${isSelected ? '#A0D8EF' : '#FFFFFF'}; display: flex; align-items: center; justify-content: center;">${isSelected ? '<ion-icon name="checkmark" style="font-size: 14px; color: #FFFFFF; --ionicon-stroke-width: 80px;"></ion-icon>' : ''}</div>` : ''}
                <div style="height: 240px; background: #F3F4F6; position: relative;">
                    <img src="${world.mapImage}" alt="${world.name}" style="width: 100%; height: 100%; object-fit: cover; opacity: ${stepsState.deleteMode ? '0.8' : '0.9'};" />
                    ${!stepsState.deleteMode ? `<div style="position: absolute; top: 16px; right: 16px; background: rgba(255,255,255,0.8); backdrop-filter: blur(4px); padding: 4px 12px; border-radius: 16px; display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: #6B7280;"><ion-icon name="map-outline" style="font-size: 12px;"></ion-icon><span>${world.landmarks.length} 地标</span></div>` : ''}
                </div>
                <div style="flex: 1; padding: 24px; display: flex; flex-direction: column; justify-content: space-between; background: #FFFFFF; position: relative;">
                    <div style="margin-top: -40px; margin-bottom: 8px;">
                        <div style="background: #FFFFFF; padding: 4px; border-radius: 16px; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                            <div style="width: 48px; height: 48px; background: #A0D8EF; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-weight: 700; font-size: 20px;">${world.name.substring(0, 1)}</div>
                        </div>
                    </div>
                    <div>
                        <h3 style="font-size: 20px; font-weight: 700; color: #1F2937; margin-bottom: 4px;">${world.name}</h3>
                        <p style="font-size: 14px; color: #6B7280; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${world.description}</p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 16px;">
                        ${world.characters.length > 0 ? `
                            <div style="display: flex; margin-left: -12px;">
                                ${world.characters.slice(0, 4).map((char, i) => `<img src="${char.avatar}" alt="${char.name}" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #FFFFFF; object-fit: cover; margin-left: -12px;" />`).join('')}
                                ${world.characters.length > 4 ? `<div style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #FFFFFF; background: #F3F4F6; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #6B7280; font-weight: 600; margin-left: -12px;">+${world.characters.length - 4}</div>` : ''}
                            </div>
                        ` : '<span style="font-size: 12px; color: #9CA3AF;">暂无角色</span>'}
                    </div>
                </div>
            </div>
        `;
    }).join('') + '<div style="width: 8px; flex-shrink: 0;"></div>';
}

function handleWorldCardClick(worldId) {
    if (stepsState.deleteMode) {
        if (stepsState.selectedDeleteIds.has(worldId)) {
            stepsState.selectedDeleteIds.delete(worldId);
        } else {
            stepsState.selectedDeleteIds.add(worldId);
        }
        renderStepsHome();
    } else {
        navigateSteps('char_list', worldId);
    }
}

function toggleStepsDeleteMode() {
    stepsState.deleteMode = !stepsState.deleteMode;
    stepsState.selectedDeleteIds.clear();
    renderStepsHome();
}

function confirmDeleteWorlds() {
    if (stepsState.selectedDeleteIds.size === 0) return;
    if (!confirm(`确定删除 ${stepsState.selectedDeleteIds.size} 个世界观？`)) return;
    
    stepsState.worlds = stepsState.worlds.filter(w => !stepsState.selectedDeleteIds.has(w.id));
    localStorage.setItem('steps-worlds', JSON.stringify(stepsState.worlds));
    stepsState.deleteMode = false;
    stepsState.selectedDeleteIds.clear();
    renderStepsHome();
}

function resetCreateForm() {
    document.getElementById('create-name').value = '';
    document.getElementById('create-desc').value = '';
    document.getElementById('create-landmarks').value = '';
    document.getElementById('create-map-preview').innerHTML = `
        <p style="color: #9CA3AF; font-size: 14px; margin-bottom: 16px;">填写完毕后点击生成</p>
        <button id="create-generate-btn" onclick="generateMap()" style="background: #A0D8EF; color: #FFFFFF; padding: 10px 24px; border-radius: 24px; font-weight: 600; box-shadow: 0 2px 8px rgba(160,216,239,0.3); border: none; cursor: pointer; display: flex; align-items: center; gap: 8px;"><ion-icon name="refresh-outline"></ion-icon><span>生成地图</span></button>
    `;
    validateCreateForm();
}

function validateCreateForm() {
    const name = document.getElementById('create-name').value.trim();
    const saveBtn = document.getElementById('create-save-btn');
    
    if (name) {
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
    } else {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
    }
}

function generateMap() {
    const preview = document.getElementById('create-map-preview');
    const worldName = document.getElementById('create-name').value.trim();
    const landmarksInput = document.getElementById('create-landmarks').value.trim();
    const landmarks = landmarksInput ? landmarksInput.split(',').map(l => l.trim()).filter(l => l) : [];
    
    preview.innerHTML = '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #6B7280; font-size: 14px;">生成中...</div>';
    
    setTimeout(() => {
        const mapSvg = generateSimpleMapSVG(worldName, landmarks);
        preview.innerHTML = `
            ${mapSvg}
            <div style="position: absolute; bottom: 16px; right: 16px; display: flex; gap: 8px;">
                <button onclick="generateMap()" style="background: rgba(255,255,255,0.9); backdrop-filter: blur(4px); color: #374151; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: none; cursor: pointer; display: flex; align-items: center; gap: 4px;"><ion-icon name="refresh-outline" style="font-size: 12px;"></ion-icon>重新生成</button>
            </div>
        `;
    }, 1500);
}

function generateSimpleMapSVG(worldName = '', landmarks = []) {
    const areas = [
        {name: '中央街区', type: 'urban', x: 50, y: 50, w: 150, h: 120, color: '#F3F4F6'},
        {name: '绿地公园', type: 'park', x: 220, y: 80, w: 130, h: 100, color: '#D1FAE5'},
        {name: '水域', type: 'water', x: 80, y: 200, w: 100, h: 80, color: '#DBEAFE'}
    ];
    
    const roads = [
        {from: [0, 150], to: [400, 150], width: 4, color: '#E5E7EB'},
        {from: [150, 0], to: [150, 400], width: 4, color: '#E5E7EB'},
        {from: [0, 250], to: [400, 250], width: 2, color: '#F3F4F6'},
        {from: [250, 0], to: [250, 400], width: 2, color: '#F3F4F6'}
    ];
    
    const defaultLandmarks = landmarks.length > 0 ? landmarks.slice(0, 5).map((lm, i) => {
        const positions = [{x: 100, y: 120}, {x: 280, y: 140}, {x: 130, y: 240}, {x: 300, y: 280}, {x: 180, y: 180}];
        return {name: lm, ...positions[i], icon: '📍'};
    }) : [
        {name: '中央广场', x: 100, y: 120, icon: '🏛️'},
        {name: '湖畔咖啡厅', x: 280, y: 140, icon: '☕'},
        {name: '旧书街', x: 130, y: 240, icon: '📚'}
    ];
    
    return `
        <svg width="100%" height="100%" viewBox="0 0 400 400" style="background: #E8EAED;">
            ${areas.map(a => `<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="${a.color}" opacity="0.8" rx="4"/>`).join('')}
            ${roads.map(r => `<line x1="${r.from[0]}" y1="${r.from[1]}" x2="${r.to[0]}" y2="${r.to[1]}" stroke="${r.color}" stroke-width="${r.width}"/>`).join('')}
            ${defaultLandmarks.map(lm => `
                <g>
                    <circle cx="${lm.x}" cy="${lm.y}" r="16" fill="#EF4444" opacity="0.9"/>
                    <circle cx="${lm.x}" cy="${lm.y}" r="6" fill="#FFFFFF"/>
                    <rect x="${lm.x - 35}" y="${lm.y + 20}" width="70" height="20" rx="10" fill="rgba(255,255,255,0.95)" stroke="#D1D5DB" stroke-width="1"/>
                    <text x="${lm.x}" y="${lm.y + 33}" text-anchor="middle" font-size="11" fill="#374151" font-weight="500">${lm.name}</text>
                </g>
            `).join('')}
        </svg>
    `;
}

function saveWorld() {
    const name = document.getElementById('create-name').value.trim();
    if (!name) return;
    
    const desc = document.getElementById('create-desc').value.trim();
    const landmarks = document.getElementById('create-landmarks').value.split(',').map(l => l.trim()).filter(l => l);
    const mapSvg = generateSimpleMapSVG(name, landmarks);
    
    const newWorld = {
        id: 'w' + Date.now(),
        name,
        description: desc || '暂无描述',
        mapImage: mapSvg,
        landmarks,
        characters: []
    };
    
    saveMapToDB(newWorld.id, mapSvg);
    
    stepsState.worlds.push(newWorld);
    localStorage.setItem('steps-worlds', JSON.stringify(stepsState.worlds));
    navigateSteps('home');
}

function renderCharList() {
    const world = stepsState.worlds.find(w => w.id === stepsState.selectedWorldId);
    if (!world) {
        navigateSteps('home');
        return;
    }
    
    const header = document.querySelector('#steps-charlist-view > div:first-child');
    const grid = document.getElementById('charlist-grid');
    
    if (charDeleteMode) {
        header.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0 12px; height: 60px; border-bottom: 1px solid #F5F5F5; background: #FFFFFF; margin-top: 32px;">
                <button onclick="toggleCharDeleteMode()" style="color: #6B7280; font-weight: 600; font-size: 14px; background: none; border: none; cursor: pointer;">取消</button>
                <span style="font-weight: 700; color: #333;">已选择 ${selectedCharIds.size} 项</span>
                <button onclick="confirmDeleteChars()" style="color: #EF4444; font-weight: 700; font-size: 14px; background: none; border: none; cursor: pointer; ${selectedCharIds.size === 0 ? 'opacity: 0.5;' : ''}" ${selectedCharIds.size === 0 ? 'disabled' : ''}>删除</button>
            </div>
        `;
    } else {
        header.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <button id="charlist-back-btn" class="linee-icon-btn" onclick="navigateSteps('home')"><ion-icon name="chevron-back-outline"></ion-icon></button>
                <div>
                    <div class="linee-title" id="charlist-world-name" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${world.name}</div>
                    <p style="font-size: 10px; color: #9CA3AF;">角色列表</p>
                </div>
            </div>
            <div style="position: relative;">
                <button id="charlist-menu-btn" class="linee-icon-btn" onclick="toggleCharlistMenu()"><ion-icon name="ellipsis-vertical"></ion-icon></button>
                <div id="charlist-menu" class="linee-popover hidden" style="right: 0; top: 50px; width: 160px;">
                    <div class="linee-popover-item" onclick="openAddCharModal()"><ion-icon name="person-add-outline"></ion-icon> 新增角色</div>
                    <div class="linee-popover-item" onclick="toggleCharDeleteMode()"><ion-icon name="trash-outline"></ion-icon> 删除角色</div>
                    <div style="height: 1px; background: #F5F5F5; margin: 4px 0;"></div>
                    <div class="linee-popover-item" onclick="openMapRefreshModal()"><ion-icon name="map-outline"></ion-icon> 地图刷新</div>
                    <div class="linee-popover-item" onclick="openFootprintSettingsModal()"><ion-icon name="settings-outline"></ion-icon> 足迹设定</div>
                </div>
            </div>
        `;
    }
    
    grid.innerHTML = world.characters.map(char => {
        const isSelected = selectedCharIds.has(char.id);
        const clickHandler = charDeleteMode ? `toggleCharSelection('${char.id}')` : `navigateSteps('char_detail', '${world.id}', '${char.id}')`;
        return `
        <div onclick="${clickHandler}" style="background: ${isSelected ? 'rgba(160,216,239,0.05)' : '#FFFFFF'}; border: ${isSelected ? '2px solid #A0D8EF' : '1px solid #F3F4F6'}; border-radius: 16px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); cursor: pointer; transition: all 0.2s; position: relative;">
            ${charDeleteMode ? `<div style="position: absolute; top: 8px; right: 8px; width: 20px; height: 20px; border-radius: 50%; border: 2px solid ${isSelected ? '#A0D8EF' : '#D1D5DB'}; background: ${isSelected ? '#A0D8EF' : '#FFFFFF'}; display: flex; align-items: center; justify-content: center;">${isSelected ? '<ion-icon name="checkmark" style="font-size: 12px; color: #FFFFFF; --ionicon-stroke-width: 80px;"></ion-icon>' : ''}</div>` : ''}
            <div style="position: relative;">
                <img src="${char.avatar}" alt="${char.name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 4px solid #F9FAFB;" />
                ${char.hasFootprints && !charDeleteMode ? '<div style="position: absolute; bottom: 0; right: 0; background: #A0D8EF; width: 24px; height: 24px; border-radius: 50%; border: 2px solid #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">👣</div>' : ''}
            </div>
            <div style="text-align: center; width: 100%;">
                <h3 style="font-size: 14px; font-weight: 700; color: #1F2937; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${char.name}</h3>
                <div style="margin-top: 8px; height: 64px; background: #F9FAFB; border-radius: 8px; padding: 8px; display: flex; align-items: center; justify-content: center;">
                    <span style="font-size: 10px; color: ${char.hasFootprints ? '#6B7280' : '#D1D5DB'}; line-height: 1.4; text-align: center;">${char.hasFootprints ? '已生成今日足迹<br/>点击查看详情' : '暂无足迹'}</span>
                </div>
            </div>
        </div>
    `}).join('') + (!charDeleteMode ? `
        <div onclick="openAddCharModal()" style="background: #F9FAFB; border: 2px dashed #D1D5DB; border-radius: 16px; padding: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: all 0.2s; height: 218px;">
            <div style="width: 48px; height: 48px; background: #E5E7EB; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #9CA3AF;"><ion-icon name="add" style="font-size: 24px;"></ion-icon></div>
            <span style="font-size: 12px; color: #9CA3AF; font-weight: 600;">添加新角色</span>
        </div>
    ` : '');
}

function toggleCharSelection(charId) {
    if (selectedCharIds.has(charId)) {
        selectedCharIds.delete(charId);
    } else {
        selectedCharIds.add(charId);
    }
    renderCharList();
}

function confirmDeleteChars() {
    if (selectedCharIds.size === 0) return;
    if (!confirm(`确定删除 ${selectedCharIds.size} 个角色？`)) return;
    
    const world = stepsState.worlds.find(w => w.id === stepsState.selectedWorldId);
    if (!world) return;
    
    world.characters = world.characters.filter(c => !selectedCharIds.has(c.id));
    localStorage.setItem('steps-worlds', JSON.stringify(stepsState.worlds));
    
    charDeleteMode = false;
    selectedCharIds.clear();
    navigateSteps('char_list', stepsState.selectedWorldId);
}

function addCharacter() {
    const name = prompt('输入角色名称：');
    if (!name || !name.trim()) return;
    
    const world = stepsState.worlds.find(w => w.id === stepsState.selectedWorldId);
    if (!world) return;
    
    const newChar = {
        id: 'c' + Date.now(),
        name: name.trim(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name + Date.now()}`,
        hasFootprints: false,
        timeline: []
    };
    
    world.characters.push(newChar);
    localStorage.setItem('steps-worlds', JSON.stringify(stepsState.worlds));
    renderCharList();
}

let charDeleteMode = false;
let selectedCharIds = new Set();

function toggleCharlistMenu() {
    const menu = document.getElementById('charlist-menu');
    menu.classList.toggle('hidden');
    
    document.addEventListener('click', function closeMenu(e) {
        if (!e.target.closest('#charlist-menu-btn') && !e.target.closest('#charlist-menu')) {
            menu.classList.add('hidden');
            document.removeEventListener('click', closeMenu);
        }
    });
}

function openAddCharModal() {
    document.getElementById('charlist-menu').classList.add('hidden');
    const modal = document.getElementById('steps-modal-add-char');
    const friendList = document.getElementById('steps-friend-list');
    
    const world = stepsState.worlds.find(w => w.id === stepsState.selectedWorldId);
    const existingCharNames = world ? world.characters.map(c => c.name) : [];
    
    friendList.innerHTML = lineeFriends.filter(f => !existingCharNames.includes(f.name)).map(friend => `
        <div onclick="addCharFromFriend('${friend.name}', '${friend.avatar}')" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #F9FAFB; border-radius: 10px; cursor: pointer; margin-bottom: 8px; transition: all 0.2s;" onmouseover="this.style.background='#E8F6FA'" onmouseout="this.style.background='#F9FAFB'">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: #E8F6FA; display: flex; align-items: center; justify-content: center; color: #A0D8EF; font-weight: 700; font-size: 16px;">${friend.avatar}</div>
            <div style="flex: 1;">
                <div style="font-size: 14px; font-weight: 600; color: #333;">${friend.name}</div>
                <div style="font-size: 11px; color: #9CA3AF;">${friend.status}</div>
            </div>
            <ion-icon name="add-circle-outline" style="font-size: 24px; color: #A0D8EF;"></ion-icon>
        </div>
    `).join('');
    
    if (friendList.innerHTML === '') {
        friendList.innerHTML = '<div style="text-align: center; color: #9CA3AF; padding: 20px; font-size: 13px;">所有好友已添加</div>';
    }
    
    modal.classList.remove('hidden');
}

function addCharFromFriend(name, avatar) {
    const world = stepsState.worlds.find(w => w.id === stepsState.selectedWorldId);
    if (!world) return;
    
    const newChar = {
        id: 'c' + Date.now(),
        name: name,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
        hasFootprints: false,
        timeline: []
    };
    
    world.characters.push(newChar);
    localStorage.setItem('steps-worlds', JSON.stringify(stepsState.worlds));
    closeStepsModal('steps-modal-add-char');
    renderCharList();
}

function toggleCharDeleteMode() {
    const menu = document.getElementById('charlist-menu');
    if (menu) menu.classList.add('hidden');
    charDeleteMode = !charDeleteMode;
    selectedCharIds.clear();
    renderCharList();
}

function openMapRefreshModal() {
    document.getElementById('charlist-menu').classList.add('hidden');
    document.getElementById('steps-modal-map-refresh').classList.remove('hidden');
    document.getElementById('map-refresh-keyword').value = '';
    document.getElementById('map-refresh-preview').innerHTML = '<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #9CA3AF; font-size: 12px;">点击刷新按钮预览</div>';
    document.getElementById('map-refresh-changelog').style.display = 'none';
}

function executeMapRefresh() {
    const keyword = document.getElementById('map-refresh-keyword').value.trim();
    const preview = document.getElementById('map-refresh-preview');
    const changelog = document.getElementById('map-refresh-changelog');
    const btn = document.getElementById('map-refresh-btn');
    
    btn.textContent = '生成中...';
    btn.disabled = true;
    
    setTimeout(() => {
        const newMapUrl = 'https://images.unsplash.com/photo-1478860409698-8707f313ee8b?auto=format&fit=crop&q=80&w=600';
        preview.innerHTML = `<img src="${newMapUrl}" style="width: 100%; height: 100%; object-fit: cover;" />`;
        
        const changes = keyword ? 
            `基于关键词「${keyword}」调整了地图生成逻辑：<br/>• 新增：北部高地、迷雾森林<br/>• 移除：旧城区废墟<br/>• 地形变化：河流改道向东流淌` :
            '• 随机重构了地图纹理<br/>• 更新了光照渲染<br/>• 调整了部分植被分布';
        
        changelog.innerHTML = changes;
        changelog.style.display = 'block';
        
        btn.textContent = '保存并应用';
        btn.disabled = false;
        btn.onclick = () => {
            const world = stepsState.worlds.find(w => w.id === stepsState.selectedWorldId);
            if (world) {
                world.mapImage = newMapUrl;
                localStorage.setItem('steps-worlds', JSON.stringify(stepsState.worlds));
            }
            closeStepsModal('steps-modal-map-refresh');
            alert('地图已更新！');
        };
    }, 1500);
}

function openFootprintSettingsModal() {
    document.getElementById('charlist-menu').classList.add('hidden');
    const modal = document.getElementById('steps-modal-footprint-settings');
    const charList = document.getElementById('footprint-char-list');
    
    const world = stepsState.worlds.find(w => w.id === stepsState.selectedWorldId);
    if (!world) return;
    
    charList.innerHTML = world.characters.map(char => {
        const canRegenerate = char.lastGenerated ? (Date.now() - char.lastGenerated) / 1000 / 60 >= 30 : false;
        const buttonText = char.hasFootprints ? (canRegenerate ? '重新生成' : '已生成') : '生成';
        
        return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #F9FAFB; border-radius: 10px;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <img src="${char.avatar}" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid #E5E7EB; object-fit: cover;" />
                <div>
                    <div style="font-size: 14px; font-weight: 600; color: #333;">${char.name}</div>
                    ${char.lastGenerated ? `<div style="font-size: 10px; color: #9CA3AF;">最后更新: ${new Date(char.lastGenerated).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}</div>` : ''}
                </div>
            </div>
            <button onclick="toggleCharFootprint('${char.id}')" style="padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; border: none; cursor: pointer; ${char.hasFootprints ? (canRegenerate ? 'background: #FEF3C7; color: #D97706;' : 'background: rgba(160,216,239,0.2); color: #A0D8EF;') : 'background: #FFFFFF; border: 1px solid #E5E7EB; color: #6B7280;'}">${buttonText}</button>
        </div>
    `}).join('');
    
    modal.classList.remove('hidden');
}

async function generateAllFootprints() {
    const world = stepsState.worlds.find(w => w.id === stepsState.selectedWorldId);
    if (!world) return;
    
    for (const char of world.characters) {
        const existingData = await getFootprintFromDB(char.id);
        const existingTimeline = existingData?.timeline || char.timeline || [];
        
        char.hasFootprints = true;
        char.timeline = generateRealtimeTimeline(char.name, world.landmarks, existingTimeline);
        char.lastGenerated = Date.now();
        
        await saveFootprintToDB(char.id, {
            timeline: char.timeline,
            lastGenerated: char.lastGenerated
        });
    }
    
    localStorage.setItem('steps-worlds', JSON.stringify(stepsState.worlds));
    closeStepsModal('steps-modal-footprint-settings');
    renderCharList();
    alert('全员足迹已生成！');
}

async function toggleCharFootprint(charId) {
    const world = stepsState.worlds.find(w => w.id === stepsState.selectedWorldId);
    if (!world) return;
    
    const char = world.characters.find(c => c.id === charId);
    if (!char) return;
    
    if (!char.hasFootprints) {
        char.hasFootprints = true;
        char.timeline = generateRealtimeTimeline(char.name, world.landmarks, char.timeline || []);
        char.lastGenerated = Date.now();
        
        await saveFootprintToDB(charId, {
            timeline: char.timeline,
            lastGenerated: char.lastGenerated
        });
    } else {
        const existingData = await getFootprintFromDB(charId);
        const existingTimeline = existingData?.timeline || char.timeline || [];
        
        char.timeline = generateRealtimeTimeline(char.name, world.landmarks, existingTimeline);
        char.lastGenerated = Date.now();
        
        await saveFootprintToDB(charId, {
            timeline: char.timeline,
            lastGenerated: char.lastGenerated
        });
    }
    
    localStorage.setItem('steps-worlds', JSON.stringify(stepsState.worlds));
    openFootprintSettingsModal();
}

function generateRealtimeTimeline(charName, landmarks, existingTimeline = []) {
    const now = new Date();
    const today = now.toDateString();
    
    const lastEvent = existingTimeline.length > 0 ? existingTimeline[existingTimeline.length - 1] : null;
    let lastTime = null;
    
    if (lastEvent && lastEvent.date === today) {
        const [hours, minutes] = lastEvent.time.split(':').map(Number);
        lastTime = new Date();
        lastTime.setHours(hours, minutes, 0, 0);
        
        const timeDiff = (now - lastTime) / 1000 / 60;
        if (timeDiff < 30) {
            return existingTimeline;
        }
    }
    
    const startTime = lastTime || new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const newEvents = [];
    
    const actions = [
        '在这里开始了一天',
        '遇到了一些有趣的事',
        '在这里休息了一会',
        '在这里停留了较长时间',
        '继续前往下一个地点'
    ];
    
    let currentTime = new Date(startTime);
    let eventCount = 0;
    const maxEvents = 5;
    
    while (currentTime < now && eventCount < maxEvents) {
        const hourIncrement = Math.floor(Math.random() * 3) + 1;
        currentTime.setHours(currentTime.getHours() + hourIncrement);
        
        if (currentTime > now) break;
        
        const timeStr = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;
        const location = landmarks[eventCount % landmarks.length] || '未知地点';
        
        newEvents.push({
            id: 'e' + Date.now() + eventCount,
            time: timeStr,
            date: today,
            location: location,
            description: `${charName}${actions[eventCount % actions.length]}。`,
            relatedCharIds: []
        });
        
        eventCount++;
    }
    
    return [...existingTimeline, ...newEvents];
}

function closeStepsModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function renderCharDetail() {
    const world = stepsState.worlds.find(w => w.id === stepsState.selectedWorldId);
    const char = world?.characters.find(c => c.id === stepsState.selectedCharId);
    
    if (!world || !char) {
        navigateSteps('char_list', stepsState.selectedWorldId);
        return;
    }
    
    document.getElementById('chardetail-char-name').textContent = char.name + ' 的足迹';
    
    const mapDiv = document.getElementById('chardetail-map');
    const hasFootprints = char.hasFootprints && char.timeline && char.timeline.length > 0;
    
    if (hasFootprints) {
        mapDiv.innerHTML = generateFootprintMapSVG(char, world);
    } else {
        mapDiv.innerHTML = `
            ${generateSimpleMapSVG(world.name, world.landmarks)}
            <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;"><div style="background: rgba(0,0,0,0.3); backdrop-filter: blur(8px); padding: 8px 16px; border-radius: 12px; color: #FFFFFF; font-size: 14px;">尚未生成今日足迹</div></div>
        `;
    }
    
    const timelineDiv = document.getElementById('chardetail-timeline');
    
    if (!hasFootprints) {
        timelineDiv.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #9CA3AF; gap: 16px;">
                <ion-icon name="time-outline" style="font-size: 48px; opacity: 0.5;"></ion-icon>
                <p style="font-size: 14px;">时间线是空的</p>
                <p style="font-size: 12px; text-align: center; max-width: 200px; line-height: 1.5;">请返回角色列表，在管理选单中点击「足迹设定」或「一键刷新」来生成。</p>
            </div>
        `;
    } else {
        timelineDiv.innerHTML = `
            <div style="position: relative; padding-left: 16px; display: flex; flex-direction: column; gap: 32px; padding-bottom: 40px;">
                <div style="position: absolute; left: 7px; top: 8px; bottom: 0; width: 2px; background: rgba(160,216,239,0.3);"></div>
                ${char.timeline.map(event => `
                    <div style="position: relative; padding-left: 24px;">
                        <div style="position: absolute; left: 0; top: 6px; width: 16px; height: 16px; background: #FFFFFF; border: 2px solid #A0D8EF; border-radius: 50%; z-index: 10;"></div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: #A0D8EF; font-weight: 700; font-size: 14px; font-family: monospace;">${event.time}</span>
                                <span style="color: #9CA3AF; font-size: 12px; display: flex; align-items: center; gap: 4px; background: #F9FAFB; padding: 2px 8px; border-radius: 12px;"><ion-icon name="location-outline" style="font-size: 10px;"></ion-icon>${event.location}</span>
                            </div>
                            <p style="color: #1F2937; font-size: 14px; line-height: 1.6; background: #F9FAFB; padding: 12px; border-radius: 12px; border-top-left-radius: 0; margin-top: 4px;">${event.description}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

window.initStepsApp = initStepsApp;
window.navigateSteps = navigateSteps;
window.handleWorldCardClick = handleWorldCardClick;
window.toggleStepsDeleteMode = toggleStepsDeleteMode;
window.confirmDeleteWorlds = confirmDeleteWorlds;
window.generateMap = generateMap;
window.saveWorld = saveWorld;
window.addCharacter = addCharacter;
window.toggleCharlistMenu = toggleCharlistMenu;
window.validateCreateForm = validateCreateForm;
window.openAddCharModal = openAddCharModal;
window.addCharFromFriend = addCharFromFriend;
window.toggleCharDeleteMode = toggleCharDeleteMode;
window.openMapRefreshModal = openMapRefreshModal;
window.executeMapRefresh = executeMapRefresh;
window.openFootprintSettingsModal = openFootprintSettingsModal;
window.generateAllFootprints = generateAllFootprints;
window.toggleCharFootprint = toggleCharFootprint;
window.closeStepsModal = closeStepsModal;
window.toggleCharSelection = toggleCharSelection;
window.confirmDeleteChars = confirmDeleteChars;
window.generateSimpleMapSVG = generateSimpleMapSVG;

function generateFootprintMapSVG(char, world) {
    const timeline = char.timeline || [];
    const positions = [
        {x: 100, y: 120},
        {x: 280, y: 140},
        {x: 130, y: 240},
        {x: 300, y: 280}
    ];
    
    const areas = [
        {x: 50, y: 50, w: 150, h: 120, color: '#F3F4F6'},
        {x: 220, y: 80, w: 130, h: 100, color: '#D1FAE5'},
        {x: 80, y: 200, w: 100, h: 80, color: '#DBEAFE'}
    ];
    
    const roads = [
        {from: [0, 150], to: [400, 150], width: 4, color: '#E5E7EB'},
        {from: [150, 0], to: [150, 400], width: 4, color: '#E5E7EB'},
        {from: [0, 250], to: [400, 250], width: 2, color: '#F3F4F6'},
        {from: [250, 0], to: [250, 400], width: 2, color: '#F3F4F6'}
    ];
    
    let pathD = '';
    if (timeline.length > 0) {
        pathD = `M ${positions[0].x} ${positions[0].y}`;
        for (let i = 1; i < Math.min(timeline.length, positions.length); i++) {
            pathD += ` L ${positions[i].x} ${positions[i].y}`;
        }
    }
    
    const markers = timeline.slice(0, positions.length).map((event, i) => {
        const pos = positions[i];
        const relatedChars = event.relatedCharIds || [];
        return `
            <g>
                <circle cx="${pos.x}" cy="${pos.y}" r="24" fill="#FFFFFF" stroke="#A0D8EF" stroke-width="3" opacity="0.95"/>
                <circle cx="${pos.x}" cy="${pos.y}" r="18" fill="#A0D8EF" opacity="0.3"/>
                <text x="${pos.x}" y="${pos.y + 5}" text-anchor="middle" font-size="16" fill="#FFFFFF" font-weight="700">${i + 1}</text>
                ${relatedChars.length > 0 ? `<circle cx="${pos.x + 16}" cy="${pos.y - 16}" r="10" fill="#10B981" stroke="#FFFFFF" stroke-width="2"/>` : ''}
                <rect x="${pos.x - 40}" y="${pos.y + 30}" width="80" height="22" rx="11" fill="rgba(255,255,255,0.98)" stroke="#D1D5DB" stroke-width="1"/>
                <text x="${pos.x}" y="${pos.y + 45}" text-anchor="middle" font-size="11" fill="#374151" font-weight="600">${event.location}</text>
            </g>
        `;
    }).join('');
    
    return `
        <svg width="100%" height="100%" viewBox="0 0 400 400" style="background: #E8EAED;">
            ${areas.map(a => `<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" fill="${a.color}" opacity="0.8" rx="4"/>`).join('')}
            ${roads.map(r => `<line x1="${r.from[0]}" y1="${r.from[1]}" x2="${r.to[0]}" y2="${r.to[1]}" stroke="${r.color}" stroke-width="${r.width}"/>`).join('')}
            ${pathD ? `<path d="${pathD}" fill="none" stroke="#A0D8EF" stroke-width="4" stroke-dasharray="8,4" opacity="0.8"/>` : ''}
            ${markers}
        </svg>
    `;
}

window.generateFootprintMapSVG = generateFootprintMapSVG;

function openChatRoom(chatId, chatName) {
    currentChatId = chatId;
    document.getElementById('linee-tab-chats').style.display = 'none';
    document.getElementById('linee-chat-room').style.display = 'flex';
    document.getElementById('chat-room-name').textContent = chatName;
    
    if (!chatMessages[chatId]) {
        chatMessages[chatId] = [
            { id: '1', text: '你好！', time: '12:00', isUser: false, type: 'text' },
            { id: '2', text: '你好！有什么可以帮你的吗？', time: '12:01', isUser: true, type: 'text' },
            { id: '3', text: '这个APP的界面设计很不错。', time: '12:02', isUser: false, type: 'text' }
        ];
    }
    renderChatMessages();
}

function closeChatRoom() {
    document.getElementById('linee-chat-room').style.display = 'none';
    document.getElementById('linee-tab-chats').style.display = 'block';
    currentChatId = null;
}

function renderChatMessages() {
    const container = document.getElementById('chat-messages-container');
    if (!container || !currentChatId) return;
    
    const messages = chatMessages[currentChatId] || [];
    container.innerHTML = messages.map(msg => {
        const isUser = msg.isUser;
        const bgColor = isUser ? '#A0D8EF' : '#FFFFFF';
        const textColor = isUser ? '#1F2937' : '#1F2937';
        const borderRadius = isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px';
        const border = isUser ? '' : 'border: 1px solid #F3F4F6;';
        
        let content = '';
        if (msg.type === 'image') {
            content = `<div style="width: 160px; height: 160px; background: #E5E7EB; margin-bottom: 4px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #6B7280; font-size: 12px;">${msg.text}</div>`;
        } else if (msg.type === 'audio') {
            content = `<div style="display: flex; align-items: center; gap: 8px; min-width: 120px;"><ion-icon name="mic-outline" style="font-size: 16px;"></ion-icon><span>语音讯息</span></div>`;
        } else {
            content = msg.text;
        }
        
        return `
            <div style="display: flex; justify-content: ${isUser ? 'flex-end' : 'flex-start'}; margin-bottom: 16px;">
                <div style="max-width: 70%; padding: 10px 14px; border-radius: ${borderRadius}; background: ${bgColor}; color: ${textColor}; ${border} box-shadow: 0 1px 2px rgba(0,0,0,0.05); position: relative;">
                    <div style="font-size: 15px; line-height: 1.5;">${content}</div>
                    <span style="font-size: 10px; color: #9CA3AF; display: block; text-align: right; margin-top: 4px; opacity: 0.7;">${msg.time}</span>
                </div>
            </div>
        `;
    }).join('');
    container.scrollTop = container.scrollHeight;
}

let promptType = null;

function togglePlusMenu() {
    const menu = document.getElementById('plus-menu');
    const btn = document.getElementById('plus-menu-btn');
    if (menu.style.display === 'none' || !menu.style.display) {
        menu.style.display = 'grid';
        btn.style.background = '#F3F4F6';
        btn.style.color = '#A0D8EF';
    } else {
        menu.style.display = 'none';
        btn.style.background = '';
        btn.style.color = '';
    }
}

function promptImageMessage() {
    promptType = 'image';
    document.getElementById('prompt-title').textContent = '描述图片内容';
    document.getElementById('prompt-input').placeholder = '例如：一只在海边喝椰子的猫...';
    document.getElementById('prompt-input').value = '';
    document.getElementById('prompt-modal').style.display = 'flex';
}

function promptAudioMessage() {
    promptType = 'audio';
    document.getElementById('prompt-title').textContent = '输入语音内容';
    document.getElementById('prompt-input').placeholder = '输入您想说的话...';
    document.getElementById('prompt-input').value = '';
    document.getElementById('prompt-modal').style.display = 'flex';
}

function closePromptModal() {
    document.getElementById('prompt-modal').style.display = 'none';
    promptType = null;
}

function submitPrompt() {
    const input = document.getElementById('prompt-input');
    const text = input.value.trim();
    if (!text || !currentChatId) {
        closePromptModal();
        return;
    }
    
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const messageText = promptType === 'image' ? `[图片] ${text}` : `[语音] ${text}`;
    
    chatMessages[currentChatId].push({ text: messageText, time, isUser: true, type: promptType });
    renderChatMessages();
    closePromptModal();
}

function handleAIRead() {
    if (!currentChatId) return;
    
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const loadingId = 'loading_' + Date.now();
    
    chatMessages[currentChatId].push({ 
        id: loadingId,
        text: 'AI 正在阅读聊天记录并思考...', 
        time, 
        isUser: false,
        type: 'text'
    });
    renderChatMessages();
    
    setTimeout(() => {
        const messages = chatMessages[currentChatId];
        const index = messages.findIndex(m => m.id === loadingId);
        if (index !== -1) {
            messages[index].text = '根据上下文，我觉得你们应该去吃火锅！🍲';
        }
        renderChatMessages();
    }, 1500);
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    const text = input.value.trim();
    if (!text || !currentChatId) return;
    
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    chatMessages[currentChatId].push({ text, time, isUser: true, type: 'text' });
    input.value = '';
    renderChatMessages();
    
    if (!state.apiConfig.url || !state.apiConfig.key) {
        chatMessages[currentChatId].push({ text: '请先在设置中配置 API', time, isUser: false, type: 'text' });
        renderChatMessages();
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
        chatMessages[currentChatId].push({ text: reply, time, isUser: false, type: 'text' });
        renderChatMessages();
    } catch (e) {
        chatMessages[currentChatId].push({ text: '发送失败: ' + e.message, time, isUser: false, type: 'text' });
        renderChatMessages();
    }
}

window.openChatRoom = openChatRoom;
window.closeChatRoom = closeChatRoom;
window.sendChatMessage = sendChatMessage;
window.togglePlusMenu = togglePlusMenu;
window.promptImageMessage = promptImageMessage;
window.promptAudioMessage = promptAudioMessage;
window.closePromptModal = closePromptModal;
window.submitPrompt = submitPrompt;
window.handleAIRead = handleAIRead;

// 工具函数
function download(filename, text) {
    const a = document.createElement('a');
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
    a.download = filename;
    a.click();
}
