// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract TokenVault is ReentrancyGuard {
    using SafeMath for uint256;

    struct Deposit {
        address tokenAddress;
        uint256 amount;
        address depositor;
    }

    Deposit[] public deposits;
    mapping(address => uint256[]) private _depositorDeposits;

    event TokensDeposited(
        address indexed token,
        address indexed depositor,
        uint256 amount,
        uint256 depositId
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed depositor,
        uint256 amount,
        uint256 depositId
    );

    // Депозит токенов в хранилище
    function deposit(address tokenAddress, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount), "Transfer failed");

        uint256 depositId = deposits.length;
        deposits.push(Deposit({
            tokenAddress: tokenAddress,
            amount: amount,
            depositor: msg.sender
        }));

        _depositorDeposits[msg.sender].push(depositId);

        emit TokensDeposited(tokenAddress, msg.sender, amount, depositId);
    }

    // Вывод своих токенов из хранилища
    function withdraw(uint256 depositId) external nonReentrant {
        Deposit storage deposit = deposits[depositId];

        require(deposit.depositor == msg.sender, "Only depositor can withdraw");
        require(deposit.amount > 0, "Already withdrawn");

        IERC20(deposit.tokenAddress).transfer(msg.sender, deposit.amount);
        uint256 amount = deposit.amount;
        deposit.amount = 0;

        emit TokensWithdrawn(deposit.tokenAddress, msg.sender, amount, depositId);
    }

    // Получить список депозитов пользователя
    function getDepositsByUser(address user) external view returns (Deposit[] memory) {
        uint256[] storage ids = _depositorDeposits[user];
        Deposit[] memory userDeposits = new Deposit[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
            userDeposits[i] = deposits[ids[i]];
        }

        return userDeposits;
    }

    // Получить конкретный депозит
    function getDeposit(uint256 depositId) external view returns (Deposit memory) {
        return deposits[depositId];
    }
}