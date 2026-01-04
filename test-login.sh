#!/bin/bash

# 智慧乡村平台 - 登录测试脚本

echo "=========================================="
echo "   智慧乡村平台 - 多角色登录测试"
echo "=========================================="
echo ""

# 定义角色
declare -A roles
roles[admin]="testadmin|Test123456!|admin|系统管理员"
roles[village_admin]="testcadre|Cadre123456!|village_admin|村干部"
roles[village_official]="testofficial|Official123456!|village_official|乡镇干部"
roles[resident]="testresident|Resident123456!|resident|村民"

# 选择角色
echo "请选择要测试的角色:"
echo "1) admin - 系统管理员"
echo "2) village_admin - 村干部"
echo "3) village_official - 乡镇干部"
echo "4) resident - 村民"
echo "5) 全部测试"
echo ""
read -p "请输入选项 (1-5): " choice

case $choice in
  1|2|3|4)
    role_keys=("" "admin" "village_admin" "village_official" "resident")
    role_key=${role_keys[$choice]}
    IFS='|' read -r username password role name <<< "${roles[$role_key]}"
    
    echo ""
    echo "=========================================="
    echo "测试登录: $name"
    echo "=========================================="
    echo "用户名: $username"
    echo "密码: $password"
    echo "角色: $role"
    echo ""
    
    curl -s -X POST http://localhost:3001/api/v1/auth/login-test \
      -H "Content-Type: application/json" \
      -d "{\"username\":\"$username\",\"password\":\"$password\",\"role\":\"$role\"}" \
      | python -m json.tool 2>/dev/null || cat
    ;;
  5)
    for role_key in "admin" "village_admin" "village_official" "resident"; do
      IFS='|' read -r username password role name <<< "${roles[$role_key]}"
      
      echo ""
      echo "=========================================="
      echo "测试登录: $name"
      echo "=========================================="
      
      response=$(curl -s -X POST http://localhost:3001/api/v1/auth/login-test \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$username\",\"password\":\"$password\",\"role\":\"$role\"}")
      
      echo "$response" | python -m json.tool 2>/dev/null || echo "$response"
      echo ""
      sleep 1
    done
    ;;
  *)
    echo "无效选项"
    exit 1
    ;;
esac

echo ""
echo "=========================================="
echo "测试完成"
echo "=========================================="
