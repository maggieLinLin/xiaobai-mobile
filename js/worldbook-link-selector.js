/**
 * 世界书关联独立选择器
 * 专门用于在LINEE中关联世界书,不进入世界书App
 */

let worldbookLinkState = {
    type: null,           // 'global' or 'local'
    selected: new Set(),  // 已选择的世界书 ID
    callback: null,       // 选择完成后的回调
    source: null          // 'chat' or 'friend'
};

// 打开世界书关联选择页面
function openWorldbookLinkSelector(type, currentSelection, callback, source) {
    console.log('📖 打开世界书关联选择器');
    console.log('  类型:', type);
    console.log('  当前已选:', currentSelection);
    console.log('  来源:', source);
    
    // 保存状态
    worldbookLinkState.type = type;
    worldbookLinkState.selected = new Set(currentSelection || []);
    worldbookLinkState.callback = callback;
    worldbookLinkState.source = source;
    
    // 显示页面
    const page = document.getElementById('worldbook-link-selector');
    if (!page) {
        console.error('❌ 找不到世界书关联选择页面元素');
        alert('错误: 找不到选择页面元素\n请刷新页面重试');
        return;
    }
    
    // 只隐藏其他app页面,不隐藏LINEE
    document.querySelectorAll('.app-window:not(#linee-app)').forEach(el => {
        if (el.id !== 'worldbook-link-selector') {
            el.classList.add('hidden');
        }
    });
    
    // 显示选择页面
    page.classList.remove('hidden');
    
    // 更新标题
    const title = document.getElementById('wblink-title');
    if (title) {
        const typeName = type === 'global' ? '全局世界书' : '局部世界书';
        title.textContent = `选择${typeName}`;
    }
    
    // 渲染列表
    renderWorldbookLinkList();
    updateWorldbookLinkCount();
}

// 关闭世界书关联选择页面
function closeWorldbookLinkSelector() {
    console.log('🚪 关闭世界书关联选择器');
    console.log('  来源:', worldbookLinkState.source);
    
    const page = document.getElementById('worldbook-link-selector');
    if (page) {
        page.classList.add('hidden');
    }
    
    // 根据来源返回对应页面
    if (worldbookLinkState.source === 'chat') {
        console.log('  → 返回聊天设置');
        // 确保LINEE页面可见
        const lineePage = document.getElementById('linee-app');
        if (lineePage) {
            lineePage.classList.remove('hidden');
        }
        // 打开聊天设置
        if (typeof openChatSettings === 'function') {
            openChatSettings();
        }
    } else if (worldbookLinkState.source === 'friend') {
        console.log('  → 返回好友资料');
        // 确保LINEE页面可见
        const lineePage = document.getElementById('linee-app');
        if (lineePage) {
            lineePage.classList.remove('hidden');
        }
        // 打开好友资料
        if (typeof currentFriendProfile !== 'undefined' && currentFriendProfile && typeof openFriendProfile === 'function') {
            openFriendProfile(currentFriendProfile);
        }
    } else {
        console.log('  → 返回LINEE主页');
        // 如果来源不明确,返回LINEE主页
        const lineePage = document.getElementById('linee-app');
        if (lineePage) {
            lineePage.classList.remove('hidden');
        }
    }
    
    // 清理状态
    worldbookLinkState = {
        type: null,
        selected: new Set(),
        callback: null,
        source: null
    };
}

// 确认选择
function confirmWorldbookLinkSelection() {
    console.log('✅ 确认世界书选择');
    
    const selectedBooks = Array.from(worldbookLinkState.selected);
    console.log('  已选择:', selectedBooks);
    
    // 调用回调
    if (worldbookLinkState.callback) {
        worldbookLinkState.callback(selectedBooks);
    }
    
    // 关闭页面
    closeWorldbookLinkSelector();
}

// 清空选择
function clearWorldbookLinkSelection() {
    console.log('🗑️ 清空世界书选择');
    worldbookLinkState.selected.clear();
    renderWorldbookLinkList();
    updateWorldbookLinkCount();
}

// 切换世界书选择状态
function toggleWorldbookLink(bookId) {
    console.log('🔄 切换世界书:', bookId);
    
    if (worldbookLinkState.selected.has(bookId)) {
        worldbookLinkState.selected.delete(bookId);
        console.log('  ❌ 取消选择');
    } else {
        worldbookLinkState.selected.add(bookId);
        console.log('  ✅ 添加选择');
    }
    
    // 更新UI
    renderWorldbookLinkList();
    updateWorldbookLinkCount();
}

// 更新计数显示
function updateWorldbookLinkCount() {
    const countEl = document.getElementById('wblink-count');
    if (countEl) {
        countEl.textContent = `已选 ${worldbookLinkState.selected.size} 个`;
    }
}

// 渲染世界书列表
function renderWorldbookLinkList() {
    const container = document.getElementById('wblink-list-container');
    if (!container) {
        console.error('❌ 找不到列表容器');
        return;
    }
    
    const type = worldbookLinkState.type;
    
    // 检查AICore是否存在
    if (typeof AICore === 'undefined' || !AICore.worldSystem) {
        container.innerHTML = '<div style="text-align: center; color: #ef4444; padding: 40px 20px;"><p style="font-size: 14px;">错误: AI核心未加载</p><p style="font-size: 12px; margin-top: 8px;">请刷新页面重试</p></div>';
        return;
    }
    
    const books = type === 'global' 
        ? AICore.worldSystem.global_books 
        : AICore.worldSystem.local_books;
    
    if (!books || Object.keys(books).length === 0) {
        const typeName = type === 'global' ? '全局' : '局部';
        container.innerHTML = `
            <div style="text-align: center; color: #9ca3af; padding: 40px 20px;">
                <i class="fa-solid fa-book" style="font-size: 48px; margin-bottom: 16px; opacity: 0.3;"></i>
                <p style="font-size: 14px;">暂无${typeName}世界书</p>
                <p style="font-size: 12px; margin-top: 8px;">请先在世界书 App 中创建</p>
            </div>
        `;
        return;
    }
    
    // 渲染卡片
    let html = '';
    Object.entries(books).forEach(([id, book]) => {
        const name = book.entries['__META_NAME__'] || id;
        const desc = book.entries['__META_DESC__'] || '';
        const entryCount = Object.keys(book.entries).filter(k => !k.startsWith('__META_')).length;
        const isSelected = worldbookLinkState.selected.has(id);
        
        const borderColor = isSelected ? '#A0D8EF' : '#e5e7eb';
        const bgColor = isSelected ? 'rgba(160, 216, 239, 0.1)' : 'white';
        const iconBg = type === 'global' ? '#EBF5FF' : '#ECFDF5';
        const iconColor = type === 'global' ? '#3B82F6' : '#10B981';
        const checkIcon = isSelected ? 'solid' : 'regular';
        const checkColor = isSelected ? '#A0D8EF' : '#d1d5db';
        
        html += `
            <div class="wblink-card ${isSelected ? 'selected' : ''}" 
                 onclick="toggleWorldbookLink('${id}')" 
                 style="position: relative; display: flex; align-items: center; padding: 16px; margin-bottom: 12px; border-radius: 12px; border: 2px solid ${borderColor}; background: ${bgColor}; cursor: pointer; transition: all 0.2s;"
                 onmouseover="this.style.borderColor='#A0D8EF'" 
                 onmouseout="this.style.borderColor='${borderColor}'">
                <div style="width: 48px; height: 48px; background: ${iconBg}; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">
                    <i class="fa-solid fa-book" style="font-size: 20px; color: ${iconColor};"></i>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <h4 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #1f2937;">${name}</h4>
                    ${desc ? `<p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${desc}</p>` : ''}
                    <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                        <i class="fa-solid fa-list-ul" style="margin-right: 4px;"></i>${entryCount} 条目
                    </p>
                </div>
                <div style="margin-left: 12px; flex-shrink: 0;">
                    <i class="fa-${checkIcon} fa-circle-check" style="font-size: 24px; color: ${checkColor};"></i>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 导出到全局
window.openWorldbookLinkSelector = openWorldbookLinkSelector;
window.closeWorldbookLinkSelector = closeWorldbookLinkSelector;
window.confirmWorldbookLinkSelection = confirmWorldbookLinkSelection;
window.clearWorldbookLinkSelection = clearWorldbookLinkSelection;
window.toggleWorldbookLink = toggleWorldbookLink;

console.log('✅ 世界书关联选择器已加载');


