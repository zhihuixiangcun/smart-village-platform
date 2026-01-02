// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * 智慧乡村存证合约
 * 用于村务数据存证、财务流水上链
 */

contract VillageRecord {
    // ============== 状态变量 ==============

    address public owner;
    string public name;
    string public version;

    uint256 public recordCount;
    uint256 public constant MAX_RECORDS = 1000000;

    // ============== 结构体 ==============

    struct Record {
        bytes32 dataHash;      // 数据哈希
        bytes32 ipfsHash;      // IPFS哈希
        string recordType;     // 记录类型
        address recordedBy;    // 记录创建者
        uint256 timestamp;     // 时间戳
        uint256 blockNumber;   // 区块号
        bool exists;           // 是否存在
    }

    // ============== 映射 ==============

    mapping(bytes32 => Record) public records;
    mapping(address => uint256) public userRecordCount;

    // ============== 事件 ==============

    event RecordCreated(
        bytes32 indexed hash,
        address indexed recordedBy,
        string recordType,
        uint256 timestamp
    );

    event RecordVerified(
        bytes32 indexed hash,
        bool isValid,
        uint256 timestamp
    );

    // ============== 修饰器 ==============

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier recordExists(bytes32 hash) {
        require(records[hash].exists, "Record does not exist");
        _;
    }

    // ============== 构造函数 ==============

    constructor(string memory _name) {
        owner = msg.sender;
        name = _name;
        version = "1.0.0";
        recordCount = 0;
    }

    // ============== 核心功能 ==============

    /**
     * @dev 创建存证记录
     * @param _dataHash 数据哈希
     * @param _ipfsHash IPFS哈希
     * @param _recordType 记录类型
     * @return hash 记录哈希
     */
    function createRecord(
        bytes32 _dataHash,
        bytes32 _ipfsHash,
        string memory _recordType
    ) external returns (bytes32) {
        // 计算记录哈希
        bytes32 hash = keccak256(
            abi.encodePacked(_dataHash, msg.sender, block.timestamp)
        );

        // 检查是否已存在
        require(!records[hash].exists, "Record already exists");

        // 检查数量限制
        require(recordCount < MAX_RECORDS, "Max records reached");

        // 创建记录
        records[hash] = Record({
            dataHash: _dataHash,
            ipfsHash: _ipfsHash,
            recordType: _recordType,
            recordedBy: msg.sender,
            timestamp: block.timestamp,
            blockNumber: block.number,
            exists: true
        });

        // 更新计数
        recordCount++;
        userRecordCount[msg.sender]++;

        // 触发事件
        emit RecordCreated(hash, msg.sender, _recordType, block.timestamp);

        return hash;
    }

    /**
     * @dev 批量创建记录
     * @param _dataHashes 数据哈希数组
     * @param _ipfsHashes IPFS哈希数组
     * @param _recordTypes 记录类型数组
     * @return hashes 记录哈希数组
     */
    function batchCreateRecords(
        bytes32[] memory _dataHashes,
        bytes32[] memory _ipfsHashes,
        string[] memory _recordTypes
    ) external returns (bytes32[] memory) {
        require(
            _dataHashes.length == _ipfsHashes.length &&
            _dataHashes.length == _recordTypes.length,
            "Array length mismatch"
        );

        require(
            _dataHashes.length <= 100,
            "Batch too large"
        );

        bytes32[] memory hashes = new bytes32[](_dataHashes.length);

        for (uint256 i = 0; i < _dataHashes.length; i++) {
            bytes32 hash = keccak256(
                abi.encodePacked(_dataHashes[i], msg.sender, block.timestamp)
            );

            require(!records[hash].exists, "Record already exists");

            records[hash] = Record({
                dataHash: _dataHashes[i],
                ipfsHash: _ipfsHashes[i],
                recordType: _recordTypes[i],
                recordedBy: msg.sender,
                timestamp: block.timestamp,
                blockNumber: block.number,
                exists: true
            });

            recordCount++;
            userRecordCount[msg.sender]++;

            emit RecordCreated(hash, msg.sender, _recordTypes[i], block.timestamp);

            hashes[i] = hash;
        }

        return hashes;
    }

    /**
     * @dev 验证记录
     * @param _hash 记录哈希
     * @return isValid 是否有效
     */
    function verifyRecord(bytes32 _hash)
        external
        view
        recordExists(_hash)
        returns (bool)
    {
        Record memory record = records[_hash];

        // 简单验证：检查记录是否存在
        return record.exists;
    }

    /**
     * @dev 获取记录详情
     * @param _hash 记录哈希
     * @return dataHash 数据哈希
     * @return ipfsHash IPFS哈希
     * @return recordType 记录类型
     * @return recordedBy 创建者
     * @return timestamp 时间戳
     * @return blockNumber 区块号
     */
    function getRecord(bytes32 _hash)
        external
        view
        recordExists(_hash)
        returns (
            bytes32 dataHash,
            bytes32 ipfsHash,
            string memory recordType,
            address recordedBy,
            uint256 timestamp,
            uint256 blockNumber
        )
    {
        Record memory record = records[_hash];
        return (
            record.dataHash,
            record.ipfsHash,
            record.recordType,
            record.recordedBy,
            record.timestamp,
            record.blockNumber
        );
    }

    /**
     * @dev 检查哈希是否匹配
     * @param _hash 记录哈希
     * @param _dataHash 数据哈希
     * @return isMatch 是否匹配
     */
    function verifyHash(bytes32 _hash, bytes32 _dataHash)
        external
        view
        recordExists(_hash)
        returns (bool)
    {
        return records[_hash].dataHash == _dataHash;
    }

    // ============== 管理功能 ==============

    /**
     * @dev 转移所有权
     * @param _newOwner 新所有者
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        owner = _newOwner;
    }

    /**
     * @dev 更新合约名称
     * @param _name 新名称
     */
    function updateName(string memory _name) external onlyOwner {
        name = _name;
    }

    /**
     * @dev 获取用户记录数量
     * @param _user 用户地址
     * @return count 记录数量
     */
    function getUserRecordCount(address _user) external view returns (uint256) {
        return userRecordCount[_user];
    }

    /**
     * @dev 获取记录总数
     * @return count 记录总数
     */
    function getTotalRecords() external view returns (uint256) {
        return recordCount;
    }
}
