let diaryEntries = [];
let diarySettings = { autoGenerate: false, syncFootprint: true };

function initDiarySystem() {
    const saved = localStorage.getItem('diaryEntries');
    if (saved) diaryEntries = JSON.parse(saved);
    const backBtn = document.getElementById('diary-back-btn');
    if (backBtn) backBtn.onclick = closeDiaryApp;
}

function saveDiaryData() {
    localStorage.setItem('diaryEntries', JSON.stringify(diaryEntries));
}

function switchDiaryView(viewName) {
    ['home', 'detail', 'favorites'].forEach(v => {
        const el = document.getElementById(`diary-${v}-view`);
        if (el) el.classList.toggle('active', v === viewName);
    });
    if (viewName === 'home') renderDiaryHome();
    if (viewName === 'favorites') renderDiaryFavorites();
}

function renderDiaryHome() {
    const list = document.getElementById('diary-friends-list');
    if (!list) return;
    const friends = window.lineeFriends?.filter(f => f.isAI) || [];
    const sorted = friends.map(f => {
        const entries = diaryEntries.filter(e => e.authorId === f.aiCharacterId).sort((a,b) => new Date(b.date) - new Date(a.date));
        const latest = entries[0];
        const hasNew = latest && new Date(latest.date).toDateString() === new Date().toDateString();
        return { ...f, latest, hasNew };
    }).sort((a,b) => (a.hasNew && !b.hasNew) ? -1 : (!a.hasNew && b.hasNew) ? 1 : 0);
    
    const hasNewFriend = sorted.find(f => f.hasNew);
    list.innerHTML = `
        ${hasNewFriend ? `<div style="background:linear-gradient(135deg,#A0D8EF 90%,#8FCCE5 100%);color:white;padding:12px 16px;display:flex;align-items:center;gap:12px;font-size:14px;cursor:pointer" onclick="openDiaryDetail('${hasNewFriend.aiCharacterId}')">
            <div style="background:rgba(255,255,255,0.2);padding:6px;border-radius:50%;font-size:14px">🔔</div>
            <span style="flex:1;font-weight:500">${hasNewFriend.name} 刚刚写了新的日记！</span>
        </div>` : ''}
        ${sorted.map(f => `
            <div onclick="openDiaryDetail('${f.aiCharacterId}')" style="display:flex;align-items:center;gap:16px;padding:16px 20px;border-bottom:1px solid #F9FAFB;cursor:pointer;background:white;transition:background 0.2s" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='white'">
                <div style="position:relative;flex-shrink:0">
                    <img src="${f.avatar}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:1px solid #F3F4F6">
                    ${f.hasNew ? '<div style="position:absolute;top:0;right:0;width:14px;height:14px;background:#EF4444;border:2px solid white;border-radius:50%;animation:pulse 2s infinite"></div>' : ''}
                </div>
                <div style="flex:1;min-width:0">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                        <div style="font-weight:700;color:#111827;font-size:16px">${f.name}</div>
                        <div style="font-size:12px;color:${f.hasNew ? '#A0D8EF' : '#9CA3AF'};font-weight:${f.hasNew ? '700' : '400'}">${f.latest ? f.latest.time : '暂无'}</div>
                    </div>
                    <div style="font-size:14px;color:${f.hasNew ? '#111827' : '#6B7280'};font-weight:${f.hasNew ? '500' : '400'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.latest ? f.latest.content.substring(0, 30) + '...' : '还没有日记'}</div>
                </div>
            </div>
        `).join('')}
    `;
}

let currentDiaryFriendId = null;

function openDiaryDetail(friendId) {
    currentDiaryFriendId = friendId;
    const friend = window.lineeFriends?.find(f => f.aiCharacterId === friendId);
    if (!friend) return;
    document.getElementById('diary-detail-title').textContent = friend.name;
    renderDiaryTimeline(friendId);
    switchDiaryView('detail');
}

function renderDiaryTimeline(friendId) {
    const container = document.getElementById('diary-timeline-container');
    if (!container) return;
    const entries = diaryEntries.filter(e => e.authorId === friendId).sort((a,b) => new Date(b.date) - new Date(a.date));
    if (entries.length === 0) {
        container.innerHTML = '<div style="height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#9CA3AF"><p style="margin-bottom:16px">暂无日记</p><button onclick="openGenerateModal()" style="padding:10px 20px;background:#A0D8EF;color:white;border:none;border-radius:20px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 6px rgba(160,216,239,0.2)">+ 手动生成第一篇</button></div>';
        return;
    }
    container.innerHTML = entries.map(e => `
        <div style="background:white;border-radius:12px;overflow:hidden;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid #F3F4F6">
            <div style="background:#F0F9FF;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(191,219,254,0.5)">
                <span style="color:#1E40AF;font-weight:700;font-size:13px;font-family:monospace">${e.date} <span style="opacity:0.6;font-weight:400;margin-left:4px">| ${e.time}</span></span>
                <div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.5);padding:4px 12px;border-radius:20px;font-size:12px;color:#3B82F6;backdrop-filter:blur(4px)">
                    <div style="display:flex;align-items:center;gap:6px">${e.weather || '☀️'}</div>
                    <div style="width:1px;height:12px;background:#BFDBFE"></div>
                    <div style="display:flex;align-items:center;gap:6px">${e.mood || '😊'}</div>
                </div>
            </div>
            <div style="padding:20px;font-size:15px;line-height:1.8;color:#111827;white-space:pre-wrap;min-height:120px">${e.content}</div>
            <div style="padding:12px 16px;border-top:1px solid #F9FAFB;display:flex;justify-content:flex-end;gap:8px">
                <button onclick="deleteDiaryEntry('${e.id}')" style="padding:8px;background:none;border:none;color:#D1D5DB;cursor:pointer;border-radius:50%;transition:all 0.2s" onmouseover="this.style.color='#EF4444';this.style.background='#FEF2F2'" onmouseout="this.style.color='#D1D5DB';this.style.background='none'">🗑️</button>
                <button onclick="toggleStar('${e.id}')" style="padding:8px;background:${e.isStarred ? '#FEF3C7' : 'none'};border:none;color:${e.isStarred ? '#F59E0B' : '#D1D5DB'};cursor:pointer;border-radius:50%;font-size:20px;transition:all 0.2s" onmouseover="this.style.color='#F59E0B';this.style.background='#FEF3C7'" onmouseout="this.style.color='${e.isStarred ? '#F59E0B' : '#D1D5DB'}';this.style.background='${e.isStarred ? '#FEF3C7' : 'none'}'">${e.isStarred ? '⭐' : '☆'}</button>
            </div>
        </div>
    `).join('');
}

function renderDiaryFavorites() {
    const container = document.getElementById('diary-favorites-container');
    if (!container) return;
    const starred = diaryEntries.filter(e => e.isStarred).sort((a,b) => new Date(b.date) - new Date(a.date));
    if (starred.length === 0) {
        container.innerHTML = '<div style="height:60vh;display:flex;align-items:center;justify-content:center;color:#9CA3AF">还没有收藏任何日记哦</div>';
        return;
    }
    container.innerHTML = starred.map(e => {
        const friend = window.lineeFriends?.find(f => f.aiCharacterId === e.authorId);
        return `
            <div style="padding:0 8px 4px;font-size:12px;font-weight:700;color:#9CA3AF">${friend ? friend.name : 'Unknown'}</div>
            <div style="background:white;border-radius:12px;overflow:hidden;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid #F3F4F6">
                <div style="background:#F0F9FF;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(191,219,254,0.5)">
                    <span style="color:#1E40AF;font-weight:700;font-size:13px;font-family:monospace">${e.date} <span style="opacity:0.6;font-weight:400;margin-left:4px">| ${e.time}</span></span>
                    <div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.5);padding:4px 12px;border-radius:20px;font-size:12px;color:#3B82F6">
                        <div>${e.weather || '☀️'}</div>
                        <div style="width:1px;height:12px;background:#BFDBFE"></div>
                        <div>${e.mood || '😊'}</div>
                    </div>
                </div>
                <div style="padding:20px;font-size:15px;line-height:1.8;color:#111827;white-space:pre-wrap;min-height:120px">${e.content}</div>
                <div style="padding:12px 16px;border-top:1px solid #F9FAFB;display:flex;justify-content:flex-end;gap:8px">
                    <button onclick="deleteDiaryEntry('${e.id}')" style="padding:8px;background:none;border:none;color:#D1D5DB;cursor:pointer;border-radius:50%;transition:all 0.2s" onmouseover="this.style.color='#EF4444';this.style.background='#FEF2F2'" onmouseout="this.style.color='#D1D5DB';this.style.background='none'">🗑️</button>
                    <button onclick="toggleStar('${e.id}')" style="padding:8px;background:#FEF3C7;border:none;color:#F59E0B;cursor:pointer;border-radius:50%;font-size:20px">⭐</button>
                </div>
            </div>
        `;
    }).join('');
}

function openGenerateModal() {
    document.getElementById('diary-generate-modal').classList.remove('hidden');
}

function closeGenerateModal() {
    document.getElementById('diary-generate-modal').classList.add('hidden');
}

function generateDiary() {
    if (!currentDiaryFriendId) return;
    closeGenerateModal();
    const container = document.getElementById('diary-timeline-container');
    container.insertAdjacentHTML('afterbegin', '<div id="diary-generating" style="margin-bottom:24px;padding:16px;background:#EFF6FF;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:12px;color:#3B82F6;border:1px solid #BFDBFE"><div style="width:20px;height:20px;border:2px solid #3B82F6;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite"></div><span style="font-size:14px;font-weight:500">正在读取今日记忆并生成日记...</span></div>');
    setTimeout(() => {
        const newEntry = {
            id: Date.now().toString(),
            authorId: currentDiaryFriendId,
            content: '今天是美好的一天，和 User 聊了很多有趣的话题。虽然有时候会觉得他有点笨笨的，但这样的他反而让我觉得很可爱。不知道他有没有发现，每次他说那些傻话的时候，我其实都在偷偷笑。希望明天也能和他继续聊天...',
            date: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.'),
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            weather: '☀️',
            mood: '😊',
            isStarred: false
        };
        diaryEntries.unshift(newEntry);
        saveDiaryData();
        document.getElementById('diary-generating')?.remove();
        renderDiaryTimeline(currentDiaryFriendId);
    }, 2000);
}

function toggleStar(entryId) {
    const entry = diaryEntries.find(e => e.id === entryId);
    if (entry) {
        entry.isStarred = !entry.isStarred;
        saveDiaryData();
        if (currentDiaryFriendId) renderDiaryTimeline(currentDiaryFriendId);
        else renderDiaryFavorites();
    }
}

function deleteDiaryEntry(entryId) {
    if (confirm('确定要删除这篇日记吗？')) {
        diaryEntries = diaryEntries.filter(e => e.id !== entryId);
        saveDiaryData();
        if (currentDiaryFriendId) renderDiaryTimeline(currentDiaryFriendId);
        else renderDiaryFavorites();
    }
}

function openDiarySettings() {
    document.getElementById('diary-settings-modal').classList.remove('hidden');
}

function closeDiarySettings() {
    document.getElementById('diary-settings-modal').classList.add('hidden');
}

function saveDiarySettings() {
    closeDiarySettings();
}

function closeDiaryApp() {
    document.getElementById('diary-app').classList.add('hidden');
    document.getElementById('linee-app').style.display = 'flex';
}

function openDiaryApp() {
    document.getElementById('linee-app').style.display = 'none';
    document.getElementById('diary-app').classList.remove('hidden');
    switchDiaryView('home');
}

window.openDiaryApp = openDiaryApp;
window.initDiarySystem = initDiarySystem;
window.switchDiaryView = switchDiaryView;
window.openDiaryDetail = openDiaryDetail;
window.openGenerateModal = openGenerateModal;
window.closeGenerateModal = closeGenerateModal;
window.generateDiary = generateDiary;
window.toggleStar = toggleStar;
window.deleteDiaryEntry = deleteDiaryEntry;
window.openDiarySettings = openDiarySettings;
window.closeDiarySettings = closeDiarySettings;
window.saveDiarySettings = saveDiarySettings;
window.closeDiaryApp = closeDiaryApp;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDiarySystem);
} else {
    initDiarySystem();
}
