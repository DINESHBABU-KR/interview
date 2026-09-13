// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20Minimal {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

contract MiniDexPair {
    uint256 public constant FEE_BPS = 30;
    uint256 public constant BPS = 10_000;
    uint256 public constant MINIMUM_LIQUIDITY = 1_000;

    address public immutable tokenA;
    address public immutable tokenB;
    uint256 public reserveA;
    uint256 public reserveB;
    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidityOf;

    event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB, uint256 liquidity);
    event Swap(address indexed trader, address indexed tokenIn, uint256 amountIn, uint256 amountOut, uint256 reserveA, uint256 reserveB);

    constructor(address _tokenA, address _tokenB) {
        require(_tokenA != _tokenB, "IDENTICAL_TOKENS");
        tokenA = _tokenA;
        tokenB = _tokenB;
    }

    function addLiquidity(uint256 amountA, uint256 amountB, uint256 minLiquidity) external returns (uint256 liquidity) {
        require(amountA > 0 && amountB > 0, "ZERO_AMOUNT");
        if (totalLiquidity == 0) {
            liquidity = _sqrt(amountA * amountB) - MINIMUM_LIQUIDITY;
            totalLiquidity = MINIMUM_LIQUIDITY;
        } else {
            uint256 liquidityA = amountA * totalLiquidity / reserveA;
            uint256 liquidityB = amountB * totalLiquidity / reserveB;
            liquidity = liquidityA < liquidityB ? liquidityA : liquidityB;
        }
        require(liquidity >= minLiquidity && liquidity > 0, "INSUFFICIENT_LIQUIDITY_MINTED");
        require(IERC20Minimal(tokenA).transferFrom(msg.sender, address(this), amountA), "TRANSFER_A_FAILED");
        require(IERC20Minimal(tokenB).transferFrom(msg.sender, address(this), amountB), "TRANSFER_B_FAILED");
        liquidityOf[msg.sender] += liquidity;
        totalLiquidity += liquidity;
        reserveA += amountA;
        reserveB += amountB;
        emit LiquidityAdded(msg.sender, amountA, amountB, liquidity);
    }

    function removeLiquidity(uint256 liquidity, uint256 minAmountA, uint256 minAmountB) external returns (uint256 amountA, uint256 amountB) {
        require(liquidity > 0 && liquidityOf[msg.sender] >= liquidity, "INVALID_LIQUIDITY");
        amountA = liquidity * reserveA / totalLiquidity;
        amountB = liquidity * reserveB / totalLiquidity;
        require(amountA >= minAmountA && amountB >= minAmountB, "SLIPPAGE");
        liquidityOf[msg.sender] -= liquidity;
        totalLiquidity -= liquidity;
        reserveA -= amountA;
        reserveB -= amountB;
        require(IERC20Minimal(tokenA).transfer(msg.sender, amountA), "TRANSFER_A_FAILED");
        require(IERC20Minimal(tokenB).transfer(msg.sender, amountB), "TRANSFER_B_FAILED");
        emit LiquidityRemoved(msg.sender, amountA, amountB, liquidity);
    }

    function quote(uint256 amountIn, bool aForB) public view returns (uint256 amountOut) {
        (uint256 reserveIn, uint256 reserveOut) = aForB ? (reserveA, reserveB) : (reserveB, reserveA);
        require(amountIn > 0 && reserveIn > 0 && reserveOut > 0, "INSUFFICIENT_RESERVES");
        uint256 amountInWithFee = amountIn * (BPS - FEE_BPS);
        amountOut = amountInWithFee * reserveOut / (reserveIn * BPS + amountInWithFee);
    }

    function swap(bool aForB, uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut) {
        amountOut = quote(amountIn, aForB);
        require(amountOut >= minAmountOut, "SLIPPAGE");
        address input = aForB ? tokenA : tokenB;
        address output = aForB ? tokenB : tokenA;
        require(IERC20Minimal(input).transferFrom(msg.sender, address(this), amountIn), "TRANSFER_IN_FAILED");
        require(IERC20Minimal(output).transfer(msg.sender, amountOut), "TRANSFER_OUT_FAILED");
        if (aForB) { reserveA += amountIn; reserveB -= amountOut; }
        else { reserveB += amountIn; reserveA -= amountOut; }
        emit Swap(msg.sender, input, amountIn, amountOut, reserveA, reserveB);
    }

    function _sqrt(uint256 value) private pure returns (uint256 result) {
        if (value > 3) {
            result = value;
            uint256 next = value / 2 + 1;
            while (next < result) { result = next; next = (value / next + next) / 2; }
        } else if (value != 0) result = 1;
    }
}
