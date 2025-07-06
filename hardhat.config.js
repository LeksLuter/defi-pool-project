require("@nomiclabs/hardhat-waffle");

module.exports = {
  solidity: "0.8.17",
  networks: {
    amoy: {
      url: process.env.ALCHEMY_POLYGON_AMOY_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
    polygon: {
      url: process.env.ALCHEMY_POLYGON_MAINNET_URL,
      accounts: [process.env.PRIVATE_KEY],
    }
  }
};