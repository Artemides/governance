// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

contract Gimnastiky is ERC20, ERC20Permit, ERC20Votes {
    address governor;

    constructor(
        address _governor
    ) ERC20("Gimnastiky", "GYMS") ERC20Permit("Gimnastiky") {
        governor = _governor;
        _mint(msg.sender, 1000e18);
    }

    function mint(address to, uint256 amount) external {
        require(governor == msg.sender);
        _mint(to, amount);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._mint(to, amount);
    }

    function _burn(
        address from,
        uint256 amount
    ) internal override(ERC20, ERC20Votes) {
        super._burn(from, amount);
    }
}
