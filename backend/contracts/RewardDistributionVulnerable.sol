// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RewardDistributionVulnerable
 * @dev VULNERABLE implementation using push payments pattern
 * @notice This contract demonstrates three critical vulnerabilities:
 * 1. Gas Limit DoS - Large beneficiary list causes transaction to exceed block gas limit
 * 2. Malicious Fallback DoS - A single malicious beneficiary can block entire distribution
 * 3. Gas Griefing - Beneficiaries can consume excessive gas to make distribution fail
 */
contract RewardDistributionVulnerable {
    address public owner;
    
    struct Beneficiary {
        uint256 reward;
        bool paid;
    }
    
    mapping(address => Beneficiary) public beneficiaries;
    address[] public beneficiaryList;
    
    event BeneficiaryAdded(address indexed beneficiary, uint256 reward);
    event RewardDistributed(address indexed beneficiary, uint256 amount);
    event DistributionFailed(address indexed beneficiary, string reason);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Add a beneficiary with their reward amount
     */
    function addBeneficiary(address _beneficiary, uint256 _reward) external onlyOwner {
        require(_beneficiary != address(0), "Invalid address");
        require(_reward > 0, "Reward must be greater than 0");
        
        if (beneficiaries[_beneficiary].reward == 0) {
            beneficiaryList.push(_beneficiary);
        }
        
        beneficiaries[_beneficiary].reward = _reward;
        beneficiaries[_beneficiary].paid = false;
        
        emit BeneficiaryAdded(_beneficiary, _reward);
    }
    
    /**
     * @dev VULNERABLE: Distribute rewards to all beneficiaries in a single transaction
     * @notice This function is vulnerable to:
     * - Gas limit DoS with large beneficiary lists
     * - Malicious fallback blocking entire distribution
     * - Gas griefing attacks
     */
    function distributeRewards() external payable onlyOwner {
        uint256 totalRequired = 0;
        
        // Calculate total required
        for (uint256 i = 0; i < beneficiaryList.length; i++) {
            address beneficiary = beneficiaryList[i];
            if (!beneficiaries[beneficiary].paid) {
                totalRequired += beneficiaries[beneficiary].reward;
            }
        }
        
        require(msg.value >= totalRequired, "Insufficient funds sent");
        
        // VULNERABLE: Loop through all beneficiaries
        // This can fail due to gas limit with large lists
        for (uint256 i = 0; i < beneficiaryList.length; i++) {
            address beneficiary = beneficiaryList[i];
            
            if (!beneficiaries[beneficiary].paid) {
                uint256 amount = beneficiaries[beneficiary].reward;
                
                // VULNERABLE: External call in loop
                // A malicious beneficiary can revert here and block everyone
                (bool success, ) = beneficiary.call{value: amount}("");
                
                if (success) {
                    beneficiaries[beneficiary].paid = true;
                    emit RewardDistributed(beneficiary, amount);
                } else {
                    // If one fails, entire transaction reverts
                    revert("Distribution failed for a beneficiary");
                }
            }
        }
    }
    
    /**
     * @dev Get total number of beneficiaries
     */
    function getBeneficiaryCount() external view returns (uint256) {
        return beneficiaryList.length;
    }
    
    /**
     * @dev Get beneficiary details
     */
    function getBeneficiary(address _beneficiary) external view returns (uint256 reward, bool paid) {
        return (beneficiaries[_beneficiary].reward, beneficiaries[_beneficiary].paid);
    }
    
    /**
     * @dev Get all beneficiaries (WARNING: can be expensive for large lists)
     */
    function getAllBeneficiaries() external view returns (address[] memory) {
        return beneficiaryList;
    }
    
    /**
     * @dev Emergency withdrawal for owner
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    receive() external payable {}
}
