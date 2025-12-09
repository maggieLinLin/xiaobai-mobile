# 🐛 世界书选择功能 - 调试指南

## 问题: 全局世界书选择按钮没反应

### 快速诊断步骤

#### 1. 打开浏览器控制台

**Chrome/Edge:**
- 按 `F12` 或 `Ctrl+Shift+I`
- 切换到 "Console" 标签

**Firefox:**
- 按 `F12`
- 切换到 "控制台" 标签

---

#### 2. 检查函数是否存在

在控制台输入:

```javascript
typeof selectChatGlobalWorldBooks
```

**期望输出:** `"function"`

**如果输出 "undefined":**
→ 说明函数没有正确加载,可能是 JS 文件缓存问题

**解决方法:**
1. 按 `Ctrl+F5` 强制刷新页面
2. 或者清除浏览器缓存后重新加载

---

#### 3. 检查 AICore 是否加载

在控制台输入:

```javascript
console.log(AICore);
console.log(AICore.worldSystem);
console.log(AICore.worldSystem.global_books);
```

**期望输出:**
```
Object { Character: class, RelationshipState: class, ... }
WorldSystem { global_books: {…}, local_books: {…} }
Object { global_main: {...} }
```

**如果显示 undefined:**
→ AICore 没有正确加载

**解决方法:**
1. 检查 `js/ai-core.js` 文件是否存在
2. 检查 HTML 中是否正确引入了该文件
3. 强制刷新 (`Ctrl+F5`)

---

#### 4. 手动测试函数

在控制台输入:

```javascript
selectChatGlobalWorldBooks();
```

**期望行为:**
- 如果有全局世界书: 弹出选择对话框
- 如果没有全局世界书: 弹出提示 "暂无可用的全局世界书"

**查看调试日志:**
```javascript
// 应该看到以下日志
🔍 selectChatGlobalWorldBooks 被调用
AICore.worldSystem: WorldSystem {...}
global_books: {...}
globalBooks keys: Array [ ... ]
```

---

#### 5. 检查世界书数据

在控制台输入:

```javascript
// 查看所有全局世界书
Object.keys(AICore.worldSystem.global_books)

// 查看所有局部世界书
Object.keys(AICore.worldSystem.local_books)
```

**如果返回空数组 `[]`:**
→ 说明没有创建世界书

**解决方法:**
1. 打开世界书 App
2. 创建至少一个全局世界书
3. 返回 LINEE,再次尝试选择

---

#### 6. 检查事件绑定

在控制台输入:

```javascript
// 查找按钮元素
const btn = document.querySelector('[onclick*="selectChatGlobalWorldBooks"]');
console.log(btn);

// 如果找到了按钮,尝试手动触发点击
if (btn) btn.click();
```

**如果 btn 是 null:**
→ 说明 HTML 中没有这个按钮,或者选择器不正确

**解决方法:**
检查你是否在正确的页面 (聊天设置页面)

---

### 常见问题与解决方案

#### 问题 1: 点击按钮没反应

**可能原因:**
- JavaScript 文件缓存
- 函数定义在错误的作用域
- HTML 和 JS 不匹配

**解决步骤:**
1. **清除缓存并硬性刷新**
   ```
   Ctrl+Shift+Delete (打开清除数据窗口)
   → 勾选 "缓存的图像和文件"
   → 点击 "清除数据"
   → 回到页面按 Ctrl+F5
   ```

2. **检查控制台错误**
   - 看是否有红色错误信息
   - 如果有 `Uncaught ReferenceError` → 函数未定义
   - 如果有 `Uncaught TypeError` → 对象不存在

3. **手动重新绑定函数**
   ```javascript
   // 在控制台执行
   window.selectChatGlobalWorldBooks = function() {
       alert('函数被调用!');
       // 然后再次点击按钮测试
   };
   ```

---

#### 问题 2: 显示"暂无可用的全局世界书"

**原因:** 确实没有创建全局世界书

**解决方法:**

1. **在控制台手动创建测试世界书:**
   ```javascript
   // 创建全局世界书
   const testBook = new AICore.WorldBook('test_global', 'GLOBAL', {
       '__META_NAME__': '测试世界书',
       '小白机': '一部智能手机',
       'LINEE': '通讯软件'
   });
   AICore.worldSystem.addGlobalBook(testBook);
   
   // 验证
   console.log(Object.keys(AICore.worldSystem.global_books));
   // 应该显示: ['global_main', 'test_global']
   ```

2. **保存到 localStorage (可选):**
   ```javascript
   // 这样刷新后不会丢失
   localStorage.setItem('worldbook_data', JSON.stringify({
       GLOBAL: [
           {
               id: 'test_global',
               type: 'book',
               name: '测试世界书',
               content: '这是测试内容'
           }
       ],
       LOCAL: []
   }));
   ```

---

#### 问题 3: 选择后没有保存

**可能原因:**
- `chatSettings` 对象没有正确初始化
- `saveLineeData()` 函数有问题

**调试步骤:**

1. **检查 chatSettings:**
   ```javascript
   console.log(chatSettings);
   console.log(chatSettings.linkedGlobalWorldBooks);
   ```

2. **手动设置值并保存:**
   ```javascript
   // 手动设置
   chatSettings.linkedGlobalWorldBooks = ['global_main'];
   
   // 手动保存
   localStorage.setItem('chatSettings', JSON.stringify(chatSettings));
   
   // 验证
   const saved = JSON.parse(localStorage.getItem('chatSettings'));
   console.log(saved.linkedGlobalWorldBooks);
   ```

---

### 使用测试页面

我已经创建了一个测试页面: `test-worldbook-selection.html`

**使用方法:**

1. 在浏览器中打开: `file:///path/to/xiaobai-mobile/test-worldbook-selection.html`

2. 按顺序点击按钮:
   - ① 测试 AICore → 检查是否加载
   - ② 创建测试世界书 → 创建测试数据
   - ③ 选择全局世界书 → 测试选择功能
   - ④ 选择局部世界书 → 测试选择功能
   - ⑤ 显示当前选择 → 查看结果

3. 如果测试页面工作正常,但主页面不工作
   → 说明主页面的函数绑定有问题

---

### 完整诊断脚本

复制以下代码到控制台,一次性运行所有检查:

```javascript
console.log('========== 世界书功能诊断 ==========');

// 1. 检查 AICore
console.log('\n1. AICore 检查:');
console.log('  AICore 存在:', typeof AICore !== 'undefined');
console.log('  worldSystem 存在:', typeof AICore?.worldSystem !== 'undefined');

// 2. 检查世界书
console.log('\n2. 世界书数据:');
const globalCount = Object.keys(AICore?.worldSystem?.global_books || {}).length;
const localCount = Object.keys(AICore?.worldSystem?.local_books || {}).length;
console.log('  全局世界书:', globalCount, '个');
console.log('  局部世界书:', localCount, '个');

if (globalCount > 0) {
    console.log('  全局世界书列表:', Object.keys(AICore.worldSystem.global_books));
}

// 3. 检查函数
console.log('\n3. 函数检查:');
console.log('  selectChatGlobalWorldBooks:', typeof selectChatGlobalWorldBooks);
console.log('  selectChatLocalWorldBooks:', typeof selectChatLocalWorldBooks);
console.log('  updateWorldBookDisplay:', typeof updateWorldBookDisplay);

// 4. 检查 chatSettings
console.log('\n4. chatSettings 检查:');
console.log('  chatSettings 存在:', typeof chatSettings !== 'undefined');
if (typeof chatSettings !== 'undefined') {
    console.log('  linkedGlobalWorldBooks:', chatSettings.linkedGlobalWorldBooks);
    console.log('  linkedLocalWorldBooks:', chatSettings.linkedLocalWorldBooks);
}

// 5. 检查 HTML 元素
console.log('\n5. HTML 元素检查:');
const globalBtn = document.querySelector('[onclick*="selectChatGlobalWorldBooks"]');
const localBtn = document.querySelector('[onclick*="selectChatLocalWorldBooks"]');
const globalDisplay = document.getElementById('selected-global-worldbooks');
const localDisplay = document.getElementById('selected-local-worldbooks');

console.log('  全局按钮:', globalBtn ? '✅ 存在' : '❌ 不存在');
console.log('  局部按钮:', localBtn ? '✅ 存在' : '❌ 不存在');
console.log('  全局显示:', globalDisplay ? '✅ 存在' : '❌ 不存在');
console.log('  局部显示:', localDisplay ? '✅ 存在' : '❌ 不存在');

console.log('\n========== 诊断完成 ==========');
console.log('\n💡 提示: 如果发现问题,请参考上方的解决方案');
```

---

### 终极解决方案

如果以上都不行,执行以下步骤:

1. **完全清除缓存:**
   ```
   Chrome: 设置 → 隐私和安全 → 清除浏览数据
   → 选择 "始终" → 勾选所有选项 → 清除数据
   ```

2. **使用无痕模式:**
   ```
   Ctrl+Shift+N (Chrome)
   Ctrl+Shift+P (Firefox)
   ```
   在无痕模式下打开应用测试

3. **检查文件完整性:**
   确认以下文件存在且没有错误:
   - `js/ai-core.js`
   - `js/linee.js`
   - `index.html`

4. **查看最近的 Git 更改:**
   ```bash
   git diff js/linee.js
   git diff js/ai-core.js
   ```

---

## 需要帮助?

如果问题仍然存在,请提供以下信息:

1. **浏览器控制台的完整输出** (运行诊断脚本后)
2. **控制台的错误信息** (红色文字)
3. **`typeof selectChatGlobalWorldBooks` 的结果**
4. **`Object.keys(AICore.worldSystem.global_books)` 的结果**

这些信息将帮助快速定位问题!

---

**最后更新:** 2024年12月7日  
**相关文档:** 
- `WORLDBOOK_MULTI_SELECT_UPDATE.md` - 功能说明
- `WORLDBOOK_QUICK_GUIDE.md` - 使用指南
- `test-worldbook-selection.html` - 测试页面


