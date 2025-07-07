const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LiquidityPool", function () {
  let owner, user, pool, factory;

  beforeEach(async () => {
    [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PoolFactory");
    factory = await Factory.deploy();
    const tx = await factory.createPool(ethers.constants.AddressZero, ethers.constants.AddressZero, 30);
    const receipt = await tx.wait();
    const poolAddress = receipt.events[0].args.pool;
    pool = await ethers.getContractAt("LiquidityPool", poolAddress);
  });

  it("Should add liquidity", async function () {
    await pool.addLiquidity(0,1, 0,1, 980000, 1020000);
    const reserves = await pool.getReserves();
    expect(reserves[0]).to.equal(0,1);
  });

  it("Should not allow non-owner to remove liquidity", async function () {
    await pool.addLiquidity(0,1, 0,1, 980000, 1020000);
    const tokenId = 0;

    await expect(pool.connect(user).removeLiquidity(tokenId)).to.be.revertedWith(
      "Only owner can remove liquidity"
    );
  });
});