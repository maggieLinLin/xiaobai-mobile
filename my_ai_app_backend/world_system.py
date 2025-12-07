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

    def get_world_context(self, user_input: str, global_ids: Optional[List[str]] = None, local_ids: Optional[List[str]] = None) -> str:
        """
        检索并合并世界观上下文
        逻辑：合并 Global 和 Local 的 Entry，Local 优先覆盖 Global，然后检索是否命中 Input
        
        ✅ 新增：支持多个世界书 ID
        🔄 兼容旧版 API (单个 global_id, local_id)
        """
        merged_entries = {}
        
        # 🔄 兼容旧版 API (如果传入的是单个字符串)
        if isinstance(global_ids, str):
            global_ids = [global_ids] if global_ids else []
        if isinstance(local_ids, str):
            local_ids = [local_ids] if local_ids else []
        
        # 设置默认值
        if global_ids is None:
            global_ids = []
        if local_ids is None:
            local_ids = []
        
        # 1. ✅ 读取所有指定的 Global 世界书
        if global_ids:
            for global_id in global_ids:
                if global_id in self.global_books:
                    merged_entries.update(self.global_books[global_id].entries)
        else:
            # 如果没有指定，读取所有全局世界书
            for book in self.global_books.values():
                merged_entries.update(book.entries)
            
        # 2. ✅ 读取所有指定的 Local 世界书 (覆盖 Global)
        if local_ids:
            for local_id in local_ids:
                if local_id in self.local_books:
                    merged_entries.update(self.local_books[local_id].entries)
            
        # 3. 检索：检查 user_input 是否包含 Key
        matched_content = []
        for key, content in merged_entries.items():
            # 跳过元数据
            if key.startswith('__META_'):
                continue
            if key in user_input:
                matched_content.append(f"【世界观-{key}】：{content}")
                
        if not matched_content:
            return ""
            
        return "\n".join(matched_content)

