import { ethers, network } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { developmentChains } from "../hardhat.helper";
import { verify } from "../utils/verify";

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

const governor = async (hre: HardhatRuntimeEnvironment) => {
  const {
    getNamedAccounts,
    deployments: { deploy },
  } = hre;
  const { deployer } = await getNamedAccounts();

  const myTokenArgs: any[] = [];
  const myGovernorArgs: any[] = [];
  const transactionCount = await ethers.provider.getTransactionCount(deployer);

  const _governorAddress = ethers.getCreateAddress({
    from: deployer,
    nonce: transactionCount + 1,
  });

  console.log({ _governorAddress });

  myTokenArgs.push(_governorAddress);

  const gimnastiky = await deploy("Gimnastiky", {
    from: deployer,
    log: true,
    args: myTokenArgs,
  });
  myGovernorArgs.push(gimnastiky.address);

  const governor = await deploy("MyGovernor", {
    from: deployer,
    args: myGovernorArgs,
    log: true,
    // gasLimit: 3e7,
  });

  console.log(
    `future ${_governorAddress} \n governor ${governor.address} \n gimnastiky${gimnastiky.address}`
  );

  if (!isDevelopmentChain()) {
    await verify(gimnastiky.address, myTokenArgs);
    await verify(_governorAddress, myGovernorArgs);
  }
};

const isDevelopmentChain = (): boolean => {
  return developmentChains.includes(network.name) && ETHERSCAN_API_KEY != "";
};

export default governor;
governor.tags = ["all", "governor"];
