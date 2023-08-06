import { ethers } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const governor = async (hre: HardhatRuntimeEnvironment) => {
  const {
    getNamedAccounts,
    deployments: { deploy },
  } = hre;
  const { deployer } = await getNamedAccounts();

  const myTokenArgs: any[] = [];
  const myGovernorArgs: any[] = [];
  const transactionCount = await ethers.provider.getTransactionCount(deployer);

  console.log({ transactionCount });

  const tokenAddress = ethers.getCreateAddress({
    from: deployer,
    nonce: transactionCount + 1,
  });

  console.log({ tokenAddress });
  myGovernorArgs.push(tokenAddress);
  const governor = await deploy("MyGovernor", {
    from: deployer,
    log: true,
    args: myGovernorArgs,
    gasLimit: 3e7,
  });

  myTokenArgs.push(governor.address);

  const gimnastiky = await deploy("Gimnastiky", {
    from: deployer,
    log: true,
    args: myTokenArgs,
  });

  console.log(
    `future ${tokenAddress} \n governor ${governor.address} \n gimnastiky${gimnastiky.address}`
  );
};

export default governor;
governor.tags = ["all", "governor"];
