// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {AccessControlV2} from "./Access/AccessControlV2.sol";

contract Crowdfunding is AccessControlV2 {
    bytes32 public constant BACKER = keccak256("BACKER");

    address public _campaignOwner;

    event FundsContributed(address indexed backerAddrs, uint256 amount);
    event FundsWithdrawn(address owner);

    error CrowdFunding__OnlyAdmin();

    modifier onlyAdmin() {
        _checkRole(DEFAULT_ADMIN_ROLE);
        _;
    }

    modifier onlyCampainOwner() {
        if (_campaignOwner != _msgSender()) {
            revert("Only the Campaign owner can withdraw funds");
        }
        _;
    }

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function addBacker(address backerAddrs) external onlyAdmin {
        grantRole(BACKER, backerAddrs);
    }

    function removeBacker(address backerAddrs) external onlyAdmin {
        revokeRole(BACKER, backerAddrs);
    }

    function setCampaignOwner(address campaignOwner) external onlyAdmin {
        _campaignOwner = campaignOwner;
    }

    function contribute() public payable onlyRole(BACKER) {
        uint256 amount = msg.value;
        require(amount > 0, "Cannot contrinute 0 Eth");

        emit FundsContributed(_msgSender(), amount);
    }

    function withdraw() public onlyCampainOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Not enough balance to withdraw");

        (bool success, ) = payable(_msgSender()).call{value: balance}("");
        require(success, "withdraw funds failed");

        emit FundsWithdrawn(_msgSender());
    }
}
