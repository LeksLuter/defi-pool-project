// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract LiquidityPool is ERC721Enumerable {
    using SafeERC20 for IERC20;

    address public immutable token0;
    address public immutable token1;
    uint256 public immutable feeRate; // 0.3% = 30, 1% = 100

    uint256 public reserve0;
    uint256 public reserve1;

    struct Position {
        uint256 lowerSqrtPrice;
        uint256 upperSqrtPrice;
        uint256 liquidity0;
        uint256 liquidity1;
        uint256 collectedFee0;
        uint256 collectedFee1;
        address owner;
    }

    Position[] public positions;
    uint256 private _tokenIdCounter;

    event LiquidityAdded(uint256 indexed tokenId, uint256 amount0, uint256 amount1);
    event LiquidityRemoved(uint256 indexed tokenId, uint256 amount0, uint256 amount1);
    event Swap(address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);

    constructor(
        address _token0,
        address _token1,
        uint256 _feeRate
    ) ERC721("LPToken", "LP-NFT") {
        token0 = _token0;
        token1 = _token1;
        feeRate = _feeRate;
    }

    function addLiquidity(
        uint256 amount0,
        uint256 amount1,
        uint256 lowerSqrtPrice,
        uint256 upperSqrtPrice
    ) external {
        require(amount0 > 0 && amount1 > 0, "Amounts must be > 0");
        require(lowerSqrtPrice < upperSqrtPrice, "Invalid price range");

        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1);

        reserve0 += amount0;
        reserve1 += amount1;

        uint256 tokenId = _tokenIdCounter++;
        positions.push(Position({
            lowerSqrtPrice: lowerSqrtPrice,
            upperSqrtPrice: upperSqrtPrice,
            liquidity0: amount0,
            liquidity1: amount1,
            collectedFee0: 0,
            collectedFee1: 0,
            owner: msg.sender
        }));
        _mint(msg.sender, tokenId);

        emit LiquidityAdded(tokenId, amount0, amount1);
    }

    function removeLiquidity(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "Only owner can remove liquidity");
        Position storage pos = positions[tokenId];

        reserve0 -= pos.liquidity0;
        reserve1 -= pos.liquidity1;

        IERC20(token0).safeTransfer(msg.sender, pos.liquidity0 + pos.collectedFee0);
        IERC20(token1).safeTransfer(msg.sender, pos.liquidity1 + pos.collectedFee1);

        _burn(tokenId);
        emit LiquidityRemoved(tokenId, pos.liquidity0, pos.liquidity1);
    }

    function swap(address tokenIn, uint256 amountIn) external {
        require(tokenIn == token0 || tokenIn == token1, "Invalid token");
        require(amountIn > 0, "Amount must be > 0");

        if (tokenIn == token0) {
            uint256 amountOut = (amountIn * reserve1) / reserve0;
            require(reserve1 >= amountOut, "Insufficient liquidity");

            IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
            IERC20(token1).safeTransfer(msg.sender, amountOut);

            reserve0 += amountIn;
            reserve1 -= amountOut;

            emit Swap(msg.sender, token0, token1, amountIn, amountOut);
        } else {
            uint256 amountOut = (amountIn * reserve0) / reserve1;
            require(reserve0 >= amountOut, "Insufficient liquidity");

            IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
            IERC20(token0).safeTransfer(msg.sender, amountOut);

            reserve1 += amountIn;
            reserve0 -= amountOut;

            emit Swap(msg.sender, token1, token0, amountIn, amountOut);
        }
    }

    function getReserves() external view returns (uint256, uint256) {
        return (reserve0, reserve1);
    }

    function getPosition(uint256 tokenId) external view returns (Position memory) {
        return positions[tokenId];
    }
}