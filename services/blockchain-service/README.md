# 智慧乡村区块链存证服务

## Go高性能服务

提供财务流水上链、操作记录存证、数据完整性验证。

## 安装依赖

```bash
go mod download
```

## 启动服务

```bash
go run main.go
```

服务将在 `http://localhost:9000` 启动。

## API文档

### 主要端点

- `POST /api/v1/blockchain/records` - 创建存证记录
- `GET /api/v1/blockchain/records/:id` - 获取记录详情
- `GET /api/v1/blockchain/records/:id/verify` - 验证存证
- `GET /api/v1/blockchain/records` - 获取记录列表

## 技术栈

- Go 1.21+
- Gin Web Framework
- Ethereum (go-ethereum)
- IPFS (go-ipfs-api)
- MongoDB (go-mongo-driver)
- Redis (go-redis)
