import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = (await network.create()) as any;

describe("Vesting", function () {
  async function deployFixture() {
    const [owner, beneficiary] = await ethers.getSigners();
    const token = await ethers.deployContract("MyVestingToken", [
      "My Vesting Token",
      "MVT",
      1_000_000,
    ]);
    const vesting = await ethers.deployContract("Vesting", [
      await token.getAddress(),
    ]);
    await token.transfer(await vesting.getAddress(), ethers.parseUnits("1000", 18));
    return { owner, beneficiary, token, vesting };
  }

  it("creates a schedule and calculates claimable tokens", async function () {
    const { owner, beneficiary, vesting } = await deployFixture();
    const now = (await ethers.provider.getBlock("latest"))!.timestamp;
    const allocation = ethers.parseUnits("100", 18);

    await vesting.createVestingSchedule(
      beneficiary.address,
      allocation,
      now,
      0,
      100,
    );

    expect((await vesting.getSchedule(beneficiary.address)).totalAllocation).to.equal(allocation);
    expect(await vesting.claimableAmount(beneficiary.address) > 0n).to.equal(true);
    expect(await vesting.owner()).to.equal(owner.address);
  });

  it("allows a beneficiary to claim vested tokens", async function () {
    const { beneficiary, token, vesting } = await deployFixture();
    const now = (await ethers.provider.getBlock("latest"))!.timestamp;

    await vesting.createVestingSchedule(
      beneficiary.address,
      ethers.parseUnits("100", 18),
      now,
      0,
      1,
    );
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    const claimTransaction = await vesting.connect(beneficiary).claim();
    const claimReceipt = await claimTransaction.wait();
    expect(claimReceipt?.status).to.equal(1);
    expect(await token.balanceOf(beneficiary.address)).to.equal(ethers.parseUnits("100", 18));
  });
});