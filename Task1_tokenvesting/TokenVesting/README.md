# TokenVesting Contracts

Solidity contracts for an ERC-20 token vesting application.

## Contracts

- `MyVestingToken.sol`: demo 18-decimal token with an initial supply.
- `Vesting.sol`: stores one vesting schedule per beneficiary, calculates claimable tokens, and transfers claims.

Only the vesting contract owner can create or revoke schedules. Beneficiaries can claim their own vested tokens.

## Requirements

- Node.js
- npm
- A funded wallet and RPC URL for Sepolia deployment

## Install and test

From this directory:

```powershell
npm install
npm run compile
npm test
```

## Local deployment

Start a local Hardhat node in one terminal:

```powershell
npx hardhat node
```

In another terminal, from `TokenVesting`:

```powershell
npx hardhat run .\scripts\deploy.js --network localhost
```

The script deploys `MyVestingToken`, deploys `Vesting`, transfers `100000` MVT to the vesting contract, and prints both contract addresses.

## Sepolia deployment

Create `TokenVesting/.env`:

```text
RPC_URL=https://sepolia.infura.io/v3/your-key
PRIVATE_KEY=0xyour-deployer-private-key
ETHERSCAN_API_KEY=your-etherscan-key
```

Deploy with:

```powershell
npm run deploy:sepolia
```

The output contains `VITE_TOKEN_ADDRESS` and `VITE_VESTING_ADDRESS`. Put those values in the frontend `.env` file.

## Deployment script

The deployment entry point is [scripts/deploy.js](scripts/deploy.js). It uses Hardhat 3 ESM and `network.connect()` to deploy and fund the contracts.

## Tests

[test/Vesting.ts](test/Vesting.ts) covers schedule creation, claimable amount calculation, and completed vesting claims.
