require("@nomiclabs/hardhat-waffle");
require("dotenv").config();

module.exports = {
  solidity: "0.8.17",
  networks: {
    polygon: {
      url: process.env.ALCHEMY_POLYGON_MAINNET_URL,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};