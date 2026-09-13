const hre = require("hardhat");

async function main() {
  const ERC20 = await hre.ethers.getContractFactory("ERC20");

  const Vesting = await hre.ethers.getContractFactory("Vesting");
  const token = await Vesting.deploy(ERC20);
  await token.waitForDeployment();

  console.log("Vesting deployed to:", await token.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});