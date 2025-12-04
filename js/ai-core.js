/* ========================================
   AI Core Logic (Ported from Python Backend)
   ======================================== */

// --- Models ---

class RelationshipState {
    constructor(score = 0, level = "陌生") {
        this.score = score;
        this.level = level;
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
    }

    addGlobalBook(book) {
        this.global_books[book.id] = book;
    }

    addLocalBook(book) {
        this.local_books[book.id] = book;
    }

    getWorldContext(userInput, globalId, localId) {
        let mergedEntries = {};
        
        if (globalId && this.global_books[globalId]) {
            Object.assign(mergedEntries, this.global_books[globalId].entries);
        }
        if (localId && this.local_books[localId]) {
            Object.assign(mergedEntries, this.local_books[localId].entries);
        }

        let matchedContent = [];
        for (const [key, content] of Object.entries(mergedEntries)) {
            if (userInput.includes(key)) {
                matchedContent.push(`【世界观-${key}】：${content}`);
            }
        }
        return matchedContent.join("\n");
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

// --- Singleton Instances ---
const worldSystem = new WorldSystem();
const chatSystem = new ChatSystem(worldSystem);

// Export to window
window.AICore = {
    Character,
    WorldBook,
    worldSystem,
    chatSystem
};

