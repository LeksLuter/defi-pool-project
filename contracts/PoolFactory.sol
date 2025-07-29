// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./LiquidityPool.sol";

contract PoolFactory {
    address public owner;
    address[] public allPools;
    
    // Структура для хранения пар токенов
    struct TokenPair {
        address token0;
        address token1;
    }
    
    // Маппинг для быстрой проверки существующих пулов
    // Используем упорядоченные адреса для ключа, чтобы избежать дубликатов (tokenA-tokenB и tokenB-tokenA)
    mapping(bytes32 => address) public getPool; 
    
    event PoolCreated(address indexed token0, address indexed token1, address pool, uint256 feeRate);

    constructor() {
        owner = msg.sender;
    }

    // Модификатор для функций, доступных только владельцу
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // Функция создания пула теперь доступна всем
    function createPool(
        address token0,
        address token1,
        uint256 feeRate
    ) external returns (address) {
        require(token0 != address(0) && token1 != address(0), "Zero address");
        require(token0 != token1, "Same tokens");
        require(feeRate > 0 && feeRate <= 1000, "Invalid fee rate"); // 0.01% to 10%
        
        // Создаем упорядоченную пару токенов для ключа
        (address tokenA, address tokenB) = token0 < token1 ? (token0, token1) : (token1, token0);
        bytes32 pairKey = keccak256(abi.encodePacked(tokenA, tokenB, feeRate));
        
        // Проверяем, существует ли уже пул с такой парой токенов и комиссией
        require(getPool[pairKey] == address(0), "Pool already exists");
        
        LiquidityPool newPool = new LiquidityPool(token0, token1, feeRate);
        allPools.push(address(newPool));
        getPool[pairKey] = address(newPool);
        
        emit PoolCreated(token0, token1, address(newPool), feeRate);
        return address(newPool);
    }

    function getPools() external view returns (address[] memory) {
        return allPools;
    }
    
    // Функция для проверки существования пула (может быть полезна для фронтенда)
    function poolExists(address token0, address token1, uint256 feeRate) external view returns (bool) {
        (address tokenA, address tokenB) = token0 < token1 ? (token0, token1) : (token1, token0);
        bytes32 pairKey = keccak256(abi.encodePacked(tokenA, tokenB, feeRate));
        return getPool[pairKey] != address(0);
    }
}