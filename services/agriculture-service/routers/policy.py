"""
政策计算路由
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict

router = APIRouter()

# ============== 数据模型 ==============

class PolicyCalculationRequest(BaseModel):
    household_size: int
    land_area: float
    crop_types: List[str]
    region: str
    income_level: str

# ============== 政策数据库 ==============

POLICY_DATABASE = {
    "耕地地力保护补贴": {
        "policy_type": "subsidy",
        "calculation_method": "per_mu",
        "amount_per_mu": 120,  # 元/亩
        "max_area": 1000,  # 最大补贴面积（亩）
        "requirements": [
            "拥有耕地承包权",
            "耕地不撂荒",
            "耕地质量不下降"
        ],
        "eligible_regions": ["全国"]
    },
    "实际种粮补贴": {
        "policy_type": "subsidy",
        "calculation_method": "per_mu",
        "crops": ["水稻", "小麦", "玉米", "大豆"],
        "amounts": {
            "水稻": 100,
            "小麦": 80,
            "玉米": 70,
            "大豆": 150
        },  # 元/亩
        "max_area": 500,
        "requirements": [
            "实际种植粮食作物",
            "面积大于1亩"
        ],
        "eligible_regions": ["全国"]
    },
    "农机购置补贴": {
        "policy_type": "subsidy",
        "calculation_method": "percentage",
        "subsidy_rate": 0.3,  # 30%
        "max_amount": 50000,  # 最大补贴额（元）
        "requirements": [
            "购买规定目录内的农机",
            "办理农机登记"
        ],
        "eligible_regions": ["全国"]
    },
    "农业保险补贴": {
        "policy_type": "insurance",
        "calculation_method": "percentage",
        "subsidy_rate": 0.8,  # 80%
        "max_amount": 300,
        "requirements": [
            "参加农业保险",
            "按时缴纳保费"
        ],
        "eligible_regions": ["全国"]
    },
    "稻谷补贴": {
        "policy_type": "subsidy",
        "calculation_method": "per_mu",
        "amount_per_mu": 100,
        "crops": ["水稻"],
        "requirements": [
            "种植水稻",
            "面积大于5亩"
        ],
        "eligible_regions": ["浙江", "江苏", "江西", "湖南", "湖北"]
    }
}

# ============== 辅助函数 ==============

def calculate_policy_amount(policy_name: str, policy_data: Dict, request: PolicyCalculationRequest) -> float:
    """计算政策补贴金额"""

    if policy_data["calculation_method"] == "per_mu":
        # 按亩计算
        if "crops" in policy_data:
            # 需要匹配作物类型
            total = 0
            for crop in request.crop_types:
                if crop in policy_data["crops"]:
                    amount = policy_data["amounts"].get(crop, policy_data["amount_per_mu"])
                    total += amount * request.land_area
            return total
        else:
            amount = policy_data["amount_per_mu"]
            area = min(request.land_area, policy_data.get("max_area", float('inf')))
            return amount * area

    elif policy_data["calculation_method"] == "percentage":
        # 按比例计算（需要额外信息，这里返回默认值）
        return policy_data.get("max_amount", 0) * 0.5

    return 0

def check_eligibility(policy_name: str, policy_data: Dict, request: PolicyCalculationRequest) -> bool:
    """检查是否符合政策条件"""

    # 地区检查
    eligible_regions = policy_data.get("eligible_regions", [])
    if "全国" not in eligible_regions and request.region not in eligible_regions:
        return False

    # 作物检查
    if "crops" in policy_data:
        if not any(crop in policy_data["crops"] for crop in request.crop_types):
            return False

    # 面积检查
    if "max_area" in policy_data and request.land_area > policy_data["max_area"]:
        # 超过最大面积按最大面积计算
        pass

    return True

# ============== API端点 ==============

@router.post("/calculate-subsidy")
async def calculate_subsidy(request: PolicyCalculationRequest):
    """
    政策补贴计算器

    根据家庭情况自动计算可获得的各类补贴
    """
    try:
        subsidies = []
        total_amount = 0

        # 遍历所有政策
        for policy_name, policy_data in POLICY_DATABASE.items():
            # 检查是否符合条件
            if not check_eligibility(policy_name, policy_data, request):
                continue

            # 计算补贴金额
            amount = calculate_policy_amount(policy_name, policy_data, request)

            if amount > 0:
                subsidies.append({
                    "policy_name": policy_name,
                    "policy_type": policy_data["policy_type"],
                    "amount": round(amount, 2),
                    "requirements": policy_data["requirements"]
                })
                total_amount += amount

        # 按金额排序
        subsidies.sort(key=lambda x: x["amount"], reverse=True)

        # 生成申请指南
        application_guide = {
            "documents_needed": [
                "身份证复印件",
                "户口本复印件",
                "土地承包合同",
                "银行卡信息",
                "种植面积证明"
            ],
            "application_channels": [
                "村委会",
                "乡镇农业服务中心",
                "手机APP（浙里办/当地政务APP）"
            ],
            "deadline": "每年6月30日前申请上一年度补贴",
            "tips": [
                "建议提前准备相关证明材料",
                "注意各补贴政策的申请时间",
                "确保银行卡信息准确",
                "关注当地农业部门通知"
            ]
        }

        return {
            "success": True,
            "subsidies": subsidies,
            "total_amount": round(total_amount, 2),
            "application_guide": application_guide,
            "metadata": {
                "household_size": request.household_size,
                "land_area": request.land_area,
                "crops": request.crop_types,
                "region": request.region,
                "calculated_policies": len(subsidies)
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"计算失败: {str(e)}")

@router.get("/policies/list")
async def list_policies():
    """获取所有政策列表"""
    policies_list = []

    for name, data in POLICY_DATABASE.items():
        policies_list.append({
            "name": name,
            "type": data["policy_type"],
            "eligible_regions": data.get("eligible_regions", [])
        })

    return {
        "success": True,
        "policies": policies_list,
        "total": len(policies_list)
    }

@router.get("/policies/{policy_name}")
async def get_policy_details(policy_name: str):
    """获取政策详情"""
    if policy_name not in POLICY_DATABASE:
        raise HTTPException(status_code=404, detail=f"政策 '{policy_name}' 不在数据库中")

    return {
        "success": True,
        "policy": policy_name,
        "details": POLICY_DATABASE[policy_name]
    }
