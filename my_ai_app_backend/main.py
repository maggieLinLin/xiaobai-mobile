import sys
from typing import List

# 导入各模块
from models import Character, WorldBook, ChatMessage
from llm_client import LLMClient
from character_system import CharacterSystem, PRESETS
from world_system import WorldSystem
from relationship_system import RelationshipSystem
from chat_system import ChatSystem

def main():
    print("=== AI Mobile Simulator (Backend) Initializing... ===")

    # 1. 初始化各系统
    llm_client = LLMClient()
    world_system = WorldSystem()
    char_system = CharacterSystem(llm_client)
    rel_system = RelationshipSystem(llm_client)
    chat_system = ChatSystem(llm_client, world_system)

    # 2. 创建世界书数据 (Mock)
    global_world = WorldBook(id="global_001", type="GLOBAL", entries={
        "云京市": "一个充满赛博朋克风格的近未来都市，霓虹灯终夜不熄。",
        "星际联邦": "统治着银河系的人类政权，科技高度发达。"
    })
    local_world_shen = WorldBook(id="local_shen_01", type="LOCAL", entries={
        "云京大学": "沈砚就读的学校，以其严苛的学术标准闻名。",
        "旧公寓": "沈砚租住的地方，虽然破旧但收拾得很干净。"
    })
    
    world_system.add_global_book(global_world)
    world_system.add_local_book(local_world_shen)

    # 3. 模拟创建角色“沈砚” (使用新的 create_manual 结构)
    print("\n[System] Creating Character '沈砚' with detailed specs...")
    
    shen_data = {
        "name": "沈砚",
        "gender": "男",
        "identity": "云京大学物理系在读博士 / 天才研究员",
        "background": "外表冷漠但内心细腻的学霸。因天赋异禀而从小被孤立，习惯独来独往。其实很会照顾人，但因为不善言辞常被误解。最近在研究量子纠缠课题。",
        "appearance": "戴着金丝眼镜，总是穿着整洁的白衬衫，袖口永远扣得一丝不苟。手指修长骨节分明。",
        "personality_tags": ["高冷", "学霸", "傲娇", "细心"],
        "dialogue_style": "现代日常 (默认)",
        "mes_example": "[沈砚]: 这么简单的题都不会？...算了，过来，我教你。\n[沈砚]: (推了推眼镜) 别误会，我只是不想你拉低班级平均分。",
        "first_message": "你好。如果是为了课题的事，请三分钟内说完。"
    }
    
    shen_yan = char_system.create_manual(shen_data)
    
    # 绑定局部世界书
    shen_yan.linked_local_world_id = "local_shen_01"
    
    # 开启所有调教开关 (默认已开启，这里显式确认)
    shen_yan.advanced_tuning.prevent_godmoding = True
    shen_yan.advanced_tuning.respect_user_agency = True
    shen_yan.advanced_tuning.force_web_novel_pacing = True

    print(f"[System] 角色创建成功: {shen_yan.name} (ID: {shen_yan.id})")
    print(f"[System] 调教开关状态: {shen_yan.advanced_tuning}")

    # 4. 进入 Console 聊天测试
    chat_history: List[ChatMessage] = []
    
    # 添加开场白
    if shen_yan.first_message:
        print(f"\n{shen_yan.name}: {shen_yan.first_message}")
        chat_history.append(ChatMessage(role="assistant", content=shen_yan.first_message))

    current_mode = "OFFLINE" # 默认为线下模式（网文风）
    
    print("\n" + "="*50)
    print(f"进入聊天测试。当前对象：{shen_yan.name}")
    print("指令：输入 '/switch' 切换 线上/线下 模式。输入 '/quit' 退出。")
    print(f"当前模式: {current_mode}")
    print("="*50 + "\n")

    while True:
        try:
            user_input = input("You: ").strip()
            if not user_input:
                continue
                
            if user_input == "/quit":
                print("退出聊天。")
                break
                
            if user_input == "/switch":
                current_mode = "ONLINE" if current_mode == "OFFLINE" else "OFFLINE"
                print(f"\n[System] 模式已切换为: {current_mode}\n")
                continue

            # 生成回复
            response = chat_system.chat(shen_yan, user_input, chat_history, mode=current_mode)
            
            # 更新历史
            chat_history.append(ChatMessage(role="user", content=user_input))
            chat_history.append(ChatMessage(role="assistant", content=response))
            
            # 更新好感度 (Mock)
            score_change = rel_system.update_relationship(shen_yan, user_input, response)
            
            # 打印结果
            print(f"\n{shen_yan.name}: {response}")
            print(f"[System] 好感度变化: {score_change:+d} -> 当前: {shen_yan.relationship.score} ({shen_yan.relationship.level})\n")

        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    main()
