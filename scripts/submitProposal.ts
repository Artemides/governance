import { ethers } from "hardhat";
import { address as gimnastikyAddress } from "../deployments/sepolia/Gimnastiky.json";
import { address as governorAddress } from "../deployments/sepolia/MyGovernor.json";
import { parseEther } from "ethers";

const METAMASK_PK = process.env.METAMASK_PK || "";

const submitProposal = async () => {
  const governor = await ethers.getContractAt("MyGovernor", governorAddress);
  const gimnastikyToken = await ethers.getContractAt(
    "Gimnastiky",
    gimnastikyAddress
  );
  const wallet = new ethers.Wallet(METAMASK_PK, ethers.provider);
  const deployer = wallet.address;
  await governor.propose(
    [gimnastikyAddress],
    [0],
    [
      gimnastikyToken.interface.encodeFunctionData("mint", [
        deployer,
        parseEther("1000"),
      ]),
    ],
    "Give more voting weight to owner"
  );
};

submitProposal();
