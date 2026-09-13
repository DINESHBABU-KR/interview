const hre = require("hardhat");

async function main() {
  if (hre.network.name === "sepolia" && !process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is missing. Add it to dex/.env before deploying to Sepolia.");
  }
  const [deployer] = await hre.ethers.getSigners();
  const supply = hre.ethers.parseUnits("1000000", 18);
  const Token = await hre.ethers.getContractFactory("MockERC20");
  const tokenA = await Token.deploy("Token A", "TKA", supply);
  const tokenB = await Token.deploy("Token B", "TKB", supply);
  await tokenA.waitForDeployment();
  await tokenB.waitForDeployment();

  const Pair = await hre.ethers.getContractFactory("MiniDexPair");
  const pair = await Pair.deploy(tokenA.target, tokenB.target);
  await pair.waitForDeployment();
  console.log(JSON.stringify({ network: hre.network.name, deployer: deployer.address, tokenA: tokenA.target, tokenB: tokenB.target, pair: pair.target }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
