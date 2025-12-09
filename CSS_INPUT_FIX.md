# 🔧 气泡主题 CSS 自定义输入框修复

## ❌ 问题描述
用户点击"高级 CSS"按钮后，文本框无法输入内容。

---

## 🔍 问题原因

### ID 冲突
在 `index.html` 中存在**两个相同 ID** 的元素：

1. **设置页面的 CSS 输入框** (第 150 行)
```html
<textarea id="custom-css" placeholder="自定义 CSS..."></textarea>
```

2. **聊天设置页面的 CSS 输入框** (第 990 行)
```html
<textarea id="custom-css" placeholder="输入自定义 CSS 代码..."></textarea>
```

### 为什么无法输入？
当 JavaScript 通过 `document.getElementById('custom-css')` 获取元素时：
- **只会返回第一个匹配的元素**（设置页面的输入框）
- 聊天设置页面的输入框永远无法被正确操作
- `toggleAdvancedCSS()` 函数操作的是错误的元素

---

## ✅ 修复方案

### 1. 修改 HTML - 更改 ID
**文件**: `index.html` (第 990 行)

```html
<!-- 修改前 -->
<textarea id="custom-css" placeholder="输入自定义 CSS 代码..." ...></textarea>

<!-- 修改后 -->
<textarea id="chat-custom-css" placeholder="输入自定义 CSS 代码..." ...></textarea>
```

---

### 2. 修改 JavaScript - 更新所有引用

#### (1) toggleAdvancedCSS() 函数
**文件**: `js/linee.js`

```javascript
// 修改前
function toggleAdvancedCSS() {
    const textarea = document.getElementById('custom-css');
    const arrow = document.getElementById('css-arrow');
    
    if (textarea.style.display === 'none') {
        textarea.style.display = 'block';
        arrow.style.transform = 'rotate(180deg)';
    } else {
        textarea.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
    }
}

// 修改后
function toggleAdvancedCSS() {
    const textarea = document.getElementById('chat-custom-css'); // ✅ 改为新 ID
    const arrow = document.getElementById('css-arrow');
    
    if (textarea.style.display === 'none' || textarea.style.display === '') { // ✅ 增加空字符串判断
        textarea.style.display = 'block';
        arrow.style.transform = 'rotate(180deg)';
    } else {
        textarea.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
    }
}
```

**改进点**:
- ✅ 使用新的 ID `chat-custom-css`
- ✅ 增加 `textarea.style.display === ''` 判断（初始状态）

---

#### (2) loadChatSettings() 函数
**文件**: `js/linee.js`

```javascript
// 修改前
document.getElementById('custom-css').value = chatSettings.customCSS;

// 修改后
document.getElementById('chat-custom-css').value = chatSettings.customCSS; // ✅
```

---

#### (3) saveAllChatSettings() 函数
**文件**: `js/linee.js`

```javascript
// 修改前
chatSettings.customCSS = document.getElementById('custom-css').value;

// 修改后
chatSettings.customCSS = document.getElementById('chat-custom-css').value; // ✅
```

---

## 📋 修改清单

| 文件 | 行号 | 修改内容 |
|------|------|---------|
| `index.html` | 990 | `id="custom-css"` → `id="chat-custom-css"` |
| `js/linee.js` | 1186 | `getElementById('custom-css')` → `getElementById('chat-custom-css')` |
| `js/linee.js` | 1189 | 增加 `\|\| textarea.style.display === ''` 判断 |
| `js/linee.js` | 1058 | `getElementById('custom-css')` → `getElementById('chat-custom-css')` |
| `js/linee.js` | 1205 | `getElementById('custom-css')` → `getElementById('chat-custom-css')` |

---

## 🧪 测试步骤

### 1. 刷新页面
```
Ctrl+F5 或 Cmd+Shift+R
```

### 2. 进入聊天设置
1. 打开 Linee
2. 进入任意聊天室
3. 点击右上角 **⋮** 菜单
4. 进入聊天设置页面

### 3. 测试 CSS 输入
1. 滚动到 **"气泡主题"** 区域
2. 点击 **"高级 CSS"** 按钮
3. ✅ 确认黑色文本框展开显示
4. 点击文本框内部
5. ✅ 确认光标出现
6. 输入测试代码：
```css
.message {
    border-radius: 20px;
    padding: 12px;
}
```
7. ✅ 确认可以正常输入
8. 点击 **"保存设定"**
9. ✅ 确认设置保存成功

### 4. 验证功能
1. 再次点击 **"高级 CSS"**
2. ✅ 文本框收起
3. 再次点击
4. ✅ 文本框展开，之前输入的代码仍在
5. 关闭设置页面
6. 重新打开设置页面
7. ✅ 确认代码被保存，没有丢失

---

## 🎯 修复效果

### 修复前 ❌
```
点击 "高级 CSS"
  ↓
文本框展开
  ↓
点击文本框
  ↓
❌ 无法输入（获取到错误的元素）
```

### 修复后 ✅
```
点击 "高级 CSS"
  ↓
文本框展开
  ↓
点击文本框
  ↓
✅ 光标出现，可以正常输入
  ↓
✅ 保存后数据持久化
```

---

## 💡 为什么这样修复？

### 方案对比

| 方案 | 优点 | 缺点 | 选择 |
|------|------|------|------|
| 改聊天设置的 ID | ✅ 不影响设置页面<br>✅ 改动最小 | - | ✅ 采用 |
| 改设置页面的 ID | - | ❌ 可能影响其他功能 | ❌ |
| 使用 class 选择器 | - | ❌ 需要改更多代码 | ❌ |

### 命名规范
```
chat-custom-css  ← 明确表示属于聊天设置
custom-css       ← 保留给设置页面使用
```

---

## 🔍 如何避免类似问题？

### 1. ID 唯一性检查
使用浏览器开发工具：
```javascript
// 在控制台运行
document.querySelectorAll('[id]').forEach(el => {
    const id = el.id;
    const matches = document.querySelectorAll(`#${id}`);
    if (matches.length > 1) {
        console.warn(`重复 ID: ${id}, 共 ${matches.length} 个`);
    }
});
```

### 2. 命名规范
使用前缀区分不同模块：
```
settings-custom-css    ← 设置页面
chat-custom-css        ← 聊天设置
profile-custom-css     ← 个人资料
```

### 3. 使用类名代替 ID
如果元素不需要唯一标识，考虑使用 class：
```html
<textarea class="custom-css-input" data-module="chat"></textarea>
```

---

## ✅ 验证修复

### 控制台检查
打开浏览器控制台（F12），运行：
```javascript
// 检查是否存在两个元素
console.log('设置页面:', document.getElementById('custom-css'));
console.log('聊天设置:', document.getElementById('chat-custom-css'));

// 都应该返回非 null
```

### 功能测试
```
✅ 点击"高级 CSS"可以展开/收起
✅ 可以在文本框中输入内容
✅ 输入的内容可以保存
✅ 刷新后内容不丢失
✅ 应用的 CSS 生效
```

---

**问题已修复！现在可以正常使用 CSS 自定义功能了。** 🎉


