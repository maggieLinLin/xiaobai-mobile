from .models import RelationshipState, Character
from .llm_client import LLMClient

class RelationshipSystem:
    """
    好感度系统：负责数值计算与等级判断
    """
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client

    def calculate_change(self, user_input: str, ai_response: str) -> int:
        """
        调用 LLM 分析对话，返回分数变化
        """
        system_prompt = """
        你是一个情感分析专家。请分析用户的输入和 AI 的回应，判断用户行为对角色好感度的影响。
        请返回一个整数变化值（范围 -5 到 +5）。
        格式要求：仅返回数字，不要其他文字。
        """
        messages = [
            {"role": "user", "content": f"用户说：{user_input}\n角色回答：{ai_response}"}
        ]
        
        try:
            # 模拟 LLM 调用，实际需解析返回的数字
            # response = self.llm.generate_text(system_prompt, messages)
            # score_change = int(response.strip())
            score_change = 1 # 默认模拟 +1
            return score_change
        except:
            return 0

    def get_level_description(self, score: int) -> str:
        """
        根据分数返回等级描述
        """
        if score < 20:
            return "陌生"
        elif score < 50:
            return "熟人"
        elif score < 80:
            return "朋友"
        elif score < 95:
            return "暧昧"
        else:
            return "恋人"

    def update_relationship(self, character: Character, user_input: str, ai_response: str):
        """
        更新角色的关系状态
        """
        change = self.calculate_change(user_input, ai_response)
        character.relationship.score = max(0, min(100, character.relationship.score + change))
        character.relationship.level = self.get_level_description(character.relationship.score)
        return change

