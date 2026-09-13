import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const TOKEN_NAME = "My Vesting Token";
  const TOKEN_SYMBOL = "MVT";
  const initialSupply = 1_000_000;
  const fundingAmountTokens = "100000";

  console.log("Deploying MyVestingToken...");
  const token = await ethers.deployContract("MyVestingToken", [
    TOKEN_NAME,
    TOKEN_SYMBOL,
    initialSupply,
  ]);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("Token deployed:", tokenAddress);

  console.log("Deploying Vesting...");
  const vesting = await ethers.deployContract("Vesting", [tokenAddress]);
  await vesting.waitForDeployment();
  const vestingAddress = await vesting.getAddress();
  console.log("Vesting deployed:", vestingAddress);

  const fundingAmount = ethers.parseUnits(fundingAmountTokens, 18);

  const balance = await token.balanceOf(await ethers.provider.getSigner().then(s => s.getAddress()));
  if (balance < fundingAmount) {
    throw new Error(
      `Deployer balance (${ethers.formatUnits(balance, 18)}) is less than funding amount (${fundingAmountTokens})`
    );
  }

  console.log(`Funding vesting contract with ${fundingAmountTokens} MVT...`);
  const tx = await token.transfer(vestingAddress, fundingAmount);
  await tx.wait();
  console.log("Funding tx:", tx.hash);

  console.log("---");
  console.log(`VITE_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`VITE_VESTING_ADDRESS=${vestingAddress}`);
  console.log(`Funded vesting contract with ${fundingAmountTokens} MVT`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});