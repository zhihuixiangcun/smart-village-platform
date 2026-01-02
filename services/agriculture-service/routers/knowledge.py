"""
知识库路由
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

# ============== 数据模型 ==============

class KnowledgeSearchRequest(BaseModel):
    query: str
    category: Optional[str] = None
    crop_type: Optional[str] = None
    limit: Optional[int] = 5

# ============== 知识库（简化） ==============

KNOWLEDGE_BASE = {
    "水稻种植": {
        "title": "水稻高产种植技术",
        "category": "planting",
        "content": "水稻种植需要掌握育秧、插秧、田间管理等关键技术...",
        "tags": ["水稻", "种植", "高产"],
        "difficulty": "beginner"
    },
    "病虫害防治": {
        "title": "水稻病虫害综合防治技术",
        "category": "pest_control",
        "content": "水稻主要病虫害包括稻瘟病、纹枯病、二化螟等...",
        "tags": ["水稻", "病虫害", "防治"],
        "difficulty": "intermediate"
    },
    "施肥技术": {
        "title": "科学施肥技术指南",
        "category": "fertilization",
        "content": "科学施肥需要根据土壤肥力、作物需求、生长阶段等因素确定...",
        "tags": ["施肥", "营养", "科学"],
        "difficulty": "beginner"
    },
    "灌溉技术": {
        "title": "节水灌溉技术",
        "category": "irrigation",
        "content": "节水灌溉技术包括滴灌、喷灌、渗灌等多种方式...",
        "tags": ["灌溉", "节水", "技术"],
        "difficulty": "beginner"
    }
}

# ============== API端点 ==============

@router.post("/knowledge/search")
async def search_knowledge(request: KnowledgeSearchRequest):
    """
    知识库智能搜索

    使用语义搜索技术查找相关农技知识
    """
    try:
        # 简化的搜索逻辑（实际应该使用向量搜索）
        results = []

        for title, knowledge in KNOWLEDGE_BASE.items():
            # 简单的关键词匹配
            if request.query.lower() in title.lower() or \
               any(tag in request.query.lower() for tag in knowledge["tags"]):

                # 过滤类别
                if request.category and knowledge["category"] != request.category:
                    continue

                results.append({
                    "title": knowledge["title"],
                    "category": knowledge["category"],
                    "content": knowledge["content"][:200] + "...",
                    "tags": knowledge["tags"],
                    "difficulty": knowledge["difficulty"],
                    "relevance_score": 0.85  # 实际应该计算相关性分数
                })

        # 排序并限制结果数量
        results.sort(key=lambda x: x["relevance_score"], reverse=True)
        results = results[:request.limit]

        return {
            "success": True,
            "query": request.query,
            "results": results,
            "total": len(results)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"搜索失败: {str(e)}")

@router.get("/knowledge/categories")
async def get_categories():
    """获取知识分类"""
    categories = {
        "planting": "种植技术",
        "fertilization": "施肥技术",
        "irrigation": "灌溉技术",
        "pest_control": "病虫害防治",
        "harvesting": "收获技术",
        "storage": "储存技术"
    }

    return {
        "success": True,
        "categories": categories
    }

@router.get("/knowledge/tags")
async def get_tags():
    """获取所有标签"""
    all_tags = set()
    for knowledge in KNOWLEDGE_BASE.values():
        all_tags.update(knowledge["tags"])

    return {
        "success": True,
        "tags": sorted(list(all_tags))
    }
