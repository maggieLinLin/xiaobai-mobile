from typing import List, Dict
from .models import Character, ChatMessage
from .world_system import WorldSystem

class PromptBuilder:
    """
    负责组装最终的 System Prompt
    """
    
    @staticmethod
    def build(character: Character, 
              world_context: str, 
              history: List[ChatMessage], 
              mode: str = "OFFLINE") -> str:
        
        # A. 核心指令层 (Updated with detailed fields)
        tags_str = ", ".join(character.personality_tags) if character.personality_tags else "无"
        
        core_instruction = f"""
你正在扮演 {character.name}。

【基础信息】性别：{character.gender} | 身份：{character.identity}
【外貌特征】{character.appearance}
【性格标签】{tags_str}
【人设详情】{character.background}
【当前关系】{character.relationship.level} ({character.relationship.score})

【语言风格要求】
"""
        if character.dialogue_style:
            core_instruction += f"请严格模仿 {character.dialogue_style} 的说话方式。\n"
            
        if character.mes_example:
            core_instruction += f"参考以下对话范例：\n{character.mes_example}\n"

        # B. 模式切换层 (Mode Switch) - 重点：网文规则
        if mode == "ONLINE":
            mode_instruction = """
【当前语境】手机聊天软件。
* 请使用短句、口语化表达。
* 适当使用Emoji表情。
* 这里的对话节奏是快速、即时的。
"""
        else: # OFFLINE (Web Novel Pacing)
            mode_instruction = """
### FORMAT & PACING RULES (Strictly Enforce "Web Novel Rhythm")

**1. Paragraph Structure (The "Breathing" Rule):**
- **Do NOT** write long, dense paragraphs.
- **Maximum 3 sentences per paragraph.** Ideally, keep it to 1-2 sentences for emotional moments.
- **Frequent Line Breaks:** Insert a line break every time the focus shifts (e.g., from an action to a thought, or from a visual detail to dialogue).

**2. Dialogue Formatting:**
- **Standard:** `Action description -> Dialogue`.
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
- Example: "他僵住了。(Short) 那些回憶像潮水一樣湧來，將他徹底淹沒。(Long)"

**[BAD EXAMPLE - DO NOT DO THIS]**
沈砚抓著你的手說「放手」，他心裡很難過，看著你流淚的樣子覺得自己很混蛋，於是更用力地抓著你說「不放」。(Too fast, no pacing, logic is bunched together.)

**[GOOD EXAMPLE - DO THIS]**
沈砚抓著你的手。
指尖微微顫抖。
「放手。」你說。
這兩個字像重錘一樣砸在他心上。他沒動，反而攥得更緊了。
「不放。」
"""

        # C. 强制调教层 (Advanced Tuning Logic)
        tuning_instruction = ""
        
        if character.advanced_tuning.prevent_godmoding:
            tuning_instruction += """
【绝对规则】你只能描写 {{char}} 的动作和语言。严禁描写 {{user}} 的任何动作、心理、语言。你的输出必须在 {{char}} 做完动作后立即停止。
""".replace("{{char}}", character.name).replace("{{user}}", "用户")

        if character.advanced_tuning.respect_user_agency:
            tuning_instruction += """
【尊重用户主权】严禁强制决定 {{user}} 的行为结果。
错误示范：“他把你按在墙上，你无法反抗。”
正确示范：“他试图把你按在墙上，眼神带着压迫感。”
任何涉及身体接触的行为，必须留有余地，等待 {{user}} 的反应。
""".replace("{{user}}", "用户")

        # Always Insert (词汇去重)
        tuning_instruction += """
【词汇禁令】禁止连续使用以下高频词：不由得、下意识地、嘴角勾起、眼神复杂、深吸一口气。请使用更多样的词汇。
"""

        # D. 上下文与范例层 (Context & Anchor)
        context_layer = f"""
【世界观信息】{world_context}

【系统锚点】保持人设。你不是AI助手。
"""

        # 组合最终 System Prompt
        final_prompt = f"{core_instruction}\n{mode_instruction}\n{tuning_instruction}\n{context_layer}"
        return final_prompt.strip()

class ChatSystem:
    """
    核心大脑：负责对话的核心逻辑
    """
    def __init__(self, llm_client, world_system: WorldSystem):
        self.llm = llm_client
        self.world_system = world_system

    def chat(self, character: Character, user_input: str, history: List[ChatMessage], mode: str = "OFFLINE") -> str:
        """
        处理一次对话请求
        """
        # 1. 检索世界观
        # 假设全局世界书 ID 为 'global_001'
        world_context = self.world_system.get_world_context(
            user_input, 
            global_id='global_001', 
            local_id=character.linked_local_world_id
        )

        # 2. 构建 System Prompt
        system_prompt = PromptBuilder.build(character, world_context, history, mode)

        # 3. 准备消息列表 (History + User Input)
        # 注意：这里需要把 ChatMessage 对象转换为 LLM 客户端需要的字典格式
        messages_payload = [{"role": msg.role, "content": msg.content} for msg in history]
        messages_payload.append({"role": "user", "content": user_input})

        # 4. 调用 LLM
        response_text = self.llm.generate_text(system_prompt, messages_payload)
        
        return response_text
