# 最终更新 - 2024年12月8日

## 修改内容

### 1. ✅ 再次缩短手机高度

**修改：** 从 750px → **667px**（iPhone SE/8 的标准高度）

这是最常见的手机屏幕比例，适合大部分手机：
- iPhone SE: 375×667
- iPhone 8: 375×667
- iPhone 7: 375×667
- 以及大量安卓手机

**相关修改：**
```css
/* css/phone.css */
height: 667px;  /* 从 750px 改为 667px */

/* 响应式断点也相应调整 */
@media (max-height:720px)  /* 从 800px 改为 720px */
```

### 2. ✅ 修改橘线逻辑

**新逻辑：** 橘线表示**用户当前选中的日期**，而不是有备忘录的日期

#### 行为说明：

1. **点击日期时：**
   - 日期被选中
   - 该日期显示橘线边框
   - 打开日历应用
   - 可以查看/编辑该日期的备忘录

2. **视觉表现：**
   - 🔵 蓝色背景 = 今天
   - 🟠 橘色边框 = 用户选中的日期
   - 如果用户选中今天，则同时显示蓝色背景和橘色边框

3. **持久化：**
   - 选中的日期会保存到 localStorage
   - 刷新页面后仍然显示橘线
   - 用户可以随时看到上次选择的日期

#### 修改的文件：

**js/home.js** (迷你日历)
```javascript
// 从：检查是否有备忘录
const hasMemo = state.memos[dateStr] && state.memos[dateStr].trim() !== '';
const border = hasMemo ? 'border:2px solid #FF9500;' : '';

// 改为：检查是否被选中
const isSelected = state.selectedDate === dateStr;
const border = isSelected ? 'border:2px solid #FF9500;' : '';

// 点击后刷新显示
el.onclick = (e) => { 
    state.selectedDate = el.dataset.date; 
    saveState();
    renderMiniCalendar(); // 立即刷新显示橘线
    openApp('calendar-app'); 
};
```

**js/app-complete.js** (两处日历代码)
- 迷你日历：同样改为检查 `isSelected`
- 完整日历：选中的日期同时显示蓝色背景和橘色边框

**css/home.css**
```css
/* 从 */
.cal-day.has-memo{border:2px solid #FF9500!important}

/* 改为 */
.cal-day.selected{border:2px solid #FF9500!important}
```

## 使用示例

### 场景1：查看今天的备忘录
1. 打开应用（今天显示蓝色背景）
2. 点击今天的日期
3. 日期显示橘线（已选中）
4. 打开日历应用，可以编辑今天的备忘录

### 场景2：查看其他日期
1. 点击任意日期（比如12月15日）
2. 该日期显示橘线
3. 打开日历应用，可以查看/编辑该日期的备忘录
4. 返回主屏幕，橘线仍然在12月15日

### 场景3：切换月份
1. 点击日历的前进/后退按钮
2. 如果选中的日期在当前月份，继续显示橘线
3. 如果选中的日期不在当前月份，则不显示橘线

## 技术细节

### 屏幕尺寸对比

| 手机型号 | 尺寸 | 是否支持 |
|---------|------|---------|
| iPhone SE/7/8 | 375×667 | ✅ 完美适配 |
| iPhone 12/13 | 390×844 | ✅ 自动缩放 |
| iPhone 14 Pro Max | 430×932 | ✅ 自动缩放 |
| 小屏安卓 | 360×640 | ✅ 自动缩放 |
| 桌面浏览器 | 任意 | ✅ 自动缩放 |

### 选中状态管理

```javascript
// 状态存储在
state.selectedDate = '2024-12-08'

// 保存到 localStorage
saveState()

// 检查选中
const isSelected = state.selectedDate === dateStr;
```

## 修改文件清单

1. ✅ `css/phone.css` - 高度改为 667px
2. ✅ `js/home.js` - 橘线改为显示选中日期
3. ✅ `js/app-complete.js` - 同步橘线逻辑（两处）
4. ✅ `css/home.css` - CSS类名从 has-memo 改为 selected

## 测试清单

- [ ] 在浏览器中打开，检查手机高度是否合适
- [ ] 点击任意日期，检查是否显示橘线
- [ ] 点击另一个日期，检查橘线是否移动
- [ ] 刷新页面，检查橘线是否保持
- [ ] 切换月份，检查橘线显示是否正确
- [ ] 在完整日历视图中检查橘线
- [ ] 调整浏览器窗口大小，检查响应式效果

## 备注

- 橘线现在表示"用户选择"，与备忘录内容无关
- 如果需要显示哪些日期有备忘录，可以考虑添加其他视觉提示（如小圆点）
- 高度 667px 是基于 iPhone SE 的标准尺寸，最适合大部分手机
