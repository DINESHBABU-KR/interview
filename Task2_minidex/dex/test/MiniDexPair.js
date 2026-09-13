const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MiniDexPair", function () {
  async function setup() {
    const [owner, trader] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MockERC20");
    const tokenA = await Token.deploy("Token A", "TKA", ethers.parseEther("100000"));
    const tokenB = await Token.deploy("Token B", "TKB", ethers.parseEther("100000"));
    const Pair = await ethers.getContractFactory("MiniDexPair");
    const pair = await Pair.deploy(tokenA.target, tokenB.target);
    await tokenA.mint(trader.address, ethers.parseEther("1000"));
    await tokenB.mint(trader.address, ethers.parseEther("1000"));
    await tokenA.approve(pair.target, ethers.MaxUint256);
    await tokenB.approve(pair.target, ethers.MaxUint256);
    return { owner, trader, tokenA, tokenB, pair };
  }

  it("adds liquidity and mints proportional LP shares", async function () {
    const { pair, tokenA, tokenB } = await setup();
    await pair.addLiquidity(ethers.parseEther("10000"), ethers.parseEther("20000"), 0);
    expect(await pair.reserveA()).to.equal(ethers.parseEther("10000"));
    expect(await pair.reserveB()).to.equal(ethers.parseEther("20000"));
    expect(await pair.totalLiquidity()).to.be.gt(0);
    const firstShares = await pair.liquidityOf((await ethers.getSigners())[0].address);
    await pair.addLiquidity(ethers.parseEther("5000"), ethers.parseEther("10000"), 0);
    expect(await pair.liquidityOf((await ethers.getSigners())[0].address)).to.equal(firstShares + (firstShares + 1000n) / 2n);
  });

  it("quotes and executes a fee-adjusted swap", async function () {
    const { pair, tokenA, tokenB, trader } = await setup();
    await pair.addLiquidity(ethers.parseEther("10000"), ethers.parseEther("10000"), 0);
    await tokenA.connect(trader).approve(pair.target, ethers.MaxUint256);
    const amountIn = ethers.parseEther("100");
    const quote = await pair.quote(amountIn, true);
    expect(quote).to.be.lt(amountIn);
    await expect(pair.connect(trader).swap(true, amountIn, quote)).to.emit(pair, "Swap");
    expect(await tokenB.balanceOf(trader.address)).to.equal(ethers.parseEther("1000") + quote);
  });

  it("rejects swaps below the minimum received amount", async function () {
    const { pair, tokenA, trader } = await setup();
    await pair.addLiquidity(ethers.parseEther("10000"), ethers.parseEther("10000"), 0);
    await tokenA.connect(trader).approve(pair.target, ethers.MaxUint256);
    await expect(pair.connect(trader).swap(true, ethers.parseEther("10"), ethers.parseEther("11"))).to.be.revertedWith("SLIPPAGE");
  });

  it("removes liquidity with minimum amount protection", async function () {
    const { pair } = await setup();
    await pair.addLiquidity(ethers.parseEther("10000"), ethers.parseEther("20000"), 0);
    const shares = await pair.liquidityOf((await ethers.getSigners())[0].address);
    await expect(pair.removeLiquidity(shares, ethers.parseEther("9999"), ethers.parseEther("19999"))).to.emit(pair, "LiquidityRemoved");
  });
});
