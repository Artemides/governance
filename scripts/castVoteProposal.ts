import { ethers } from "hardhat";
import { address as governorAddress } from "../deployments/sepolia/MyGovernor.json";
import { EventLog } from "ethers";
const PROPOSAL_ID: bigint =
  77443489648007384882596267641259623077886761072278501135202454959560110631742n;
const castVote = async () => {
  const governor = await ethers.getContractAt("MyGovernor", governorAddress);

  try {
    const tx = await governor.castVote(PROPOSAL_ID, 1);
    const txReceipt = await tx.wait();
    const events = txReceipt?.logs as EventLog[];
    const event = events.find((e) => e.eventName === "VoteCast")!;
    const [account, proposalId, support, weight] = event.args;
    console.log(
      `proposalId: ${proposalId}\nvoter: ${account}\nsupport: ${support}\n weight: ${weight}\n`
    );
  } catch (error) {
    console.error(error);
  }
};
castVote();
