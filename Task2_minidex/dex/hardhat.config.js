require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

const deployerKey = process.env.PRIVATE_KEY;
const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL;
const validDeployerKey = deployerKey && /^0x[0-9a-fA-F]{64}$/.test(deployerKey)
  ? [deployerKey]
  : [];

module.exports = {
  solidity: "0.8.24",
  networks: {
    localhost: {
      type: "http",
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      type: "http",
      url: sepoliaRpcUrl,
      accounts: validDeployerKey,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
