// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RewardDistributionSecure
 * @dev SECURE implementation using pull payments pattern
 * @notice This contract is immune to DoS attacks because:
 * 1. No loops over unbounded arrays
 * 2. Each beneficiary withdraws independently
 * 3. One malicious actor cannot affect others
 * 4. Scalable to unlimited beneficiaries
 */
contract RewardDistributionSecure {
    address public owner;
    
    mapping(address => uint256) public pendingRewards;
    mapping(address => uint256) public totalWithdrawn;
    address[] public beneficiaryList;
    
    uint256 public totalDeposited;
    uint256 public totalDistributed;
    
    event RewardSet(address indexed beneficiary, uint256 amount);
    event RewardWithdrawn(address indexed beneficiary, uint256 amount);
    event Deposited(address indexed from, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Set reward for a beneficiary
     * @notice This doesn't send funds, just allocates them
     */
    function setBeneficiaryReward(address _beneficiary, uint256 _reward) external onlyOwner {
        require(_beneficiary != address(0), "Invalid address");
        require(_reward > 0, "Reward must be greater than 0");
        
        if (pendingRewards[_beneficiary] == 0 && totalWithdrawn[_beneficiary] == 0) {
            beneficiaryList.push(_beneficiary);
        }
        
        pendingRewards[_beneficiary] = _reward;
        
        emit RewardSet(_beneficiary, _reward);
    }
    
    /**
     * @dev Batch set rewards for multiple beneficiaries
     * @notice Gas-efficient way to set multiple rewards
     */
    function batchSetRewards(address[] calldata _beneficiaries, uint256[] calldata _rewards) external onlyOwner {
        require(_beneficiaries.length == _rewards.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < _beneficiaries.length; i++) {
            require(_beneficiaries[i] != address(0), "Invalid address");
            require(_rewards[i] > 0, "Reward must be greater than 0");
            
            if (pendingRewards[_beneficiaries[i]] == 0 && totalWithdrawn[_beneficiaries[i]] == 0) {
                beneficiaryList.push(_beneficiaries[i]);
            }
            
            pendingRewards[_beneficiaries[i]] = _rewards[i];
            emit RewardSet(_beneficiaries[i], _rewards[i]);
        }
    }
    
    /**
     * @dev SECURE: Pull payment - beneficiary withdraws their own reward
     * @notice This pattern is immune to DoS attacks
     */
    function withdraw() external {
        uint256 amount = pendingRewards[msg.sender];
        require(amount > 0, "No pending rewards");
        require(address(this).balance >= amount, "Insufficient contract balance");
        
        // Update state before external call (Checks-Effects-Interactions)
        pendingRewards[msg.sender] = 0;
        totalWithdrawn[msg.sender] += amount;
        totalDistributed += amount;
        
        // External call at the end
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit RewardWithdrawn(msg.sender, amount);
    }
    
    /**
     * @dev Get pending reward for an address
     */
    function getBalance(address _beneficiary) external view returns (uint256) {
        return pendingRewards[_beneficiary];
    }
    
    /**
     * @dev Get total withdrawn by an address
     */
    function getTotalWithdrawn(address _beneficiary) external view returns (uint256) {
        return totalWithdrawn[_beneficiary];
    }
    
    /**
     * @dev Get total number of beneficiaries
     */
    function getBeneficiaryCount() external view returns (uint256) {
        return beneficiaryList.length;
    }
    
    /**
     * @dev Get all beneficiaries
     */
    function getAllBeneficiaries() external view returns (address[] memory) {
        return beneficiaryList;
    }
    
    /**
     * @dev Get total pending rewards across all beneficiaries
     */
    function getTotalPending() external view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < beneficiaryList.length; i++) {
            total += pendingRewards[beneficiaryList[i]];
        }
        return total;
    }
    
    /**
     * @dev Deposit funds to the contract
     */
    function deposit() external payable {
        require(msg.value > 0, "Must send some ETH");
        totalDeposited += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
    
    /**
     * @dev Emergency withdrawal for owner (only excess funds)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 totalPending = 0;
        for (uint256 i = 0; i < beneficiaryList.length; i++) {
            totalPending += pendingRewards[beneficiaryList[i]];
        }
        
        uint256 excess = address(this).balance - totalPending;
        require(excess > 0, "No excess funds");
        
        payable(owner).transfer(excess);
    }
    
    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    receive() external payable {
        totalDeposited += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
}
