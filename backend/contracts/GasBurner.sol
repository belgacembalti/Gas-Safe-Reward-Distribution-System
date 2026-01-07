// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GasBurner
 * @dev Additional contract for demonstrating gas griefing attacks
 * @notice This contract intentionally wastes gas in various ways
 */
contract GasBurner {
    address public owner;
    uint256 public counter;
    mapping(uint256 => uint256) public storage_map;
    
    event GasBurned(uint256 gasUsed);
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Fallback that performs expensive storage operations
     */
    fallback() external payable {
        uint256 gasBefore = gasleft();
        
        // Expensive storage writes
        for (uint256 i = 0; i < 50; i++) {
            storage_map[counter + i] = block.timestamp;
        }
        
        counter += 50;
        
        uint256 gasUsed = gasBefore - gasleft();
        emit GasBurned(gasUsed);
        
        // Still revert to block distribution
        revert("Gas griefing attack");
    }
    
    receive() external payable {
        // Delegate to fallback
        this.burnGas();
    }
    
    /**
     * @dev Publicly callable function to burn gas
     */
    function burnGas() external payable {
        for (uint256 i = 0; i < 100; i++) {
            storage_map[i] = block.number;
        }
        counter++;
    }
    
    /**
     * @dev Withdraw funds
     */
    function withdraw() external {
        require(msg.sender == owner, "Only owner");
        payable(owner).transfer(address(this).balance);
    }
}
