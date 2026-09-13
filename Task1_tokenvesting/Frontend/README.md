# TokenVesting Frontend

Minimal React and ethers.js interface for the TokenVesting contracts.

## Features

- Connects to MetaMask or another injected browser wallet.
- Shows wallet address, allocation, claimed amount, claimable amount, and vesting progress.
- Allows beneficiaries to claim vested tokens.
- Shows the schedule creation form only when the connected wallet is the on-chain contract owner.
- Creates schedules using `createVestingSchedule` from the Vesting contract.

The contract remains the final authority: `Vesting.createVestingSchedule` uses `onlyOwner`, so a non-owner cannot create a schedule even if they manually call the contract.

## Install

From this directory:

```powershell
npm install
```

## Environment

Create `Frontend/.env` or `Frontend/.env.local`:

```text
VITE_VESTING_ADDRESS=0xYourVestingContractAddress
```
example - vesting address = 0x43aB65640fAadC43B6774BFaf962762aBFf0eD3e

Use the address printed by the TokenVesting deployment script. The frontend reads the ABI from [src/Abi/VestingABI.json](src/Abi/VestingABI.json).

## Run

```powershell
npm run dev
```

Open the Vite URL in a browser with MetaMask installed.

## Local Hardhat network

1. Start the node from `TokenVesting`:

   ```powershell
   npx hardhat node
   ```

2. Deploy the contracts from another `TokenVesting` terminal:

   ```powershell
   npx hardhat run .\scripts\deploy.js --network localhost
   ```

3. Add the printed `VITE_VESTING_ADDRESS` to `Frontend/.env.local`.

4. Add a Hardhat network to MetaMask:

   ```text
   Network name: Hardhat Local
   RPC URL: http://127.0.0.1:8545
   Chain ID: 31337
   Currency symbol: ETH
   ```

5. Import one private key printed by `npx hardhat node` into MetaMask. The first account is normally the contract owner.

6. Restart Vite after changing `.env.local`, then connect MetaMask.

Use the owner account to create a schedule. Switch MetaMask to a beneficiary account to view and claim that beneficiary's vested tokens.

## Sepolia

For Sepolia, set MetaMask to Sepolia and use the `VITE_VESTING_ADDRESS` printed by:

```powershell
cd ..\TokenVesting
npm run deploy:sepolia
```

The wallet and the deployed contracts must be on the same network.

## Build

```powershell
npm run build
```