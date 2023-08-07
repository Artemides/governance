import { ethers } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const governor = async (hre: HardhatRuntimeEnvironment) => {
  const {
    getNamedAccounts,
    deployments: { deploy },
  } = hre;
  const { deployer } = await getNamedAccounts();

  const myTokenArgs: any[] = [];
  const transactionCount = await ethers.provider.getTransactionCount(deployer);

  console.log({ transactionCount });

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

  const governorFactory = await ethers.getContractFactory("MyGovernor");
  const governor = await governorFactory.deploy(gimnastiky.address);
  const governorAddress = await governor.getAddress();
  console.log(
    `future ${_governorAddress} \n governor ${governorAddress} \n gimnastiky${gimnastiky.address}`
  );
};

export default governor;
governor.tags = ["all", "governor"];
