import hre from "hardhat";

async function main() {
  const token = await hre.ethers.deployContract("MyVestingToken", [
    "My Vesting Token",
    "MVT",
    1_000_000,
  ]);
  await token.waitForDeployment();

  const vesting = await hre.ethers.deployContract("Vesting", [
    await token.getAddress(),
  ]);
  await vesting.waitForDeployment();

  console.log("Token:", await token.getAddress());
  console.log("Vesting:", await vesting.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});