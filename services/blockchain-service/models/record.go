package models

/**
 * 数据模型
 */

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	client   *mongo.Client
	database *mongo.Database
	collection *mongo.Collection
)

// 存证记录模型
type BlockchainRecord struct {
	ID              primitive.ObjectID `json:"id" bson:"_id"`
	RecordType      string             `json:"record_type" bson:"record_type"`
	RelatedID       string             `json:"related_id" bson:"related_id"`
	VillageID       string             `json:"village_id" bson:"village_id"`
	Data            interface{}        `json:"data" bson:"data"`
	CreatedBy       string             `json:"created_by" bson:"created_by"`

	// 哈希信息
	DataHash        string `json:"data_hash" bson:"data_hash"`
	IPFSHash        string `json:"ipfs_hash" bson:"ipfs_hash"`
	BlockchainHash  string `json:"blockchain_hash" bson:"blockchain_hash"`

	// 区块链信息
	ContractAddress string    `json:"contract_address,omitempty" bson:"contract_address,omitempty"`
	TransactionHash string    `json:"transaction_hash,omitempty" bson:"transaction_hash,omitempty"`
	BlockNumber     uint64    `json:"block_number,omitempty" bson:"block_number,omitempty"`
	BlockTimestamp  time.Time `json:"block_timestamp,omitempty" bson:"block_timestamp,omitempty"`

	// 验证信息
	IsVerified      bool      `json:"is_verified" bson:"is_verified"`
	VerifiedAt      time.Time `json:"verified_at,omitempty" bson:"verified_at,omitempty"`

	// 隐私设置
	IsEncrypted     bool      `json:"is_encrypted" bson:"is_encrypted"`
	AccessControl   string    `json:"access_control" bson:"access_control"` // public, village_only, authorized_only

	// 元数据
	Tags            []string  `json:"tags,omitempty" bson:"tags,omitempty"`
	Notes           string    `json:"notes,omitempty" bson:"notes,omitempty"`

	CreatedAt       time.Time `json:"created_at" bson:"created_at"`
	UpdatedAt       time.Time `json:"updated_at" bson:"updated_at"`
}

// 创建记录请求
type CreateRecordRequest struct {
	RecordType string      `json:"record_type" binding:"required"`
	RelatedID  string      `json:"related_id" binding:"required"`
	VillageID  string      `json:"village_id" binding:"required"`
	Data       interface{} `json:"data" binding:"required"`
	CreatedBy  string      `json:"created_by" binding:"required"`
	Tags       []string    `json:"tags"`
	Notes      string      `json:"notes"`
	IsEncrypted bool       `json:"is_encrypted"`
}

// 初始化数据库连接
func InitDB() error {
	// 从环境变量获取MongoDB连接字符串
	mongoURI := "mongodb://localhost:27017"
	dbName := "smart_village"
	collName := "blockchain_records"

	var err error
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err = mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		return err
	}

	// 检查连接
	if err = client.Ping(ctx, nil); err != nil {
		return err
	}

	database = client.Database(dbName)
	collection = database.Collection(collName)

	// 创建索引
	createIndexes(ctx)

	log.Printf("Connected to MongoDB: %s/%s", dbName, collName)
	return nil
}

func createIndexes(ctx context.Context) {
	indexes := []mongo.IndexModel{
		{Keys: bson.D{{"record_type", 1}, {"created_at", -1}}},
		{Keys: bson.D{{"village_id", 1}, {"created_at", -1}}},
		{Keys: bson.D{{"related_id", 1}}},
		{Keys: bson.D{{"transaction_hash", 1}}},
		{Keys: bson.D{{"data_hash", 1}, {"ipfs_hash", 1}}},
	}

	_, err := collection.Indexes().CreateMany(ctx, indexes)
	if err != nil {
		log.Printf("Warning: Failed to create indexes: %v", err)
	}
}

// 关闭数据库连接
func CloseDB() {
	if client != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		client.Disconnect(ctx)
	}
}

// 计算数据哈希
func CalculateDataHash(data interface{}) (string, error) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return "", err
	}

	hash := sha256.Sum256(jsonData)
	return hex.EncodeToString(hash[:]), nil
}

// 创建记录
func CreateRecord(req CreateRecordRequest) (*BlockchainRecord, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 计算数据哈希
	dataHash, err := CalculateDataHash(req.Data)
	if err != nil {
		return nil, err
	}

	// 创建记录
	record := &BlockchainRecord{
		ID:            primitive.NewObjectID(),
		RecordType:    req.RecordType,
		RelatedID:     req.RelatedID,
		VillageID:     req.VillageID,
		Data:          req.Data,
		CreatedBy:     req.CreatedBy,
		DataHash:      dataHash,
		IsVerified:    false,
		IsEncrypted:   req.IsEncrypted,
		AccessControl: "village_only",
		Tags:          req.Tags,
		Notes:         req.Notes,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	// 保存到数据库
	_, err = collection.InsertOne(ctx, record)
	if err != nil {
		return nil, err
	}

	return record, nil
}

// 获取记录
func GetRecord(id string) (*BlockchainRecord, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var record BlockchainRecord
	err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&record)
	if err != nil {
		return nil, err
	}

	return &record, nil
}

// 列出记录
func ListRecords(filter bson.M, skip, limit int64) ([]*BlockchainRecord, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().
		SetSkip(skip).
		SetLimit(limit).
		SetSort(bson.D{{"created_at", -1}})

	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}

	var records []*BlockchainRecord
	if err = cursor.All(ctx, &records); err != nil {
		return nil, err
	}

	return records, nil
}

// 验证记录
func VerifyRecord(id string) (bool, error) {
	record, err := GetRecord(id)
	if err != nil {
		return false, err
	}

	// 简化验证：检查哈希是否匹配
	currentHash, err := CalculateDataHash(record.Data)
	if err != nil {
		return false, err
	}

	// 实际项目中应该验证区块链上的哈希
	isValid := currentHash == record.DataHash

	return isValid, nil
}

// 删除记录
func DeleteRecord(id string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	_, err = collection.DeleteOne(ctx, bson.M{"_id": objectID})
	return err
}

// 获取统计信息
func GetStats() (map[string]interface{}, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	totalCount, _ := collection.CountDocuments(ctx, bson.D{})
	verifiedCount, _ := collection.CountDocuments(ctx, bson.M{"is_verified": true})

	// 按类型分组
	pipeline := mongo.Pipeline{
		{{"$group": bson.D{
			{"_id", "$record_type"},
			{"count", bson.D{{"$sum", 1}}},
		}}},
	}

	cursor, _ := collection.Aggregate(ctx, pipeline)
	defer cursor.Close(ctx)

	var results []bson.M
	cursor.All(ctx, &results)

	typeStats := make(map[string]int)
	for _, result := range results {
		if typeName, ok := result["_id"].(string); ok {
			if count, ok := result["count"].(int32); ok {
				typeStats[typeName] = int(count)
			}
		}
	}

	return map[string]interface{}{
		"total_records":   totalCount,
		"verified_records": verifiedCount,
		"by_type":         typeStats,
	}, nil
}

var log = func() *log.Logger {
	return log.Default()
}()
