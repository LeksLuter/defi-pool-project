const hre = require("hardhat");

async function main() {
  const PoolFactory = await hre.ethers.getContractFactory("PoolFactory");
  const poolFactory = await PoolFactory.deploy();
  await poolFactory.deployed();
  console.log("PoolFactory deployed to:", poolFactory.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});