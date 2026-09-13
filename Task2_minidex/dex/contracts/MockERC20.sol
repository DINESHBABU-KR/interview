// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory tokenName, string memory tokenSymbol, uint256 initialSupply) {
        name = tokenName;
        symbol = tokenSymbol;
        _mint(msg.sender, initialSupply);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address recipient, uint256 amount) external returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[sender][msg.sender];
        require(allowed >= amount, "ERC20: insufficient allowance");
        if (allowed != type(uint256).max) allowance[sender][msg.sender] = allowed - amount;
        _transfer(sender, recipient, amount);
        return true;
    }

    function mint(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }

    function _mint(address recipient, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[recipient] += amount;
        emit Transfer(address(0), recipient, amount);
    }

    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(balanceOf[sender] >= amount, "ERC20: insufficient balance");
        balanceOf[sender] -= amount;
        balanceOf[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }
}
