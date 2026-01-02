"""
病虫害识别路由
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import base64
from io import BytesIO
from PIL import Image
import numpy as np

router = APIRouter()

# ============== 数据模型 ==============

class PestIdentificationRequest(BaseModel):
    image_base64: str
    crop_type: str
    region: str
    growth_stage: str

# ============== 病虫害数据库 ==============

PEST_DATABASE = {
    "二化螟": {
        "type": "pest",
        "scientific_name": "Chilo suppressalis",
        "affected_crops": ["水稻"],
        "symptoms": ["枯心苗", "白穗", "虫伤株"],
        "lifecycle": {
            "generations_per_year": 2,
            "overwintering": "幼虫",
            "peak_season": "6-8月"
        },
        "treatment": {
            "chemical": [
                {"name": "氯虫苯甲酰胺", "dosage": "10-20ml/亩", "effectiveness": 95},
                {"name": "阿维菌素", "dosage": "30-50ml/亩", "effectiveness": 85}
            ],
            "biological": [
                {"name": "赤眼蜂", "method": "放蜂", "effectiveness": 75},
                {"name": "Bt制剂", "dosage": "100-150ml/亩", "effectiveness": 80}
            ]
        },
        "prevention": [
            "适时田水管理",
            "清除田边杂草",
            "利用性诱剂诱杀",
            "保护天敌"
        ]
    },
    "稻瘟病": {
        "type": "disease",
        "scientific_name": "Magnaporthe oryzae",
        "affected_crops": ["水稻"],
        "symptoms": ["叶瘟", "穗颈瘟", "谷粒瘟"],
        "conditions": {
            "temperature": "25-28°C",
            "humidity": ">90%",
            "susceptible_stage": "分蘖期、抽穗期"
        },
        "treatment": {
            "chemical": [
                {"name": "三环唑", "dosage": "20-30g/亩", "effectiveness": 90},
                {"name": "稻瘟灵", "dosage": "100-150ml/亩", "effectiveness": 85}
            ],
            "cultural": [
                {"name": "选用抗病品种", "method": "品种选择"},
                {"name": "合理施肥", "method": "避免偏施氮肥"}
            ]
        },
        "prevention": [
            "选用抗病品种",
            "种子消毒处理",
            "合理密植",
            "科学用水施肥"
        ]
    },
    "蚜虫": {
        "type": "pest",
        "scientific_name": "Myzus persicae",
        "affected_crops": ["小麦", "玉米", "大豆", "油菜"],
        "symptoms": ["叶片卷曲", "黄化", "生长停滞"],
        "lifecycle": {
            "generations_per_year": 10,
            "reproduction_rate": "极高",
            "peak_season": "4-6月, 9-10月"
        },
        "treatment": {
            "chemical": [
                {"name": "吡虫啉", "dosage": "10-20g/亩", "effectiveness": 95},
                {"name": "噻虫嗪", "dosage": "5-10g/亩", "effectiveness": 90}
            ]
        },
        "prevention": [
            "清除田间杂草",
            "利用黄色粘板诱杀",
            "保护天敌（瓢虫等）"
        ]
    },
    "纹枯病": {
        "type": "disease",
        "scientific_name": "Rhizoctonia solani",
        "affected_crops": ["水稻", "小麦", "玉米"],
        "symptoms": ["云纹状病斑", "茎秆腐烂", "倒伏"],
        "conditions": {
            "temperature": "28-32°C",
            "humidity": ">95%",
            "susceptible_stage": "分蘖盛期"
        },
        "treatment": {
            "chemical": [
                {"name": "井冈霉素", "dosage": "200-300ml/亩", "effectiveness": 88}
            ]
        },
        "prevention": [
            "合理密植",
            "科学施肥",
            "适时晒田"
        ]
    }
}

# ============== AI模型（简化实现） ==============

class PestClassifier:
    """病虫害分类器"""

    def __init__(self):
        self.model = None  # 实际应该加载训练好的模型

    def predict(self, image_array):
        """
        预测病虫害

        实际项目中应该使用训练好的深度学习模型
        这里返回模拟结果
        """
        # 模拟预测结果
        import random

        # 根据作物类型筛选可能的病虫害
        possible_pests = [
            (name, data) for name, data in PEST_DATABASE.items()
            if "水稻" in data.get("affected_crops", [])
        ]

        if possible_pests:
            # 随机选择一个（实际应该是模型预测）
            pest_name, pest_data = random.choice(possible_pests)
            confidence = random.uniform(0.75, 0.98)

            return {
                "name": pest_name,
                "type": pest_data["type"],
                "scientific_name": pest_data.get("scientific_name", ""),
                "confidence": round(confidence, 2),
                "severity": self._estimate_severity(confidence)
            }

        return None

    def _estimate_severity(self, confidence):
        """估算严重程度"""
        if confidence > 0.9:
            return "severe"
        elif confidence > 0.8:
            return "moderate"
        else:
            return "mild"

# 创建分类器实例
pest_classifier = PestClassifier()

# ============== API端点 ==============

@router.post("/identify-pest")
async def identify_pest(request: PestIdentificationRequest):
    """
    病虫害图像识别

    使用深度学习模型识别作物病虫害
    """
    try:
        # 解析base64图片
        if "," in request.image_base64:
            request.image_base64 = request.image_base64.split(",")[1]

        image_data = base64.b64decode(request.image_base64)
        image = Image.open(BytesIO(image_data))

        # 转换为numpy数组
        image_array = np.array(image)

        # AI模型识别
        prediction = pest_classifier.predict(image_array)

        if not prediction:
            return {
                "success": True,
                "identification": None,
                "message": "未识别到已知病虫害，建议人工确认"
            }

        # 查询防治方案
        pest_info = PEST_DATABASE.get(prediction["name"], {})

        return {
            "success": True,
            "identification": {
                "name": prediction["name"],
                "type": prediction["type"],
                "scientific_name": prediction["scientific_name"],
                "confidence": prediction["confidence"],
                "severity": prediction["severity"]
            },
            "treatment": pest_info.get("treatment", {}),
            "prevention": pest_info.get("prevention", []),
            "affected_parts": pest_info.get("symptoms", []),
            "metadata": {
                "crop_type": request.crop_type,
                "region": request.region,
                "growth_stage": request.growth_stage,
                "model_version": "2.0.0"
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"识别失败: {str(e)}")

@router.get("/pests/list")
async def list_pests():
    """获取所有病虫害列表"""
    pests_list = []

    for name, data in PEST_DATABASE.items():
        pests_list.append({
            "name": name,
            "type": data["type"],
            "scientific_name": data.get("scientific_name", ""),
            "affected_crops": data.get("affected_crops", [])
        })

    return {
        "success": True,
        "pests": pests_list,
        "total": len(pests_list)
    }

@router.get("/pests/{pest_name}")
async def get_pest_details(pest_name: str):
    """获取病虫害详情"""
    if pest_name not in PEST_DATABASE:
        raise HTTPException(status_code=404, detail=f"病虫害 '{pest_name}' 不在数据库中")

    return {
        "success": True,
        "pest": pest_name,
        "details": PEST_DATABASE[pest_name]
    }
