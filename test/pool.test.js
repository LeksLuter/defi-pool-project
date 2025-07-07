const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LiquidityPool", function () {
  let owner, user, pool, factory;
  let TokenA, TokenB, tokenA, tokenB;

  beforeEach(async () => {
    [owner, user] = await ethers.getSigners();

    // Деплой фабрики пулов
    const PoolFactory = await ethers.getContractFactory("PoolFactory");
    factory = await PoolFactory.deploy();
    await factory.deployed();

    // Деплой тестовых токенов
    const TestToken = await ethers.getContractFactory("TestToken");
    TokenA = await TestToken.deploy("Token A", "TKNA", 18, ethers.parseUnits("1000", 18));
    TokenB = await TestToken.deploy("Token B", "TKNB", 18, ethers.parseUnits("1000", 18));

    await TokenA.waitForDeployment();
    await TokenB.waitForDeployment();

    const feeRate = 30; // 0.3%

    // Создание пула с реальными токенами
    const tx = await factory.createPool(await TokenA.getAddress(), await TokenB.getAddress(), feeRate);
    const receipt = await tx.wait();
    const poolAddress = receipt.events[0].args.pool;

    // Подключение к пулу
    pool = await ethers.getContractAt("LiquidityPool", poolAddress);

    // Нужно дать пользователю токены (через mint или transfer)
    await TokenA.transfer(user.address, ethers.parseUnits("100", 18));
    await TokenB.transfer(user.address, ethers.parseUnits("100", 18));
  });

  it("Should add liquidity", async function () {
    await TokenA.approve(pool.address, ethers.parseUnits("100", 18));
    await TokenB.approve(pool.address, ethers.parseUnits("100", 18));

    await pool.addLiquidity(
      ethers.parseUnits("100", 18),
      ethers.parseUnits("100", 18),
      980000,
      1020000
    );

    const reserves = await pool.getReserves();
    expect(reserves[0]).to.equal(ethers.parseUnits("100", 18));
    expect(reserves[1]).to.equal(ethers.parseUnits("100", 18));
  });

  it("Should not allow non-owner to remove liquidity", async function () {
    await TokenA.connect(user).approve(pool.address, ethers.parseUnits("100", 18));
    await TokenB.connect(user).approve(pool.address, ethers.parseUnits("100", 18));

    await pool.connect(user).addLiquidity(
      ethers.parseUnits("100", 18),
      ethers.parseUnits("100", 18),
      980000,
      1020000
    );

    const tokenId = 0;

    await expect(pool.connect(user).removeLiquidity(tokenId)).to.be.revertedWith(
      "Only owner can remove liquidity"
    );
  });
});