const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LiquidityPool", function () {
  let owner, user, pool, factory;

  beforeEach(async () => {
    [owner, user] = await ethers.getSigners();

    // Деплой фабрики пулов
    const PoolFactory = await ethers.getContractFactory("PoolFactory");
    factory = await PoolFactory.deploy();
    await factory.deployed();

    // Создание пула с токенами и комиссией
    const tokenA = ethers.constants.AddressZero; // Заглушка для токена A
    const tokenB = ethers.constants.AddressZero; // Заглушка для токена B
    const feeRate = 30; // 0.3%

    const tx = await factory.createPool(tokenA, tokenB, feeRate);
    const receipt = await tx.wait();
    const poolAddress = receipt.events[0].args.pool;

    // Подключение к созданному пулу
    pool = await ethers.getContractAt("LiquidityPool", poolAddress);
  });

  it("Should add liquidity with 0.1 tokens", async function () {
    const amount0 = ethers.utils.parseUnits("0.1", 18); // 0.1 токена A
    const amount1 = ethers.utils.parseUnits("0.1", 18); // 0.1 токена B
    const lowerSqrtPrice = 980000;
    const upperSqrtPrice = 1020000;

    await pool.addLiquidity(amount0, amount1, lowerSqrtPrice, upperSqrtPrice);

    const reserves = await pool.getReserves();
    expect(reserves[0]).to.equal(amount0);
    expect(reserves[1]).to.equal(amount1);
  });

  it("Should NOT allow non-owner to remove liquidity", async function () {
    const amount0 = ethers.utils.parseUnits("0.1", 18);
    const amount1 = ethers.utils.parseUnits("0.1", 18);
    const lowerSqrtPrice = 980000;
    const upperSqrtPrice = 1020000;

    await pool.addLiquidity(amount0, amount1, lowerSqrtPrice, upperSqrtPrice);
    const tokenId = 0;

    await expect(pool.connect(user).removeLiquidity(tokenId))
      .to.be.revertedWith("Only owner can remove liquidity");
  });
});