import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import vestingAbi from "./Abi/VestingABI.json";

const vestingAddress = import.meta.env.VITE_VESTING_ADDRESS;

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [schedule, setSchedule] = useState(null);
  const [claimable, setClaimable] = useState(0n);
  const [status, setStatus] = useState("Not connected");
  const [scheduleForm, setScheduleForm] = useState({
    beneficiary: "",
    allocation: "",
    startTimestamp: "",
    cliffDuration: "0",
    vestingDuration: "",
  });

  async function loadVestingData(currentProvider, address) {
    if (!vestingAddress) {
      setStatus("Set VITE_VESTING_ADDRESS in Frontend/.env.local");
      return;
    }

    const contract = new ethers.Contract(vestingAddress, vestingAbi, currentProvider);
    const [currentSchedule, currentClaimable] = await Promise.all([
      contract.vestingSchedules(address),
      contract.claimableAmount(address),
    ]);
    console.log("currentSchedule, currentClaimable",currentSchedule, currentClaimable)
    setSchedule(currentSchedule);
    setClaimable(currentClaimable);
    setStatus(currentSchedule.exists ? "Schedule loaded" : "No vesting schedule found");
  }

  async function connectWallet() {
    if (!window.ethereum) {
      setStatus("Install a browser wallet such as MetaMask");
      return;
    }

    try {
      setStatus("Connecting...");
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await browserProvider.send("eth_requestAccounts", []);
      const currentSigner = await browserProvider.getSigner();
      const address = await currentSigner.getAddress();
      const contract = new ethers.Contract(vestingAddress, vestingAbi, browserProvider);
      const ownerAddress = await contract.owner();
      setProvider(browserProvider);
      setSigner(currentSigner);
      setWalletAddress(address);
      setIsOwner(ownerAddress.toLowerCase() === address.toLowerCase());
      await loadVestingData(browserProvider, address);
    } catch (error) {
      setStatus(error.shortMessage || error.message);
    }
  }

  async function claimTokens() {
    if (!signer) return;

    try {
      setStatus("Submitting claim...");
      const contract = new ethers.Contract(vestingAddress, vestingAbi, signer);
      const transaction = await contract.claim();
      setStatus(`Waiting for ${transaction.hash}`);
      await transaction.wait();
      await loadVestingData(provider, walletAddress);
      setStatus("Claim confirmed");
    } catch (error) {
      setStatus(error.shortMessage || error.message);
    }
  }

  async function createSchedule(event) {
    event.preventDefault();

    if (!signer) {
      setStatus("Connect the owner wallet first");
      return;
    }

    if (!isOwner) {
      setStatus("Only the contract owner can create a vesting schedule");
      return;
    }

    try {
      setStatus("Creating vesting schedule...");
      const contract = new ethers.Contract(vestingAddress, vestingAbi, signer);
      const transaction = await contract.createVestingSchedule(
        scheduleForm.beneficiary,
        ethers.parseUnits(scheduleForm.allocation, 18),
        scheduleForm.startTimestamp,
        scheduleForm.cliffDuration,
        scheduleForm.vestingDuration,
      );
      setStatus(`Waiting for ${transaction.hash}`);
      await transaction.wait();
      setStatus("Vesting schedule created");

      if (scheduleForm.beneficiary.toLowerCase() === walletAddress.toLowerCase()) {
        await loadVestingData(provider, walletAddress);
      }
    } catch (error) {
      setStatus(error.shortMessage || error.message);
    }
  }

  function updateScheduleForm(event) {
    setScheduleForm({
      ...scheduleForm,
      [event.target.name]: event.target.value,
    });
  }

  useEffect(() => {
    if (!window.ethereum) return undefined;

    const handleAccountsChanged = ([address]) => {
      if (!address) {
        setSigner(null);
        setProvider(null);
        setWalletAddress("");
        setIsOwner(false);
        setSchedule(null);
        setClaimable(0n);
        setStatus("Not connected");
      } else {
        connectWallet();
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
  }, []);

  const totalAllocation = schedule?.totalAllocation ?? 0n;
  const claimedAmount = schedule?.amountClaimed ?? 0n;
  const vestedAmount = claimedAmount + claimable;
  const progress = totalAllocation > 0n
    ? Number((vestedAmount * 10000n) / totalAllocation) / 100
    : 0;

  return (
    <main>
      <h1>Token Vesting</h1>
      <button type="button" onClick={connectWallet}>
        {walletAddress ? "Wallet Connected" : "Connect Wallet"}
      </button>

      <p>Wallet address: {walletAddress || "-"}</p>
      <p>Total allocation: {ethers.formatUnits(totalAllocation, 18)} MVT</p>
      <p>Claimed amount: {ethers.formatUnits(claimedAmount, 18)} MVT</p>
      <p>Claimable amount: {ethers.formatUnits(claimable, 18)} MVT</p>
      <p>Vesting progress: {progress}%</p>
      <button type="button" onClick={claimTokens} disabled={!signer || claimable === 0n}>
        Claim
      </button>

      {isOwner && <h2>Create vesting schedule</h2>}
      {isOwner && <form onSubmit={createSchedule}>
        <p>
          <label>
            Beneficiary address: {" "}
            <input
              name="beneficiary"
              value={scheduleForm.beneficiary}
              onChange={updateScheduleForm}
              required
            />
          </label>
        </p>
        <p>
          <label>
            Allocation in MVT: {" "}
            <input
              name="allocation"
              type="number"
              min="0"
              step="any"
              value={scheduleForm.allocation}
              onChange={updateScheduleForm}
              required
            />
          </label>
        </p>
        <p>
          <label>
            Start timestamp: {" "}
            <input
              name="startTimestamp"
              type="number"
              min="0"
              value={scheduleForm.startTimestamp}
              onChange={updateScheduleForm}
              placeholder={Math.floor(Date.now() / 1000)}
              required
            />
          </label>
        </p>
        <p>
          <label>
            Cliff duration in seconds: {" "}
            <input
              name="cliffDuration"
              type="number"
              min="0"
              value={scheduleForm.cliffDuration}
              onChange={updateScheduleForm}
              required
            />
          </label>
        </p>
        <p>
          <label>
            Vesting duration in seconds: {" "}
            <input
              name="vestingDuration"
              type="number"
              min="1"
              value={scheduleForm.vestingDuration}
              onChange={updateScheduleForm}
              required
            />
          </label>
        </p>
        <button type="submit" disabled={!signer}>
          Create schedule
        </button>
      </form>}
      <p>Transaction status: {status}</p>
    </main>
  );
}

export default App;
