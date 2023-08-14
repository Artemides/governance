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
};

export default governor;
governor.tags = ["all", "governor"];
