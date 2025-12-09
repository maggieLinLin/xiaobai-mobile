/* ========================================
   LINEE 增强功能 - Enhancements
   包含: 好友长按、未读消息、头像绑定、线上模式过滤
   ======================================== */

// === 好友长按功能增强 ===
window.showFriendContextMenu = function(event, friend, friendIndex) {
    event.preventDefault();
    event.stopPropagation();
    
    const existingMenu = document.getElementById('friend-context-menu');
    if (existingMenu) existingMenu.remove();
    
    const menu = document.createElement('div');
    menu.id = 'friend-context-menu';
    menu.style.cssText = `
        position: fixed;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        padding: 8px 0;
        z-index: 10000;
        min-width: 160px;
    `;
    
    const menuItems = [
        {
            icon: 'star',
            text: friend.isFavorite ? '取消最爱' : '设为最爱',
            action: () => toggleFavorite(friendIndex)
        },
        {
            icon: 'gift',
            text: friend.isBirthday ? '取消寿星' : '设为寿星',
            action: () => toggleBirthday(friendIndex)
        }
    ];
    
    menuItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.style.cssText = `
            padding: 12px 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            color: #333;
            font-size: 15px;
            transition: background 0.2s;
        `;
        menuItem.innerHTML = `
            <ion-icon name="${item.icon}-outline" style="font-size: 20px;"></ion-icon>
            <span>${item.text}</span>
        `;
        menuItem.onmouseover = () => menuItem.style.background = '#F3F4F6';
        menuItem.onmouseout = () => menuItem.style.background = 'transparent';
        menuItem.onclick = () => {
            item.action();
            menu.remove();
        };
        menu.appendChild(menuItem);
    });
    
    const x = event.clientX || event.touches?.[0]?.clientX || 0;
    const y = event.clientY || event.touches?.[0]?.clientY || 0;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    
    document.body.appendChild(menu);
    
    setTimeout(() => {
        document.addEventListener('click', function closeMenu() {
            menu.remove();
            document.removeEventListener('click', closeMenu);
        });
    }, 100);
};

window.toggleFavorite = function(friendIndex) {
    lineeFriends[friendIndex].isFavorite = !lineeFriends[friendIndex].isFavorite;
    renderLineeFriends();
    saveLineeData();
};

window.toggleBirthday = function(friendIndex) {
    lineeFriends[friendIndex].isBirthday = !lineeFriends[friendIndex].isBirthday;
    renderLineeFriends();
    saveLineeData();
};

// === 更新最爱和寿星列表 ===
window.updateFavoritesAndBirthdays = function() {
    // 更新最爱列表
    const favoritesList = document.getElementById('linee-favorites-list');
    const favoritesSubtitle = document.getElementById('linee-favorites-subtitle');
    const favorites = lineeFriends.filter(f => f.isFavorite);
    
    if (favoritesList && favoritesSubtitle) {
        if (favorites.length > 0) {
            favoritesSubtitle.textContent = favorites.map(f => f.nickname || f.name).join(', ');
            favoritesList.innerHTML = '';
            favorites.forEach(f => {
                const item = document.createElement('div');
                item.className = 'linee-friend-item';
                let avatarHtml = `<div class="linee-friend-avatar">${f.avatar}</div>`;
                if (f.avatar && (f.avatar.startsWith('http') || f.avatar.startsWith('data:'))) {
                    avatarHtml = `<div class="linee-friend-avatar"><img src="${f.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;"></div>`;
                }
                item.innerHTML = `
                    ${avatarHtml}
                    <div class="linee-friend-info">
                        <div class="linee-friend-name">${f.nickname || f.name} ⭐</div>
                        <div class="linee-friend-status">${f.status || ''}</div>
                    </div>
                `;
                item.onclick = () => openFriendProfile(f);
                favoritesList.appendChild(item);
            });
        } else {
            favoritesSubtitle.textContent = '长按好友添加';
        }
    }
    
    // 更新寿星列表
    const birthdaysList = document.getElementById('linee-birthdays-list');
    const birthdaysSubtitle = document.getElementById('linee-birthdays-subtitle');
    const birthdays = lineeFriends.filter(f => f.isBirthday);
    
    if (birthdaysList && birthdaysSubtitle) {
        if (birthdays.length > 0) {
            birthdaysSubtitle.textContent = birthdays.map(f => f.nickname || f.name).join(', ');
            birthdaysList.innerHTML = '';
            birthdays.forEach(f => {
                const item = document.createElement('div');
                item.className = 'linee-friend-item';
                let avatarHtml = `<div class="linee-friend-avatar">${f.avatar}</div>`;
                if (f.avatar && (f.avatar.startsWith('http') || f.avatar.startsWith('data:'))) {
                    avatarHtml = `<div class="linee-friend-avatar"><img src="${f.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;"></div>`;
                }
                item.innerHTML = `
                    ${avatarHtml}
                    <div class="linee-friend-info">
                        <div class="linee-friend-name">${f.nickname || f.name} 🎂</div>
                        <div class="linee-friend-status">${f.status || ''}</div>
                    </div>
                `;
                item.onclick = () => openFriendProfile(f);
                birthdaysList.appendChild(item);
            });
        } else {
            birthdaysSubtitle.textContent = '长按好友添加';
        }
    }
};

// === 未读消息逻辑 ===
window.updateUnreadCount = function(chatId, count) {
    const chat = mockChats.find(c => c.id === chatId);
    if (chat) {
        chat.unreadCount = count;
        renderChatList();
        saveLineeData();
    }
};

window.clearUnreadCount = function(chatId) {
    updateUnreadCount(chatId, 0);
};

// === 全局设置对象 (头像动态绑定) ===
window.globalSettings = {
    charAvatar: '',
    userName: '',
    userAvatar: ''
};

// 加载全局设置
window.loadGlobalSettings = function() {
    const saved = localStorage.getItem('globalSettings');
    if (saved) {
        try {
            Object.assign(globalSettings, JSON.parse(saved));
        } catch (e) {
            console.error('加载全局设置失败:', e);
        }
    }
};

// 保存全局设置
window.saveGlobalSettings = function() {
    try {
        localStorage.setItem('globalSettings', JSON.stringify(globalSettings));
        console.log('✅ 全局设置已保存');
    } catch (e) {
        console.error('❌ 保存全局设置失败:', e);
    }
};

// 更新聊天室头像
window.updateChatRoomAvatar = function() {
    if (!currentChatId) return;
    
    const currentChat = mockChats.find(c => c.id === currentChatId);
    if (!currentChat) return;
    
    // 更新聊天室顶部头像
    const headerAvatar = document.querySelector('#chat-room-page .linee-actions img');
    if (headerAvatar && globalSettings.charAvatar) {
        headerAvatar.src = globalSettings.charAvatar;
    }
    
    // 重新渲染消息以更新 AI 头像
    renderChatMessages();
};

// === 线上模式强制过滤 ===
window.filterOnlineMode = function(text) {
    if (!text) return text;
    
    // 删除所有括号及其内容 (包括全形与半形)
    text = text.replace(/（.*?）/g, '').replace(/\(.*?\)/g, '');
    
    // 删除 Markdown 动作 (如 *看着你*)
    text = text.replace(/\*.*?\*/g, '');
    
    // 删除方括号动作 [动作]
    text = text.replace(/\[.*?\]/g, '');
    
    // 删除常见动作描述词
    const actionPatterns = [
        /他.*?地.*?[，。]/g,
        /她.*?地.*?[，。]/g,
        /眼神.*?[，。]/g,
        /目光.*?[，。]/g,
        /表情.*?[，。]/g
    ];
    
    actionPatterns.forEach(pattern => {
        text = text.replace(pattern, '');
    });
    
    // 清理多余的空格和换行
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadGlobalSettings();
    
    // 监听好友列表渲染完成后添加长按功能
    const observer = new MutationObserver(() => {
        const friendItems = document.querySelectorAll('.linee-friend-item');
        friendItems.forEach((item, index) => {
            if (!item.dataset.longPressAdded) {
                item.dataset.longPressAdded = 'true';
                let longPressTimer;
                
                item.addEventListener('touchstart', (e) => {
                    longPressTimer = setTimeout(() => {
                        if (lineeFriends[index]) {
                            showFriendContextMenu(e, lineeFriends[index], index);
                        }
                    }, 800);
                });
                
                item.addEventListener('touchend', () => {
                    if (longPressTimer) clearTimeout(longPressTimer);
                });
                
                item.addEventListener('mousedown', (e) => {
                    longPressTimer = setTimeout(() => {
                        if (lineeFriends[index]) {
                            showFriendContextMenu(e, lineeFriends[index], index);
                        }
                    }, 800);
                });
                
                item.addEventListener('mouseup', () => {
                    if (longPressTimer) clearTimeout(longPressTimer);
                });
                
                item.addEventListener('mouseleave', () => {
                    if (longPressTimer) clearTimeout(longPressTimer);
                });
            }
        });
    });
    
    const friendsList = document.getElementById('linee-friends-list');
    if (friendsList) {
        observer.observe(friendsList, { childList: true, subtree: true });
    }
});

console.log('✅ Linee 增强功能已加载');


