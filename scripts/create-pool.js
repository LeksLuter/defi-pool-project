const hre = require("hardhat");

async function main() {
  const factoryAddress = "0xYourFactoryAddress";
  const PoolFactory = await hre.ethers.getContractFactory("PoolFactory");
  const poolFactory = PoolFactory.attach(factoryAddress);

  const token0 = "0xTokenA"; // USDC
  const token1 = "0xTokenB"; // DAI
  const feeRate = 30; // 0.3%

  const tx = await poolFactory.createPool(token0, token1, feeRate);
  const receipt = await tx.wait();
  const poolAddress = receipt.events[0].args.pool;
  console.log("Pool created at:", poolAddress);
}

main().catch(console.error);