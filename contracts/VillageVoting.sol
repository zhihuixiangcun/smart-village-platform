// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VillageVoting {
    struct Suggestion {
        uint256 id;
        string title;
        string content;
        address submitter;
        uint256 createdAt;
        uint256 supportVotes;
        uint256 opposeVotes;
        bool isActive;
        mapping(address => bool) hasVoted;
        mapping(address => VoteType) votes;
    }

    struct VoteRecord {
        uint256 suggestionId;
        address voter;
        VoteType voteType;
        uint256 timestamp;
        bytes32 transactionHash;
    }

    enum VoteType { NONE, SUPPORT, OPPOSE }

    mapping(uint256 => Suggestion) public suggestions;
    mapping(bytes32 => VoteRecord) public voteRecords;

    uint256 public suggestionCount;
    uint256 public totalVotes;

    address public owner;
    mapping(address => bool) public authorizedVoters;
    mapping(address => bool) public villageAdmins;

    event SuggestionCreated(
        uint256 indexed suggestionId,
        string title,
        address indexed submitter,
        uint256 timestamp
    );

    event VoteCast(
        uint256 indexed suggestionId,
        address indexed voter,
        VoteType voteType,
        uint256 timestamp,
        bytes32 indexed transactionHash
    );

    event VoterAuthorized(address indexed voter, address indexed admin);
    event VoterRevoked(address indexed voter, address indexed admin);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier onlyAdmin() {
        require(villageAdmins[msg.sender] || msg.sender == owner, "Only admin can perform this action");
        _;
    }

    modifier onlyAuthorizedVoter() {
        require(authorizedVoters[msg.sender], "Not authorized to vote");
        _;
    }

    modifier suggestionExists(uint256 _suggestionId) {
        require(_suggestionId > 0 && _suggestionId <= suggestionCount, "Suggestion does not exist");
        _;
    }

    constructor() {
        owner = msg.sender;
        villageAdmins[msg.sender] = true;
        authorizedVoters[msg.sender] = true;
    }

    function addVillageAdmin(address _admin) external onlyOwner {
        villageAdmins[_admin] = true;
        authorizedVoters[_admin] = true;
        emit VoterAuthorized(_admin, msg.sender);
    }

    function removeVillageAdmin(address _admin) external onlyOwner {
        require(_admin != owner, "Cannot remove owner");
        villageAdmins[_admin] = false;
    }

    function authorizeVoter(address _voter) external onlyAdmin {
        authorizedVoters[_voter] = true;
        emit VoterAuthorized(_voter, msg.sender);
    }

    function revokeVoter(address _voter) external onlyAdmin {
        require(_voter != owner, "Cannot revoke owner");
        authorizedVoters[_voter] = false;
        emit VoterRevoked(_voter, msg.sender);
    }

    function createSuggestion(
        uint256 _externalId,
        string memory _title,
        string memory _content
    ) external onlyAdmin returns (uint256) {
        suggestionCount++;

        Suggestion storage newSuggestion = suggestions[suggestionCount];
        newSuggestion.id = _externalId;
        newSuggestion.title = _title;
        newSuggestion.content = _content;
        newSuggestion.submitter = msg.sender;
        newSuggestion.createdAt = block.timestamp;
        newSuggestion.isActive = true;

        emit SuggestionCreated(suggestionCount, _title, msg.sender, block.timestamp);

        return suggestionCount;
    }

    function vote(uint256 _suggestionId, VoteType _voteType)
        external
        onlyAuthorizedVoter
        suggestionExists(_suggestionId)
    {
        require(_voteType == VoteType.SUPPORT || _voteType == VoteType.OPPOSE, "Invalid vote type");
        require(suggestions[_suggestionId].isActive, "Suggestion is not active");

        Suggestion storage suggestion = suggestions[_suggestionId];

        // 如果用户已经投过票，需要先撤销之前的投票
        if (suggestion.hasVoted[msg.sender]) {
            VoteType previousVote = suggestion.votes[msg.sender];
            if (previousVote == VoteType.SUPPORT) {
                suggestion.supportVotes--;
            } else if (previousVote == VoteType.OPPOSE) {
                suggestion.opposeVotes--;
            }
        } else {
            suggestion.hasVoted[msg.sender] = true;
            totalVotes++;
        }

        // 记录新投票
        suggestion.votes[msg.sender] = _voteType;
        if (_voteType == VoteType.SUPPORT) {
            suggestion.supportVotes++;
        } else {
            suggestion.opposeVotes++;
        }

        // 创建投票记录
        bytes32 recordHash = keccak256(abi.encodePacked(
            _suggestionId,
            msg.sender,
            _voteType,
            block.timestamp,
            block.number
        ));

        voteRecords[recordHash] = VoteRecord({
            suggestionId: _suggestionId,
            voter: msg.sender,
            voteType: _voteType,
            timestamp: block.timestamp,
            transactionHash: recordHash
        });

        emit VoteCast(_suggestionId, msg.sender, _voteType, block.timestamp, recordHash);
    }

    function closeSuggestion(uint256 _suggestionId)
        external
        onlyAdmin
        suggestionExists(_suggestionId)
    {
        suggestions[_suggestionId].isActive = false;
    }

    function getSuggestionDetails(uint256 _suggestionId)
        external
        view
        suggestionExists(_suggestionId)
        returns (
            uint256 id,
            string memory title,
            string memory content,
            address submitter,
            uint256 createdAt,
            uint256 supportVotes,
            uint256 opposeVotes,
            bool isActive
        )
    {
        Suggestion storage suggestion = suggestions[_suggestionId];
        return (
            suggestion.id,
            suggestion.title,
            suggestion.content,
            suggestion.submitter,
            suggestion.createdAt,
            suggestion.supportVotes,
            suggestion.opposeVotes,
            suggestion.isActive
        );
    }

    function getVoteRecord(bytes32 _recordHash)
        external
        view
        returns (
            uint256 suggestionId,
            address voter,
            VoteType voteType,
            uint256 timestamp,
            bytes32 transactionHash
        )
    {
        VoteRecord storage record = voteRecords[_recordHash];
        return (
            record.suggestionId,
            record.voter,
            record.voteType,
            record.timestamp,
            record.transactionHash
        );
    }

    function hasUserVoted(uint256 _suggestionId, address _user)
        external
        view
        suggestionExists(_suggestionId)
        returns (bool, VoteType)
    {
        Suggestion storage suggestion = suggestions[_suggestionId];
        return (suggestion.hasVoted[_user], suggestion.votes[_user]);
    }

    function getVotingStats()
        external
        view
        returns (
            uint256 totalSuggestions,
            uint256 totalVotesCast,
            uint256 authorizedVotersCount
        )
    {
        // 注意：authorizedVotersCount 需要在实际实现中维护一个计数器
        return (suggestionCount, totalVotes, 0);
    }

    // 批量获取建议信息（用于前端展示）
    function getSuggestionsBatch(uint256 _offset, uint256 _limit)
        external
        view
        returns (
            uint256[] memory ids,
            string[] memory titles,
            uint256[] memory supportVotes,
            uint256[] memory opposeVotes,
            bool[] memory isActiveList
        )
    {
        require(_limit <= 50, "Limit too high"); // 防止gas消耗过大

        uint256 end = _offset + _limit;
        if (end > suggestionCount) {
            end = suggestionCount;
        }

        uint256 resultLength = end > _offset ? end - _offset : 0;

        ids = new uint256[](resultLength);
        titles = new string[](resultLength);
        supportVotes = new uint256[](resultLength);
        opposeVotes = new uint256[](resultLength);
        isActiveList = new bool[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            uint256 suggestionId = _offset + i + 1;
            Suggestion storage suggestion = suggestions[suggestionId];

            ids[i] = suggestion.id;
            titles[i] = suggestion.title;
            supportVotes[i] = suggestion.supportVotes;
            opposeVotes[i] = suggestion.opposeVotes;
            isActiveList[i] = suggestion.isActive;
        }
    }

    // 验证投票记录的完整性
    function verifyVoteRecord(
        uint256 _suggestionId,
        address _voter,
        VoteType _voteType,
        uint256 _timestamp,
        bytes32 _expectedHash
    ) external pure returns (bool) {
        bytes32 computedHash = keccak256(abi.encodePacked(
            _suggestionId,
            _voter,
            _voteType,
            _timestamp
        ));
        return computedHash == _expectedHash;
    }
}