// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract Auction {

    //storage
    address payable public seller;
    address payable public platform;
    uint public reservePrice;
    bool public ended;
    uint public constant TAX_PERCENT = 5;
    mapping(address => uint) public bids;

    address public highestBidder;
    uint public highestBid;

    event NewBid(address indexed bidder, uint amount);
    event AuctionEnded(address winner, uint amount);
    event Withdrawn(address indexed bidder, uint amount);

    constructor(uint _reservePrice, address _platform) {
        seller = payable(msg.sender);
        platform = payable(_platform);
        reservePrice = _reservePrice;
    }

    function bid() external payable {
        require(!ended, "Auction ended");
        require(bids[msg.sender] == 0, "You already have an active bid");
        require(msg.value > highestBid, "Bid too low");
        require(msg.value >= reservePrice, "Bid below reserve price");

        bids[msg.sender] = msg.value;
        highestBidder = msg.sender;
        highestBid = msg.value;
        emit NewBid(msg.sender, msg.value);
    }

    function withdraw() external {
        uint amount = bids[msg.sender];     //memory
        require(amount > 0, "No bid");
        require(msg.sender != highestBidder, "Current highest bidder cannot withdraw");

        bids[msg.sender] = 0;
        payable(msg.sender).transfer(amount);       
        emit Withdrawn(msg.sender, amount);
    }

    //calldata
    function refundBidders(address[] calldata bidders) external {
        require(msg.sender == seller, "Only seller can refund");
        for (uint i = 0; i < bidders.length; i++) {
            address bidder = bidders[i];
            uint amount = bids[bidder];
            if (amount > 0 && bidder != highestBidder) {
                bids[bidder] = 0;
                payable(bidder).transfer(amount);
                emit Withdrawn(bidder, amount);
            }
        }
    }

    function endAuction() external {
        require(msg.sender == seller, "Only seller can end auction");
        require(!ended, "Auction already ended");
        require(highestBid >= reservePrice, "Reserve price not met");

        ended = true;
        emit AuctionEnded(highestBidder, highestBid);
        (uint tax, uint netAmount) = _calculateTax(highestBid);
        platform.transfer(tax);
        seller.transfer(netAmount);
        bids[highestBidder] = 0;
    }

   function _calculateTax(uint amount) internal pure returns (uint tax, uint netAmount) {
        //stack
        tax = amount * TAX_PERCENT / 100;
        netAmount = amount - tax;
    }
}