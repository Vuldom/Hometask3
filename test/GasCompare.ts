import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("Auctions Gas Compare", function () {

    async function deployContracts() {
        const accounts = await ethers.getSigners();
        const reservePrice = ethers.parseEther("1.0");
        
        const StandardAuction = await ethers.getContractFactory("Auction");
        const OptimizedAuction = await ethers.getContractFactory("OptimizedAuction");
        
        const standardAuction = await StandardAuction.deploy(reservePrice, accounts[1].address);
        await standardAuction.waitForDeployment();
        const optimizedAuction = await OptimizedAuction.deploy(reservePrice, accounts[1].address);
        await optimizedAuction.waitForDeployment();
        
        return { standardAuction, optimizedAuction, accounts, reservePrice};
    }

    it("Should compare deployment costs", async function () {
        const { standardAuction, optimizedAuction } = await loadFixture(deployContracts);
        
        const standardDeployReceipt = await standardAuction.deploymentTransaction()?.wait();
        const optimizedDeployReceipt = await optimizedAuction.deploymentTransaction()?.wait();

        console.log("\nDeployment Gas Costs:");
        console.log(`Standard: ${standardDeployReceipt?.gasUsed} gas`);
        console.log(`Optimized: ${optimizedDeployReceipt?.gasUsed} gas`);

        expect(optimizedDeployReceipt?.gasUsed).to.be.lessThan(standardDeployReceipt?.gasUsed);
    });

    it("Should compare bid() operation", async function () {
        const { standardAuction, optimizedAuction, accounts } = await loadFixture(deployContracts);
        const bidAmount = ethers.parseEther("1.5");
        
        const tx1 = await standardAuction.connect(accounts[2]).bid({ value: bidAmount });
        const receipt1 = await tx1.wait();
        
        const tx2 = await optimizedAuction.connect(accounts[2]).bid({ value: bidAmount });
        const receipt2 = await tx2.wait();

        console.log("\nbid() Operation Gas:");
        console.log(`Standard: ${receipt1?.gasUsed} gas`);
        console.log(`Optimized: ${receipt2?.gasUsed} gas`);

        expect(receipt2?.gasUsed).to.be.lessThan(receipt1?.gasUsed);
    });
    
    it("Should compare endAuction() operation", async function () {
        const { standardAuction, optimizedAuction, accounts } = await loadFixture(deployContracts);
        const bidAmount = ethers.parseEther("1.5");

        await standardAuction.connect(accounts[2]).bid({ value: bidAmount });
        await optimizedAuction.connect(accounts[2]).bid({ value: bidAmount });
        
        const tx1 = await standardAuction.connect(accounts[0]).endAuction();
        const receipt1 = await tx1.wait();
        
        const tx2 = await optimizedAuction.connect(accounts[0]).endAuction();
        const receipt2 = await tx2.wait();

        console.log("\nendAuction() Operation Gas:");
        console.log(`Standard: ${receipt1?.gasUsed} gas`);
        console.log(`Optimized: ${receipt2?.gasUsed} gas`);

        expect(receipt2?.gasUsed).to.be.lessThan(receipt1?.gasUsed);
    });
   
});