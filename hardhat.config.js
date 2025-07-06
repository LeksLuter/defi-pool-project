require("@nomiclabs/hardhat-waffle");
require("dotenv").config(); // <-- Добавьте эту строку

module.exports = {
  solidity: "0.8.17",
  networks: {
    amoy: {
      url: process.env.ALCHEMY_POLYGON_AMOY_URL || "https://polygon-amoy.g.alchemy.com/v2/YOUR_ALCHEMY_KEY ",
      accounts: [process.env.PRIVATE_KEY],
    },
    polygon: {
      url: process.env.ALCHEMY_POLYGON_MAINNET_URL || "https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY ",
      accounts: [process.env.PRIVATE_KEY],
    }
  }
};