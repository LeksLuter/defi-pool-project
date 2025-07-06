const hre = require("hardhat");

async function main() {
  const factoryAddress = process.env.FACTORY_ADDRESS;
  const PoolFactory = await hre.ethers.getContractFactory("PoolFactory");
  const poolFactory = PoolFactory.attach(factoryAddress);

  const tokenA = process.env.TOKEN_A_ADDRESS;
  const tokenB = process.env.TOKEN_B_ADDRESS;
  const feeRate = 30; // 0.3%

  const tx = await poolFactory.createPool(tokenA, tokenB, feeRate);
  const receipt = await tx.wait();

  const poolAddress = receipt.events[0].args.pool;
  console.log("Pool created at:", poolAddress);
}

main().catch(console.error);