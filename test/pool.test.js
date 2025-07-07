const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LiquidityPool", function () {
  let owner, user, pool, factory;

  beforeEach(async () => {
    [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PoolFactory");
    factory = await Factory.deploy();
    await factory.deployed();

    const tokenA = ethers.constants.AddressZero;
    const tokenB = ethers.constants.AddressZero;
    const feeRate = 30;

    const tx = await factory.createPool(tokenA, tokenB, feeRate);
    const receipt = await tx.wait();
    const poolAddress = receipt.events[0].args.pool;

    pool = await ethers.getContractAt("LiquidityPool", poolAddress);
  });

  it("Should add liquidity", async function () {
    await pool.addLiquidity(100, 100, 980000, 1020000);
    const reserves = await pool.getReserves();
    expect(reserves[0]).to.equal(100);
  });

  it("Should not allow non-owner to remove liquidity", async function () {
    await pool.addLiquidity(100, 100, 980000, 1020000);
    const tokenId = 0;

    await expect(pool.connect(user).removeLiquidity(tokenId)).to.be.revertedWith(
      "Only owner can remove liquidity"
    );
  });
});