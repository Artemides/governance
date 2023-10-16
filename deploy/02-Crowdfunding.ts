import { HardhatRuntimeEnvironment } from "hardhat/types";
import { developmentChains } from "../hardhat.helper";
import { network } from "hardhat";
import { verify } from "../utils/verify";

const crowdfundingDeployment = async (hre: HardhatRuntimeEnvironment) => {
  const {
    getNamedAccounts,
    deployments: { deploy },
  } = hre;

  const deployer = (await getNamedAccounts()).deployer;
  let args: any[] = [];

  const crowdfunding = await deploy("Crowdfunding", {
    from: deployer,
    args,
    log: true,
    waitConfirmations: 1,
  });

  if (!developmentChains.includes(network.name)) {
    verify(crowdfunding.address, args);
  }
};

export default crowdfundingDeployment;

crowdfundingDeployment.tags = ["all", "crowdfunding"];
