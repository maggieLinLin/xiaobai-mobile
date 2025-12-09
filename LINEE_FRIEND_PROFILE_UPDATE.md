# 👤 Linee 好友信息主页功能说明

**更新时间**: 2025-12-04  
**功能**: 壁纸修复 + 好友信息主页

---

## ✅ 问题修复

### 1. 🖼️ 主页壁纸截断问题

#### 问题原因
```css
/* 旧代码 */
#home-screen {
    position: absolute;
    top: 40px;
    height: calc(100% - 40px);  /* ❌ 高度计算导致壁纸被截断 */
}
```

壁纸被截断的原因：
- `top: 40px` 向下偏移 40px
- `height: calc(100% - 40px)` 高度减少 40px
- 导致壁纸无法覆盖顶部 40px 的状态栏区域

#### 修复方案
```css
/* 新代码 */
#home-screen {
    position: absolute;
    top: 0;                     /* ✅ 从顶部开始 */
    height: 100%;               /* ✅ 完整高度 */
    padding-top: 40px;          /* ✅ 用 padding 留出状态栏空间 */
    box-sizing: border-box;     /* ✅ padding 计入总高度 */
}
```

**效果**:
- ✅ 壁纸覆盖整个屏幕
- ✅ 状态栏透明可见背景
- ✅ 内容区域正确偏移 40px

---

## 🆕 好友信息主页功能

### 功能概览

点击好友列表中的好友后，进入好友信息主页，可以：
1. ✅ 查看好友详细信息
2. ✅ 上传本地头像
3. ✅ 上传本地背景图片
4. ✅ 编辑背景描述
5. ✅ 发送消息
6. ✅ 删除好友

---

### 📱 界面设计

```
┌─────────────────────────────────┐
│  ←                    [更换背景]  │  ← 顶部横幅（可自定义背景图）
│                                   │
│                                   │
├─────────────────────────────────┤
│          🧑 [📷]                  │  ← 头像（可点击相机图标上传）
│        好友姓名 [AI]              │
│        状态消息                   │
├─────────────────────────────────┤
│  ┌─ 背景描述 ────────── [编辑] ┐ │
│  │                              │ │
│  │  这里可以编辑好友的背景描述   │ │
│  │  包括性格、身份、经历等...    │ │
│  │                              │ │
│  └──────────────────────────────┘ │
├─────────────────────────────────┤
│  [💬 发送消息]          [🗑️]     │
└─────────────────────────────────┘
```

---

### 🎨 UI 设计细节

#### 1. 顶部横幅 (Background Banner)
```css
默认状态:
  height: 200px
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)

上传背景后:
  显示用户上传的图片
  object-fit: cover (覆盖整个区域)
```

**操作按钮**:
- **返回按钮**: 左上角，半透明黑色背景
- **更换背景按钮**: 右上角，白色背景

#### 2. 头像区域
```css
头像样式:
  width: 100px
  height: 100px
  border-radius: 50%
  border: 4px solid white
  box-shadow: 0 4px 12px rgba(0,0,0,0.1)
  margin-top: -50px (向上偏移，覆盖横幅底部)

相机按钮:
  position: absolute
  bottom: 0
  right: 0
  width: 32px
  height: 32px
  background: #A0D8EF
  border: 2px solid white
```

#### 3. 信息卡片
```css
背景描述卡片:
  background: white
  border-radius: 16px
  padding: 16px
  box-shadow: 0 1px 3px rgba(0,0,0,0.05)

文本框:
  min-height: 100px
  border: 1px solid #E5E7EB
  border-radius: 8px
  resize: vertical

编辑状态:
  border-color: #A0D8EF (蓝色边框)
  readonly: false
```

#### 4. 操作按钮
```css
发送消息按钮:
  flex: 1
  background: #A0D8EF
  color: white
  display: flex (图标 + 文字)

删除按钮:
  border: 1px solid #E5E7EB
  background: white
  color: #EF4444 (红色)
```

---

### 🔧 功能实现

#### 1. 打开好友信息页

**触发**: 点击好友列表中的好友

```javascript
function openFriendProfile(friend) {
    currentFriendProfile = friend;
    
    // 隐藏 Linee 主界面，显示好友信息页
    document.getElementById('linee-app').style.display = 'none';
    document.getElementById('friend-profile-page').classList.remove('hidden');
    
    // 填充数据
    document.getElementById('friend-profile-name').textContent = friend.name;
    document.getElementById('friend-profile-status').textContent = friend.status;
    
    // 设置头像
    if (friend.avatar.startsWith('data:')) {
        // 本地上传的图片
        avatarImg.src = friend.avatar;
    } else {
        // 网络图片或生成的头像
        avatarImg.src = friend.avatar;
    }
    
    // 设置背景图片
    if (friend.bgImage) {
        bgImg.src = friend.bgImage;
        bgImg.style.display = 'block';
    }
    
    // 设置描述
    descTextarea.value = friend.description || '';
}
```

#### 2. 上传头像

**流程**:
```
点击相机图标
  ↓
打开文件选择器
  ↓
选择图片文件
  ↓
FileReader 读取为 Base64
  ↓
更新当前显示
  ↓
保存到 friend.avatar
  ↓
更新好友列表和聊天列表
```

**代码**:
```javascript
function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;  // Base64 图片
        
        // 更新显示
        document.getElementById('friend-profile-avatar-img').src = dataUrl;
        
        // 保存数据
        currentFriendProfile.avatar = dataUrl;
        
        // 更新列表
        renderLineeFriends();
        renderChatList();
    };
    reader.readAsDataURL(file);
}
```

#### 3. 上传背景图片

**流程**: 与上传头像类似

```javascript
function handleBgUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        
        // 更新显示
        const bgImg = document.getElementById('friend-profile-bg-img');
        bgImg.src = dataUrl;
        bgImg.style.display = 'block';
        
        // 保存数据
        currentFriendProfile.bgImage = dataUrl;
    };
    reader.readAsDataURL(file);
}
```

#### 4. 编辑背景描述

**状态切换**:
```
默认状态（只读）:
  textarea.readOnly = true
  border-color: #E5E7EB
  显示 [编辑] 按钮

编辑状态:
  textarea.readOnly = false
  border-color: #A0D8EF
  显示 [取消] 按钮 + [保存] 按钮
```

**代码**:
```javascript
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
        // 取消编辑，恢复原始值
        textarea.readOnly = true;
        textarea.style.borderColor = '#E5E7EB';
        saveSection.style.display = 'none';
        editBtn.innerHTML = '<ion-icon name="create-outline"></ion-icon> 编辑';
        textarea.value = currentFriendProfile.description || '';
    }
}

function saveDescription() {
    const description = textarea.value.trim();
    
    // 保存到好友数据
    currentFriendProfile.description = description;
    
    // 如果是 AI 角色，同步更新 AI Character 的 background
    if (currentFriendProfile.isAI && currentFriendProfile.aiCharacterId) {
        const aiChar = aiCharacters[currentFriendProfile.aiCharacterId];
        if (aiChar) {
            aiChar.background = description;
        }
    }
    
    alert('保存成功！');
}
```

#### 5. 发送消息

**流程**:
```
点击 "发送消息"
  ↓
查找或创建聊天会话
  ↓
关闭好友信息页
  ↓
切换到 "聊天" Tab
  ↓
打开聊天室
```

**代码**:
```javascript
function sendMessageToFriend() {
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
    
    // 关闭并跳转
    closeFriendProfile();
    document.querySelectorAll('.linee-nav-item[data-tab="chats"]')[0].click();
    setTimeout(() => openChatRoom(existingChat.id, existingChat.name), 100);
}
```

#### 6. 删除好友

**流程**:
```
点击删除按钮
  ↓
弹出确认对话框
  ↓
确认后：
  - 从 lineeFriends 中删除
  - 从 mockChats 中删除
  - 如果是 AI 角色，删除 aiCharacters 数据
  - 删除聊天记录
  ↓
更新好友列表和聊天列表
  ↓
关闭好友信息页
```

**代码**:
```javascript
function deleteFriend() {
    const confirmDelete = confirm(`确定要删除好友 "${currentFriendProfile.name}" 吗？`);
    if (!confirmDelete) return;
    
    // 删除好友
    const index = lineeFriends.findIndex(f => f.name === currentFriendProfile.name);
    if (index > -1) {
        lineeFriends.splice(index, 1);
    }
    
    // 删除聊天
    const chatIndex = mockChats.findIndex(c => c.name === currentFriendProfile.name);
    if (chatIndex > -1) {
        mockChats.splice(chatIndex, 1);
    }
    
    // 删除 AI 数据
    if (currentFriendProfile.isAI && currentFriendProfile.aiCharacterId) {
        delete aiCharacters[currentFriendProfile.aiCharacterId];
        delete chatMessages[currentFriendProfile.aiCharacterId];
    }
    
    // 更新 UI
    renderLineeFriends();
    renderChatList();
    closeFriendProfile();
    
    alert('已删除好友');
}
```

---

### 🎯 使用流程

#### 场景 1: 查看好友信息
```
1. 打开 Linee
2. 点击好友列表中的任意好友
3. 进入好友信息主页
4. 查看头像、姓名、状态、背景描述
```

#### 场景 2: 自定义好友头像
```
1. 进入好友信息主页
2. 点击头像右下角的相机图标
3. 选择本地图片（支持 jpg/png/webp）
4. 头像自动更新
5. 好友列表和聊天列表同步更新
```

#### 场景 3: 自定义背景横幅
```
1. 进入好友信息主页
2. 点击右上角 "更换背景" 按钮
3. 选择本地图片
4. 背景横幅自动更新
```

#### 场景 4: 编辑背景描述
```
1. 进入好友信息主页
2. 点击 "背景描述" 右侧的 [编辑] 按钮
3. 文本框变为可编辑状态（蓝色边框）
4. 输入或修改描述内容
5. 点击 [保存] 按钮
6. 描述保存成功
   - 如果是 AI 角色，同步更新 aiChar.background
```

#### 场景 5: 发送消息
```
1. 进入好友信息主页
2. 点击底部 [💬 发送消息] 按钮
3. 自动关闭好友信息页
4. 切换到聊天 Tab
5. 打开与该好友的聊天室
```

#### 场景 6: 删除好友
```
1. 进入好友信息主页
2. 点击右下角 [🗑️] 按钮
3. 弹出确认对话框
4. 点击 "确定"
5. 好友被删除
   - 从好友列表移除
   - 从聊天列表移除
   - AI 数据清理
6. 自动返回 Linee 主界面
```

---

### 📊 数据结构

#### Friend 对象扩展

```javascript
{
  name: "好友姓名",
  status: "状态消息",
  avatar: "https://..." 或 "data:image/...",  // 支持网络图片和 Base64
  bgImage: "data:image/...",                  // 背景图片（Base64）
  description: "背景描述文本...",              // 可编辑的描述
  isAI: true/false,                           // 是否为 AI 角色
  aiCharacterId: "uuid"                       // AI 角色 ID
}
```

#### 数据同步

```
好友信息页修改
  ↓
currentFriendProfile 对象更新
  ↓
同步到 lineeFriends 数组
  ↓
如果是 AI 角色，同步到 aiCharacters
  ↓
渲染更新：
  - renderLineeFriends()
  - renderChatList()
```

---

### 🎨 视觉效果

#### 默认横幅（无背景图）
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
```
紫色渐变效果

#### 上传背景图后
```css
background-image: url(data:image/...)
background-size: cover
background-position: center
```
用户自定义图片全屏覆盖

#### 头像偏移效果
```css
margin-top: -50px
```
头像向上偏移 50px，部分覆盖横幅底部，形成层次感

---

### 🔒 数据持久化

**当前实现**: 内存存储（刷新页面会丢失）

**建议优化**:
```javascript
// 保存到 localStorage
function saveFriendData() {
    localStorage.setItem('lineeFriends', JSON.stringify(lineeFriends));
}

// 加载数据
function loadFriendData() {
    const saved = localStorage.getItem('lineeFriends');
    if (saved) {
        lineeFriends = JSON.parse(saved);
    }
}
```

---

### 🧪 测试清单

#### 基础功能
- [ ] 点击好友列表中的好友，进入信息页
- [ ] 显示好友姓名、状态、头像
- [ ] 点击返回按钮，返回 Linee 主界面

#### 头像上传
- [ ] 点击相机图标，打开文件选择器
- [ ] 选择图片后，头像立即更新
- [ ] 返回好友列表，头像已更新
- [ ] 进入聊天室，头像已更新

#### 背景上传
- [ ] 点击 "更换背景"，打开文件选择器
- [ ] 选择图片后，横幅背景更新
- [ ] 返回再进入，背景图片保留

#### 描述编辑
- [ ] 默认状态，文本框只读
- [ ] 点击 "编辑"，文本框变为可编辑（蓝色边框）
- [ ] 修改内容后，点击 "保存"
- [ ] 保存成功提示，文本框恢复只读
- [ ] 点击 "取消"，内容恢复原始值

#### AI 角色特殊测试
- [ ] 编辑 AI 角色的描述
- [ ] 保存后，发送消息
- [ ] AI 回复是否根据新描述调整

#### 发送消息
- [ ] 点击 "发送消息"，跳转到聊天室
- [ ] 聊天室正确打开
- [ ] 可以正常发送和接收消息

#### 删除好友
- [ ] 点击删除按钮，弹出确认框
- [ ] 点击确定，好友被删除
- [ ] 好友列表、聊天列表同步更新
- [ ] AI 数据正确清理

---

## 🎉 总结

### 核心改进
1. ✅ **壁纸修复**: 主页壁纸完整显示，不再截断
2. ✅ **好友信息页**: 全新的好友详情界面
3. ✅ **头像自定义**: 支持本地上传头像
4. ✅ **背景自定义**: 支持本地上传背景图片
5. ✅ **描述编辑**: 可编辑好友背景描述
6. ✅ **快捷操作**: 发送消息、删除好友
7. ✅ **数据同步**: AI 角色描述与聊天系统同步

### 用户体验提升
- 🎯 **更完整的个性化**: 头像 + 背景图 + 描述
- 🎯 **更好的视觉效果**: 横幅偏移、卡片阴影
- 🎯 **更便捷的操作**: 一键发送消息、编辑描述
- 🎯 **更统一的设计**: 与 Linee 整体风格一致

---

**更新完成！刷新页面测试好友信息主页功能。** 🚀


