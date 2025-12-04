import uuid
from typing import List, Dict, Optional
from .models import Character, AdvancedTuning
from .llm_client import LLMClient

# 预设选项库 (供前端 UI 显示用)
PRESETS = {
    "personality_tags": [
        "高冷", "傲娇", "温柔", "腹黑", "病娇", "元气", "内向", "强势"
    ],
    "dialogue_styles": [
        "现代日常 (默认)", 
        "古风 (吾, 汝, 甚好)", 
        "翻译腔 (哦, 我的老伙计)", 
        "二次元 (颜文字, 语气词)",
        "赛博朋克 (黑话, 干练)"
    ]
}

class CharacterSystem:
    """
    角色工厂：负责角色的创建与管理
    """
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client
        self.characters: Dict[str, Character] = {}

    def get_presets(self) -> Dict:
        """
        获取角色创建预设选项
        """
        return PRESETS

    def create_manual(self, data: dict) -> Character:
        """
        处理用户手动填写的表单。
        Input data 包含: name, gender, identity, background, appearance, tags, style, etc.
        """
        # 1. 创建基础对象 (Pydantic 会处理字段验证)
        # 如果 data 中包含 id，使用它；否则 Character model 的 default_factory 会生成
        char = Character(**data)
        
        # 2. 如果用户选择了 'dialogue_style' 且没有 mes_example，
        # 可以在这里通过 LLM 自动生成一段 mes_example (可选优化，这里暂留空)
        # if char.dialogue_style and not char.mes_example:
        #     char.mes_example = self._generate_style_example(char.dialogue_style)

        # 3. 保存并返回
        self.characters[char.id] = char
        return char

    def create_from_ai(self, keywords: str) -> Character:
        """
        通过 AI 根据关键词生成角色
        (注：此函数需适配新的 Character 字段结构，这里做简单适配演示)
        """
        system_prompt = "你是一个专业的小说家。请根据用户提供的关键词，生成一份详细的角色人设描述，并提供3-5句符合其性格的对话范例。"
        messages = [{"role": "user", "content": f"关键词：{keywords}"}]
        
        # 调用 LLM 生成 (模拟)
        generated_content = self.llm.generate_text(system_prompt, messages)
        
        # 模拟生成数据
        char_id = str(uuid.uuid4())[:8]
        char = Character(
            id=char_id,
            name=f"AI-{keywords[:4]}",
            gender="未知", # 简化处理
            identity="AI生成角色",
            background=f"基于关键词 '{keywords}' 生成的背景...",
            appearance="AI生成的描述...",
            personality_tags=["AI生成"],
            source='ai',
            mes_example="[示例对话]\n角色: 你好..."
        )
        self.characters[char_id] = char
        return char

    def create_from_import(self, file_content: str) -> Character:
        """
        导入酒館卡 (模拟)
        """
        # 实际项目中需解析 PNG-Chunk 或 JSON 结构 (V2 Spec)
        char_id = str(uuid.uuid4())[:8]
        char = Character(
            id=char_id,
            name="导入角色",
            gender="未知",
            identity="导入身份",
            background=f"导入内容: {file_content[:20]}...",
            appearance="导入外貌...",
            source='import',
            mes_example="导入的对话范例..."
        )
        self.characters[char_id] = char
        return char

    def get_character(self, char_id: str) -> Optional[Character]:
        return self.characters.get(char_id)
