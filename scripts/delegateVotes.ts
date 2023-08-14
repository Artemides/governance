import { ethers } from "hardhat";
import { address } from "../deployments/sepolia/Gimnastiky.json";
const METAMASK_PK = process.env.METAMASK_PK || "";
const delegateVotes = async () => {
  const token = await ethers.getContractAt("Gimnastiky", address);
  const deployer = new ethers.Wallet(METAMASK_PK, ethers.provider);

  console.log("Delegate voting power to deployer");
  try {
    await token.delegate(deployer);
  } catch (error: any) {
    console.error(error.message);
  }
};

delegateVotes();
