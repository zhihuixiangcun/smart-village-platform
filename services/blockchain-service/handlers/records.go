package handlers

/**
 * HTTP请求处理器
 */

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"blockchain-service/models"
	"blockchain-service/services"
)

// CreateRecord 创建存证记录
func CreateRecord(c *gin.Context) {
	var req models.CreateRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "参数错误",
			"details": err.Error(),
		})
		return
	}

	// 1. 计算数据哈希
	dataHash, err := models.CalculateDataHash(req.Data)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "计算哈希失败",
		})
		return
	}

	// 2. 存储到IPFS
	ipfsHash, err := services.StoreToIPFS(req.Data)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "IPFS存储失败",
		})
		return
	}

	// 3. 上链存证
	txHash, blockNumber, err := services.RecordOnBlockchain(ipfsHash, dataHash, req.RecordType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "区块链存证失败",
		})
		return
	}

	// 4. 保存到数据库
	record, err := models.CreateRecord(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "保存记录失败",
		})
		return
	}

	// 更新区块链信息
	record.IPFSHash = ipfsHash
	record.BlockchainHash = dataHash
	record.TransactionHash = txHash
	record.BlockNumber = blockNumber
	record.IsVerified = true

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    record,
		"message": "数据已上链存证",
	})
}

// ListRecords 获取记录列表
func ListRecords(c *gin.Context) {
	recordType := c.Query("record_type")
	villageID := c.Query("village_id")
	verified := c.Query("verified")

	filter := make(map[string]interface{})
	if recordType != "" {
		filter["record_type"] = recordType
	}
	if villageID != "" {
		filter["village_id"] = villageID
	}
	if verified == "true" {
		filter["is_verified"] = true
	}

	// 分页参数
	skip := int64(0)
	limit := int64(20)

	records, err := models.ListRecords(filter, skip, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "查询失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    records,
		"total":   len(records),
	})
}

// GetRecord 获取记录详情
func GetRecord(c *gin.Context) {
	id := c.Param("id")

	record, err := models.GetRecord(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "记录不存在",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    record,
	})
}

// VerifyRecord 验证记录
func VerifyRecord(c *gin.Context) {
	id := c.Param("id")

	isValid, err := models.VerifyRecord(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "验证失败",
		})
		return
	}

	record, _ := models.GetRecord(id)

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"valid":    isValid,
		"record":   record,
		"verified": isValid,
	})
}

// DeleteRecord 删除记录
func DeleteRecord(c *gin.Context) {
	id := c.Param("id")

	err := models.DeleteRecord(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "记录不存在或删除失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "记录已删除",
	})
}

// BatchCreateRecords 批量创建记录
func BatchCreateRecords(c *gin.Context) {
	var requests []models.CreateRecordRequest
	if err := c.ShouldBindJSON(&requests); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "参数错误",
		})
		return
	}

	var records []models.BlockchainRecord
	var failed []int

	for i, req := range requests {
		record, err := models.CreateRecord(req)
		if err != nil {
			failed = append(failed, i)
			continue
		}
		records = append(records, *record)
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":       true,
		"created":       len(records),
		"failed":        failed,
		"data":          records,
	})
}

// GetStats 获取统计信息
func GetStats(c *gin.Context) {
	stats, err := models.GetStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "获取统计失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}
