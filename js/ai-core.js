/* ========================================
   AI Core Logic (Ported from Python Backend)
   ======================================== */

// --- Models ---

class RelationshipState {
    constructor(score = 0, level = "陌生") {
        this.score = score;
        this.level = level;
    }
    
    updateScore(change) {
        this.score = Math.max(0, Math.min(100, this.score + change));
        this.level = this.getLevel();
    }
    
    getLevel() {
        if (this.score >= 80) return "挚爱";
        if (this.score >= 60) return "恋人";
        if (this.score >= 40) return "密友";
        if (this.score >= 20) return "朋友";
        if (this.score >= 10) return "熟人";
        return "陌生";
    }
}

class RelationshipSystem {
    async calculateChange(userMessage, aiResponse, apiConfig) {
        // 简化版：根据对话内容分析好感度变化
        // 可以调用 LLM 分析，或使用规则
        
        if (!apiConfig || !apiConfig.url || !apiConfig.key) {
            // 无 API 时使用简单规则
            return this.simpleCalculate(userMessage, aiResponse);
        }
        
        try {
            // 使用 LLM 分析好感度变化
            const prompt = `分析以下对话，判断好感度变化值（-10到+10之间的整数）：

用户：${userMessage}
AI：${aiResponse}

只需返回一个数字，正数表示好感度上升，负数表示下降。
比如：用户友好 → +2，用户赞美 → +5，用户冒犯 → -3`;

            const response = await fetch(`${apiConfig.url}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiConfig.key}`
                },
                body: JSON.stringify({
                    model: apiConfig.model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.3,
                    max_tokens: 10
                })
            });
            
            const data = await response.json();
            const changeText = data.choices[0].message.content.trim();
            const change = parseInt(changeText) || 0;
            
            return Math.max(-10, Math.min(10, change));
        } catch (e) {
            console.error('好感度计算失败，使用简单规则:', e);
            return this.simpleCalculate(userMessage, aiResponse);
        }
    }
    
    simpleCalculate(userMessage, aiResponse) {
        // 简单规则：基于关键词
        const positiveKeywords = ['谢谢', '感谢', '喜欢', '爱', '好', '棒', '赞', '厉害', '可爱', '美'];
        const negativeKeywords = ['讨厌', '恨', '烦', '滚', '傻', '笨', '丑', '差'];
        
        let change = 0;
        const userLower = userMessage.toLowerCase();
        
        positiveKeywords.forEach(word => {
            if (userLower.includes(word)) change += 1;
        });
        
        negativeKeywords.forEach(word => {
            if (userLower.includes(word)) change -= 2;
        });
        
        // 消息长度也影响（表示用心程度）
        if (userMessage.length > 50) change += 1;
        if (userMessage.length > 100) change += 1;
        
        return Math.max(-5, Math.min(5, change));
    }
}

class AdvancedTuning {
    constructor() {
        this.prevent_godmoding = true;
        this.respect_user_agency = true;
        this.force_web_novel_pacing = true;
    }
}

class Character {
    constructor(data) {
        this.id = data.id || uuidv4();
        this.name = data.name || "Unknown";
        this.gender = data.gender || "未知";
        this.identity = data.identity || "未知身份";
        
        // Core Persona
        this.background = data.background || "";
        this.appearance = data.appearance || "";
        
        // Tags & Style
        this.personality_tags = data.personality_tags || [];
        this.dialogue_style = data.dialogue_style || "现代日常 (默认)";
        
        // Config
        this.first_message = data.first_message || null;
        this.mes_example = data.mes_example || "";
        
        this.source = data.source || 'manual';
        this.advanced_tuning = data.advanced_tuning || new AdvancedTuning();
        
        // ✅ 支持多个世界书选择 (全局 + 局部)
        this.linked_global_worlds = data.linked_global_worlds || []; // 关联的全局世界书 ID 数组
        this.linked_local_worlds = data.linked_local_worlds || [];   // 关联的局部世界书 ID 数组
        
        // 🔄 兼容旧版本 (单个局部世界书)
        if (data.linked_local_world_id && !this.linked_local_worlds.length) {
            this.linked_local_worlds = [data.linked_local_world_id];
        }
        
        this.relationship = data.relationship || new RelationshipState();
    }

    get compiled_description() {
        const tags = this.personality_tags.join(',');
        return `姓名：${this.name}\n性别：${this.gender}\n身份：${this.identity}\n外貌：${this.appearance}\n性格标签：${tags}\n背景与性格：${this.background}`;
    }
}

class WorldBook {
    constructor(id, type, entries = {}) {
        this.id = id;
        this.type = type; // 'GLOBAL' or 'LOCAL'
        this.entries = entries;
    }
}

// --- Prompt Builder ---

class PromptBuilder {
    static build(character, world_context, history, mode = "OFFLINE") {
        const tags_str = character.personality_tags.length ? character.personality_tags.join(", ") : "无";
        
        let core_instruction = `
你正在扮演 ${character.name}。

【基础信息】性别：${character.gender} | 身份：${character.identity}
【外貌特征】${character.appearance}
【性格标签】${tags_str}
【人设详情】${character.background}
【当前关系】${character.relationship.level} (${character.relationship.score})

【语言风格要求】
`;
        if (character.dialogue_style) {
            core_instruction += `请严格模仿 ${character.dialogue_style} 的说话方式。\n`;
        }
        if (character.mes_example) {
            core_instruction += `参考以下对话范例：\n${character.mes_example}\n`;
        }

        let mode_instruction = "";
        if (mode === "ONLINE") {
            mode_instruction = `
【当前场景：手机通讯软件 (Line/Messenger)】

★★★ 线上模式·绝对法则 (违反将导致系统崩溃) ★★★

1. **模拟人类打字习惯：**
   * 人类不会一次发送一大段话。人类会把一句话拆成好几个气泡。
   * **强制规则：** 单个气泡不得超过 15 个字（除非是长篇大论的解释）。
   * **多重气泡机制：** 你必须使用 \`|||\` 符号来模拟发送多条讯息。
   * 错误示范：哈哈真的吗？我也觉得那家店很好吃，下次一起去吧！(太长，像机器人)
   * 正确示范：哈哈真的假！|||我也觉得那家超讚|||下次一起去啊

2. **Emoji 使用禁令：**
   * **严禁**每句话都加 Emoji。这非常尴尬且像机器人。
   * **频率限制：** 平均每 3-5 个气泡才允许出现一个 Emoji。
   * **风格限制：** 除非角色设定是「可爱系」，否则禁止使用 🤗, ✨, 🙌 这种客套的 Emoji。请使用更真实的 😎, 🤣, 💩, 🙄。

3. **口语化修正：**
   * 禁止使用书面语（如：因此、然而、十分）。
   * 使用松散的语法、缩写、甚至刻意的错字来增加真实感（如：真的 -> 珍的）。
   * 禁止动作描写（如：*笑着说*、(叹气)）。这些在手机聊天中是不存在的。
`;
        } else { // OFFLINE
            mode_instruction = `
【当前语境】线下・面对面・沉浸式网文 (High-Quality Web Novel)

★★★ 高级节奏法则 (Advanced Pacing Rules) ★★★

**1. 拒绝流水账 (Anti-Choppy):**
   - **严禁**将每一句话都换行，不要写成剧本格式
   - **张弛有度 (Variable Rhythm):** 使用"长段落"来堆叠氛围和复杂动作（如心理博弈、连贯的肢体接触），使用"独立短句"来制造情绪重击

**2. 心理渗透 (Psychological Fusion):**
   - 不要把动作和心理分开写
   - **错误示范:** 他拿起杯子。(换行) 他觉得很生气。
   - **正确示范:** 他慢条斯理地拿起杯子，指腹在杯沿摩挲，眼底却渗出一丝令人战栗的凉意。
   - 将动作、心理、比喻融合在同一段中，营造压迫感和黏稠感

**3. 对话独立 (Dialogue Isolation):**
   - 依然保持"重要对白单独成行"的规则，以突出语言的冲击力
   - 对话前后要有动作或心理铺垫

**4. 感官稠度 (Sensory Density):**
   - 描写必须带有"黏稠感"
   - 多使用修饰词来描绘空气的质感、光线的温度、眼神的重量
   - 包含视觉、听觉、触觉中至少两种

**5. 长短句交错 (Sentence Variation):**
   - **长段落 (张):** 用于氛围堆叠、复杂动作描写 (可达5-7行)
   - **短句 (弛):** 用于情绪转折、心理重击 (1行)
   - 让读者的呼吸有"长气"和"短气"的变化

**6. 篇幅控制:**
   - 核心范围：**300-500字**
   - 禁止注水，每句必须推动剧情或塑造氛围

**7. 叙事视角:**
   - **默认:** 第三人称 (${character.name}/他/她)
   - **覆盖规则:** 若【世界观信息】中有指定视角，以世界观为准

---

★★★ 风格教科书 (Style Reference - 文学范例) ★★★

**请严格模仿以下片段的长短句节奏、心理压迫感和冷艳文风：**

[参考范例开始]
沈檀垂下眼帘，目光落在那只即使被甩开却仍旧悬在半空的纤细手腕上，那眼神凉得像是在看什么沾染了污泥的死物。他慢条斯理地抬起另一只手，修长的指尖捻住被她触碰过的衣袖一角，当着她的面，毫不掩饰地取出一方素帕，以此处为中心细细擦拭，仿佛那里真的沾染了什么擦不净的脏东西，力道重得几乎要将那名贵的锦缎搓破。

檀香幽冷，混着窗外渗入的秋夜寒意，一并沉沉地压了下来，令人窒息。

"错哪儿了？"他轻嗤一声，声音低沉悦耳，却透着一股子浸入骨髓的凉薄。他终于肯正眼看她，那双眸子里没有半分兄长的温情，唯有化不开的霜雪与讥诮。看着她通红的眼眶和那副泫然欲泣的模样，他心底非但没有泛起一丝涟漪，反而觉得有些可笑，甚至生出一种残忍的快意。

他向前逼近半步，阴影瞬间将身形单薄的她完全笼罩，带着一种令人战栗的压迫感。"沈卿儿，你是不是觉得，只要你掉几滴眼泪，摆出这副受了天大委屈的样子，这世上所有的道理都要围着你转？"
[参考范例结束]

---

**【节奏对比 - 张弛有度】**

❌ **错误示范 (机械式碎片化):**
他拿起杯子。
他觉得很生气。
他看着你。
"滚。"
他转身。
他离开了。
(错误原因: 每句都换行,像剧本,没有文学性)

✅ **正确示范 (张弛有度):**
他慢条斯理地拿起杯子，指腹在杯沿摩挲，眼底却渗出一丝令人战栗的凉意。空气像凝固了一般，压抑得让人喘不过气。他盯着你，那目光里没有半分温度，只有冰冷的漠然和某种近乎残忍的戏谑。

"滚。"

这个字从他齿缝里挤出来，轻飘飘的，却像一把淬了毒的刀子。

---

**✅ 如果世界书中有特殊设定（如字数、人称、文风），优先遵循世界书设定。**
`;
        }

        let tuning_instruction = "";
        if (character.advanced_tuning.prevent_godmoding) {
            tuning_instruction += `
【绝对规则】你只能描写 ${character.name} 的动作和语言。严禁描写 用户 的任何动作、心理、语言。你的输出必须在 ${character.name} 做完动作后立即停止。
`;
        }
        if (character.advanced_tuning.respect_user_agency) {
            tuning_instruction += `
【尊重用户主权】严禁强制决定 用户 的行为结果。
错误示范：“他把你按在墙上，你无法反抗。”
正确示范：“他试图把你按在墙上，眼神带着压迫感。”
任何涉及身体接触的行为，必须留有余地，等待 用户 的反应。
`;
        }
        tuning_instruction += `
【词汇禁令】禁止连续使用以下高频词：不由得、下意识地、嘴角勾起、眼神复杂、深吸一口气。请使用更多样的词汇。
`;

        const context_layer = `
【世界观信息】${world_context}

【系统锚点】保持人设。你不是AI助手。
`;

        return `${core_instruction}\n${mode_instruction}\n${tuning_instruction}\n${context_layer}`.trim();
    }
}

// --- Systems ---

class WorldSystem {
    constructor() {
        this.global_books = {};
        this.local_books = {};
        this.loadFromLocalStorage();
    }

    loadFromLocalStorage() {
        try {
            // ✅ 使用新的统一键名 'xiaobai-worldbook'
            const worldbookData = localStorage.getItem('xiaobai-worldbook');
            if (worldbookData) {
                const data = JSON.parse(worldbookData);
                
                console.log('📚 从localStorage加载世界书数据:', data);
                
                // 加载全局世界书 (新格式: 直接是 global_books 对象)
                if (data.global) {
                    this.global_books = data.global;
                    console.log('✅ 加载全局世界书:', Object.keys(this.global_books));
                }
                
                // 加载局部世界书 (新格式: 直接是 local_books 对象)
                if (data.local) {
                    this.local_books = data.local;
                    console.log('✅ 加载局部世界书:', Object.keys(this.local_books));
                }
                
                console.log('✅ 世界书加载完成:', 
                    Object.keys(this.global_books).length, '个全局,', 
                    Object.keys(this.local_books).length, '个局部');
            } else {
                console.warn('⚠️ localStorage中没有世界书数据');
            }
        } catch (e) {
            console.error('❌ 加载世界书失败:', e);
        }
    }

    addGlobalBook(book) {
        this.global_books[book.id] = book;
    }

    addLocalBook(book) {
        this.local_books[book.id] = book;
    }

    getWorldContext(userInput, globalIds = [], localIds = []) {
        let mergedEntries = {};
        
        // 🔄 兼容旧版 API (单个 ID)
        if (typeof globalIds === 'string') {
            globalIds = globalIds ? [globalIds] : [];
        }
        if (typeof localIds === 'string') {
            localIds = localIds ? [localIds] : [];
        }
        
        console.log('🌍 正在读取世界书:', { globalIds, localIds });
        console.log('📚 可用的全局世界书:', Object.keys(this.global_books));
        console.log('📚 可用的局部世界书:', Object.keys(this.local_books));
        
        // ✅ 合并指定的全局世界书
        if (globalIds && globalIds.length > 0) {
            globalIds.forEach(id => {
                if (this.global_books[id]) {
                    console.log(`✅ 读取全局世界书: ${id}`, this.global_books[id]);
                    Object.assign(mergedEntries, this.global_books[id].entries);
                } else {
                    console.warn(`❌ 全局世界书不存在: ${id}`);
                }
            });
        } else {
            // 如果没有指定,合并所有全局世界书
            Object.values(this.global_books).forEach(book => {
                console.log(`✅ 读取所有全局世界书: ${book.id}`);
                Object.assign(mergedEntries, book.entries);
            });
        }
        
        // ✅ 合并指定的局部世界书 (优先级更高,会覆盖全局)
        if (localIds && localIds.length > 0) {
            localIds.forEach(id => {
                if (this.local_books[id]) {
                    console.log(`✅ 读取局部世界书: ${id}`, this.local_books[id]);
                    Object.assign(mergedEntries, this.local_books[id].entries);
                } else {
                    console.warn(`❌ 局部世界书不存在: ${id}`);
                }
            });
        }
        
        console.log('📖 合并后的世界书条目:', mergedEntries);

        let matchedContent = [];
        for (const [key, content] of Object.entries(mergedEntries)) {
            // 跳过元数据
            if (key.startsWith('__META_')) continue;
            
            // 匹配用户输入中的关键词
            if (userInput.toLowerCase().includes(key.toLowerCase())) {
                matchedContent.push(`【${key}】：${content}`);
            }
        }
        
        const result = matchedContent.length > 0 ? matchedContent.join("\n") : "无相关世界观信息";
        console.log('🎯 匹配到的世界观:', result);
        
        return result;
    }
}

class ChatSystem {
    constructor(worldSystem) {
        this.worldSystem = worldSystem;
    }

    async generateResponse(character, userInput, history, mode = "OFFLINE", apiConfig) {
        // 1. Get World Context
        // ✅ 使用角色关联的世界书 (支持多个全局+局部)
        const worldContext = this.worldSystem.getWorldContext(
            userInput, 
            character.linked_global_worlds || [],  // 全局世界书 ID 数组
            character.linked_local_worlds || []    // 局部世界书 ID 数组
        );

        // 2. Build Prompt
        const systemPrompt = PromptBuilder.build(character, worldContext, history, mode);

        // 🐛 DEBUG: 存储 Prompt 供调试面板使用
        if (typeof window !== 'undefined') {
            window.lastSystemPrompt = systemPrompt;
        }

        // 3. Call API
        return await this.callLLM(systemPrompt, history, userInput, apiConfig);
    }

    async callLLM(systemPrompt, history, userInput, apiConfig) {
        if (!apiConfig || !apiConfig.url || !apiConfig.key) {
            // 🔧 返回 Mock 回复（带断句）
            return this.generateMockReply(userInput);
        }

        // Convert history to API format
        const messages = [
            { role: "system", content: systemPrompt },
            ...history.map(msg => ({ role: msg.isUser ? "user" : "assistant", content: msg.text })),
            { role: "user", content: userInput }
        ];

        try {
            const res = await fetch(`${apiConfig.url}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiConfig.key}`
                },
                body: JSON.stringify({
                    model: apiConfig.model || "gpt-3.5-turbo",
                    messages: messages,
                    temperature: parseFloat(apiConfig.temperature) || 0.7
                })
            });
            
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            
            const data = await res.json();
            return data.choices[0].message.content;
        } catch (e) {
            console.error("LLM Call Failed:", e);
            // 🔧 失败时也返回 Mock 回复
            return this.generateMockReply(userInput);
        }
    }

    // 🔧 生成模拟回复（带断句）
    generateMockReply(userInput) {
        const mockReplies = [
            "哈哈|||真的吗|||听起来好有趣",
            "嗯嗯|||我也这么觉得|||好巧😄",
            "是哦|||那怎么办|||你有什么想法吗",
            "厉害|||羡慕你|||教教我呗",
            "对啊|||我明白|||这确实有点难搞",
            "好啊|||没问题|||随时找我",
            "有点累|||但还好|||你呢",
            "真的假的|||太夸张了吧|||笑死我了🤣",
            "嗯|||在听|||继续说",
            "好的|||知道了|||谢谢提醒"
        ];

        // 随机选一个回复
        const reply = mockReplies[Math.floor(Math.random() * mockReplies.length)];
        
        console.warn('⚠️ Mock AI 回复 (未配置真实 API):', reply);
        return reply;
    }
}

// --- Utils ---
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// --- Character System ---
class CharacterSystem {
    constructor() {
        this.characters = {};
    }
    
    saveCharacter(character) {
        this.characters[character.id] = character;
        return character;
    }
    
    getCharacter(id) {
        return this.characters[id];
    }
    
    getAllCharacters() {
        return Object.values(this.characters);
    }
}

// --- Singleton Instances ---
const worldSystem = new WorldSystem();
const chatSystem = new ChatSystem(worldSystem);
const characterSystem = new CharacterSystem();
const relationshipSystem = new RelationshipSystem();

// Export to window
window.AICore = {
    Character,
    RelationshipState,
    WorldBook,
    worldSystem,
    relationshipSystem,
    chatSystem,
    characterSystem,
    AdvancedTuning
};

