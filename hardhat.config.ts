import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";
import "hardhat-deploy";

const SEPOLIA_URL = process.env.ALCHEMY_SEPOLIA_RPC_URL || "";
const METAMASK = process.env.METAMASK_PK || "";
const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      chainId: 11155111,
      url: SEPOLIA_URL,
      accounts: [METAMASK],
    },
  },
  solidity: {
    version: "0.8.19",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
};

export default config;
