import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { developmentChains } from "../hardhat.helper";
import { Crowfunding } from "../typechain-types";
import { Address } from "hardhat-deploy/dist/types";
import { assert, expect } from "chai";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
!developmentChains.includes(network.name)
  ? describe.skip
  : describe("role-bases crowdfunding", () => {
      let deployer: Address;
      let backers: HardhatEthersSigner[];
      let crowfunding: Crowfunding;
      beforeEach(async () => {
        await deployments.fixture(["crowfunding"]);
        backers = (await ethers.getSigners()).filter(
          (signer) => signer.address !== deployer
        );

        deployer = (await getNamedAccounts()).deployer;
        crowfunding = await ethers.getContract("Crowfunding", deployer);
      });

      it("should define a backer role", async () => {
        const backerRole = await crowfunding.BACKER();
        assert.isNotEmpty(backerRole);
      });

      it("should set the deployer as admin", async () => {
        const defaultAdminRole = await crowfunding.DEFAULT_ADMIN_ROLE();
        const isAdmin = await crowfunding.hasRole(defaultAdminRole, deployer);
        assert.isTrue(isAdmin);
      });
      describe("Backer actions", () => {
        it("shouldn't allow a non admin account to add a new backer", async () => {
          const [baker1, baker2] = backers;
          const addBacker = crowfunding
            .connect(baker1)
            .addBacker(baker2.address);

          expect(await addBacker).to.be.reverted;
        });

        it("allows to add a new Backer to an admin account", async () => {
          const [backer] = backers;
          const addBacker = crowfunding.addBacker(backer.address);
          await expect(addBacker).to.emit(crowfunding, "RoleGranted");
        });

        it("allows to remove a Backer to an admin account", async () => {
          const [backer] = backers;
          await crowfunding.addBacker(backer);
          const removeBacker = crowfunding.removeBacker(backer.address);
          await expect(removeBacker).to.emit(crowfunding, "RoleRevoked");
        });

        it("ignores removing a non backer address", async () => {
          const [backer] = backers;
          const removeBacker = crowfunding.removeBacker(backer.address);
          expect(await removeBacker).to.be.ok;
        });

        it("reverts by removing with a non admin account", async () => {
          const [baker1, baker2] = backers;
          const defaultAdminRole = await crowfunding.DEFAULT_ADMIN_ROLE();
          const addBacker = crowfunding
            .connect(baker1)
            .removeBacker(baker2.address);

          const custumErr = `AccesControl: account ${baker1.address.toLowerCase()} is missing role ${defaultAdminRole}`;
          expect(await addBacker).to.be.revertedWith(custumErr);
        });
      });
    });
