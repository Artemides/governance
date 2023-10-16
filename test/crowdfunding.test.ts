import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { developmentChains } from "../hardhat.helper";
import { Crowdfunding } from "../typechain-types";
import { Address } from "hardhat-deploy/dist/types";
import { assert, expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { calculateTransactionCost } from "../utils/transactions";
!developmentChains.includes(network.name)
  ? describe.skip
  : describe("role-based crowdfunding", () => {
      let deployer: Address;
      let accounts: HardhatEthersSigner[];
      let crowdfunding: Crowdfunding;
      beforeEach(async () => {
        await deployments.fixture(["crowdfunding"]);
        accounts = (await ethers.getSigners()).filter(
          (signer) => signer.address !== deployer
        );
        deployer = (await getNamedAccounts()).deployer;
        crowdfunding = await ethers.getContract("Crowdfunding", deployer);
      });

      it("should define a backer role", async () => {
        const backerRole = await crowdfunding.BACKER();
        assert.isNotEmpty(backerRole);
      });

      it("should set the deployer as admin", async () => {
        const defaultAdminRole = await crowdfunding.DEFAULT_ADMIN_ROLE();
        const isAdmin = await crowdfunding.hasRole(defaultAdminRole, deployer);
        assert.isTrue(isAdmin);
      });
      describe("Backer actions", () => {
        it("shouldn't allow a non admin account to add a new backer", async () => {
          const [baker1, baker2] = accounts;
          const addBacker = crowdfunding
            .connect(baker1)
            .addBacker(baker2.address);

          await expect(addBacker).to.be.reverted;
        });

        it("allows to add a new Backer to an admin account", async () => {
          const [backer] = accounts;
          const addBacker = crowdfunding.addBacker(backer.address);
          await expect(addBacker).to.emit(crowdfunding, "RoleGranted");
        });

        it("allows to remove a Backer to an admin account", async () => {
          const [backer] = accounts;
          await crowdfunding.addBacker(backer);
          const removeBacker = crowdfunding.removeBacker(backer.address);
          await expect(removeBacker).to.emit(crowdfunding, "RoleRevoked");
        });

        it("ignores removing a non backer address", async () => {
          const [backer] = accounts;
          const removeBacker = crowdfunding.removeBacker(backer.address);
          expect(await removeBacker).to.be.ok;
        });

        it("reverts by removing with a non admin account", async () => {
          const [baker1, baker2] = accounts;
          const defaultAdminRole = await crowdfunding.DEFAULT_ADMIN_ROLE();
          const addBacker = crowdfunding
            .connect(baker1)
            .removeBacker(baker2.address);

          const custumErr = `AccesControl: account ${baker1.address.toLowerCase()} is missing role ${defaultAdminRole}`;
          await expect(addBacker).to.be.revertedWith(custumErr);
        });
      });

      describe("campaign ownership", () => {
        let currentCampaignOwner: string;
        let campaignOwner: HardhatEthersSigner,
          anyAccount: HardhatEthersSigner,
          anotherOwner: HardhatEthersSigner;
        beforeEach(async () => {
          [campaignOwner, anyAccount, anotherOwner] = accounts;

          await crowdfunding.setCampaignOwner(campaignOwner);
          currentCampaignOwner = await crowdfunding._campaignOwner();
        });

        it("only allows the admin to set the campaign owner", async () => {
          const setCampaignOwnerByAny = crowdfunding
            .connect(anyAccount)
            .setCampaignOwner(campaignOwner);

          await expect(setCampaignOwnerByAny).to.be.reverted;
          assert.equal(currentCampaignOwner, campaignOwner.address);
        });

        it("updates an already campaign owner set account", async () => {
          if (currentCampaignOwner === "") {
            assert.fail("capaign owner hasn't been already set");
          }
          await crowdfunding.setCampaignOwner(anotherOwner);
          currentCampaignOwner = await crowdfunding._campaignOwner();
          assert.equal(currentCampaignOwner, anotherOwner.address);
        });
      });
      describe("Contribute and Withdraw funds", () => {
        it("doesn't allow non-backer accounts to contribute", async () => {
          const [account] = accounts;
          const FUND_ETH = ethers.parseEther("1");
          const backerRole = await crowdfunding.BACKER();
          const contribute = crowdfunding
            .connect(account)
            .contribute({ value: FUND_ETH });
          const customErr = `AccesControl: account ${account.address.toLocaleLowerCase()} is missing role ${backerRole}`;
          await expect(contribute).to.be.revertedWith(customErr);
        });

        it("requires ether to be sent", async () => {
          const [account] = accounts;
          const contribute = crowdfunding.connect(account).contribute();
          await expect(contribute).to.be.reverted;
        });

        it("doesn't allow to contribute 0 eth", async () => {
          const [backer] = accounts;
          await crowdfunding.addBacker(backer);
          const FUND_ETH = ethers.parseEther("0");
          const contribute = crowdfunding
            .connect(backer)
            .contribute({ value: FUND_ETH });
          await expect(contribute).to.be.revertedWith(
            "Cannot contrinute 0 Eth"
          );
        });
        it("allows to contribute to a backer more than 0 eth", async () => {
          const [backer] = accounts;
          await crowdfunding.addBacker(backer);
          const FUND_ETH = ethers.parseEther("0.025");
          const contribute = crowdfunding
            .connect(backer)
            .contribute({ value: FUND_ETH });
          await expect(contribute).to.emit(crowdfunding, "FundsContributed");
        });

        it("allows to withdraw only to the campaign owner", async () => {
          const [backer, campaignOwner] = accounts;
          await crowdfunding.addBacker(backer);
          await crowdfunding.setCampaignOwner(campaignOwner);
          const FUND_ETH = ethers.parseEther("0.025");
          await crowdfunding.connect(backer).contribute({ value: FUND_ETH });

          //Any Account withdrawing
          const withdrawByAny = crowdfunding.withdraw();
          const err = "Only the Campaign owner can withdraw funds";

          //Campaign owner address withdrawing

          //initial balances
          const campaignOwnerBalance = await ethers.provider.getBalance(
            campaignOwner.address
          );
          const crowdfundingAddress = await crowdfunding.getAddress();
          const crowdfundingBalance = await ethers.provider.getBalance(
            crowdfundingAddress
          );

          //perform tx
          const tx = await crowdfunding.connect(campaignOwner).withdraw();
          const txReceipt = await tx.wait(1);

          //final balances
          const campaignOwnerBalanceAfter = await ethers.provider.getBalance(
            campaignOwner.address
          );
          const txCost = calculateTransactionCost(txReceipt);
          const ownerBalanceAfterTx =
            campaignOwnerBalance + crowdfundingBalance - txCost;

          //assertion
          await expect(withdrawByAny).to.be.revertedWith(err);
          assert.equal(campaignOwnerBalanceAfter, ownerBalanceAfterTx);
          expect(tx).to.emit(crowdfunding, "FundsWithdrawn");
        });
      });
    });
