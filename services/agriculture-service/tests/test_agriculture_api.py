"""
农业服务单元测试 - 政策计算模块
测试政策补贴计算功能
"""

import pytest
from httpx import AsyncClient
from fastapi import FastAPI


@pytest.mark.asyncio
class TestPolicyCalculation:
    """政策计算测试"""

    async def test_calculate_subsidy_basic(self, client: AsyncClient):
        """测试基础补贴计算"""
        request = {
            "household_size": 4,
            "land_area": 10.0,
            "crop_types": ["水稻", "小麦"],
            "region": "浙江",
            "income_level": "middle"
        }

        response = await client.post("/api/v2/agriculture/calculate-subsidy", json=request)
        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True
        assert "subsidies" in data
        assert "total_amount" in data
        assert "application_guide" in data

        # 检查申请指南
        guide = data["application_guide"]
        assert "documents_needed" in guide
        assert "application_channels" in guide
        assert "deadline" in guide

    async def test_calculate_subsidy_large_area(self, client: AsyncClient):
        """测试大面积补贴计算"""
        request = {
            "household_size": 6,
            "land_area": 800.0,  # 大面积
            "crop_types": ["水稻"],
            "region": "浙江",
            "income_level": "low"
        }

        response = await client.post("/api/v2/agriculture/calculate-subsidy", json=request)
        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True
        assert data["total_amount"] > 0

    async def test_calculate_subsidy_invalid_region(self, client: AsyncClient):
        """测试无效地区的补贴计算"""
        request = {
            "household_size": 3,
            "land_area": 5.0,
            "crop_types": ["水稻"],
            "region": "不存在的地区",
            "income_level": "middle"
        }

        response = await client.post("/api/v2/agriculture/calculate-subsidy", json=request)
        # 应该仍然返回成功，只是某些政策不适用
        assert response.status_code == 200

    async def test_calculate_subsidy_zero_area(self, client: AsyncClient):
        """测试零面积的补贴计算"""
        request = {
            "household_size": 2,
            "land_area": 0.0,
            "crop_types": ["水稻"],
            "region": "浙江",
            "income_level": "low"
        }

        response = await client.post("/api/v2/agriculture/calculate-subsidy", json=request)
        assert response.status_code == 200

        data = response.json()
        # 零面积应该没有补贴
        assert data["total_amount"] == 0 or data["total_amount"] is None

    async def test_list_policies(self, client: AsyncClient):
        """测试政策列表"""
        response = await client.get("/api/v2/agriculture/policies/list")
        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True
        assert "policies" in data
        assert "total" in data
        assert data["total"] > 0

    async def test_get_policy_details(self, client: AsyncClient):
        """测试获取政策详情"""
        policy_name = "耕地地力保护补贴"

        response = await client.get(f"/api/v2/agriculture/policies/{policy_name}")
        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True
        assert data["policy"] == policy_name
        assert "details" in data
        assert "requirements" in data["details"]

    async def test_get_policy_details_not_found(self, client: AsyncClient):
        """测试获取不存在的政策详情"""
        policy_name = "不存在的政策"

        response = await client.get(f"/api/v2/agriculture/policies/{policy_name}")
        assert response.status_code == 404

    async def test_subsidy_ordering_by_amount(self, client: AsyncClient):
        """测试补贴按金额排序"""
        request = {
            "household_size": 5,
            "land_area": 50.0,
            "crop_types": ["水稻", "小麦", "玉米"],
            "region": "浙江",
            "income_level": "middle"
        }

        response = await client.post("/api/v2/agriculture/calculate-subsidy", json=request)
        assert response.status_code == 200

        data = response.json()
        subsidies = data["subsidies"]

        # 检查是否按金额降序排列
        for i in range(len(subsidies) - 1):
            assert subsidies[i]["amount"] >= subsidies[i+1]["amount"]

    async def test_calculation_method_per_mu(self, client: AsyncClient):
        """测试按亩计算方法"""
        request = {
            "household_size": 4,
            "land_area": 100.0,
            "crop_types": ["水稻"],
            "region": "浙江",
            "income_level": "middle"
        }

        response = await client.post("/api/v2/agriculture/calculate-subsidy", json=request)
        assert response.status_code == 200

        data = response.json()

        # 检查实际种粮补贴
        grain_subsidy = next(
            (s for s in data["subsidies"] if "实际种粮" in s["policy_name"]),
            None
        )

        if grain_subsidy:
            # 验证金额计算正确（水稻100元/亩 * 100亩）
            assert abs(grain_subsidy["amount"] - 10000) < 1

    async def test_max_area_limit(self, client: AsyncClient):
        """测试最大面积限制"""
        request = {
            "household_size": 10,
            "land_area": 2000.0,  # 超过最大面积限制
            "crop_types": ["水稻"],
            "region": "浙江",
            "income_level": "middle"
        }

        response = await client.post("/api/v2/agriculture/calculate-subsidy", json=request)
        assert response.status_code == 200

        data = response.json()

        # 检查实际种粮补贴最大面积限制
        grain_subsidy = next(
            (s for s in data["subsidies"] if "实际种粮" in s["policy_name"]),
            None
        )

        if grain_subsidy:
            # 应该按最大面积计算（500亩）
            assert grain_subsidy["amount"] <= 100 * 500  # 水稻100元/亩 * 500亩


@pytest.mark.asyncio
class TestPestIdentification:
    """病虫害识别测试"""

    async def test_identify_pest_success(self, client: AsyncClient):
        """测试病虫害识别成功"""
        import base64

        # 创建一个简单的测试图片
        from io import BytesIO
        from PIL import Image

        img = Image.new('RGB', (100, 100), color='red')
        buffered = BytesIO()
        img.save(buffered, format="JPEG")
        img_str = base64.b64encode(buffered.getvalue()).decode()

        request = {
            "image_base64": f"data:image/jpeg;base64,{img_str}",
            "crop_type": "水稻",
            "region": "浙江",
            "growth_stage": "分蘖期"
        }

        response = await client.post("/api/v2/agriculture/identify-pest", json=request)
        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True

        # 检查识别结果
        if data["identification"]:
            assert "name" in data["identification"]
            assert "confidence" in data["identification"]
            assert "severity" in data["identification"]

    async def test_identify_pest_invalid_image(self, client: AsyncClient):
        """测试无效图片的病虫害识别"""
        request = {
            "image_base64": "invalid_base64_string",
            "crop_type": "水稻",
            "region": "浙江",
            "growth_stage": "分蘖期"
        }

        response = await client.post("/api/v2/agriculture/identify-pest", json=request)
        # 应该返回错误
        assert response.status_code == 500 or response.status_code == 400

    async def test_list_pests(self, client: AsyncClient):
        """测试病虫害列表"""
        response = await client.get("/api/v2/agriculture/pests/list")
        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True
        assert "pests" in data
        assert "total" in data

    async def test_get_pest_details(self, client: AsyncClient):
        """测试获取病虫害详情"""
        pest_name = "二化螟"

        response = await client.get(f"/api/v2/agriculture/pests/{pest_name}")
        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True
        assert data["pest"] == pest_name
        assert "details" in data

        # 检查详细信息
        details = data["details"]
        assert "symptoms" in details or "symptoms" in details  # 注意数据库中的拼写
        assert "treatment" in details
        assert "prevention" in details


@pytest.mark.asyncio
class TestKnowledgeSearch:
    """知识库搜索测试"""

    async def test_search_knowledge_basic(self, client: AsyncClient):
        """测试基础知识搜索"""
        request = {
            "query": "水稻种植",
            "category": None,
            "crop_type": None,
            "limit": 5
        }

        response = await client.post("/api/v2/agriculture/knowledge/search", json=request)
        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True
        assert "results" in data
        assert "total" in data

    async def test_search_knowledge_with_category(self, client: AsyncClient):
        """测试带分类的知识搜索"""
        request = {
            "query": "水稻",
            "category": "planting",
            "crop_type": None,
            "limit": 3
        }

        response = await client.post("/api/v2/agriculture/knowledge/search", json=request)
        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True

        # 检查结果是否只包含指定分类
        for result in data["results"]:
            assert result["category"] == "planting"

    async def test_search_knowledge_no_results(self, client: AsyncClient):
        """测试无结果的知识搜索"""
        request = {
            "query": "不存在的内容",
            "category": None,
            "crop_type": None,
            "limit": 5
        }

        response = await client.post("/api/v2/agriculture/knowledge/search", json=request)
        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True
        assert data["total"] == 0

    async def test_get_categories(self, client: AsyncClient):
        """测试获取知识分类"""
        response = await client.get("/api/v2/agriculture/knowledge/categories")
        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True
        assert "categories" in data
        assert len(data["categories"]) > 0

    async def test_get_tags(self, client: AsyncClient):
        """测试获取所有标签"""
        response = await client.get("/api/v2/agriculture/knowledge/tags")
        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True
        assert "tags" in data
        assert len(data["tags"]) > 0


@pytest.mark.asyncio
class TestHealthCheck:
    """健康检查测试"""

    async def test_root_endpoint(self, client: AsyncClient):
        """测试根路径"""
        response = await client.get("/")
        assert response.status_code == 200

        data = response.json()
        assert "service" in data
        assert "version" in data
        assert "status" in data
        assert data["status"] == "running"

    async def test_health_check(self, client: AsyncClient):
        """测试健康检查端点"""
        response = await client.get("/health")
        assert response.status_code == 200

        data = response.json()
        assert data["status"] == "healthy"
        assert "service" in data
