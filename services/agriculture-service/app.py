"""
智慧乡村农技知识图谱服务
FastAPI主应用
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 创建FastAPI应用
app = FastAPI(
    title="智慧乡村农技知识图谱API",
    description="提供作物推荐、病虫害识别、政策计算等农技服务",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== 数据模型 ==============

class CropRecommendationRequest(BaseModel):
    """作物推荐请求"""
    region: str
    soil_type: str
    season: str
    area_size: float  # 亩
    water_availability: str
    budget_range: tuple[float, float]
    preferred_crops: Optional[List[str]] = None

class PestIdentificationRequest(BaseModel):
    """病虫害识别请求"""
    image_base64: str
    crop_type: str
    region: str
    growth_stage: str

class PolicyCalculationRequest(BaseModel):
    """政策补贴计算请求"""
    household_size: int
    land_area: float
    crop_types: List[str]
    region: str
    income_level: str

class KnowledgeSearchRequest(BaseModel):
    """知识搜索请求"""
    query: str
    category: Optional[str] = None
    crop_type: Optional[str] = None
    limit: Optional[int] = 5

# ============== API路由 ==============

@app.get("/")
async def root():
    """根路径"""
    return {
        "service": "智慧乡村农技知识图谱API",
        "version": "2.0.0",
        "status": "running",
        "endpoints": {
            "docs": "/docs",
            "crops": "/api/v2/agriculture/recommend-crops",
            "pests": "/api/v2/agriculture/identify-pest",
            "policy": "/api/v2/agriculture/calculate-subsidy",
            "knowledge": "/api/v2/agriculture/knowledge/search"
        }
    }

@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "service": "agriculture-ai",
        "timestamp": os.popen('date').read().strip()
    }

# 导入路由
import routers.crops as crops
import routers.pests as pests
import routers.knowledge as knowledge
import routers.policy as policy

# 注册路由
app.include_router(crops.router, prefix="/api/v2/agriculture", tags=["作物推荐"])
app.include_router(pests.router, prefix="/api/v2/agriculture", tags=["病虫害识别"])
app.include_router(knowledge.router, prefix="/api/v2/agriculture", tags=["知识库"])
app.include_router(policy.router, prefix="/api/v2/agriculture", tags=["政策计算"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
