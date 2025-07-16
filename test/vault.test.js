const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenVault", function () {
  let owner, user, tokenVault, mockTokenA, mockTokenB;

  beforeEach(async () => {
    [owner, user] = await ethers.getSigners();

    // Деплой мок токена
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockTokenA = await MockToken.deploy("TokenA", "TKA", 100000);
    mockTokenB = await MockToken.deploy("TokenB", "TKB", 100000);
    await mockTokenA.deployed();
    await mockTokenB.deployed();

    // Деплой хранилища
    const Vault = await ethers.getContractFactory("TokenVault");
    tokenVault = await Vault.deploy();
    await tokenVault.deployed();

    // Выдать пользователю TKA
    await mockTokenA.transfer(user.address, ethers.utils.parseUnits("1000", 18));
  });

  it("Should allow deposit and withdraw of tokens", async function () {
    const amount = ethers.utils.parseUnits("0.1", 18);

    // Владелец депонирует токены
    await mockTokenA.connect(owner).approve(tokenVault.address, amount);
    await tokenVault.connect(owner).deposit(mockTokenA.address, amount);

    const depositId = 0;
    const deposit = await tokenVault.getDeposit(depositId);

    expect(deposit.amount).to.equal(amount);

    // Только владелец может вывести токены
    await tokenVault.connect(owner).withdraw(depositId);
    const updatedDeposit = await tokenVault.getDeposit(depositId);
    expect(updatedDeposit.amount).to.equal(0);
  });

  it("Should NOT allow non-depositor to withdraw", async function () {
    const amount = ethers.utils.parseUnits("0.1", 18);

    await mockTokenA.connect(owner).approve(tokenVault.address, amount);
    await tokenVault.connect(owner).deposit(mockTokenA.address, amount);

    const depositId = 0;

    await expect(tokenVault.connect(user).withdraw(depositId))
      .to.be.revertedWith("Only depositor can withdraw");
  });
});