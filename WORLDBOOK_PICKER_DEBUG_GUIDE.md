# 🔧 世界书选择器调试指南

## 🐛 问题描述

**用户反馈:**
> 点击想选择的世界书后没有列入选择,应该在点击想选择的世界书模块后列入已选择世界书表

---

## 🔍 诊断步骤

### 步骤 1: 检查是否进入选择器模式

**操作:**
```
1. 按 F12 打开控制台
2. 点击 "选择世界书" 按钮
3. 观察控制台输出
```

**预期输出:**
```
🎯 进入世界书选择器模式
  - 类型: global (或 local)
  - 当前已选: []
  - 回调函数: function

✅ 选择器状态已设置:
  - wbState.mode: picker
  - pickerMode.type: global
  - pickerSelected: []
```

**如果没有看到上述输出:**
- ❌ 选择器未正确初始化
- 💡 刷新页面 (Ctrl+F5) 重试

---

### 步骤 2: 测试点击世界书卡片

**操作:**
```
1. 保持控制台打开
2. 点击任意世界书卡片
3. 观察控制台输出
```

**预期输出:**
```
🖱️ 世界书卡片被点击
  - ID: global_main
  - 当前模式: picker
  - 项目类型: book

📌 触发选择器切换

🎯 togglePickerItem 被调用: global_main
当前选择器模式: { type: 'global', callback: function }
选中前: []
✅ 添加选择: global_main
选中后: ['global_main']
🔄 重新渲染列表: global
```

**如果没有看到输出:**
- ❌ 点击事件未触发
- 💡 检查是否点击在卡片上 (不是空白区域)
- 💡 刷新页面重试

---

### 步骤 3: 检查选中状态

**操作:**
```
点击世界书后,观察:
1. 右上角计数是否增加
2. 卡片是否显示蓝色高亮
3. 卡片是否显示勾选图标
```

**预期效果:**
```
┌─────────────────────────────────┐
│ [×] 已选 1 个        [✓ 确定]  │  ← 计数增加
└─────────────────────────────────┘

┌────────────────────────────────┐
│ 📘 主世界书              ☑️    │  ← 显示勾选
│    5 条目                      │
└────────────────────────────────┘
   ↑ 蓝色高亮背景
```

---

## 🧪 使用诊断脚本

**运行诊断:**
```
1. 打开控制台 (F12)
2. 点击 "选择世界书" 进入选择器模式
3. 复制 debug-worldbook-picker.js 内容
4. 粘贴到控制台并按回车
5. 查看诊断结果
```

**诊断脚本会检查:**
- ✅ 全局函数是否存在
- ✅ wbState 状态是否正确
- ✅ 世界书数据是否加载
- ✅ 选择器 UI 是否显示
- ✅ 提供测试建议

---

## 🛠️ 常见问题与解决

### 问题 1: 点击无反应

**症状:**
- 点击世界书卡片没有任何变化
- 控制台无输出
- 右上角计数不变

**诊断:**
```javascript
// 在控制台执行
console.log('wbState.mode:', wbState.mode);
console.log('pickerMode:', wbState.pickerMode);
```

**可能原因 A: 不在选择器模式**
```
输出: wbState.mode: normal
原因: 未进入选择器模式
解决: 重新点击 "选择世界书" 按钮
```

**可能原因 B: 点击事件未绑定**
```
原因: JavaScript 未正确加载
解决: 强制刷新 (Ctrl+F5)
```

---

### 问题 2: 右上角计数不更新

**症状:**
- 点击世界书有输出
- 但右上角显示 "已选 0 个"

**诊断:**
```javascript
// 在控制台执行
console.log('pickerSelected:', Array.from(wbState.pickerSelected));
console.log('计数元素:', document.getElementById('wb-picker-count'));
```

**解决方法:**
```javascript
// 手动触发更新
if (typeof updatePickerCount === 'function') {
    updatePickerCount();
} else {
    console.error('updatePickerCount 函数不存在');
}
```

---

### 问题 3: 卡片不显示选中状态

**症状:**
- 控制台显示已选中
- 右上角计数增加
- 但卡片没有蓝色高亮

**诊断:**
```javascript
// 在控制台执行
const cards = document.querySelectorAll('.wb-card');
console.log('卡片数量:', cards.length);

cards.forEach(card => {
    const id = card.dataset.id;
    const isSelected = card.classList.contains('selected');
    console.log(`${id}: ${isSelected ? '✅' : '❌'}`);
});
```

**解决方法:**
- 可能是 CSS 缓存问题
- 按 Ctrl+F5 强制刷新

---

### 问题 4: 选中后刷新丢失

**症状:**
- 选中世界书后
- 不点 "确定" 就刷新页面
- 选择丢失

**说明:**
- ✅ **这是正常行为!**
- 选择器的选择状态不会保存到 localStorage
- 只有点击 "✓ 确定" 才会保存

**正确流程:**
```
1. 点击世界书选择 (临时状态)
2. 点击 "✓ 确定" (保存到 chatSettings/aiCharacters)
3. 自动返回原页面 (永久保存)
```

---

## 🎯 手动测试函数

### 测试选择功能

```javascript
// 1. 检查当前模式
console.log('当前模式:', wbState.mode);

// 2. 手动选择第一个世界书
const firstBookId = Object.keys(AICore.worldSystem.global_books)[0];
console.log('选择世界书:', firstBookId);
togglePickerItem(firstBookId);

// 3. 检查是否选中
console.log('已选:', Array.from(wbState.pickerSelected));

// 4. 检查 UI
const countEl = document.getElementById('wb-picker-count');
console.log('计数显示:', countEl?.textContent);
```

---

### 测试取消选择

```javascript
// 1. 再次点击同一个世界书
togglePickerItem(firstBookId);

// 2. 应该取消选中
console.log('已选:', Array.from(wbState.pickerSelected));
// 预期输出: []
```

---

### 测试多选

```javascript
// 选择多个世界书
const bookIds = Object.keys(AICore.worldSystem.global_books);
bookIds.forEach(id => {
    togglePickerItem(id);
    console.log('已选:', Array.from(wbState.pickerSelected));
});
```

---

## 📊 完整的选择流程

### 正常流程

```
1. 用户点击 "选择全局世界书"
   ↓
   调用: selectChatGlobalWorldBooks()
   ↓
   调用: enterWorldBookPicker('global', [...], callback)
   ↓
   设置: wbState.mode = 'picker'
   ↓
   打开世界书 App
   ↓
   显示选择器 UI

2. 用户点击世界书卡片
   ↓
   触发: el.onclick 事件
   ↓
   检查: wbState.mode === 'picker'
   ↓
   调用: togglePickerItem(id)
   ↓
   更新: wbState.pickerSelected
   ↓
   调用: updatePickerCount()
   ↓
   调用: renderWbList(type)
   ↓
   UI 更新: 卡片显示选中状态

3. 用户点击 "✓ 确定"
   ↓
   调用: exitWorldBookPicker(true)
   ↓
   获取: Array.from(wbState.pickerSelected)
   ↓
   调用: callback(selectedBooks)
   ↓
   保存: chatSettings.linkedGlobalWorldBooks
   ↓
   清理: wbState.pickerSelected.clear()
   ↓
   返回原页面
```

---

## 🔧 紧急修复

### 如果完全无法选择

**临时方案 - 控制台手动选择:**

```javascript
// 1. 查看可用的世界书
console.log('全局世界书:', Object.keys(AICore.worldSystem.global_books));
console.log('局部世界书:', Object.keys(AICore.worldSystem.local_books));

// 2. 手动设置选择 (例如选择全局世界书)
chatSettings.linkedGlobalWorldBooks = ['global_main'];

// 3. 保存
localStorage.setItem('chatSettings', JSON.stringify(chatSettings));

// 4. 刷新页面
location.reload();
```

---

## 📝 报告问题

**如果以上方法都无法解决,请提供以下信息:**

1. **控制台输出**
   - 点击 "选择世界书" 后的输出
   - 点击世界书卡片后的输出

2. **诊断脚本结果**
   - 运行 `debug-worldbook-picker.js` 的完整输出

3. **浏览器信息**
   - 浏览器类型和版本
   - 是否在无痕模式

4. **操作步骤**
   - 详细描述你的操作流程
   - 哪一步出现问题

---

## ✅ 验证修复

**测试清单:**

- [ ] 点击 "选择世界书" 进入选择器模式
- [ ] 点击世界书卡片,控制台显示选择日志
- [ ] 右上角计数显示 "已选 X 个"
- [ ] 卡片显示蓝色高亮和勾选图标
- [ ] 再次点击卡片可以取消选择
- [ ] 点击 "✓ 确定" 返回原页面
- [ ] 刷新页面后选择仍然保留

**全部通过 = 功能正常!** ✅

---

**更新日期:** 2024年12月7日
**相关文档:** `WORLDBOOK_PICKER_UPDATE.md`


