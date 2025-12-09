# 🤖 Linee AI 生成角色功能说明

**更新时间**: 2025-12-04  
**功能**: 融合添加好友 + AI 一键生成角色

---

## ✅ 功能更新

### 1. 添加好友界面重构

#### 🎯 新的三大功能

```
┌─────────────────────────────┐
│  添加新联系人               │
│  选择创建方式               │
├─────────────────────────────┤
│  👤  手动创建                │
│      自定义角色详细设定      │
├─────────────────────────────┤
│  ✨  AI 生成                 │
│      输入关键词自动生成      │
├─────────────────────────────┤
│  ⬇️   导入角色卡             │
│      从 Tavern 卡导入        │
└─────────────────────────────┘
```

#### 📝 文案对比

| 旧版 | 新版 | 说明 |
|------|------|------|
| 普通好友 | 手动创建 | 融合了普通好友和智能角色 |
| 智能角色 | AI 生成 | 强调 AI 自动生成功能 |
| 导入角色卡 | 导入角色卡 | 保持不变 |

---

## 🤖 AI 生成角色功能

### 核心逻辑

```
用户输入关键词
    ↓
调用 LLM API
    ↓
使用专业 Prompt 生成完整角色设定
    ↓
返回 JSON 格式数据
    ↓
自动创建 AI Character 对象
    ↓
添加到好友列表和聊天列表
```

### System Prompt 设计

```javascript
你是一个专业的角色设定生成器。
请根据用户提供的关键词，生成一个完整的角色设定。

输出格式（JSON）：
{
  "name": "角色姓名",
  "gender": "男/女/其他",
  "identity": "身份职业",
  "appearance": "外貌特征（100-200字）",
  "background": "性格背景设定（200-300字）",
  "personality_tags": ["标签1", "标签2"],
  "dialogue_style": "对话风格",
  "first_message": "开场白（50-100字）"
}

要求：
1. 名字要符合文化背景
2. 外貌描写要具体生动
3. 背景设定要有深度
4. 性格标签要精准（2-4个）
5. 开场白要有代入感
```

### 输入界面

#### UI 元素
- **标题**: "✨ AI 生成角色"
- **说明**: "输入关键词，AI 将自动生成完整的角色设定"
- **输入框**: 多行文本框（3 行）
  - Placeholder: "例如：冷酷霸道总裁、温柔邻家姐姐、中二病魔法师..."
- **提示**: "💡 提示：可以包含性别、年龄、职业、性格等信息"
- **示例标签**: 4 个可点击的快捷示例

#### 快捷示例

1. **霸道总裁**: "28岁霸道总裁，冷漠高傲，对主角有执念"
2. **邻家姐姐**: "温柔体贴的邻家姐姐，25岁，开朗善良"
3. **中二魔法师**: "中二病魔法师，16岁，自称魔王，实际上很单纯"
4. **冷酷杀手**: "冷酷杀手，32岁，寡言少语，内心柔软"

**交互**: 点击标签自动填充到输入框

---

## 🎯 使用流程

### 场景 1: AI 生成角色（完整流程）

```
步骤 1: 打开 Linee
步骤 2: 点击右上角 "+" 按钮
步骤 3: 选择 "AI 生成"
步骤 4: 输入关键词
  示例输入：
  "冷漠的跨国集团 CEO，28岁，外表高冷内心温柔，
   对主角有特殊的执念，说话直接不拐弯抹角"

步骤 5: 点击 "🤖 生成角色"
步骤 6: 等待 AI 生成（显示 "⏳ 生成中..."）
步骤 7: 生成成功
  ✅ 弹出提示：角色 "沈砚" 生成成功！
  ✅ 自动添加到好友列表
  ✅ 自动创建聊天会话
  ✅ 显示开场白消息

步骤 8: 点击好友头像，开始聊天
```

### 场景 2: 手动创建角色

```
步骤 1: 打开 Linee
步骤 2: 点击右上角 "+" 按钮
步骤 3: 选择 "手动创建"
步骤 4: 填写详细表单（原高级创角界面）
  - 姓名、性别、身份
  - 外貌、背景
  - 性格标签、对话风格
  - 开场白
步骤 5: 点击 "创建"
步骤 6: 完成创建
```

---

## 📊 生成示例

### 输入示例 1
```
关键词：
冷酷霸道总裁，28岁，黑发黑眸，对主角有执念
```

### AI 生成输出（模拟）
```json
{
  "name": "沈砚",
  "gender": "男",
  "identity": "28岁跨国集团CEO",
  "appearance": "深邃的黑眸如同深不见底的夜色，总是透着一股让人难以抗拒的压迫感。笔挺的西装包裹着完美的身材，每一个动作都透着上位者的冷漠与掌控欲。偶尔在无人时，眼底会闪过一丝不易察觉的温柔。",
  "background": "自幼在豪门长大，被培养成完美的继承人。父亲的严苛教育让他学会了隐藏情绪，用冷漠武装自己。表面上对所有人都保持距离，但内心深处渴望被理解。遇到你之后，内心的防线开始出现裂痕，却不知该如何表达。习惯用命令和控制来表达关心，却不自知这种方式有多别扭。",
  "personality_tags": ["高冷", "毒舌", "控制欲强", "口是心非"],
  "dialogue_style": "现代日常 (默认)",
  "first_message": "又来了？这次有什么事？"
}
```

### 输入示例 2
```
关键词：
温柔邻家姐姐，25岁，开朗善良，喜欢做料理
```

### AI 生成输出（模拟）
```json
{
  "name": "林初雪",
  "gender": "女",
  "identity": "25岁咖啡店店主",
  "appearance": "柔和的笑容总是挂在嘴角，给人如沐春风的感觉。齐肩的短发随着动作轻轻摇摆，清澈的眼眸里满是温柔。穿着简单的围裙，手上总是带着淡淡的咖啡香气和烘焙的甜蜜气息。",
  "background": "从小在家人的呵护下长大，性格温柔体贴。大学毕业后开了一家小咖啡店，每天为客人制作美味的点心和咖啡。喜欢照顾别人，总是能敏锐地察觉到他人的情绪变化。对你格外关心，会记得你喜欢的口味，偶尔会做些小点心送过来。",
  "personality_tags": ["温柔", "体贴", "开朗", "善解人意"],
  "dialogue_style": "现代日常 (默认)",
  "first_message": "今天也辛苦了吧？我刚做了你喜欢的提拉米苏，要不要尝尝？"
}
```

---

## 🔧 技术实现

### 函数定义

```javascript
async function confirmAIGenerateChar() {
    // 1. 获取关键词
    const keywords = document.getElementById('ai-generate-keywords').value.trim();
    
    // 2. 检查 API 配置
    if (!state.apiConfig.url || !state.apiConfig.key) {
        alert("请先配置 API");
        return;
    }
    
    // 3. 显示加载状态
    confirmBtn.innerHTML = '<span>⏳ 生成中...</span>';
    
    // 4. 调用 LLM API
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
                { role: "user", content: `关键词：${keywords}` }
            ],
            temperature: 0.8
        })
    });
    
    // 5. 解析返回的 JSON
    const data = await res.json();
    let responseText = data.choices[0].message.content.trim();
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const charData = JSON.parse(responseText);
    
    // 6. 创建 AI Character 对象
    const char = new AICore.Character({
        ...charData,
        source: 'ai'
    });
    aiCharacters[char.id] = char;
    
    // 7. 添加到好友列表
    lineeFriends.push({ 
        name: char.name, 
        status: char.identity,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${char.name}`,
        isAI: true,
        aiCharacterId: char.id
    });
    
    // 8. 创建聊天会话（包含开场白）
    const newChat = { ... };
    mockChats.unshift(newChat);
    
    // 9. 更新 UI
    renderLineeFriends();
    renderChatList();
    
    // 10. 显示成功提示
    alert(`✅ 角色 "${char.name}" 生成成功！`);
}
```

### 错误处理

```javascript
try {
    // ... 生成逻辑
} catch (e) {
    console.error('AI Generate Error:', e);
    alert(`生成失败：${e.message}

请检查：
1. API 配置是否正确
2. 关键词是否清晰
3. 网络连接是否正常`);
} finally {
    // 恢复按钮状态
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = originalText;
}
```

---

## 🎨 UI 设计细节

### 图标更新

**AI 生成图标** (Layers):
```svg
<svg width="24" height="24" viewBox="0 0 24 24">
  <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
  <path d="M2 17l10 5 10-5"></path>
  <path d="M2 12l10 5 10-5"></path>
</svg>
```

**手动创建图标** (User):
```svg
<svg width="24" height="24" viewBox="0 0 24 24">
  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
  <circle cx="12" cy="7" r="4"></circle>
</svg>
```

### 示例标签样式

```css
默认状态:
  font-size: 11px
  padding: 4px 8px
  background: white
  border: 1px solid #D1D5DB
  border-radius: 6px
  cursor: pointer

悬停状态:
  border-color: #A0D8EF
  color: #0EA5E9
```

---

## 📝 优势对比

### 旧版流程
```
添加好友:
  输入姓名 → 添加 → 只是普通联系人

创建 AI 角色:
  填写 10+ 个字段 → 耗时 3-5 分钟
```

### 新版流程
```
AI 生成:
  输入关键词 → 等待 5-10 秒 → 自动生成完整设定

手动创建:
  精细化控制所有细节
```

**时间对比**:
- ❌ 旧版手动创建: 3-5 分钟
- ✅ 新版 AI 生成: 5-10 秒
- ✅ 新版手动创建: 仍可精细控制

---

## 🧪 测试清单

### 基础功能
- [ ] 打开 Linee，点击 "+"
- [ ] 看到三个选项：手动创建、AI 生成、导入角色卡
- [ ] 图标为线性风格
- [ ] 悬停时边框变蓝

### AI 生成功能
- [ ] 点击 "AI 生成"，打开输入界面
- [ ] 输入框显示正确的 placeholder
- [ ] 点击示例标签，自动填充关键词
- [ ] 输入自定义关键词，点击 "生成角色"
- [ ] 显示 "⏳ 生成中..." 状态
- [ ] 生成成功后弹出提示
- [ ] 好友列表出现新角色（带 AI 标签）
- [ ] 聊天列表出现新会话
- [ ] 聊天记录包含开场白
- [ ] 可以正常与 AI 角色聊天

### 错误处理
- [ ] 未配置 API 时提示错误
- [ ] 输入框为空时提示输入关键词
- [ ] API 调用失败时显示详细错误信息
- [ ] 生成失败后按钮恢复正常状态

### 手动创建
- [ ] 点击 "手动创建"，打开表单
- [ ] 所有字段正常显示
- [ ] 填写完整信息后可以创建
- [ ] 创建的角色正常出现在列表

---

## 🎉 总结

### 核心改进
1. ✅ **功能融合**: 普通好友 + 智能角色 → 手动创建
2. ✅ **AI 赋能**: 新增 AI 一键生成功能
3. ✅ **效率提升**: 3-5 分钟 → 5-10 秒
4. ✅ **用户体验**: 
   - 快速生成 → AI 生成
   - 精细控制 → 手动创建
   - 一键导入 → 导入角色卡

### 使用建议
- **新手用户**: 使用 "AI 生成"，快速创建角色
- **资深用户**: 使用 "手动创建"，精细控制细节
- **导入用户**: 使用 "导入角色卡"，迁移已有角色

---

**更新完成！刷新页面即可体验 AI 一键生成角色功能。** 🚀


