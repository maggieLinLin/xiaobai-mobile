import os
import random
import time

# 模拟 LLM 响应，实际项目中请替换为真实的 API 调用 (如 OpenAI SDK / Anthropic SDK)
# 为了演示效果，这里使用简单的模拟返回

class LLMClient:
    """
    LLM API 客户端封装
    """
    def __init__(self, api_key: str = "dummy_key", model: str = "gpt-4o"):
        self.api_key = api_key
        self.model = model

    def generate_text(self, system_prompt: str, messages: list, temperature: float = 0.7) -> str:
        """
        调用 LLM 生成文本
        
        Args:
            system_prompt: 系统提示词
            messages: 对话历史列表 [{"role": "user", "content": "..."}, ...]
            temperature: 随机度
            
        Returns:
            str: 生成的文本内容
        """
        print(f"\n[LLM_CALL] System Prompt Length: {len(system_prompt)}")
        print(f"[LLM_CALL] Messages Count: {len(messages)}")
        
        # 实际开发中，这里应调用 openai.ChatCompletion.create 或 anthropic.messages.create
        # 这里进行简单的模拟逻辑，以便在没有 API Key 的情况下也能跑通流程
        
        last_user_msg = messages[-1]['content'] if messages else ""
        
        if "分析这段对话" in system_prompt or "好感度" in last_user_msg:
             # 模拟好感度分析返回
             return "CHANGE: +2\nREASON: 用户表达了关心，角色感到温暖。"
        
        if "生成详细人设" in system_prompt:
            # 模拟 AI 生成人设
            return f"这是一个基于关键词生成的详细人设... (关键词: {last_user_msg})"

        # 模拟角色回复
        time.sleep(1) # 模拟网络延迟
        return f"[模拟回复] 收到你的消息：'{last_user_msg}'。 (当前温度: {temperature})"


