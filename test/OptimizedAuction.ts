import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("OptimizedAuction test", function () {

    async function deployAuctionFixture() {
        const accounts = await ethers.getSigners();
        const reservePrice = ethers.parseEther("1.0");
        const Auction = await ethers.getContractFactory("OptimizedAuction");
        const auction = await Auction.deploy(reservePrice, accounts[1].address);
        await auction.waitForDeployment();
        return { auction, accounts, reservePrice, seller: accounts[0], platform: accounts[1],
            bidder1: accounts[2],
            bidder2: accounts[3],
            bidder3: accounts[4]
        };
    }

    it("Should set correct initial state", async function () {
        const { auction, seller, platform, reservePrice } = await loadFixture(deployAuctionFixture);
        expect(await auction.seller()).to.equal(seller.address);
        expect(await auction.platform()).to.equal(platform.address);
        expect(await auction.reservePrice()).to.equal(reservePrice);
        expect(await auction.ended()).to.be.false;
        expect(await auction.highestBid()).to.equal(0);
        expect(await auction.highestBidder()).to.equal(ethers.ZeroAddress);
    });

    it("Should accept valid bid", async function () {
        const { auction, bidder1, reservePrice } = await loadFixture(deployAuctionFixture);
        const bidAmount = reservePrice + ethers.parseEther("0.5");
        await expect(auction.connect(bidder1).bid({ value: bidAmount }))
            .to.emit(auction, "NewBid").withArgs(bidder1.address, bidAmount);
        
        expect(await auction.bids(bidder1.address)).to.equal(bidAmount);
        expect(await auction.highestBid()).to.equal(bidAmount);
        expect(await auction.highestBidder()).to.equal(bidder1.address);
    });

    it("Should reject bid", async function () {
        const { auction, bidder1, reservePrice } = await loadFixture(deployAuctionFixture);
        const lowBid = reservePrice - ethers.parseEther("0.1");
        await expect(auction.connect(bidder1).bid({ value: lowBid }))
            .to.be.revertedWith("Bid below reserve price");
    });

    it("Should allow bidders to withdraw", async function () {
        const { auction, bidder1, bidder2, reservePrice } = await loadFixture(deployAuctionFixture);
        const bidAmount1 = reservePrice;
        const bidAmount2 = reservePrice + 1n;
        
        await auction.connect(bidder1).bid({ value: bidAmount1 });
        await auction.connect(bidder2).bid({ value: bidAmount2 });
        
        const initialBalance = await ethers.provider.getBalance(bidder1.address);
        const tx = await auction.connect(bidder1).withdraw();
        const receipt = await tx.wait();
        const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
        
        expect(await auction.bids(bidder1.address)).to.equal(0);
        const finalBalance = await ethers.provider.getBalance(bidder1.address);
        expect(finalBalance).to.equal(initialBalance - gasUsed + bidAmount1);
        await expect(tx).to.emit(auction, "Withdrawn").withArgs(bidder1.address, bidAmount1);
    });

    it("Should allow seller to end auction", async function () {
        const { auction, seller, platform, bidder1, reservePrice } = await loadFixture(deployAuctionFixture);
        const bidAmount = reservePrice + 1n;
        await auction.connect(bidder1).bid({ value: bidAmount });
        
        const initialPlatformBalance = await ethers.provider.getBalance(platform.address);
        const initialSellerBalance = await ethers.provider.getBalance(seller.address);
        
        const tx = await auction.connect(seller).endAuction();
        const receipt = await tx.wait();
        const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
        
        const tax = bidAmount * 5n / 100n;
        const sellerProceeds = bidAmount - tax;
        
        expect(await auction.ended()).to.be.true;
        expect(await ethers.provider.getBalance(platform.address)).to.equal(initialPlatformBalance + tax);
        expect(await ethers.provider.getBalance(seller.address)).to.equal(initialSellerBalance - gasUsed + sellerProceeds);
        await expect(tx).to.emit(auction, "AuctionEnded").withArgs(bidder1.address, bidAmount);
    });

});