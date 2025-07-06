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

    // Создание пула с тестовыми токенами и фиксированной комиссией
    const tokenA = ethers.constants.AddressZero; // Заглушка
    const tokenB = ethers.constants.AddressZero; // Заглушка
    const feeRate = 30; // 0.3%

    const tx = await factory.createPool(tokenA, tokenB, feeRate);
    const receipt = await tx.wait();
    const poolAddress = receipt.events[0].args.pool;

    // Подключение к созданному пулу
    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    pool = LiquidityPool.attach(poolAddress);
  });

  it("Should add liquidity", async function () {
    // Пользователь добавляет ликвидность
    await pool.addLiquidity(100, 100, 980000, 1020000);

    // Проверяем резервы
    const reserves = await pool.getReserves();
    expect(reserves[0]).to.equal(100);
    expect(reserves[1]).to.equal(100);
  });
});