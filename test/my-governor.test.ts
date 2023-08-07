import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { developmentChains } from "../hardhat.helper";
import { Gimnastiky, MyGovernor } from "../typechain-types";
import { assert } from "chai";
import { Signer, parseEther } from "ethers";

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("My Governor", () => {
      let deployerAddrs;
      let deployer: Signer;
      let governor: MyGovernor;
      let token: Gimnastiky;
      beforeEach(async () => {
        deployerAddrs = (await getNamedAccounts()).deployer;
        deployer = await ethers.getSigner(deployerAddrs);
        await deployments.fixture(["governor"]);
        token = await ethers.getContract("Gimnastiky", deployerAddrs);
        const governorFactory = await ethers.getContractFactory("MyGovernor");
        governor = await governorFactory.deploy(await token.getAddress());

        await token.delegate(deployerAddrs);
      });
      it("Delegates 10000 tokens to the owner", async () => {
        const ownerBalance = await token.balanceOf(deployer);
        assert.equal(ownerBalance.toString(), parseEther("1000").toString());
      });
    });
