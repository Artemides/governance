import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { developmentChains } from "../hardhat.helper";
import { Gimnastiky, MyGovernor } from "../typechain-types";
import { assert } from "chai";
import {
  EventLog,
  Result,
  Signer,
  keccak256,
  parseEther,
  toUtf8Bytes,
} from "ethers";
import { Address } from "hardhat-deploy/dist/types";

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("My Governor", () => {
      let deployerAddrs: Address;
      let deployer: Signer;
      let governor: MyGovernor;
      let token: Gimnastiky;
      let tokenAddress: Address;
      beforeEach(async () => {
        deployerAddrs = (await getNamedAccounts()).deployer;
        deployer = await ethers.getSigner(deployerAddrs);
        await deployments.fixture(["governor"]);
        token = await ethers.getContract("Gimnastiky", deployerAddrs);
        tokenAddress = await token.getAddress();
        governor = await ethers.getContract("MyGovernor", deployerAddrs);

        await token.delegate(deployerAddrs);
      });
      it("Delegates 1000 tokens to the owner", async () => {
        const ownerBalance = await token.balanceOf(deployer);
        assert.equal(ownerBalance.toString(), parseEther("1000").toString());
      });

      describe("Proposal Submition on Governance", async () => {
        let proposalId: bigint;
        beforeEach(async () => {
          const tx = await governor.propose(
            [tokenAddress],
            [0],
            [
              token.interface.encodeFunctionData("mint", [
                deployerAddrs,
                parseEther("2000"),
              ]),
            ],
            "Give the owner more token"
          );

          const txReceipt = await tx.wait();
          const events = txReceipt?.logs as EventLog[];
          const event = events.find((e) => e.eventName === "ProposalCreated")!;
          proposalId = event.args.proposalId;

          await network.provider.send("evm_mine");
        });

        it("Sets a new Proposal as Pending State", async () => {
          const proposalState = await governor.state(proposalId);
          assert.equal(proposalState, BigInt(0));
        });

        describe("After voting on a proposal", () => {
          let VoteCastEvent: Result;
          beforeEach(async () => {
            const tx = await governor.castVote(proposalId, 1);
            const txReceipt = await tx.wait();
            const events = txReceipt?.logs as EventLog[];
            const event = events.find((e) => e.eventName === "VoteCast")!;
            VoteCastEvent = event.args;

            await network.provider.send("evm_mine");
          });

          it("submits the deployer's vote correctly", async () => {
            const [account, , , weight] = VoteCastEvent;
            assert.equal(account, deployerAddrs);
            assert.equal(weight, parseEther("1000").toString());
          });

          it("Allows a proposal execution", async () => {
            await governor.execute(
              [tokenAddress],
              [0],
              [
                token.interface.encodeFunctionData("mint", [
                  deployerAddrs,
                  parseEther("2000"),
                ]),
              ],
              keccak256(toUtf8Bytes("Give the owner more token"))
            );

            const deployerBalance = await token.balanceOf(deployer);

            assert.equal(deployerBalance, parseEther("3000"));
          });
        });
      });
    });
