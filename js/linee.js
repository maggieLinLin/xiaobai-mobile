/* ========================================
   LINEE 應用程式 - JavaScript
   ======================================== */

// === LINEE 數據 ===
let lineeInitialized = false;
let currentEditingSlot = 0;
let currentChatId = null;
let chatMessages = {};

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

let lineePersonaCards = [
    { name: '我的名字', status: '设定状态消息...', settings: '', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', active: true },
    null,
    null
];

// === LINEE 主應用初始化 ===
function initLineeApp() {
    if (lineeInitialized) return;
    lineeInitialized = true;

    renderLineeFriends();
    renderLineeGroups();

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

    document.querySelectorAll('#linee-app-content .linee-card').forEach(card => {
        card.onclick = () => {
            document.querySelectorAll('#linee-app-content .linee-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        };
    });

    document.querySelectorAll('#linee-app-content .linee-nav-item').forEach(item => {
        item.onclick = () => {
            const tab = item.dataset.tab;
            document.querySelectorAll('#linee-app-content .linee-nav-item').forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            document.getElementById('linee-tab-home').style.display = tab === 'home' ? 'block' : 'none';
            document.getElementById('linee-tab-chats').style.display = tab === 'chats' ? 'block' : 'none';
            
            if (tab === 'chats') renderChatList();
        };
    });
}

// === 好友列表 ===
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

// === 群組列表 ===
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

// === 聊天列表 ===
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

// === 聊天室 ===
function openChatRoom(chatId, chatName) {
    currentChatId = chatId;
    document.getElementById('linee-tab-chats').style.display = 'none';
    document.getElementById('linee-chat-room').style.display = 'flex';
    document.getElementById('chat-room-name').textContent = chatName;
    
    if (!chatMessages[chatId]) chatMessages[chatId] = [];
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
    container.innerHTML = messages.map(msg => `
        <div style="display: flex; justify-content: ${msg.isUser ? 'flex-end' : 'flex-start'}; margin-bottom: 12px;">
            <div style="max-width: 70%; padding: 10px 14px; border-radius: 16px; background: ${msg.isUser ? '#A0D8EF' : '#FFFFFF'}; color: ${msg.isUser ? '#FFFFFF' : '#333'}; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                <div style="font-size: 14px; line-height: 1.4;">${msg.text}</div>
                <div style="font-size: 10px; margin-top: 4px; opacity: 0.7;">${msg.time}</div>
            </div>
        </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    const text = input.value.trim();
    if (!text || !currentChatId) return;
    
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    chatMessages[currentChatId].push({ text, time, isUser: true });
    input.value = '';
    renderChatMessages();
    
    if (!state.apiConfig.url || !state.apiConfig.key) {
        chatMessages[currentChatId].push({ text: '请先在设置中配置 API', time, isUser: false });
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
        chatMessages[currentChatId].push({ text: reply, time, isUser: false });
        renderChatMessages();
    } catch (e) {
        chatMessages[currentChatId].push({ text: '发送失败: ' + e.message, time, isUser: false });
        renderChatMessages();
    }
}

// === 模態框 ===
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
        lineeFriends.push({ name, status: "New Friend", avatar: name[0].toUpperCase() });
        
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

// === 個人設定 ===
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

// === 初始化 ===
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLineeProfileSettings);
} else {
    initLineeProfileSettings();
}

// === 全局函數 ===
window.toggleLineeList = toggleLineeList;
window.closeLineeModal = closeLineeModal;
window.confirmLineeAddFriend = confirmLineeAddFriend;
window.confirmLineeAddGroup = confirmLineeAddGroup;
window.openLineeProfileSettings = openLineeProfileSettings;
window.closeLineeProfileSettings = closeLineeProfileSettings;
window.changeLineeAvatar = changeLineeAvatar;
window.saveLineeProfile = saveLineeProfile;
window.selectPersonaCard = selectPersonaCard;
window.openChatRoom = openChatRoom;
window.closeChatRoom = closeChatRoom;
window.sendChatMessage = sendChatMessage;
