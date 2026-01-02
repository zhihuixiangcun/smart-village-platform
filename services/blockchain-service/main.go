package main

/**
 * 智慧乡村区块链存证服务
 * Go Gin主应用
 */

package main

import (
	"fmt"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"blockchain-service/handlers"
	"blockchain-service/middleware"
	"blockchain-service/models"
)

func init() {
	// 加载环境变量
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found")
	}
}

func main() {
	// 初始化数据库连接
	models.InitDB()
	defer models.CloseDB()

	// 创建Gin路由
	r := gin.Default()

	// 中间件
	r.Use(middleware.CORS())
	r.Use(middleware.RequestLogger())
	r.Use(middleware.ErrorHandler())

	// 健康检查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "healthy",
			"service": "blockchain-service",
			"version": "1.0.0",
		})
	})

	// API路由组
	api := r.Group("/api/v1/blockchain")
	{
		// 存证记录管理
		api.POST("/records", handlers.CreateRecord)
		api.GET("/records", handlers.ListRecords)
		api.GET("/records/:id", handlers.GetRecord)
		api.GET("/records/:id/verify", handlers.VerifyRecord)
		api.DELETE("/records/:id", handlers.DeleteRecord)

		// 批量操作
		api.POST("/records/batch", handlers.BatchCreateRecords)
		api.GET("/records/stats/summary", handlers.GetStats)
	}

	// 获取端口
	port := os.Getenv("PORT")
	if port == "" {
		port = "9000"
	}

	// 启动服务
	addr := fmt.Sprintf(":%s", port)
	log.Printf("Blockchain service starting on %s", addr)

	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
