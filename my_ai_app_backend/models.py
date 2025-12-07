from typing import List, Dict, Optional, Any
import uuid
from pydantic import BaseModel, Field

class RelationshipState(BaseModel):
    """
    关系状态模型
    """
    score: int = Field(default=0, ge=0, le=100, description="好感度分数 (0-100)")
    level: str = Field(default="陌生", description="当前关系等级描述")

class AdvancedTuning(BaseModel):
    """
    高级行为调教开关
    """
    prevent_godmoding: bool = Field(default=True, description="是否开启防抢话 (Anti-Godmoding)")
    respect_user_agency: bool = Field(default=True, description="是否开启防强迫行为 (User Agency)")
    force_web_novel_pacing: bool = Field(default=True, description="是否强制网文节奏 (Web Novel Pacing)")

class Character(BaseModel):
    """
    角色模型 (Updated)
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str
    gender: str = Field(..., description="性别：男/女/其他")
    identity: str = Field(..., description="身份/职业 (e.g. 28岁跨国集团CEO)")

    # 核心人设
    background: str = Field(..., description="性格背景设定 (User input text)")
    appearance: str = Field(..., description="外貌特征 (User input text)")

    # 标签与风格
    personality_tags: List[str] = Field(default_factory=list, description="性格标签列表 (e.g. ['高冷', '毒舌'])")
    dialogue_style: Optional[str] = Field(default=None, description="对话风格 (e.g. '京片子', '古风')")

    # 对话配置
    first_message: Optional[str] = Field(default=None, description="开场白")
    mes_example: Optional[str] = Field(default=None, description="对话范例 (Few-Shot)")
    
    # 原有字段保持
    source: str = Field(default='manual', pattern='^(manual|ai|import)$', description="角色来源")
    advanced_tuning: AdvancedTuning = Field(default_factory=AdvancedTuning)
    
    # ✅ 新增：支持多个世界书选择 (全局 + 局部)
    linked_global_worlds: List[str] = Field(default_factory=list, description="关联的全局世界书 ID 列表")
    linked_local_worlds: List[str] = Field(default_factory=list, description="关联的局部世界书 ID 列表")
    
    # 🔄 保留旧版兼容性
    linked_local_world_id: Optional[str] = Field(default=None, description="[已废弃] 绑定的局部世界书 ID (使用 linked_local_worlds 替代)")
    
    # ✅ 新增：生日与最爱系统
    birthday: Optional[str] = Field(default=None, description="生日 (格式: MM-DD, 例如: 03-15)")
    is_favorite: bool = Field(default=False, description="是否为星标好友")
    
    # 动态数据
    relationship: RelationshipState = Field(default_factory=RelationshipState)

    @property
    def compiled_description(self) -> str:
        """
        用于生成完整的 description 给 LLM
        """
        tags_str = ','.join(self.personality_tags)
        return f"姓名：{self.name}\n性别：{self.gender}\n身份：{self.identity}\n外貌：{self.appearance}\n性格标签：{tags_str}\n背景与性格：{self.background}"

class WorldBook(BaseModel):
    """
    世界书模型
    """
    id: str
    type: str = Field(..., pattern='^(GLOBAL|LOCAL)$', description="世界书类型 (全局/局部)")
    entries: Dict[str, str] = Field(default_factory=dict, description="词条字典 (关键词 -> 内容)")

# 聊天消息模型 (方便 ChatSystem 使用)
class ChatMessage(BaseModel):
    role: str = Field(..., pattern='^(user|assistant|system)$')
    content: str
