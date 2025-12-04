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
        this.linked_local_world_id = data.linked_local_world_id || null;
        
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
【当前语境】手机聊天软件。
* 请使用短句、口语化表达。
* 适当使用Emoji表情。
* 这里的对话节奏是快速、即时的。
`;
        } else { // OFFLINE
            mode_instruction = `
### FORMAT & PACING RULES (Strictly Enforce "Web Novel Rhythm")

**1. Paragraph Structure (The "Breathing" Rule):**
- **Do NOT** write long, dense paragraphs.
- **Maximum 3 sentences per paragraph.** Ideally, keep it to 1-2 sentences for emotional moments.
- **Frequent Line Breaks:** Insert a line break every time the focus shifts (e.g., from an action to a thought, or from a visual detail to dialogue).

**2. Dialogue Formatting:**
- **Standard:** Action description -> Dialogue.
- **Emphasis:** For important lines, put the dialogue on its own line, separated from the description.
  (e.g., instead of: *He looked at you and said "Stop."*, write:
   He looked at you, his eyes red.
   *"Stop."*)

**3. The "Slow-Motion" Technique (For Intense Scenes):**
- When the user performs a specific action or emotions run high, **slow down the narration**.
- Deconstruct one action into three parts:
  1. **Physical Reaction:** (e.g., His fingers stiffened.)
  2. **Sensory Detail:** (e.g., The cold wind brushed his cheek.)
  3. **Internal Monologue:** (e.g., Why does it hurt so much?)

**4. Sentence Variation:**
- Mix **Short, punchy sentences** (for impact) with **Long, flowing descriptions** (for atmosphere).
- Example: "他僵住了。(Short) 那些回忆像潮水一样涌来，将他彻底淹没。(Long)"

**[BAD EXAMPLE - DO NOT DO THIS]**
沈砚抓着你的手说“放手”，他心里很难过，看着你流泪的样子觉得自己很混蛋，于是更用力地抓着你说“不放”。(Too fast, no pacing, logic is bunched together.)

**[GOOD EXAMPLE - DO THIS]**
沈砚抓着你的手。
指尖微微颤抖。
“放手。”你说。
这两个字像重锤一样砸在他心上。他没动，反而攥得更紧了。
“不放。”
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
            const worldbookData = localStorage.getItem('worldbook_data');
            if (worldbookData) {
                const data = JSON.parse(worldbookData);
                
                // 加载全局世界书
                if (data.GLOBAL) {
                    data.GLOBAL.forEach(item => {
                        if (item.type === 'book') {
                            const entries = {};
                            // 解析内容为键值对
                            if (item.content) {
                                entries[item.name] = item.content;
                            }
                            this.global_books[item.id] = new WorldBook(item.id, 'GLOBAL', entries);
                        }
                    });
                }
                
                // 加载局部世界书
                if (data.LOCAL) {
                    data.LOCAL.forEach(item => {
                        if (item.type === 'book') {
                            const entries = {};
                            if (item.content) {
                                entries[item.name] = item.content;
                            }
                            this.local_books[item.id] = new WorldBook(item.id, 'LOCAL', entries);
                        }
                    });
                }
                
                console.log('✅ 已加载世界书:', Object.keys(this.global_books).length, '个全局,', Object.keys(this.local_books).length, '个局部');
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

    getWorldContext(userInput, globalId, localId) {
        let mergedEntries = {};
        
        // 合并全局世界书
        Object.values(this.global_books).forEach(book => {
            Object.assign(mergedEntries, book.entries);
        });
        
        // 合并指定的局部世界书 (优先级更高)
        if (localId && this.local_books[localId]) {
            Object.assign(mergedEntries, this.local_books[localId].entries);
        }

        let matchedContent = [];
        for (const [key, content] of Object.entries(mergedEntries)) {
            // 匹配用户输入中的关键词
            if (userInput.toLowerCase().includes(key.toLowerCase())) {
                matchedContent.push(`【${key}】：${content}`);
            }
        }
        
        return matchedContent.length > 0 ? matchedContent.join("\n") : "无相关世界观信息";
    }
}

class ChatSystem {
    constructor(worldSystem) {
        this.worldSystem = worldSystem;
    }

    async generateResponse(character, userInput, history, mode = "OFFLINE", apiConfig) {
        // 1. Get World Context
        // Assuming a default global ID for now, or stored in character
        const globalId = "global_main"; 
        const worldContext = this.worldSystem.getWorldContext(userInput, globalId, character.linked_local_world_id);

        // 2. Build Prompt
        const systemPrompt = PromptBuilder.build(character, worldContext, history, mode);

        // 3. Call API
        return await this.callLLM(systemPrompt, history, userInput, apiConfig);
    }

    async callLLM(systemPrompt, history, userInput, apiConfig) {
        if (!apiConfig || !apiConfig.url || !apiConfig.key) {
            throw new Error("API未配置");
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
            return `(AI Error: ${e.message})`;
        }
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

