const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LiquidityPool", function () {
  let owner, user, pool;

  beforeEach(async () => {
    [owner, user] = await ethers.getSigners();
    const Pool = await ethers.getContractFactory("LiquidityPool");
    pool = await Pool.deploy(owner.address);
  });

  it("Should add liquidity", async function () {
    await pool.addLiquidity(100, 100, 980000, 1020000, 30);
    const reserves = await pool.getReserves();
    expect(reserves[0]).to.equal(100);
  });
});