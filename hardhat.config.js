require("@nomiclabs/hardhat-waffle");

module.exports = {
  solidity: "0.8.17",
  networks: {
    mumbai: {
      url: "https://polygon-mumbai.g.alchemy.com/v2/YOUR_ALCHEMY_KEY ",
      accounts: [process.env.PRIVATE_KEY],
    },
    polygon: {
      url: "https://polygon-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY ",
      accounts: [process.env.PRIVATE_KEY],
    }
  }
};