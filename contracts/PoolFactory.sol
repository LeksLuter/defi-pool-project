// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./LiquidityPool.sol";

contract PoolFactory {
    address public owner;
    address[] public allPools;

    event PoolCreated(address indexed token0, address indexed token1, address pool);

    constructor() {
        owner = msg.sender;
    }

    function createPool(
        address token0,
        address token1,
        uint256 feeRate
    ) external returns (address) {
        require(msg.sender == owner, "Only owner can create pools");

        LiquidityPool newPool = new LiquidityPool(token0, token1, feeRate);
        allPools.push(address(newPool));

        emit PoolCreated(token0, token1, address(newPool));
        return address(newPool);
    }

    function getPools() external view returns (address[] memory) {
        return allPools;
    }
}