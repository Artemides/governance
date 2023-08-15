import { ethers } from "hardhat";
import { address as governorAddress } from "../deployments/sepolia/MyGovernor.json";
import { address as tokenAddress } from "../deployments/sepolia/Gimnastiky.json";
import { EventLog, keccak256, parseEther, toUtf8Bytes } from "ethers";

const METAMASK_PK = process.env.METAMASK_PK || "";

const executeProposal = async () => {
  const governor = await ethers.getContractAt("MyGovernor", governorAddress);
  const token = await ethers.getContractAt("Gimnastiky", tokenAddress);
  const wallet = new ethers.Wallet(METAMASK_PK, ethers.provider);
  try {
    const tx = await governor.execute(
      [tokenAddress],
      [0],
      [
        token.interface.encodeFunctionData("mint", [
          wallet.address,
          parseEther("1000"),
        ]),
      ],
      keccak256(toUtf8Bytes("Give more voting weight to owner"))
    );

    const txReceipt = await tx.wait();
    const events = txReceipt?.logs as EventLog[];
    const event = events.find((e) => e.eventName === "ProposalExecuted")!;
    const [proposalId] = event.args;
    if (proposalId) return console.log("Proposal Executed");

    return console.error("Error Executing Proposal...");
  } catch (error) {
    console.error(error);
  }
};

executeProposal();
