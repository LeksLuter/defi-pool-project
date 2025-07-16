const hre = require("hardhat");

async function main() {
  const TokenVault = await hre.ethers.getContractFactory("TokenVault");
  const tokenVault = await TokenVault.deploy();
  await tokenVault.deployed();

  console.log("TokenVault deployed to:", tokenVault.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});