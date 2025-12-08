# 🌍 世界书多选功能更新报告

## 📋 更新概述

根据用户需求,现在 LINEE 中的 AI 角色可以**同时选择多个世界书**,包括全局和局部世界书。

---

## ✅ 实现的功能

### 1. **Character 模型扩展**

**修改文件:** 
- `js/ai-core.js`
- `my_ai_app_backend/models.py`

**新增字段:**
```javascript
// 前端 (JavaScript)
class Character {
    // ... 其他字段
    
    // ✅ 新增：支持多个世界书选择
    linked_global_worlds: []  // 关联的全局世界书 ID 数组
    linked_local_worlds: []   // 关联的局部世界书 ID 数组
    
    // 🔄 保留旧版兼容
    linked_local_world_id: null  // 已废弃,但仍保留兼容
}
```

```python
# 后端 (Python)
class Character(BaseModel):
    # ... 其他字段
    
    # ✅ 新增：支持多个世界书选择
    linked_global_worlds: List[str] = Field(default_factory=list)
    linked_local_worlds: List[str] = Field(default_factory=list)
    
    # 🔄 保留旧版兼容
    linked_local_world_id: Optional[str] = Field(default=None)
```

**兼容性处理:**
- 如果旧版角色有 `linked_local_world_id`,会自动转换为 `linked_local_worlds` 数组
- 新版代码完全兼容旧版数据

---

### 2. **WorldSystem 更新**

**修改文件:**
- `js/ai-core.js` (WorldSystem.getWorldContext)
- `my_ai_app_backend/world_system.py`

**新增功能:**

```javascript
// 旧版 API (仍然支持)
getWorldContext(userInput, globalId, localId)

// ✅ 新版 API
getWorldContext(userInput, globalIds = [], localIds = [])
```

**合并逻辑:**
1. 读取所有指定的全局世界书
2. 读取所有指定的局部世界书
3. 局部世界书的条目会覆盖同名的全局条目
4. 匹配用户输入中的关键词,返回相关内容

**示例:**
```javascript
const character = {
    linked_global_worlds: ['global_main', 'global_fantasy'],
    linked_local_worlds: ['local_char_001', 'local_school']
};

const context = worldSystem.getWorldContext(
    "小白机在学校",
    character.linked_global_worlds,
    character.linked_local_worlds
);
// 返回: "【小白机】:... \n【学校】:..."
```

---

### 3. **好友资料页面 - 世界书选择 UI**

**修改文件:**
- `index.html` (新增世界书卡片)
- `js/linee.js` (新增选择逻辑)

**新增 UI 元素:**

```html
<!-- 关联世界书卡片 (仅 AI 角色显示) -->
<div id="friend-worldbook-card" style="display: none;">
    <h3>关联世界书</h3>
    
    <!-- 全局世界书 -->
    <div id="friend-global-worldbooks">
        未选择全局世界书
    </div>
    <button onclick="selectGlobalWorldBooks()">选择全局世界书</button>
    
    <!-- 局部世界书 -->
    <div id="friend-local-worldbooks">
        未选择局部世界书
    </div>
    <button onclick="selectLocalWorldBooks()">选择局部世界书</button>
</div>
```

**显示逻辑:**
- 打开好友资料时,检查是否为 AI 角色
- 如果是 AI 角色,显示世界书卡片
- 显示当前已关联的世界书(带标签样式)

---

### 4. **世界书选择流程**

**新增函数:**
- `selectGlobalWorldBooks()` - 选择全局世界书
- `selectLocalWorldBooks()` - 选择局部世界书
- `renderFriendWorldBooks()` - 渲染世界书标签

**选择流程:**

1. 点击"选择全局世界书"按钮
2. 弹出 prompt,显示可用的世界书列表
3. 输入序号(可多选,用逗号分隔)
   - 例如: `1,3,5` 选择第 1、3、5 个世界书
   - 输入 `0` 清空所有选择
4. 保存后自动更新显示

**显示效果:**
```
🌍 全局世界书
┌────────────────────────────────┐
│ [小白机世界] [奇幻设定] [现代背景] │
└────────────────────────────────┘
[选择全局世界书]

📚 局部世界书
┌────────────────────────────────┐
│ [角色专属设定] [学校环境]       │
└────────────────────────────────┘
[选择局部世界书]
```

---

## 🎯 使用方法

### 为 AI 角色关联世界书

1. **进入好友资料**
   - 在 LINEE → 好友列表
   - 点击任意 AI 角色好友

2. **查看世界书卡片**
   - 向下滚动到"关联世界书"部分
   - 可以看到当前已关联的世界书

3. **选择全局世界书**
   - 点击"选择全局世界书"按钮
   - 在弹窗中输入序号(可多选)
   - 例如: `1,2` 选择前两个

4. **选择局部世界书**
   - 点击"选择局部世界书"按钮
   - 同样输入序号选择

5. **自动保存**
   - 选择后会自动保存
   - 立即生效,无需重启

---

## 📊 数据结构示例

### 前端存储 (localStorage)

```json
{
  "aiCharacters": {
    "char_001": {
      "id": "char_001",
      "name": "林雨",
      "gender": "女",
      "identity": "艺术系学生",
      "linked_global_worlds": ["global_main", "global_modern"],
      "linked_local_worlds": ["local_school_001", "local_art_world"],
      "relationship": {
        "score": 65,
        "level": "密友"
      }
    }
  }
}
```

### 世界书数据结构

```javascript
// 全局世界书
AICore.worldSystem.global_books = {
    "global_main": {
        id: "global_main",
        type: "GLOBAL",
        entries: {
            "__META_NAME__": "小白机世界",
            "小白机": "一部神奇的智能手机模拟器",
            "LINEE": "这个世界中最流行的通讯软件"
        }
    }
};

// 局部世界书
AICore.worldSystem.local_books = {
    "local_school_001": {
        id: "local_school_001",
        type: "LOCAL",
        entries: {
            "__META_NAME__": "艺术学院设定",
            "学校": "位于江南水乡的艺术学院...",
            "画室": "学校的专业画室..."
        }
    }
};
```

---

## 🔄 兼容性说明

### 向后兼容

✅ **旧版角色自动升级**
```javascript
// 旧版角色数据
{
    "linked_local_world_id": "local_001"
}

// 自动转换为
{
    "linked_local_world_id": "local_001",  // 保留
    "linked_global_worlds": [],
    "linked_local_worlds": ["local_001"]   // 自动填充
}
```

✅ **旧版 API 仍然可用**
```javascript
// 旧版调用方式
worldSystem.getWorldContext(input, "global_001", "local_001");

// 新版调用方式
worldSystem.getWorldContext(input, ["global_001"], ["local_001"]);

// 两种方式都支持
```

### 数据迁移

**无需手动迁移!**
- 系统会自动检测旧版数据
- 在读取时自动转换为新格式
- 保存时使用新格式

---

## 🎨 UI 设计

### 世界书标签样式

**全局世界书:**
```
[小白机世界]  ← 蓝色背景 #DBEAFE
```

**局部世界书:**
```
[角色专属]  ← 绿色背景 #D1FAE5
```

**已删除的世界书:**
```
[已删除]  ← 红色背景 #FEE2E2
```

### 卡片布局

```
┌────────────────────────────────────┐
│ 🌍 关联世界书                       │
├────────────────────────────────────┤
│ 🌍 全局世界书                       │
│ ┌──────────────────────────────┐  │
│ │ [小白机世界] [现代背景]        │  │
│ └──────────────────────────────┘  │
│ [选择全局世界书]                   │
│                                    │
│ 📚 局部世界书                       │
│ ┌──────────────────────────────┐  │
│ │ [角色专属设定] [学校环境]      │  │
│ └──────────────────────────────┘  │
│ [选择局部世界书]                   │
└────────────────────────────────────┘
```

---

## 🐛 调试支持

### 调试面板显示

打开调试面板 (🐛 Debug 按钮) 可以看到:

```
👤 当前角色信息
-----------------
角色名: 林雨
...

关联世界书:
  全局: global_main, global_modern
  局部: local_school_001, local_art_world

📝 最后发送的 System Prompt
-----------------
【世界观信息】
【小白机】：一部神奇的智能手机模拟器。
【学校】：位于江南水乡的艺术学院...
【画室】：学校的专业画室...
```

---

## ⚠️ 注意事项

### 1. 世界书数量限制

**建议:**
- 全局世界书: 不超过 3 个
- 局部世界书: 不超过 5 个
- 总条目数: 不超过 50 个

**原因:**
- 太多世界书会导致 Prompt 过长
- 可能超出模型的上下文限制
- 影响响应速度

### 2. 条目冲突处理

**规则:**
- 局部世界书 > 全局世界书
- 后选择的 > 先选择的
- 同名条目会被覆盖

**示例:**
```javascript
// 全局世界书 A
{ "学校": "普通高中" }

// 局部世界书 B
{ "学校": "魔法学院" }

// 最终生效: "学校: 魔法学院"
```

### 3. 性能优化

**建议:**
- 定期清理不用的世界书
- 删除重复的条目
- 使用简洁的关键词

---

## 📈 后续优化计划

### 短期 (1-2周)

- [ ] 添加世界书预览功能
- [ ] 支持拖拽排序
- [ ] 添加批量操作

### 中期 (1-2月)

- [ ] 可视化世界书编辑器
- [ ] 世界书导入/导出
- [ ] 条目冲突检测

### 长期 (3月+)

- [ ] 智能推荐相关世界书
- [ ] 世界书版本管理
- [ ] 多角色共享世界书

---

## 🎉 总结

通过这次更新,LINEE 中的 AI 角色现在可以:

✅ **同时关联多个全局世界书** - 构建更丰富的背景设定
✅ **同时关联多个局部世界书** - 为不同角色定制专属世界观
✅ **灵活组合世界观** - 根据需要自由搭配
✅ **可视化管理** - 在好友资料页面直接操作
✅ **完全兼容旧版** - 无需手动迁移数据

这将大大提升角色扮演的深度和真实感!

---

**更新日期:** 2024年12月7日  
**修改文件数量:** 6 个  
**新增功能:** 世界书多选 + UI 界面  
**兼容性:** 完全向后兼容  

🎊 **现在就去为你的 AI 角色选择世界书吧!**

