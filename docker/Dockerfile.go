# Go 服务 Dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /build

# 复制依赖文件
COPY go.mod go.sum ./
RUN go mod download

# 复制源代码
COPY . .

# 编译
RUN CGO_ENABLED=0 GOOS=linux go build -o blockchain-service main.go

# 运行镜像
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# 从构建镜像复制二进制文件
COPY --from=builder /build/blockchain-service .

# 暴露端口
EXPOSE 9000

# 启动服务
CMD ["./blockchain-service"]
