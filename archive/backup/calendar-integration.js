// calendar-integration.js - 整合主页日历和完整日历应用
// 修复：让 calendar.js 使用主页的 #today-memo-widget

(function(){

  const BACKUP_PREFIX = 'backup:';
  const NOTE_PREFIX = 'note:';
  const INDICATOR_KEY = '_last_note_update';

  function nowTs(){ return Date.now(); }
  
  function localDateKey(date = new Date()){
    const y = date.getFullYear();
    const m = String(date.getMonth()+1).padStart(2,'0');
    const d = String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }

  function noteKey(dateKey){ return NOTE_PREFIX + dateKey; }
  function backupKey(k){ return BACKUP_PREFIX + k + ':' + nowTs(); }

  function safeSet(k,v){ try{ localStorage.setItem(k,v); return true; }catch(e){console.error(e);return false;} }
  function safeGet(k){ try{ return localStorage.getItem(k); }catch(e){return null;} }
  function safeRemove(k){ try{ localStorage.removeItem(k); return true; }catch(e){return false;} }

  function backupBeforeWrite(noteKeyFull){
    const cur = safeGet(noteKeyFull);
    if(cur !== null && cur !== undefined){
      safeSet(backupKey(noteKeyFull), cur);
      appendLog('backup', noteKeyFull, null);
    }
  }

  function appendLog(action, key, payload){
    const LOG = '_note_log';
    let arr = [];
    try{ arr = JSON.parse(safeGet(LOG) || '[]'); }catch(e){ arr = []; }
    arr.push({ action, key, payload, ts: nowTs() });
    safeSet(LOG, JSON.stringify(arr));
  }

  function loadNoteForDate(dateKey){
    const raw = safeGet(noteKey(dateKey));
    if(!raw) return '';
    try{ const obj = JSON.parse(raw); return obj.content || ''; }catch(e){ return raw; }
  }

  function loadNoteRaw(dateKey){
    const raw = safeGet(noteKey(dateKey)); 
    if(!raw) return null;
    try{ return JSON.parse(raw); }catch(e){ return {content: raw, updatedAt:0}; }
  }

  function saveNoteForDate(dateKey, content){
    const k = noteKey(dateKey);
    backupBeforeWrite(k);

    const trimmed = (content||'').replace(/\r\n/g,'\n');
    if(trimmed.trim() === ''){
      safeRemove(k);
      appendLog('remove', k, null);
    } else {
      const payload = { content: trimmed, updatedAt: nowTs() };
      safeSet(k, JSON.stringify(payload));
      appendLog('save', k, {updatedAt: payload.updatedAt});
    }

    const info = { dateKey, ts: nowTs() };
    try{ safeSet(INDICATOR_KEY, JSON.stringify(info)); setTimeout(()=> safeRemove(INDICATOR_KEY), 80); }catch(e){}
    window.dispatchEvent(new CustomEvent('notes-updated', { detail: info }));
    processNoteUpdate(dateKey);
  }

  // 获取主页的 #today-memo-widget（将在 DOMContentLoaded 中初始化）
  let taskBox = null;

  // ⚡ 立即调整高度，强制重排
  function adjustTaskBoxHeight(){
    if(!taskBox) return;
    
    // 🔥 立即同步执行，强制浏览器重排
    taskBox.style.overflowY = 'hidden';
    
    // 强制重排：先设置 auto，触发重新计算
    taskBox.style.height = 'auto';
    
    // 立即读取计算后的样式（强制重排）
    const style = window.getComputedStyle(taskBox);
    let lh = parseFloat(style.lineHeight);
    if(isNaN(lh)) lh = (parseFloat(style.fontSize)||14) * 1.2;
    const padding = (parseFloat(style.paddingTop)||0) + (parseFloat(style.paddingBottom)||0);
    const maxLines = 5;
    const maxHeight = (lh * maxLines) + padding;

    // 读取 scrollHeight（强制重排）
    const needed = taskBox.scrollHeight;
    
    // 设置最终高度
    taskBox.style.height = Math.min(needed, maxHeight) + 'px';
    
    // 🔥 强制浏览器立即应用样式
    void taskBox.offsetHeight;
  }

  function countLines(t){
    if(!t) return 0;
    const style = window.getComputedStyle(t);
    let lh = parseFloat(style.lineHeight);
    if(isNaN(lh)) lh = (parseFloat(style.fontSize)||14) * 1.2;
    const padding = (parseFloat(style.paddingTop)||0) + (parseFloat(style.paddingBottom)||0);
    return Math.round((t.scrollHeight - padding) / lh);
  }

  function autoResizeMemoInput(el){
    if(!el) return;
    el.style.overflowY = 'hidden';
    el.style.height = 'auto';
    const style = window.getComputedStyle(el);
    let lh = parseFloat(style.lineHeight);
    if(isNaN(lh)) lh = (parseFloat(style.fontSize)||14) * 1.2;
    const padding = (parseFloat(style.paddingTop)||0) + (parseFloat(style.paddingBottom)||0);
    const maxLines = 5;
    const maxHeight = (lh * maxLines) + padding;
    el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px';
  }

  // 初始化任务栏事件（在 DOMContentLoaded 中调用）
  function initTaskBoxEvents(){
    taskBox = document.getElementById('today-memo-widget');
    if(!taskBox){
      console.warn('⚠️ 未找到 #today-memo-widget');
      return;
    }

    console.log('✅ 初始化任务栏事件');

    // 输入事件：自动调整高度 + 自动保存
    taskBox.addEventListener('input', ()=>{
      console.log('📝 任务栏输入:', taskBox.value.substring(0, 20) + '...');
      adjustTaskBoxHeight();
      scheduleAutoSave();
    });
    
    // 键盘事件：限制5行
    taskBox.addEventListener('keydown', (e)=>{
      if(e.key === 'Enter'){
        const lines = countLines(taskBox);
        if(lines >= 5){
          e.preventDefault();
          console.log('⚠️ 已达到5行限制');
        }
      }
    });

    // 失焦事件：立即保存
    taskBox.addEventListener('blur', ()=>{
      if(currentEditingDate){
        console.log('💾 失焦保存:', currentEditingDate);
        saveNoteForDate(currentEditingDate, taskBox.value);
      }
    });

    // 额外事件：确保高度随时刷新（即使 input 未触发）
    ['keyup','change','compositionend','paste','focus'].forEach(evt => {
      taskBox.addEventListener(evt, ()=>{
        adjustTaskBoxHeight();
      });
    });

    console.log('✅ 任务栏事件已绑定');
  }

  let autoSaveTimer = null;
  const AUTO_SAVE_DELAY = 800;
  function scheduleAutoSave(){
    if(autoSaveTimer) clearTimeout(autoSaveTimer);
    console.log('⏰ 计划自动保存（800ms 后）');
    autoSaveTimer = setTimeout(() => {
      if(currentEditingDate && taskBox){
        console.log('💾 自动保存:', currentEditingDate, '→', taskBox.value.substring(0, 30) + '...');
        saveNoteForDate(currentEditingDate, taskBox.value);
        
        // 🔥 保存后立即调整高度
        console.log('📏 保存后调整高度');
        adjustTaskBoxHeight();
        
        // 🔥 强制浏览器立即应用
        void taskBox.offsetHeight;
      }
      autoSaveTimer = null;
    }, AUTO_SAVE_DELAY);
  }

  // 渲染主页迷你日历（在 #calendar-widget）
  function renderMiniCalendar(containerId='calendar-widget', focusDate = new Date()){
    const container = document.getElementById(containerId);
    if(!container) return;

    console.log('🔒 渲染前保护：获取今天的任务状态');
    const todayKey = localDateKey(new Date());
    const currentTask = loadNoteRaw(todayKey); // 获取当前真实状态

    const year = focusDate.getFullYear();
    const month = focusDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const today = localDateKey();

    let html = `<div style="padding:5px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <button id="cal-prev" style="border:none;background:none;font-size:14px;cursor:pointer;padding:5px">◀</button>
            <div style="font-size:11px;font-weight:bold">${year}年${month + 1}月</div>
            <button id="cal-next" style="border:none;background:none;font-size:14px;cursor:pointer;padding:5px">▶</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;font-size:8px;text-align:center">
            <div style="font-weight:bold">日</div><div style="font-weight:bold">一</div><div style="font-weight:bold">二</div><div style="font-weight:bold">三</div><div style="font-weight:bold">四</div><div style="font-weight:bold">五</div><div style="font-weight:bold">六</div>`;

    for(let i = 0; i < firstDay; i++) html += '<div></div>';

    for(let day = 1; day <= daysInMonth; day++){
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === today;
      const hasNote = !!safeGet(noteKey(dateStr));
      const bgColor = isToday ? 'background:#007AFF;color:white;font-weight:bold;' : '';
      const border = hasNote ? 'border:1px solid #FF9500;' : '';
      html += `<div style="padding:4px 2px;text-align:center;border-radius:4px;cursor:pointer;font-size:9px;${bgColor}${border}" class="cal-day" data-date="${dateStr}">${day}</div>`;
    }

    html += '</div></div>';
    container.innerHTML = html;

    // 🔒 渲染后立即恢复任务栏状态（防止被覆盖）
    console.log('🔒 渲染后保护：恢复今天的任务状态');
    // 使用 RAF 而不是微任务，减少延迟
    requestAnimationFrame(() => {
      forceUpdateTaskBox(currentTask ? currentTask.content : '');
    });

    // 绑定上下月按钮
    const prevBtn = document.getElementById('cal-prev');
    const nextBtn = document.getElementById('cal-next');

    if(prevBtn){
      prevBtn.onclick = (e) => {
        e.stopPropagation();
        focusDate.setMonth(focusDate.getMonth() - 1);
        renderMiniCalendar(containerId, focusDate);
        // 🔒 切换月份后也要恢复任务栏（立即执行，不延迟）
        const todayTask = loadNoteRaw(todayKey);
        forceUpdateTaskBox(todayTask ? todayTask.content : '');
      };
    }

    if(nextBtn){
      nextBtn.onclick = (e) => {
        e.stopPropagation();
        focusDate.setMonth(focusDate.getMonth() + 1);
        renderMiniCalendar(containerId, focusDate);
        // 🔒 切换月份后也要恢复任务栏（立即执行，不延迟）
        const todayTask = loadNoteRaw(todayKey);
        forceUpdateTaskBox(todayTask ? todayTask.content : '');
      };
    }

    // 绑定日期点击
    container.querySelectorAll('.cal-day').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        currentEditingDate = el.dataset.date;
        const note = loadNoteForDate(currentEditingDate);
        
        // 添加选中效果
        container.querySelectorAll('.cal-day').forEach(d => {
          d.style.background = d.dataset.date === currentEditingDate ? '#007AFF' : '';
          d.style.color = d.dataset.date === currentEditingDate ? 'white' : '';
        });

        // 打开日历应用并显示记事
        if(typeof openApp === 'function'){
          openApp('calendar-app');
          
          // 更新日历应用中的记事输入框
          setTimeout(() => {
            const memoInput = document.getElementById('memo-input');
            const memoTitle = document.getElementById('memo-date-title');
            if(memoInput){
              memoInput.value = note || '';
              memoInput.placeholder = note ? '' : '输入备忘录...';
            }
            if(memoTitle){
              memoTitle.textContent = `${currentEditingDate} 备忘录`;
            }
            
            // 渲染完整日历（如果需要）
            renderFullCalendarIfNeeded();
          }, 100);
        }
      };
    });
  }

  function processNoteUpdate(dateKey){
    // 更新日历标记
    const miniCalDays = document.querySelectorAll(`#calendar-widget .cal-day[data-date="${dateKey}"]`);
    const fullCalDays = document.querySelectorAll(`#calendar .day[data-date="${dateKey}"]`);
    const exists = !!safeGet(noteKey(dateKey));
    
    miniCalDays.forEach(el => {
      if(exists){
        el.style.border = '1px solid #FF9500';
      }else{
        el.style.border = '';
      }
    });

    fullCalDays.forEach(el => el.classList.toggle('has-note', exists));

    // 更新 taskbox
    const todayKey = localDateKey();
    if(dateKey === currentEditingDate || dateKey === todayKey){
      const payload = loadNoteRaw(dateKey);
      forceUpdateTaskBox(payload ? payload.content : '');
    }
  }

  function forceUpdateTaskBox(content){
    const norm = (content||'').trim();
    if(!taskBox) return;

    // 立即更新内容
    if(norm === ''){
      taskBox.value = '';
      taskBox.placeholder = '今天沒有任務';
    } else {
      taskBox.value = content;
      taskBox.placeholder = '';
    }

    // 🔥 强制浏览器立即应用内容变化
    void taskBox.offsetHeight;
    
    // 🔥 立即调整高度（同步执行，强制重排）
    adjustTaskBoxHeight();
    
    // 🔥 再次强制重排，确保高度已应用
    void taskBox.offsetHeight;

    const detail = { value: taskBox.value };

    // 🔄 再在下一帧重新调整一次，避免隐藏/过渡导致的高度被压缩
    requestAnimationFrame(() => {
      adjustTaskBoxHeight();
      void taskBox.offsetHeight;
      window.dispatchEvent(new CustomEvent('taskbox-updated', { detail }));
    });
  }

  // 跨标签页同步
  window.addEventListener('storage', (ev)=>{
    if(!ev) return;
    if(ev.key === INDICATOR_KEY && ev.newValue){
      try{
        const info = JSON.parse(ev.newValue);
        if(info && info.dateKey) processNoteUpdate(info.dateKey);
      }catch(e){}
    }
  });

  window.addEventListener('notes-updated', (e)=>{
    const info = e.detail;
    if(info && info.dateKey) processNoteUpdate(info.dateKey);
  });

  // 初始化
  let currentEditingDate = localDateKey();
  let calendarDate = new Date();

  function bootstrapCalendarIntegration(){
    console.log('🎯 calendar-integration.js 初始化开始');

    // 🔥 1. 先初始化任务栏事件
    initTaskBoxEvents();

    // 🔥 2. 加载今天的记事到任务栏
    const todayNote = loadNoteForDate(currentEditingDate);
    console.log('📅 今天的记事:', todayNote || '(空)');

    if(taskBox){
      taskBox.value = todayNote || '';
      taskBox.placeholder = todayNote ? '' : '今天沒有任務';
      adjustTaskBoxHeight();
      console.log('✅ 任务栏已加载今天的内容');
    } else {
      console.error('❌ taskBox 仍然是 null');
    }

    // 🔥 3. 渲染迷你日历（注意：现在有保护机制，不会覆盖任务栏）
    renderMiniCalendar('calendar-widget', calendarDate);

    // 🔥 4. 确保任务栏显示正确（使用 RAF，避免双重延迟）
    requestAnimationFrame(()=> {
      console.log('🔄 processNoteUpdate:', currentEditingDate);
      processNoteUpdate(currentEditingDate);
    });

    const memoInputDom = document.getElementById('memo-input');
    if(memoInputDom){
      ['input','change','focus','keyup','compositionend','paste'].forEach(evt => {
        memoInputDom.addEventListener(evt, ()=> autoResizeMemoInput(memoInputDom));
      });
      autoResizeMemoInput(memoInputDom);
    }

    console.log('✅ calendar-integration.js 初始化完成');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapCalendarIntegration);
  } else {
    bootstrapCalendarIntegration();
  }

  // 渲染完整日历（在日历应用中）
  function renderFullCalendarIfNeeded(){
    const fullCalContainer = document.getElementById('calendar-full');
    if(!fullCalContainer) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const today = localDateKey();

    let html = `<div style="padding:10px">
      <h3 style="margin-bottom:15px">${year}年${month + 1}月</h3>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px">
        <div style="text-align:center;font-weight:bold;padding:8px;font-size:12px">日</div>
        <div style="text-align:center;font-weight:bold;padding:8px;font-size:12px">一</div>
        <div style="text-align:center;font-weight:bold;padding:8px;font-size:12px">二</div>
        <div style="text-align:center;font-weight:bold;padding:8px;font-size:12px">三</div>
        <div style="text-align:center;font-weight:bold;padding:8px;font-size:12px">四</div>
        <div style="text-align:center;font-weight:bold;padding:8px;font-size:12px">五</div>
        <div style="text-align:center;font-weight:bold;padding:8px;font-size:12px">六</div>`;

    for(let i = 0; i < firstDay; i++) html += '<div></div>';

    for(let day = 1; day <= daysInMonth; day++){
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === today;
      const hasNote = !!safeGet(noteKey(dateStr));
      const isSelected = dateStr === currentEditingDate;
      
      let cellStyle = 'padding:8px;text-align:center;border-radius:4px;cursor:pointer;font-size:14px;';
      if(isToday) cellStyle += 'background:#007AFF;color:white;font-weight:bold;';
      else if(isSelected) cellStyle += 'background:#007AFF;color:white;';
      if(hasNote) cellStyle += 'border:2px solid #FF9500;';

      html += `<div class="full-cal-day" data-date="${dateStr}" style="${cellStyle}">${day}</div>`;
    }

    html += '</div></div>';
    fullCalContainer.innerHTML = html;

    // 绑定完整日历的日期点击
    fullCalContainer.querySelectorAll('.full-cal-day').forEach(el => {
      el.onclick = () => {
        currentEditingDate = el.dataset.date;
        const note = loadNoteForDate(currentEditingDate);
        
        // 更新记事输入框
        const memoInput = document.getElementById('memo-input');
        const memoTitle = document.getElementById('memo-date-title');
        if(memoInput){
          memoInput.value = note || '';
          autoResizeMemoInput(memoInput);
        }
        if(memoTitle) memoTitle.textContent = `${currentEditingDate} 备忘录`;
        
        // 重新渲染以更新选中状态
        renderFullCalendarIfNeeded();
      };
    });
  }

  // 绑定保存按钮（在日历应用中）
  document.addEventListener('DOMContentLoaded', () => {
    const saveMemoBtn = document.getElementById('save-memo');
    if(saveMemoBtn){
      saveMemoBtn.onclick = () => {
        const memoInput = document.getElementById('memo-input');
        if(memoInput && currentEditingDate){
          autoResizeMemoInput(memoInput);
          saveNoteForDate(currentEditingDate, memoInput.value);
          forceUpdateTaskBox(memoInput.value);
          
          // 更新迷你日历和完整日历
          renderMiniCalendar('calendar-widget', calendarDate);
          renderFullCalendarIfNeeded();
          
          // 显示保存成功提示
          if(typeof showToast === 'function'){
            showToast('✅ 备忘录已保存');
          }
        }
      };
    }
  });

  // 暴露 API
  window.__calendarIntegration = {
    saveNoteForDate,
    loadNoteForDate,
    loadNoteRaw,
    renderMiniCalendar,
    renderFullCalendarIfNeeded,
    processNoteUpdate,
    getCurrentEditingDate: () => currentEditingDate,
    setCurrentEditingDate: (date) => { currentEditingDate = date; }
  };

  console.log('calendar-integration.js loaded - 日历已整合');

})();

