function initHomeScreen() {
    const homePages = document.getElementById('home-pages');
    const dots = document.querySelectorAll('.dot');
    let startX = 0, isDragging = false;

    homePages.addEventListener('touchstart', e => { startX = e.touches[0].clientX; });
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

    homePages.addEventListener('mousedown', e => { startX = e.clientX; isDragging = true; });
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

    const homeScreen = document.getElementById('home-screen');
    const pullHint = document.getElementById('pull-hint');
    let startY = 0, isPulling = false;

    homeScreen.addEventListener('mousedown', e => { startY = e.clientY; isPulling = true; if (pullHint) pullHint.style.display = 'none'; });
    homeScreen.addEventListener('mousemove', e => { if (isPulling && e.clientY - startY > 100) { openSettings(); isPulling = false; } });
    homeScreen.addEventListener('mouseup', () => { isPulling = false; });
    homeScreen.addEventListener('touchstart', e => { startY = e.touches[0].clientY; isPulling = true; if (pullHint) pullHint.style.display = 'none'; });
    homeScreen.addEventListener('touchmove', e => { if (isPulling && e.touches[0].clientY - startY > 100) { openSettings(); isPulling = false; } });
    homeScreen.addEventListener('touchend', () => { isPulling = false; });

    const notch = document.getElementById('notch');
    if (notch) { notch.style.cursor = 'pointer'; notch.onclick = openSettings; }

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
    
    let html = `<div style="padding:5px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><button id="cal-prev" style="border:none;background:none;font-size:14px;cursor:pointer;padding:5px">◀</button><div style="font-size:11px;font-weight:bold">${year}年${month + 1}月</div><button id="cal-next" style="border:none;background:none;font-size:14px;cursor:pointer;padding:5px">▶</button></div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;font-size:8px;text-align:center"><div style="font-weight:bold">S</div><div style="font-weight:bold">M</div><div style="font-weight:bold">T</div><div style="font-weight:bold">W</div><div style="font-weight:bold">T</div><div style="font-weight:bold">F</div><div style="font-weight:bold">S</div>`;
    
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
    
    if (prevBtn) prevBtn.onclick = (e) => { e.stopPropagation(); state.calendarDate = new Date(date.setMonth(date.getMonth() - 1)); renderMiniCalendar(); saveState(); };
    if (nextBtn) nextBtn.onclick = (e) => { e.stopPropagation(); state.calendarDate = new Date(date.setMonth(date.getMonth() + 1)); renderMiniCalendar(); saveState(); };
    
    widget.querySelectorAll('.cal-day').forEach(el => {
        el.onclick = (e) => { e.stopPropagation(); state.selectedDate = el.dataset.date; openApp('calendar-app'); selectDate(el.dataset.date); };
    });
}
