// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyVestingToken is ReentrancyGuard {

    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error InsufficientBalance();
    error InsufficientAllowance();
    error InvalidRecipient();       

    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        uint256 initialSupply
    ) {
        name = tokenName;
        symbol = tokenSymbol;
        _mint(msg.sender, initialSupply * 10 ** decimals);
    }

    function transfer(address to, uint256 value) external nonReentrant returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external nonReentrant returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external nonReentrant returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        if (currentAllowance < value) revert InsufficientAllowance();

        if (currentAllowance != type(uint256).max) {
            allowance[from][msg.sender] = currentAllowance - value;
            emit Approval(from, msg.sender, currentAllowance - value);
        }

        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        if (to == address(0)) revert InvalidRecipient();
        if (balanceOf[from] < value) revert InsufficientBalance();

        balanceOf[from] -= value;
        balanceOf[to] += value;

        emit Transfer(from, to, value);
    }

    function _mint(address to, uint256 value) internal {
        if (to == address(0)) revert InvalidRecipient();

        totalSupply += value;
        balanceOf[to] += value;

        emit Transfer(address(0), to, value);
    }

}

// contract MyVestingToken is ERC20, Ownable, ReentrancyGuard {
//     constructor(
//         string memory tokenName,
//         string memory tokenSymbol,
//         uint256 initialSupply
//     ) ERC20(tokenName, tokenSymbol) Ownable(msg.sender) {
//         _mint(msg.sender, initialSupply * 10 ** decimals());
//     }

//     function mint(address to, uint256 amount) external onlyOwner nonReentrant {
//         _mint(to, amount);
//     }
// }