from typing import Dict, List, Optional
from .models import WorldBook

class WorldSystem:
    """
    世界观百科：负责处理全局与局部世界书的冲突与检索
    """
    def __init__(self):
        self.global_books: Dict[str, WorldBook] = {}
        self.local_books: Dict[str, WorldBook] = {}

    def add_global_book(self, book: WorldBook):
        if book.type != 'GLOBAL':
            raise ValueError("Type must be GLOBAL")
        self.global_books[book.id] = book

    def add_local_book(self, book: WorldBook):
        if book.type != 'LOCAL':
            raise ValueError("Type must be LOCAL")
        self.local_books[book.id] = book

    def get_world_context(self, user_input: str, global_id: Optional[str], local_id: Optional[str]) -> str:
        """
        检索并合并世界观上下文
        逻辑：合并 Global 和 Local 的 Entry，Local 优先覆盖 Global，然后检索是否命中 Input
        """
        merged_entries = {}
        
        # 1. 读取 Global
        if global_id and global_id in self.global_books:
            merged_entries.update(self.global_books[global_id].entries)
            
        # 2. 读取 Local (覆盖 Global)
        if local_id and local_id in self.local_books:
            merged_entries.update(self.local_books[local_id].entries)
            
        # 3. 检索：检查 user_input 是否包含 Key
        matched_content = []
        for key, content in merged_entries.items():
            if key in user_input:
                matched_content.append(f"【世界观-{key}】：{content}")
                
        if not matched_content:
            return ""
            
        return "\n".join(matched_content)

