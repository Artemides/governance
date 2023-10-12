import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { developmentChains } from "../hardhat.helper";
import { crowdfundingSol } from "../typechain-types/contracts";
import { Crowfunding } from "../typechain-types";
import { Address } from "hardhat-deploy/dist/types";
import { assert, expect } from "chai";

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("role-bases crowdfunding", () => {
      let deployer: Address;
      let crowfunding: Crowfunding;
      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        crowfunding = await ethers.getContract("Crowfunding", deployer);
      });

      it("should define a backer role", async () => {
        const backerRole = await crowfunding.BACKER();
        expect(backerRole).to.be.not.empty(backerRole);
      });
    });
