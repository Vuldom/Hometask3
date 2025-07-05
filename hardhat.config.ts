import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-gas-reporter";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  gasReporter: {
    enabled: true,
    outputFile: "gas-report.txt",
    noColors: true,
    currency: "USD",
    token: "ETH",
    gasPriceApi: "https://api.etherscan.io/api?module=proxy&action=eth_gasPrice",
    showMethodSig: true
  }
};

export default config;
