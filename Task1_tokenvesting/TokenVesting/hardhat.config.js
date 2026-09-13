import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import "dotenv/config";

const deployerKey = process.env.PRIVATE_KEY;
export default {
  plugins: [hardhatToolboxMochaEthers],
  solidity: "0.8.34",
  networks: {
    localhost: {
      type: "http",
      url: "http://127.0.0.1:8545",
    },
    sepolia: {
      type: "http",
      url: process.env.RPC_URL,
      accounts: deployerKey && /^0x[0-9a-fA-F]{64}$/.test(deployerKey)
        ? [deployerKey]
        : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};