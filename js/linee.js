/* ========================================
   LINEE 應用程式 - JavaScript
   ======================================== */

// === LINEE 數據 ===
let lineeInitialized = false;
let currentEditingSlot = 0;
let currentChatId = null;
let chatMessages = {};

// AI Characters Storage (Id -> Character Object)
let aiCharacters = {};

// Steps Data
let stepsWorlds = [
    { 
        id: 'world_1', 
        name: '赛博夜之城', 
        desc: '霓虹灯下的高科技低生活...', 
        landmarks: ['中央塔', '地下黑市', '荒坂海滨'],
        image: 'https://images.unsplash.com/photo-1535905557558-afc4877a26fc?w=400&q=80',
        characters: ['char_1']
    }
];
let currentWorldId = null;
let currentCharId = null;

let lineeFriends = [];
let lineeGroups = [];
let mockChats = [];

// === 本地存储功能 ===
function saveLineeData() {
    try {
        localStorage.setItem('lineeFriends', JSON.stringify(lineeFriends));
        localStorage.setItem('lineeGroups', JSON.stringify(lineeGroups));
        localStorage.setItem('mockChats', JSON.stringify(mockChats));
        localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
        localStorage.setItem('aiCharacters', JSON.stringify(aiCharacters));
        console.log('✅ Linee 数据已保存');
    } catch (e) {
        console.error('❌ 保存失败:', e);
    }
}

function loadLineeData() {
    try {
        const savedFriends = localStorage.getItem('lineeFriends');
        const savedGroups = localStorage.getItem('lineeGroups');
        const savedChats = localStorage.getItem('mockChats');
        const savedMessages = localStorage.getItem('chatMessages');
        const savedAIChars = localStorage.getItem('aiCharacters');
        
        if (savedFriends) lineeFriends = JSON.parse(savedFriends);
        if (savedGroups) lineeGroups = JSON.parse(savedGroups);
        if (savedChats) mockChats = JSON.parse(savedChats);
        if (savedMessages) chatMessages = JSON.parse(savedMessages);
        if (savedAIChars) aiCharacters = JSON.parse(savedAIChars);
        
        console.log('✅ 已加载:', lineeFriends.length, '个好友');
    } catch (e) {
        console.error('❌ 加载失败:', e);
    }
}

let lineePersonaCards = [
    { name: '我的名字', status: '设定状态消息...', settings: '', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', active: true },
    null,
    null
];

// === LINEE 主應用初始化 ===
function initLineeApp() {
    if (lineeInitialized) return;
    lineeInitialized = true;
    
    // 加载本地数据
    loadLineeData();

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
            
            // 切换 Tab 显示
            const tabs = ['home', 'chats', 'steps', 'diary', 'wallet'];
            tabs.forEach(t => {
                const el = document.getElementById('linee-tab-' + t);
                if (el) el.style.display = tab === t ? 'block' : 'none';
            });
            
            if (tab === 'chats') renderChatList();
            if (tab === 'steps') initStepsPage();
        };
    });
    
    // 初始化默认全局世界书
    AICore.worldSystem.addGlobalBook(new AICore.WorldBook("global_main", "GLOBAL", {
        "小白机": "一部神奇的智能手机模拟器。",
        "LINEE": "这个世界中最流行的通讯软件。"
    }));

    // 初始化足迹页面事件监听
    setupStepsListeners();
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
        
        let avatarHtml = `<div class="linee-friend-avatar">${f.avatar}</div>`;
        // 如果是 URL 图片
        if (f.avatar.startsWith('http') || f.avatar.startsWith('data:')) {
            avatarHtml = `<div class="linee-friend-avatar"><img src="${f.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;"></div>`;
        }

        const displayName = f.nickname || f.name;
        item.innerHTML = `
            ${avatarHtml}
            <div class="linee-friend-info">
                <div class="linee-friend-name">${displayName}</div>
                <div class="linee-friend-status">${f.status}</div>
            </div>
        `;
        // 点击好友打开好友信息页
        item.onclick = () => {
            openFriendProfile(f);
        };
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
    
    list.innerHTML = mockChats.map(chat => {
        const displayName = chat.nickname || chat.name;
        return `
        <div onclick="openChatRoom('${chat.id}', '${displayName}')" style="display: flex; align-items: center; padding: 12px 16px; background: #FFFFFF; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='#FFFFFF'">
            <div style="position: relative; flex-shrink: 0; margin-right: 16px;">
                <img src="${chat.avatar}" alt="${displayName}" style="width: 52px; height: 52px; object-fit: cover; border: 1px solid #F3F4F6; border-radius: ${chat.isGroup ? '16px' : '50%'};" />
                ${!chat.isGroup ? '<div style="position: absolute; bottom: 0; right: 0; width: 14px; height: 14px; background: #10B981; border: 2px solid #FFFFFF; border-radius: 50%;"></div>' : ''}
            </div>
            <div style="flex: 1; min-width: 0; border-bottom: 1px solid #F9FAFB; padding-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                    <div style="display: flex; align-items: center; gap: 4px; overflow: hidden;">
                        <h3 style="font-size: 18px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayName}</h3>
                        ${chat.isMuted ? '<ion-icon name="notifications-off-outline" style="font-size: 14px; color: #9CA3AF;"></ion-icon>' : ''}
                    </div>
                    <span style="font-size: 13px; color: #9CA3AF; flex-shrink: 0; margin-left: 8px;">${chat.timestamp}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <p style="font-size: 15px; color: #6B7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 8px;">${chat.lastMessage}</p>
                    <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                        ${chat.isPinned ? '<ion-icon name="pin" style="font-size: 14px; color: #D1D5DB; transform: rotate(45deg);"></ion-icon>' : ''}
                        ${chat.unreadCount > 0 ? `<span style="display: flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; padding: 0 6px; font-size: 12px; font-weight: 700; color: #FFFFFF; background: #A0D8EF; border-radius: 10px;">${chat.unreadCount > 99 ? '99+' : chat.unreadCount}</span>` : ''}
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
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
    const isOfflineMode = chatSettings.offlineMode;

    if (isOfflineMode) {
        // 线下模式：酒馆粉色温馨风格
        container.style.padding = '20px 16px';
        container.style.background = '#fff5f7';
        container.style.color = '#000';
        
        container.innerHTML = messages.map((msg, index) => {
            if (msg.isUser) {
                // 用户消息：简洁样式，右对齐，黑色文字
                return `
                    <div style="display: flex; justify-content: flex-end; margin: 16px 0;" oncontextmenu="showMessageMenu(event, ${index}); return false;" ontouchstart="handleTouchStart(event, ${index})" ontouchend="handleTouchEnd(event)">
                        <div style="max-width: 80%; padding: 12px 16px; background: #ffd4e5; border-radius: 12px; border-left: 3px solid #ff9ec7;">
                            <div style="font-size: 18px; line-height: 1.6; color: #000; white-space: pre-wrap; font-family: 'Source Han Sans CN', sans-serif;">${msg.text}</div>
                            <div style="font-size: 13px; color: #666; margin-top: 6px; text-align: right;">${msg.time}</div>
                        </div>
                    </div>
                `;
            } else {
                // AI 回复：酒馆粉色卡片格式，黑色文字
                return `
                    <div style="margin: 20px 0; padding: 16px; background: #ffffff; border-radius: 8px; border: 1px solid #ffcce0; box-shadow: 0 2px 8px rgba(255, 158, 199, 0.1);" oncontextmenu="showMessageMenu(event, ${index}); return false;" ontouchstart="handleTouchStart(event, ${index})" ontouchend="handleTouchEnd(event)">
                        <div style="font-size: 19px; line-height: 1.8; color: #000; white-space: pre-wrap; font-family: 'Source Han Sans CN', sans-serif; letter-spacing: 0.3px;">
                            ${msg.text}
                        </div>
                        <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #ffe0f0; font-size: 13px; color: #666; text-align: right;">
                            ${msg.time}
                        </div>
                    </div>
                `;
            }
        }).join('');
    } else {
        // 线上模式：即时聊天风格
        container.style.padding = '16px';
        container.style.background = '#FFFFFF';
        
        container.innerHTML = messages.map((msg, index) => `
            <div style="display: flex; justify-content: ${msg.isUser ? 'flex-end' : 'flex-start'}; margin-bottom: 12px;" oncontextmenu="showMessageMenu(event, ${index}); return false;" ontouchstart="handleTouchStart(event, ${index})" ontouchend="handleTouchEnd(event)">
                ${!msg.isUser ? '<div style="width:32px;height:32px;background:#eee;border-radius:50%;margin-right:8px;overflow:hidden;"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed='+ currentChatId +'" style="width:100%;"></div>' : ''}
                <div style="max-width: 70%; padding: 10px 14px; border-radius: 16px; background: ${msg.isUser ? '#A0D8EF' : '#FFFFFF'}; color: ${msg.isUser ? '#FFFFFF' : '#333'}; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                    <div style="font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${msg.text}</div>
                    <div style="font-size: 12px; margin-top: 4px; opacity: 0.7; text-align: right;">${msg.time}</div>
                </div>
            </div>
        `).join('');
    }
    
    container.scrollTop = container.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input-field');
    const text = input.value.trim();
    if (!text || !currentChatId) return;
    
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // 1. 用户消息上屏
    chatMessages[currentChatId].push({ text, time, isUser: true });
    input.value = '';
    renderChatMessages();
    
    // 保存消息到本地
    saveLineeData();
    
    // 2. 检查是否开启自动回复
    if (!chatSettings.autoReply) {
        console.log('⏸️ 自动回复已关闭，等待用户手动触发回复');
        return; // 不自动回复
    }
    
    // 3. 检查是否为 AI 聊天
    const currentChat = mockChats.find(c => c.id === currentChatId);
    
    // A. 普通聊天 (API 直连，旧逻辑)
    if (!currentChat || !currentChat.isAI) {
        if (!state.apiConfig.url || !state.apiConfig.key) {
            // 模拟回复
            setTimeout(() => {
                chatMessages[currentChatId].push({ text: '此功能需要连接 API，请在设置中配置。', time, isUser: false });
                renderChatMessages();
            }, 1000);
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
        return;
    }

    // B. AI 角色聊天 (使用 AICore)
    const aiChar = aiCharacters[currentChat.aiCharacterId];
    if (!aiChar) {
        chatMessages[currentChatId].push({ text: '(系统错误：找不到 AI 角色数据)', time, isUser: false });
        renderChatMessages();
        return;
    }

    // 检查 API 配置
    if (!state || !state.apiConfig || !state.apiConfig.url || !state.apiConfig.key) {
        chatMessages[currentChatId].push({ text: '请先在设置中配置 API', time, isUser: false });
        renderChatMessages();
        return;
    }

    // 显示对方气泡 "输入中..."
    const typingMsg = { text: '输入中...', time, isUser: false, isTyping: true };
    chatMessages[currentChatId].push(typingMsg);
    renderChatMessages();
    
    try {
        // 过滤掉用户消息前的打字提示
        const history = chatMessages[currentChatId]
            .filter(m => !m.isTyping)
            .map(m => ({ isUser: m.isUser, text: m.text }));
        
        // 获取当前模式 (从聊天设置中读取)
        const currentMode = chatSettings.offlineMode ? "OFFLINE" : "ONLINE";
        
        // 调用 AI 核心
        const responseText = await AICore.chatSystem.generateResponse(
            aiChar,
            text,
            history,
            currentMode, // 使用设置中的模式
            state.apiConfig
        );
        
        // 移除打字提示
        chatMessages[currentChatId] = chatMessages[currentChatId].filter(m => !m.isTyping);
        
        // 添加真实回复
        chatMessages[currentChatId].push({ text: responseText, time, isUser: false });
        renderChatMessages();
        
        // 更新列表最后一条消息
        currentChat.lastMessage = responseText.substring(0, 50) + (responseText.length > 50 ? '...' : '');
        renderChatList();
        
        // ✅ 更新好感度
        try {
            const relationshipChange = await AICore.relationshipSystem.calculateChange(
                text, 
                responseText, 
                state.apiConfig
            );
            
            if (relationshipChange !== 0) {
                aiChar.relationship.updateScore(relationshipChange);
                
                // 保存更新后的角色数据
                aiCharacters[currentChat.aiCharacterId] = aiChar;
                saveLineeData();
                
                console.log(`💖 好感度变化: ${relationshipChange > 0 ? '+' : ''}${relationshipChange}, 当前: ${aiChar.relationship.score} (${aiChar.relationship.level})`);
                
                // 可选：显示好感度变化提示
                if (Math.abs(relationshipChange) >= 3) {
                    const changeText = relationshipChange > 0 ? `↑ +${relationshipChange}` : `↓ ${relationshipChange}`;
                    const levelText = `${aiChar.relationship.level} (${aiChar.relationship.score})`;
                    
                    // 在聊天界面显示提示（可选）
                    // showRelationshipNotification(changeText, levelText);
                }
            }
        } catch (e) {
            console.error('好感度更新失败:', e);
            // 不影响主流程，静默失败
        }
        
    } catch (e) {
        // 移除打字提示
        chatMessages[currentChatId] = chatMessages[currentChatId].filter(m => !m.isTyping);
        
        console.error('AI Chat Error:', e);
        chatMessages[currentChatId].push({ text: '(AI 错误: ' + e.message + ')', time, isUser: false });
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

// AI 生成角色函数
async function confirmAIGenerateChar() {
    const keywordsInput = document.getElementById('ai-generate-keywords');
    const keywords = keywordsInput.value.trim();
    
    if (!keywords) {
        alert("请输入关键词");
        return;
    }
    
    // 检查 API 配置
    if (!state || !state.apiConfig || !state.apiConfig.url || !state.apiConfig.key) {
        alert("请先在设置中配置 API");
        return;
    }
    
    // 显示生成中状态
    const confirmBtn = document.querySelector('#linee-modal-ai-generate .linee-btn-confirm');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span>⏳ 生成中...</span>';
    confirmBtn.style.opacity = '0.6';
    
    try {
        // 构建 AI 生成角色的 Prompt
        const systemPrompt = `你是一个专业的角色设定生成器。请根据用户提供的关键词，生成一个完整的角色设定。

请严格按照以下 JSON 格式输出（不要添加任何其他文字）：

{
  "name": "角色姓名",
  "gender": "男/女/其他",
  "identity": "身份职业（例如：28岁跨国集团CEO）",
  "appearance": "外貌特征的详细描述（100-200字）",
  "background": "性格背景设定（200-300字，包含性格、经历、动机等）",
  "personality_tags": ["标签1", "标签2", "标签3"],
  "dialogue_style": "现代日常 (默认)/古风 (吾, 汝, 甚好)/翻译腔 (哦, 我的老伙计)/二次元 (颜文字)/赛博朋克",
  "first_message": "开场白（50-100字，符合角色性格的第一句话）"
}

要求：
1. 名字要符合角色设定的文化背景
2. 外貌描写要具体生动
3. 背景设定要有深度和故事性
4. 性格标签要精准（2-4个）
5. 开场白要有代入感`;

        const userPrompt = `关键词：${keywords}

请生成角色设定（纯 JSON 格式）。`;

        // 调用 LLM API
        const res = await fetch(`${state.apiConfig.url}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${state.apiConfig.key}`
            },
            body: JSON.stringify({
                model: state.apiConfig.model || "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.8
            })
        });
        
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        
        const data = await res.json();
        let responseText = data.choices[0].message.content.trim();
        
        // 尝试解析 JSON（可能被包裹在代码块中）
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        
        const charData = JSON.parse(responseText);
        
        // 创建 AI Character 对象
        const char = new AICore.Character({
            ...charData,
            source: 'ai'
        });
        aiCharacters[char.id] = char;
        
        // 添加到好友列表
        lineeFriends.push({ 
            name: char.name, 
            status: char.identity || "AI Character", 
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${char.name}`,
            isAI: true,
            aiCharacterId: char.id
        });
        
        // 创建聊天会话
        const newChat = {
            id: 'chat_' + Date.now(),
            name: char.name,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${char.name}`,
            lastMessage: char.first_message || "你好，我是" + char.name,
            timestamp: '刚刚',
            unreadCount: 1,
            isGroup: false,
            isAI: true,
            aiCharacterId: char.id
        };
        mockChats.unshift(newChat);
        
        // 如果有开场白，添加到聊天记录
        if (char.first_message) {
            chatMessages[newChat.id] = [{
                text: char.first_message,
                time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
                isUser: false
            }];
        }
        
        // 更新 UI
        renderLineeFriends();
        renderChatList();
        
        // 关闭模态框
        keywordsInput.value = '';
        closeLineeModal('linee-modal-ai-generate');
        
        // 显示成功提示
        alert(`✅ 角色 "${char.name}" 生成成功！\n\n已添加到好友列表，可以开始聊天了。`);
        
    } catch (e) {
        console.error('AI Generate Error:', e);
        alert(`生成失败：${e.message}\n\n请检查：\n1. API 配置是否正确\n2. 关键词是否清晰\n3. 网络连接是否正常`);
    } finally {
        // 恢复按钮状态
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
        confirmBtn.style.opacity = '1';
    }
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
        saveLineeData(); // 保存数据
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
        saveLineeData(); // 保存数据
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
    
    if (!name) return alert('请输入名字');
    
    const wasActive = lineePersonaCards[currentEditingSlot] && lineePersonaCards[currentEditingSlot].active;
    lineePersonaCards[currentEditingSlot] = { name, status, settings, avatar, active: wasActive };
    
    // 保存到本地存储
    localStorage.setItem('linee-persona-cards', JSON.stringify(lineePersonaCards));
    
    // 同时保存到 lineeData
    saveLineeData();
    
    if (wasActive) updateLineeMainProfile();
    renderPersonaCards();
    
    console.log('✅ 个人设定已保存:', lineePersonaCards[currentEditingSlot]);
    alert('✅ 已保存至卡槽 ' + (currentEditingSlot + 1) + '！');
}

// 上传个人头像
function uploadPersonalAvatar() {
    document.getElementById('personal-avatar-upload').click();
}

// 处理个人头像上传
function handlePersonalAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
    }
    
    // 检查文件大小 (限制 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('图片文件不能超过 5MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        
        // 更新显示
        document.getElementById('linee-edit-avatar').src = dataUrl;
        document.getElementById('linee-display-avatar').src = dataUrl;
        
        console.log('✅ 头像已上传 (Base64)');
        alert('✅ 头像已上传！记得点击"保存至卡槽"按钮保存');
    };
    
    reader.onerror = () => {
        alert('❌ 读取图片失败，请重试');
    };
    
    reader.readAsDataURL(file);
}

function selectPersonaCard(slot) {
    currentEditingSlot = slot;
    const card = lineePersonaCards[slot];
    
    if (!card) {
        document.getElementById('linee-edit-name').value = '新人物';
        document.getElementById('linee-edit-status-input').value = '设定状态...';
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

// === AI 创意工坊功能 ===

// 打开高级创角
window.openCreateCharModal = function() {
    document.getElementById('linee-modal-create-char').classList.remove('hidden');
};

// === 好友信息页功能 ===
let currentFriendProfile = null;

function openFriendProfile(friend) {
    currentFriendProfile = friend;
    
    const profilePage = document.getElementById('friend-profile-page');
    const lineeApp = document.getElementById('linee-app');
    
    // 隐藏 Linee 主界面
    lineeApp.style.display = 'none';
    profilePage.classList.remove('hidden');
    
    // 填充数据
    const displayName = friend.nickname || friend.name;
    document.getElementById('friend-profile-name').textContent = displayName;
    document.getElementById('friend-profile-status').textContent = friend.status || '暂无状态';
    document.getElementById('friend-profile-name-input').value = friend.name;
    document.getElementById('friend-profile-nickname').value = friend.nickname || '';
    
    // 设置头像
    const avatarImg = document.getElementById('friend-profile-avatar-img');
    if (friend.avatar) {
        if (friend.avatar.startsWith('http')) {
            avatarImg.src = friend.avatar;
        } else if (friend.avatar.startsWith('data:')) {
            avatarImg.src = friend.avatar;
        } else {
            avatarImg.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.name}`;
        }
    } else {
        avatarImg.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.name}`;
    }
    
    // 设置背景
    const bgImg = document.getElementById('friend-profile-bg-img');
    const banner = document.getElementById('friend-profile-banner');
    if (friend.bgImage) {
        bgImg.src = friend.bgImage;
        bgImg.style.display = 'block';
    } else {
        bgImg.style.display = 'none';
    }
    
    // 设置描述
    const descTextarea = document.getElementById('friend-profile-description');
    descTextarea.value = friend.description || '';
    descTextarea.readOnly = true;
}

function closeFriendProfile() {
    document.getElementById('friend-profile-page').classList.add('hidden');
    document.getElementById('linee-app').style.display = 'flex';
    currentFriendProfile = null;
}

function openAvatarUploader() {
    document.getElementById('friend-avatar-upload').click();
}

function openBgUploader() {
    document.getElementById('friend-bg-upload').click();
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        
        // 更新当前显示
        document.getElementById('friend-profile-avatar-img').src = dataUrl;
        
        // 更新好友数据
        if (currentFriendProfile) {
            currentFriendProfile.avatar = dataUrl;
            
            // 更新好友列表中的头像
            renderLineeFriends();
            
            // 更新聊天列表中的头像
            const chat = mockChats.find(c => c.name === currentFriendProfile.name);
            if (chat) {
                chat.avatar = dataUrl;
                renderChatList();
            }
            
            // 保存到本地
            saveLineeData();
            
            alert('✅ 头像已更新并保存');
        }
    };
    reader.readAsDataURL(file);
}

function handleBgUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        
        // 更新当前显示
        const bgImg = document.getElementById('friend-profile-bg-img');
        bgImg.src = dataUrl;
        bgImg.style.display = 'block';
        
        // 更新好友数据
        if (currentFriendProfile) {
            currentFriendProfile.bgImage = dataUrl;
            
            // 保存到本地
            saveLineeData();
            
            alert('✅ 背景已更新并保存');
        }
    };
    reader.readAsDataURL(file);
}

function toggleEditDescription() {
    const textarea = document.getElementById('friend-profile-description');
    const saveSection = document.getElementById('desc-save-section');
    const editBtn = document.getElementById('edit-desc-btn');
    
    if (textarea.readOnly) {
        // 进入编辑模式
        textarea.readOnly = false;
        textarea.style.borderColor = '#A0D8EF';
        textarea.focus();
        saveSection.style.display = 'block';
        editBtn.innerHTML = '<ion-icon name="close-outline"></ion-icon> 取消';
    } else {
        // 取消编辑
        textarea.readOnly = true;
        textarea.style.borderColor = '#E5E7EB';
        saveSection.style.display = 'none';
        editBtn.innerHTML = '<ion-icon name="create-outline"></ion-icon> 编辑';
        // 恢复原始值
        textarea.value = currentFriendProfile.description || '';
    }
}

function saveDescription() {
    const textarea = document.getElementById('friend-profile-description');
    const description = textarea.value.trim();
    
    if (currentFriendProfile) {
        currentFriendProfile.description = description;
        currentFriendProfile.background = description; // 同步到 background 字段
        
        // 更新 AI 角色的背景信息
        if (currentFriendProfile.isAI && currentFriendProfile.aiCharacterId) {
            const aiChar = aiCharacters[currentFriendProfile.aiCharacterId];
            if (aiChar) {
                aiChar.background = description;
            }
        }
        
        // 更新状态显示
        if (description) {
            currentFriendProfile.status = description.substring(0, 50) + (description.length > 50 ? '...' : '');
            renderLineeFriends();
        }
        
        // 保存到本地
        saveLineeData();
    }
    
    // 退出编辑模式
    textarea.readOnly = true;
    textarea.style.borderColor = '#E5E7EB';
    document.getElementById('desc-save-section').style.display = 'none';
    document.getElementById('edit-desc-btn').innerHTML = '<ion-icon name="create-outline"></ion-icon> 编辑';
    
    alert('描述已保存！');
    
    alert('保存成功！');
}

function sendMessageToFriend() {
    if (!currentFriendProfile) return;
    
    // 查找或创建聊天
    let existingChat = mockChats.find(c => c.name === currentFriendProfile.name);
    if (!existingChat) {
        existingChat = {
            id: 'chat_' + Date.now(),
            name: currentFriendProfile.name,
            avatar: currentFriendProfile.avatar,
            lastMessage: '开始聊天吧',
            timestamp: '刚刚',
            unreadCount: 0,
            isGroup: false,
            isAI: currentFriendProfile.isAI,
            aiCharacterId: currentFriendProfile.aiCharacterId
        };
        mockChats.unshift(existingChat);
    }
    
    // 关闭好友信息页
    closeFriendProfile();
    
    // 切换到聊天 Tab 并打开聊天室
    document.querySelectorAll('.linee-nav-item[data-tab="chats"]')[0].click();
    setTimeout(() => openChatRoom(existingChat.id, existingChat.name), 100);
}

function toggleEditNameNickname() {
    const nameInput = document.getElementById('friend-profile-name-input');
    const nicknameInput = document.getElementById('friend-profile-nickname');
    const saveSection = document.getElementById('name-save-section');
    const editBtn = document.getElementById('edit-name-btn');
    
    if (nameInput.readOnly) {
        // 进入编辑模式
        nameInput.readOnly = false;
        nicknameInput.readOnly = false;
        nameInput.style.borderColor = '#A0D8EF';
        nicknameInput.style.borderColor = '#A0D8EF';
        nameInput.focus();
        saveSection.style.display = 'block';
        editBtn.innerHTML = '<ion-icon name="close-outline"></ion-icon> 取消';
    } else {
        // 取消编辑
        nameInput.readOnly = true;
        nicknameInput.readOnly = true;
        nameInput.style.borderColor = '#E5E7EB';
        nicknameInput.style.borderColor = '#E5E7EB';
        saveSection.style.display = 'none';
        editBtn.innerHTML = '<ion-icon name="create-outline"></ion-icon> 编辑';
        // 恢复原始值
        nameInput.value = currentFriendProfile.name;
        nicknameInput.value = currentFriendProfile.nickname || '';
    }
}

function saveNameNickname() {
    const nameInput = document.getElementById('friend-profile-name-input');
    const nicknameInput = document.getElementById('friend-profile-nickname');
    const newName = nameInput.value.trim();
    const newNickname = nicknameInput.value.trim();
    
    if (!newName) {
        alert('姓名不能为空！');
        return;
    }
    
    if (currentFriendProfile) {
        const oldName = currentFriendProfile.name;
        currentFriendProfile.name = newName;
        currentFriendProfile.nickname = newNickname;
        
        // 更新显示名称
        const displayName = newNickname || newName;
        document.getElementById('friend-profile-name').textContent = displayName;
        
        // 更新好友列表
        renderLineeFriends();
        
        // 更新聊天列表
        const chat = mockChats.find(c => c.name === oldName);
        if (chat) {
            chat.name = newName;
            chat.nickname = newNickname;
            renderChatList();
        }
        
        // 保存到本地
        saveLineeData();
    }
    
    // 退出编辑模式
    nameInput.readOnly = true;
    nicknameInput.readOnly = true;
    nameInput.style.borderColor = '#E5E7EB';
    nicknameInput.style.borderColor = '#E5E7EB';
    document.getElementById('name-save-section').style.display = 'none';
    document.getElementById('edit-name-btn').innerHTML = '<ion-icon name="create-outline"></ion-icon> 编辑';
    
    alert('保存成功！');
}

function deleteFriend() {
    if (!currentFriendProfile) return;
    
    const confirmDelete = confirm(`确定要删除好友 "${currentFriendProfile.name}" 吗？`);
    if (!confirmDelete) return;
    
    // 从好友列表中删除
    const index = lineeFriends.findIndex(f => f.name === currentFriendProfile.name);
    if (index > -1) {
        lineeFriends.splice(index, 1);
    }
    
    // 从聊天列表中删除
    const chatIndex = mockChats.findIndex(c => c.name === currentFriendProfile.name);
    if (chatIndex > -1) {
        mockChats.splice(chatIndex, 1);
    }
    
    // 如果是 AI 角色，删除 AI 数据
    if (currentFriendProfile.isAI && currentFriendProfile.aiCharacterId) {
        delete aiCharacters[currentFriendProfile.aiCharacterId];
        delete chatMessages['chat_' + currentFriendProfile.aiCharacterId];
    }
    
    // 更新列表
    renderLineeFriends();
    renderChatList();
    
    // 保存到本地
    saveLineeData();
    
    // 关闭页面
    closeFriendProfile();
    
    alert('已删除好友');
}

// === 聊天设置页功能 ===
let chatSettings = {
    worldbook: null,
    streaming: false,
    timeSync: false,
    contextLimit: 20,
    charAvatar: '',
    charBackground: '',
    userPersonaSlot: 0,
    chatBackground: '',
    bubbleColor: '#A0D8EF',
    customCSS: '',
    autoReply: false,
    enterToSend: true,
    allowCalls: false,
    offlineMode: false  // 新增：线下模式开关 (默认线上模式)
};

function openChatSettings() {
    const chatRoom = document.getElementById('linee-chat-room');
    const settingsPage = document.getElementById('chat-settings-page');
    
    // 隐藏聊天室，显示设置页
    chatRoom.style.display = 'none';
    settingsPage.classList.remove('hidden');
    
    // 加载当前设置
    loadChatSettings();
    
    // 同步当前聊天好友的信息到设置
    syncCurrentFriendToSettings();
}

function closeChatSettings() {
    const chatRoom = document.getElementById('linee-chat-room');
    const settingsPage = document.getElementById('chat-settings-page');
    
    // 显示聊天室，隐藏设置页
    settingsPage.classList.add('hidden');
    chatRoom.style.display = 'flex';
}

function loadChatSettings() {
    // 加载已保存的设置
    document.getElementById('streaming-toggle').checked = chatSettings.streaming;
    document.getElementById('timesync-toggle').checked = chatSettings.timeSync;
    document.getElementById('context-slider').value = chatSettings.contextLimit;
    document.getElementById('context-value').textContent = chatSettings.contextLimit + ' 条';
    document.getElementById('char-avatar-url').value = chatSettings.charAvatar;
    document.getElementById('char-background').value = chatSettings.charBackground;
    document.getElementById('chat-custom-css').value = chatSettings.customCSS;
    document.getElementById('offline-mode-toggle').checked = chatSettings.offlineMode;
    document.getElementById('autoreply-toggle').checked = chatSettings.autoReply;
    document.getElementById('enter-send-toggle').checked = chatSettings.enterToSend;
    document.getElementById('allow-calls-toggle').checked = chatSettings.allowCalls;
}

// 同步当前好友信息到聊天设置
function syncCurrentFriendToSettings() {
    if (!currentChatId) return;
    
    // 查找当前聊天对应的好友
    const currentChat = mockChats.find(c => c.id === currentChatId);
    if (!currentChat) return;
    
    const friend = lineeFriends.find(f => f.name === currentChat.name);
    if (!friend) return;
    
    // 同步姓名和备注
    const nameInput = document.getElementById('char-name-input');
    const nicknameInput = document.getElementById('char-nickname-input');
    const backgroundInput = document.getElementById('char-background');
    const avatarInput = document.getElementById('char-avatar-url');
    
    if (nameInput) nameInput.value = friend.name || '';
    if (nicknameInput) nicknameInput.value = friend.nickname || '';
    if (backgroundInput) backgroundInput.value = friend.background || friend.status || '';
    if (avatarInput && friend.avatar) {
        // 如果是 data URL，显示 "(本地图片)"
        if (friend.avatar.startsWith('data:')) {
            avatarInput.value = '(本地图片已上传)';
        } else {
            avatarInput.value = friend.avatar;
        }
    }
}

function selectWorldBook() {
    // 获取所有局部世界书
    const localBooks = Object.keys(AICore.worldSystem.local_books);
    
    if (localBooks.length === 0) {
        alert('暂无可用的世界书\n\n请先在世界书 App 中创建局部世界书');
        return;
    }
    
    // 创建选择列表
    let booksList = '请选择要关联的世界书：\n\n';
    localBooks.forEach((id, index) => {
        const book = AICore.worldSystem.local_books[id];
        const name = book.entries["__META_NAME__"] || id;
        booksList += `${index + 1}. ${name}\n`;
    });
    
    const choice = prompt(booksList + '\n输入序号选择：');
    if (!choice) return;
    
    const index = parseInt(choice) - 1;
    if (index >= 0 && index < localBooks.length) {
        const selectedId = localBooks[index];
        const book = AICore.worldSystem.local_books[selectedId];
        const name = book.entries["__META_NAME__"] || selectedId;
        
        chatSettings.worldbook = selectedId;
        document.getElementById('selected-worldbook').textContent = name;
        document.getElementById('selected-worldbook').style.color = '#06c755';
    }
}

// Context Slider
document.addEventListener('DOMContentLoaded', () => {
    const slider = document.getElementById('context-slider');
    if (slider) {
        slider.addEventListener('input', (e) => {
            const value = e.target.value;
            document.getElementById('context-value').textContent = value + ' 条';
            chatSettings.contextLimit = parseInt(value);
        });
    }
});

function toggleCharacterProfile() {
    const details = document.getElementById('character-details');
    const arrow = document.getElementById('char-profile-arrow');
    
    if (details.style.display === 'none') {
        details.style.display = 'block';
        arrow.style.transform = 'rotate(90deg)';
    } else {
        details.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
    }
}

function uploadCharAvatar() {
    document.getElementById('char-avatar-file').click();
}

function handleCharAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        chatSettings.charAvatar = e.target.result;
        document.getElementById('char-avatar-url').value = '(本地图片已上传)';
    };
    reader.readAsDataURL(file);
}

function selectPersonaSlot(slot) {
    // 移除所有活动状态
    document.querySelectorAll('.persona-slot').forEach(s => {
        s.classList.remove('active');
        s.style.borderColor = '#E5E7EB';
    });
    
    // 激活选中的卡槽
    const selectedSlot = document.querySelector(`[data-slot="${slot}"]`);
    selectedSlot.classList.add('active');
    selectedSlot.style.borderColor = '#06c755';
    
    chatSettings.userPersonaSlot = slot;
}

function uploadChatBackground() {
    document.getElementById('chat-bg-file').click();
}

function handleChatBgUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        chatSettings.chatBackground = e.target.result;
        const preview = document.querySelector('#chat-bg-preview img');
        preview.src = e.target.result;
        preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function selectBubbleColor(color) {
    // 移除所有活动状态
    document.querySelectorAll('.bubble-color').forEach(c => {
        c.classList.remove('active');
        c.style.boxShadow = 'none';
        c.style.borderColor = 'white';
    });
    
    // 激活选中的颜色
    const selectedColor = document.querySelector(`[data-color="${color}"]`);
    selectedColor.classList.add('active');
    
    chatSettings.bubbleColor = color;
}

function toggleAdvancedCSS() {
    const textarea = document.getElementById('chat-custom-css');
    const arrow = document.getElementById('css-arrow');
    
    if (textarea.style.display === 'none' || textarea.style.display === '') {
        textarea.style.display = 'block';
        arrow.style.transform = 'rotate(180deg)';
    } else {
        textarea.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
    }
}

function saveAllChatSettings() {
    // 收集所有设置
    chatSettings.streaming = document.getElementById('streaming-toggle').checked;
    chatSettings.timeSync = document.getElementById('timesync-toggle').checked;
    chatSettings.contextLimit = parseInt(document.getElementById('context-slider').value);
    chatSettings.charAvatar = document.getElementById('char-avatar-url').value;
    chatSettings.charBackground = document.getElementById('char-background').value;
    chatSettings.customCSS = document.getElementById('chat-custom-css').value;
    chatSettings.offlineMode = document.getElementById('offline-mode-toggle').checked;
    chatSettings.autoReply = document.getElementById('autoreply-toggle').checked;
    chatSettings.enterToSend = document.getElementById('enter-send-toggle').checked;
    chatSettings.allowCalls = document.getElementById('allow-calls-toggle').checked;
    
    // 同步设置到当前好友
    syncSettingsToCurrentFriend();
    
    // 保存到 localStorage
    localStorage.setItem('chatSettings', JSON.stringify(chatSettings));
    
    // 输出到 Console (用于调试)
    console.log('📋 Chat Settings Saved:', chatSettings);
    
    // 应用设置到当前聊天
    applyChatSettings();
    
    // 显示成功提示
    alert('✅ 设定已保存！\n\n设置将应用到当前聊天和好友信息。');
    
    // 返回聊天室
    closeChatSettings();
}

// 将聊天设置同步到当前好友
function syncSettingsToCurrentFriend() {
    if (!currentChatId) return;
    
    // 查找当前聊天对应的好友
    const currentChat = mockChats.find(c => c.id === currentChatId);
    if (!currentChat) return;
    
    const friend = lineeFriends.find(f => f.name === currentChat.name);
    if (!friend) return;
    
    // 同步姓名和备注
    const newName = document.getElementById('char-name-input').value.trim();
    const newNickname = document.getElementById('char-nickname-input').value.trim();
    const newBackground = document.getElementById('char-background').value.trim();
    
    if (newName && newName !== friend.name) {
        const oldName = friend.name;
        friend.name = newName;
        currentChat.name = newName;
        
        // 更新聊天消息中的好友名称
        if (chatMessages[currentChatId]) {
            // 消息已经在 chatMessages 中，不需要改名称
        }
    }
    
    if (newNickname !== friend.nickname) {
        friend.nickname = newNickname;
        currentChat.nickname = newNickname;
    }
    
    if (newBackground) {
        friend.background = newBackground;
        // 如果没有 status 或 status 是默认值，用 background 的前50字作为状态
        if (!friend.status || friend.status === 'New Friend' || friend.status === 'AI Character') {
            friend.status = newBackground.substring(0, 50) + (newBackground.length > 50 ? '...' : '');
        }
    }
    
    // 保存数据
    saveLineeData();
    
    // 更新列表显示
    renderLineeFriends();
    renderChatList();
}

function applyChatSettings() {
    // 应用聊天背景
    if (chatSettings.chatBackground) {
        const chatContainer = document.getElementById('chat-messages-container');
        chatContainer.style.backgroundImage = `url(${chatSettings.chatBackground})`;
        chatContainer.style.backgroundSize = 'cover';
        chatContainer.style.backgroundPosition = 'center';
    }
    
    // 应用气泡颜色
    document.documentElement.style.setProperty('--bubble-color', chatSettings.bubbleColor);
    
    // 应用自定义 CSS
    if (chatSettings.customCSS) {
        let styleTag = document.getElementById('custom-chat-style');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'custom-chat-style';
            document.head.appendChild(styleTag);
        }
        styleTag.textContent = chatSettings.customCSS;
    }
    
    // 重新渲染消息（应用线上/线下模式布局）
    if (currentChatId && chatMessages[currentChatId]) {
        renderChatMessages();
    }
}

// 页面加载时恢复设置
if (typeof window !== 'undefined') {
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
        chatSettings = JSON.parse(savedSettings);
    }
}

// 导出聊天设置函数
window.openChatSettings = openChatSettings;
window.closeChatSettings = closeChatSettings;
window.selectWorldBook = selectWorldBook;
window.toggleCharacterProfile = toggleCharacterProfile;
window.uploadCharAvatar = uploadCharAvatar;
window.handleCharAvatarUpload = handleCharAvatarUpload;
window.selectPersonaSlot = selectPersonaSlot;
window.uploadChatBackground = uploadChatBackground;
window.handleChatBgUpload = handleChatBgUpload;
window.selectBubbleColor = selectBubbleColor;
window.toggleAdvancedCSS = toggleAdvancedCSS;
window.saveAllChatSettings = saveAllChatSettings;
window.syncCurrentFriendToSettings = syncCurrentFriendToSettings;
window.syncSettingsToCurrentFriend = syncSettingsToCurrentFriend;

// 导出个人设定函数
window.uploadPersonalAvatar = uploadPersonalAvatar;
window.handlePersonalAvatarUpload = handlePersonalAvatarUpload;

// 导出好友信息页函数
window.openFriendProfile = openFriendProfile;
window.toggleEditNameNickname = toggleEditNameNickname;
window.saveNameNickname = saveNameNickname;
window.closeFriendProfile = closeFriendProfile;
window.openAvatarUploader = openAvatarUploader;
window.openBgUploader = openBgUploader;
window.handleAvatarUpload = handleAvatarUpload;
window.handleBgUpload = handleBgUpload;
window.toggleEditDescription = toggleEditDescription;
window.saveDescription = saveDescription;
window.sendMessageToFriend = sendMessageToFriend;
window.deleteFriend = deleteFriend;

// 导出 AI 生成角色函数
window.confirmAIGenerateChar = confirmAIGenerateChar;

// 确认创建角色
window.confirmAICreateChar = function() {
    const name = document.getElementById('ai-char-name').value.trim();
    if (!name) return alert("请输入名字");
    
    const data = {
        name: name,
        gender: document.getElementById('ai-char-gender').value,
        identity: document.getElementById('ai-char-identity').value,
        appearance: document.getElementById('ai-char-appearance').value,
        background: document.getElementById('ai-char-background').value,
        personality_tags: document.getElementById('ai-char-tags').value.split(/[,，]/).map(s => s.trim()).filter(s => s),
        dialogue_style: document.getElementById('ai-char-style').value,
        first_message: document.getElementById('ai-char-first-msg').value,
        source: 'manual'
    };
    
    // 1. 创建 AI Character 对象
    const char = new AICore.Character(data);
    aiCharacters[char.id] = char;
    
    // 2. 添加到好友列表
    lineeFriends.push({ 
        name: char.name, 
        status: char.identity || "AI Character", 
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${char.name}`,
        isAI: true,
        aiCharacterId: char.id
    });
    
    // 3. 创建聊天会话
    const newChat = {
        id: 'chat_' + Date.now(),
        name: char.name,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${char.name}`,
        lastMessage: char.first_message || "你好，我是" + char.name,
        timestamp: '刚刚',
        unreadCount: 1,
        isGroup: false,
        isAI: true,
        aiCharacterId: char.id
    };
    mockChats.unshift(newChat);
    
    // 4. 如果有开场白，写入记录
    if (char.first_message) {
        chatMessages[newChat.id] = [{ text: char.first_message, time: '刚刚', isUser: false }];
    }
    
    // 刷新界面
    renderLineeFriends();
    renderChatList();
    saveLineeData(); // 保存数据
    closeLineeModal('linee-modal-create-char');
    closeLineeProfileSettings(); // 关闭设置，回到主界面查看新好友
    alert(`角色 ${char.name} 创建成功！已添加为好友。`);
};

// 打开世界书
window.openWorldBookModal = function() {
    document.getElementById('linee-modal-world-book').classList.remove('hidden');
    renderWorldEntries();
};

function renderWorldEntries() {
    const list = document.getElementById('world-entries-list');
    if (!list) return;
    
    // 简单展示 Global Main 的内容
    const book = AICore.worldSystem.global_books["global_main"];
    if (!book || Object.keys(book.entries).length === 0) {
        list.innerHTML = '<div style="color: #999; font-size: 12px; text-align: center;">暂无条目</div>';
        return;
    }
    
    list.innerHTML = Object.entries(book.entries).map(([k, v]) => `
        <div style="padding: 6px; border-bottom: 1px solid #eee; font-size: 12px;">
            <strong style="color: #333;">${k}</strong>: <span style="color: #666;">${v}</span>
        </div>
    `).join('');
}

window.addWorldEntry = function() {
    const key = document.getElementById('world-key').value.trim();
    const content = document.getElementById('world-content').value.trim();
    
    if (key && content) {
        const book = AICore.worldSystem.global_books["global_main"];
        book.entries[key] = content;
        
        document.getElementById('world-key').value = '';
        document.getElementById('world-content').value = '';
        renderWorldEntries();
    }
};

// 打开导入
window.openImportCardModal = function() {
    document.getElementById('linee-modal-import-card').classList.remove('hidden');
};

// 确认导入 (Mock Implementation)
window.confirmImportCard = function() {
    const fileInput = document.getElementById('import-card-file');
    if (fileInput.files.length === 0) return alert("请选择文件");
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        // 这里应该解析 Tavern Card (PNG Chunk or JSON)
        // 简化：假设成功，创建一个模拟角色
        
        const charName = file.name.split('.')[0];
        const data = {
            name: charName,
            gender: "未知",
            identity: "导入角色",
            background: "从酒馆卡导入的详细设定...",
            appearance: "导入的外貌描述...",
            personality_tags: ["导入"],
            source: 'import'
        };
        
        const char = new AICore.Character(data);
        aiCharacters[char.id] = char;
        
        lineeFriends.push({ 
            name: char.name, 
            status: "Imported Character", 
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${char.name}`,
            isAI: true,
            aiCharacterId: char.id
        });
        
        const newChat = {
            id: 'chat_' + Date.now(),
            name: char.name,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${char.name}`,
            lastMessage: "已导入角色卡",
            timestamp: '刚刚',
            unreadCount: 0,
            isGroup: false,
            isAI: true,
            aiCharacterId: char.id
        };
        mockChats.unshift(newChat);
        
        renderLineeFriends();
        renderChatList();
        saveLineeData(); // 保存数据
        closeLineeModal('linee-modal-import-card');
        closeLineeProfileSettings();
        alert(`角色 ${char.name} 导入成功！`);
    };
    
    reader.readAsText(file); // 实际对于图片应该 readAsArrayBuffer 并解析 metadata
};

// === 聊天室功能补充 ===

function togglePlusMenu() {
    const menu = document.getElementById('plus-menu');
    const btn = document.getElementById('plus-menu-btn');
    if (menu) {
        const isHidden = menu.style.display === 'none';
        menu.style.display = isHidden ? 'grid' : 'none';
        // Rotate button logic if desired
        if (btn) btn.style.transform = isHidden ? 'rotate(45deg)' : 'rotate(0deg)';
    }
}

function promptImageMessage() {
    openPromptModal('发送图片描述', '描述你想生成的图片画面...');
}

function promptAudioMessage() {
    openPromptModal('发送语音', '输入你想说的语音内容...');
}

async function handleAIRead() {
    if (!currentChatId) return;
    
    const currentChat = mockChats.find(c => c.id === currentChatId);
    if (!currentChat || !currentChat.isAI) {
        alert('当前聊天不是 AI 角色');
        return;
    }
    
    // 手动触发 AI 回复（即使自动回复关闭也生成）
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    
    // 检查 API 配置
    if (!state.apiConfig || !state.apiConfig.url || !state.apiConfig.key) {
        alert('请先在设置中配置 API');
        return;
    }
    
    // 获取 AI 角色
    const aiChar = aiCharacters[currentChat.aiCharacterId];
    if (!aiChar) {
        alert('找不到 AI 角色数据');
        return;
    }
    
    // 显示 "正在输入..." 气泡
    const typingMsg = { text: '正在输入...', time, isUser: false, isTyping: true };
    chatMessages[currentChatId].push(typingMsg);
    renderChatMessages();
    
    try {
        // 获取历史记录
        const allHistory = chatMessages[currentChatId] || [];
        const recentHistory = allHistory.filter(m => !m.isTyping).slice(-10);
        
        const currentMode = chatSettings.offlineMode ? "OFFLINE" : "ONLINE";
        
        // 调用 AI 核心
        const responseText = await AICore.chatSystem.generateResponse(
            aiChar,
            "（继续之前的对话）",  // 提示词
            recentHistory,
            currentMode,
            state.apiConfig
        );
        
        // 移除打字提示
        chatMessages[currentChatId] = chatMessages[currentChatId].filter(m => !m.isTyping);
        
        // 添加真实回复
        chatMessages[currentChatId].push({ text: responseText, time, isUser: false });
        renderChatMessages();
        
        // 更新列表最后一条消息
        currentChat.lastMessage = responseText.substring(0, 50) + (responseText.length > 50 ? '...' : '');
        renderChatList();
        
        // 更新好感度
        try {
            const relationshipChange = await AICore.relationshipSystem.calculateChange(
                "（继续对话）",
                responseText,
                state.apiConfig
            );
            
            if (relationshipChange !== 0) {
                aiChar.relationship.updateScore(relationshipChange);
                aiCharacters[currentChat.aiCharacterId] = aiChar;
                saveLineeData();
                console.log(`💖 好感度变化: ${relationshipChange > 0 ? '+' : ''}${relationshipChange}, 当前: ${aiChar.relationship.score} (${aiChar.relationship.level})`);
            }
        } catch (e) {
            console.error('好感度更新失败:', e);
        }
        
        saveLineeData();
        
    } catch (e) {
        console.error('AI 生成失败:', e);
        chatMessages[currentChatId] = chatMessages[currentChatId].filter(m => !m.isTyping);
        chatMessages[currentChatId].push({ text: '❌ 生成失败: ' + e.message, time, isUser: false });
        renderChatMessages();
    }
}

function openPromptModal(title, placeholder) {
    const modal = document.getElementById('prompt-modal');
    const titleEl = document.getElementById('prompt-title');
    const inputEl = document.getElementById('prompt-input');
    
    if (modal && titleEl && inputEl) {
        titleEl.textContent = title;
        inputEl.placeholder = placeholder;
        inputEl.value = '';
        modal.style.display = 'flex';
        inputEl.focus();
    }
}

function closePromptModal() {
    const modal = document.getElementById('prompt-modal');
    if (modal) modal.style.display = 'none';
}

function submitPrompt() {
    const inputEl = document.getElementById('prompt-input');
    const text = inputEl ? inputEl.value.trim() : '';
    
    if (text) {
        // Handle prompt submission - for now just send as text message with a prefix or directly
        const title = document.getElementById('prompt-title').textContent;
        let prefix = "";
        if (title.includes("图片")) prefix = "[图片生成请求] ";
        if (title.includes("语音")) prefix = "[语音] ";
        
        const inputField = document.getElementById('chat-input-field');
        if (inputField) {
            inputField.value = prefix + text;
            sendChatMessage();
        }
    }
    closePromptModal();
}

function deleteChatHistory() {
    if (!currentChatId) {
        alert('请先打开聊天室');
        return;
    }
    
    if (confirm('确定要清空当前聊天记录吗？此操作无法撤销。')) {
        chatMessages[currentChatId] = [];
        renderChatMessages();
        
        // 更新聊天列表的最后一条消息
        const currentChat = mockChats.find(c => c.id === currentChatId);
        if (currentChat) {
            currentChat.lastMessage = '';
            renderChatList();
        }
        
        saveLineeData();
        alert('✅ 聊天记录已清空');
    }
}

// 消息长按功能
let longPressTimer = null;
let longPressTarget = null;

function handleTouchStart(event, msgIndex) {
    longPressTarget = msgIndex;
    longPressTimer = setTimeout(() => {
        showMessageMenu(event, msgIndex);
    }, 500);
}

function handleTouchEnd(event) {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
}

function showMessageMenu(event, msgIndex) {
    event.preventDefault();
    
    const existingMenu = document.getElementById('message-context-menu');
    if (existingMenu) existingMenu.remove();
    
    const msg = chatMessages[currentChatId][msgIndex];
    if (!msg) return;
    
    const menu = document.createElement('div');
    menu.id = 'message-context-menu';
    menu.style.cssText = `position: fixed; background: white; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.15); padding: 8px 0; z-index: 10000; min-width: 150px;`;
    
    const menuItems = [];
    
    if (msg.isUser) {
        menuItems.push({ icon: 'refresh-outline', text: '重新发送', action: () => resendMessage(msgIndex) });
        menuItems.push({ icon: 'return-up-back-outline', text: '撤回', action: () => recallMessage(msgIndex) });
    }
    
    menuItems.push({ icon: 'copy-outline', text: '复制', action: () => copyMessage(msgIndex) });
    menuItems.push({ icon: 'trash-outline', text: '删除', color: '#DC2626', action: () => deleteMessage(msgIndex) });
    
    menuItems.forEach(item => {
        const menuItem = document.createElement('div');
        menuItem.style.cssText = `padding: 12px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; color: ${item.color || '#333'}; font-size: 15px; transition: background 0.2s;`;
        menuItem.innerHTML = `<ion-icon name="${item.icon}" style="font-size: 20px;"></ion-icon><span>${item.text}</span>`;
        menuItem.onmouseover = () => menuItem.style.background = '#F3F4F6';
        menuItem.onmouseout = () => menuItem.style.background = 'transparent';
        menuItem.onclick = () => { item.action(); menu.remove(); };
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
}

function resendMessage(msgIndex) {
    const msg = chatMessages[currentChatId][msgIndex];
    if (!msg || !msg.isUser) return;
    const input = document.getElementById('chat-input-field');
    if (input) {
        input.value = msg.text;
        sendChatMessage();
    }
}

function recallMessage(msgIndex) {
    const msg = chatMessages[currentChatId][msgIndex];
    if (!msg || !msg.isUser) return;
    chatMessages[currentChatId][msgIndex] = { text: '你撤回了一条消息', time: msg.time, isUser: false, isRecalled: true };
    renderChatMessages();
    saveLineeData();
}

function copyMessage(msgIndex) {
    const msg = chatMessages[currentChatId][msgIndex];
    if (!msg) return;
    navigator.clipboard.writeText(msg.text).then(() => alert('✅ 已复制')).catch(() => alert('❌ 复制失败'));
}

function deleteMessage(msgIndex) {
    if (confirm('确定要删除这条消息吗？')) {
        chatMessages[currentChatId].splice(msgIndex, 1);
        renderChatMessages();
        saveLineeData();
    }
}

// === 足迹 (Steps) 系统 ===

function setupStepsListeners() {
    // 顶部按钮
    const addBtn = document.getElementById('steps-add-btn');
    if (addBtn) addBtn.onclick = () => switchStepsView('create');
    
    const deleteBtn = document.getElementById('steps-delete-btn');
    if (deleteBtn) deleteBtn.onclick = toggleWorldDeleteMode;

    // 创建世界观
    const createBack = document.getElementById('create-back-btn');
    if (createBack) createBack.onclick = () => switchStepsView('home');
    
    const createSave = document.getElementById('create-save-btn');
    if (createSave) createSave.onclick = saveNewWorld;
    
    const createGenerate = document.getElementById('create-generate-btn');
    if (createGenerate) createGenerate.onclick = generateMapPreview;
    
    // 输入监听 - 激活保存按钮
    const createName = document.getElementById('create-name');
    if (createName) createName.oninput = validateCreateForm;

    // 角色列表
    const charListBack = document.getElementById('charlist-back-btn');
    if (charListBack) charListBack.onclick = () => switchStepsView('home');
    
    const charListMenu = document.getElementById('charlist-menu-btn');
    if (charListMenu) charListMenu.onclick = toggleCharListMenu;
    
    // 角色详情
    const charDetailBack = document.getElementById('chardetail-back-btn');
    if (charDetailBack) charDetailBack.onclick = () => switchStepsView('charlist');
}

function initStepsPage() {
    renderStepsWorlds();
    switchStepsView('home');
}

function switchStepsView(viewName) {
    const views = ['home', 'create', 'charlist', 'chardetail'];
    views.forEach(v => {
        const el = document.getElementById(`steps-${v}-view`);
        if (el) el.style.display = v === viewName ? 'flex' : 'none';
    });
    
    if (viewName === 'home') renderStepsWorlds();
}

// --- World Management ---

function renderStepsWorlds() {
    const container = document.getElementById('steps-worlds-container');
    const hint = document.getElementById('steps-hint');
    if (!container) return;

    if (stepsWorlds.length === 0) {
        container.innerHTML = '<div style="width: 100%; text-align: center; color: #9CA3AF; padding: 40px 0;">暂无世界观，点击右上角 + 新增</div>';
        if (hint) hint.textContent = '';
        return;
    }

    container.innerHTML = stepsWorlds.map(world => `
        <div class="steps-world-card" onclick="openWorld('${world.id}')" style="min-width: 280px; height: 360px; border-radius: 24px; position: relative; overflow: hidden; scroll-snap-align: center; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.2);">
            <img src="${world.image}" style="width: 100%; height: 100%; object-fit: cover;">
            <div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); padding: 24px; display: flex; flex-direction: column; justify-content: flex-end;">
                <h3 style="color: white; font-size: 24px; font-weight: bold; margin-bottom: 8px;">${world.name}</h3>
                <p style="color: rgba(255,255,255,0.8); font-size: 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${world.desc}</p>
                <div style="margin-top: 12px; display: flex; gap: 8px;">
                    ${world.landmarks.slice(0, 2).map(l => `<span style="background: rgba(255,255,255,0.2); color: white; padding: 4px 8px; border-radius: 6px; font-size: 10px; backdrop-filter: blur(4px);">${l}</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
    
    if (hint) hint.textContent = `${stepsWorlds.length} 个世界观`;
}

function openWorld(worldId) {
    currentWorldId = worldId;
    const world = stepsWorlds.find(w => w.id === worldId);
    if (!world) return;
    
    document.getElementById('charlist-world-name').textContent = world.name;
    renderWorldCharList();
    switchStepsView('charlist');
}

function saveNewWorld() {
    const name = document.getElementById('create-name').value.trim();
    const desc = document.getElementById('create-desc').value.trim();
    const landmarks = document.getElementById('create-landmarks').value.split(/[,，]/).map(s => s.trim()).filter(s => s);
    
    if (!name) return alert('请输入世界观名称');
    
    const newWorld = {
        id: 'world_' + Date.now(),
        name,
        desc: desc || '暂无描述',
        landmarks: landmarks.length ? landmarks : ['未命名区域'],
        image: `https://source.unsplash.com/random/400x600?scifi,city&sig=${Date.now()}`, // Random mock image
        characters: []
    };
    
    stepsWorlds.push(newWorld);
    
    // Reset form
    document.getElementById('create-name').value = '';
    document.getElementById('create-desc').value = '';
    document.getElementById('create-landmarks').value = '';
    document.getElementById('create-map-preview').innerHTML = '<p style="color: #9CA3AF; font-size: 14px;">点击生成预览</p>';
    document.getElementById('create-save-btn').disabled = true;
    
    switchStepsView('home');
}

function validateCreateForm() {
    const name = document.getElementById('create-name').value.trim();
    const btn = document.getElementById('create-save-btn');
    if (btn) {
        btn.disabled = !name;
        btn.style.opacity = name ? '1' : '0.5';
    }
}

function generateMapPreview() {
    const preview = document.getElementById('create-map-preview');
    preview.innerHTML = `<div style="color: #A0D8EF; font-weight: bold;">🗺 地图生成中...</div>`;
    setTimeout(() => {
        preview.innerHTML = `<img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400&q=80" style="width:100%;height:100%;object-fit:cover;">`;
    }, 1000);
}

function toggleWorldDeleteMode() {
    alert("长按世界卡片即可删除 (功能开发中)");
}

// --- Character List in World ---

function renderWorldCharList() {
    const grid = document.getElementById('charlist-grid');
    if (!grid || !currentWorldId) return;
    
    const world = stepsWorlds.find(w => w.id === currentWorldId);
    // Filter friends who are "in" this world (mock logic: just show all AI chars for now)
    // In real app, Character model would have a linked_world_id
    
    // For demo, let's just show some mock cards plus actual AI chars
    const charsToShow = Object.values(aiCharacters).map(c => ({
        id: c.id,
        name: c.name,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.name}`,
        status: "在 " + (world.landmarks[0] || "未知地")
    }));
    
    if (charsToShow.length === 0) {
        grid.innerHTML = '<div style="grid-column: span 2; text-align: center; color: #999; padding: 20px;">暂无角色，请点击右上角添加</div>';
        return;
    }

    grid.innerHTML = charsToShow.map(c => `
        <div onclick="openCharDetail('${c.id}')" style="background: #F9FAFB; border-radius: 16px; padding: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <img src="${c.avatar}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">
            <div style="text-align: center;">
                <div style="font-weight: 600; font-size: 14px;">${c.name}</div>
                <div style="font-size: 10px; color: #6B7280; margin-top: 2px;">${c.status}</div>
            </div>
        </div>
    `).join('');
}

function toggleCharListMenu() {
    const menu = document.getElementById('charlist-menu');
    if (menu) menu.classList.toggle('hidden');
}

// --- Character Detail & Footprints ---

function openCharDetail(charId) {
    currentCharId = charId;
    const char = aiCharacters[charId] || { name: 'Unknown', id: charId };
    
    document.getElementById('chardetail-char-name').textContent = char.name;
    
    // Render Mock Map
    const mapContainer = document.getElementById('chardetail-map');
    mapContainer.innerHTML = `<img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&q=80" style="width:100%;height:100%;object-fit:cover;opacity:0.8;">
        <div style="position:absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">📍 当前位置</div>`;

    // Render Mock Timeline
    const timeline = document.getElementById('chardetail-timeline');
    timeline.innerHTML = `
        <div style="padding: 20px 0;">
            <div style="font-size: 12px; color: #9CA3AF; margin-bottom: 16px;">今天</div>
            ${[
                { time: '08:00', loc: '公寓', action: '醒来，喝了一杯合成咖啡。' },
                { time: '10:30', loc: '中央塔', action: '前往公司处理突发网络安全事故。' },
                { time: '12:00', loc: '街角面摊', action: '遇见了几个老朋友，聊起了最近的传闻。' },
                { time: '18:45', loc: '地下黑市', action: '购买了一些非法组件。' }
            ].map(item => `
                <div style="display: flex; gap: 16px; margin-bottom: 24px;">
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <div style="width: 8px; height: 8px; border-radius: 50%; background: #A0D8EF;"></div>
                        <div style="width: 2px; flex: 1; background: #E5E7EB; margin-top: 4px;"></div>
                    </div>
                    <div style="padding-bottom: 4px;">
                        <div style="font-size: 12px; color: #6B7280; font-weight: 600;">${item.time} · ${item.loc}</div>
                        <div style="font-size: 14px; color: #374151; margin-top: 4px; line-height: 1.5;">${item.action}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    switchStepsView('chardetail');
}

// --- Modals for Steps ---

function closeStepsModal(id) {
    document.getElementById(id).classList.add('hidden');
}

window.openAddCharModal = function() {
    toggleCharListMenu(); // Close menu
    const modal = document.getElementById('steps-modal-add-char');
    const list = document.getElementById('steps-friend-list');
    
    // Filter AI friends not yet in world (mock)
    const candidates = lineeFriends.filter(f => f.isAI);
    
    list.innerHTML = candidates.map(c => `
        <div onclick="addCharToWorld('${c.aiCharacterId}')" style="padding: 12px; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 12px; cursor: pointer;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: #eee; overflow: hidden;">${c.avatar.startsWith('http') ? `<img src="${c.avatar}" style="width:100%">` : c.avatar}</div>
            <div>${c.name}</div>
        </div>
    `).join('');
    
    modal.classList.remove('hidden');
};

window.addCharToWorld = function(charId) {
    // Mock adding
    alert("已将角色加入当前世界观");
    closeStepsModal('steps-modal-add-char');
    renderWorldCharList();
};

window.toggleCharDeleteMode = function() {
    toggleCharListMenu();
    alert("点击角色右上角删除 (功能开发中)");
};

window.openMapRefreshModal = function() {
    toggleCharListMenu();
    document.getElementById('steps-modal-map-refresh').classList.remove('hidden');
};

window.executeMapRefresh = function() {
    alert("地图刷新指令已发送！");
    closeStepsModal('steps-modal-map-refresh');
};

window.openFootprintSettingsModal = function() {
    toggleCharListMenu();
    document.getElementById('steps-modal-footprint-settings').classList.remove('hidden');
};

window.generateAllFootprints = function() {
    alert("正在演算全员足迹... 请稍候");
    setTimeout(() => {
        alert("演算完成！");
        closeStepsModal('steps-modal-footprint-settings');
    }, 1500);
};

// === 初始化 ===
function initLineeAll() {
    initLineeProfileSettings();
    initLineeApp();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLineeAll);
} else {
    initLineeAll();
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

// 新增聊天室功能导出
window.togglePlusMenu = togglePlusMenu;
window.promptImageMessage = promptImageMessage;
window.promptAudioMessage = promptAudioMessage;
window.handleAIRead = handleAIRead;
window.closePromptModal = closePromptModal;
window.submitPrompt = submitPrompt;

// 新增足迹页面功能导出
window.closeStepsModal = closeStepsModal;
window.addCharToWorld = addCharToWorld;
window.toggleCharDeleteMode = toggleCharDeleteMode;
window.executeMapRefresh = executeMapRefresh;
window.generateAllFootprints = generateAllFootprints;
window.openAddCharModal = openAddCharModal;
window.openMapRefreshModal = openMapRefreshModal;
window.openFootprintSettingsModal = openFootprintSettingsModal;
