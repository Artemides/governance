import { ethers } from "hardhat";
import { address as gimnastikyAddress } from "../deployments/sepolia/Gimnastiky.json";
import { address as governorAddress } from "../deployments/sepolia/MyGovernor.json";
import { EventLog, parseEther } from "ethers";

const METAMASK_PK = process.env.METAMASK_PK || "";

const submitProposal = async () => {
  const governor = await ethers.getContractAt("MyGovernor", governorAddress);
  const gimnastikyToken = await ethers.getContractAt(
    "Gimnastiky",
    gimnastikyAddress
  );
  const wallet = new ethers.Wallet(METAMASK_PK, ethers.provider);
  const deployer = wallet.address;
  const tx = await governor.propose(
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
  const txReceipt = await tx.wait();
  const events = txReceipt?.logs as EventLog[];
  const event = events.find((e) => e.eventName === "ProposalCreated")!;
  const proposalId = event.args.proposalId;
  console.log({ proposalId });
  //   77443489648007384882596267641259623077886761072278501135202454959560110631742n
};

submitProposal();
