import { useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, ethers, formatUnits, parseUnits } from "ethers";

const pairAddress = import.meta.env.VITE_PAIR_ADDRESS || "";
const tokenAAddress = import.meta.env.VITE_TOKEN_A_ADDRESS || "";
const tokenBAddress = import.meta.env.VITE_TOKEN_B_ADDRESS || "";
const pairAbi = ["function reserveA() view returns (uint256)", "function reserveB() view returns (uint256)", "function quote(uint256,bool) view returns (uint256)", "function addLiquidity(uint256,uint256,uint256) returns (uint256)", "function removeLiquidity(uint256,uint256,uint256) returns (uint256,uint256)", "function swap(bool,uint256,uint256) returns (uint256)", "function liquidityOf(address) view returns (uint256)", "event Swap(address indexed trader,address indexed tokenIn,uint256 amountIn,uint256 amountOut,uint256 reserveA,uint256 reserveB)"];
const tokenAbi = ["function symbol() view returns (string)", "function decimals() view returns (uint8)", "function balanceOf(address) view returns (uint256)", "function allowance(address,address) view returns (uint256)", "function approve(address,uint256) returns (bool)"];
const tokens = [{ symbol: "TKA", name: "Token A", color: "coral", address: tokenAAddress }, { symbol: "TKB", name: "Token B", color: "mint", address: tokenBAddress }];

function shortAddress(address) { return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""; }
function number(value, digits = 5) { return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: digits }); }

export default function App() {
  const [account, setAccount] = useState("");
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [inputIndex, setInputIndex] = useState(0);
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [quote, setQuote] = useState("0");
  const [reserves, setReserves] = useState({ a: "0", b: "0" });
  const [balance, setBalance] = useState("0");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [transactions, setTransactions] = useState([]);
  const [liquidityAmount, setLiquidityAmount] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const outputIndex = inputIndex === 0 ? 1 : 0;
  const inputToken = tokens[inputIndex];
  const outputToken = tokens[outputIndex];
  const configured = pairAddress && tokenAAddress && tokenBAddress;
  const readProvider = provider || (window.ethereum ? new BrowserProvider(window.ethereum) : null);

  async function connect() {
    if (!window.ethereum) { setNotice({ type: "error", text: "Install a wallet extension to continue." }); return; }
    try {
      const nextProvider = new BrowserProvider(window.ethereum);
      await nextProvider.send("eth_requestAccounts", []);
      const nextSigner = await nextProvider.getSigner();
      setProvider(nextProvider); setSigner(nextSigner); setAccount(await nextSigner.getAddress()); setNotice({ type: "", text: "" });
    } catch (error) { setNotice({ type: "error", text: error.shortMessage || error.message }); }
  }

  async function loadPool() {
    if (!configured || !readProvider) return;
    try {
      const pair = new Contract(pairAddress, pairAbi, readProvider);
      const [a, b] = await Promise.all([pair.reserveA(), pair.reserveB()]);
      setReserves({ a: formatUnits(a, 18), b: formatUnits(b, 18) });
      if (account) { const token = new Contract(inputToken.address, tokenAbi, readProvider); setBalance(formatUnits(await token.balanceOf(account), 18)); }
    } catch { setNotice({ type: "error", text: "Could not read the pool. Check your network and deployment addresses." }); }
  }

  useEffect(() => { loadPool(); }, [account, inputIndex, configured]);
  useEffect(() => {
    let cancelled = false;
    async function getQuote() {
      if (!amount || Number(amount) <= 0 || !configured || !readProvider) { setQuote("0"); return; }
      try { const pair = new Contract(pairAddress, pairAbi, readProvider); const result = await pair.quote(parseUnits(amount, 18), inputIndex === 0); if (!cancelled) setQuote(formatUnits(result, 18)); } catch { if (!cancelled) setQuote("0"); }
    }
    getQuote(); return () => { cancelled = true; };
  }, [amount, inputIndex, configured, provider]);

  const priceImpact = useMemo(() => {
    const reserveIn = Number(inputIndex === 0 ? reserves.a : reserves.b); const reserveOut = Number(inputIndex === 0 ? reserves.b : reserves.a);
    if (!reserveIn || !reserveOut || !Number(amount) || !Number(quote)) return 0;
    const mid = Number(amount) * reserveOut / reserveIn;
    return Math.max(0, (1 - Number(quote) / mid) * 100);
  }, [amount, quote, reserves, inputIndex]);
  const minReceived = quote ? Number(quote) * (1 - Number(slippage) / 100) : 0;

  function addTx(label, hash, state = "pending") { setTransactions((items) => [{ label, hash, state }, ...items].slice(0, 4)); }
  async function approve() {
    if (!signer || !configured || !amount) return setNotice({ type: "error", text: "Connect a wallet and enter an amount first." });
    try { setBusy("approve"); const token = new Contract(inputToken.address, tokenAbi, signer); const tx = await token.approve(pairAddress, parseUnits(amount, 18)); addTx(`Approve ${inputToken.symbol}`, tx.hash); await tx.wait(); setTransactions((items) => items.map((item) => item.hash === tx.hash ? { ...item, state: "confirmed" } : item)); setNotice({ type: "success", text: "Approval confirmed. You can swap now." }); } catch (error) { setNotice({ type: "error", text: error.shortMessage || error.message }); } finally { setBusy(""); }
  }
  async function swap() {
    if (!signer || !configured || !amount || !quote) return setNotice({ type: "error", text: "Connect a wallet and enter a valid amount first." });
    try { setBusy("swap"); const pair = new Contract(pairAddress, pairAbi, signer); const minimum = parseUnits(minReceived.toFixed(18), 18); const tx = await pair.swap(inputIndex === 0, parseUnits(amount, 18), minimum); addTx(`Swap ${inputToken.symbol} for ${outputToken.symbol}`, tx.hash); await tx.wait(); setTransactions((items) => items.map((item) => item.hash === tx.hash ? { ...item, state: "confirmed" } : item)); setAmount(""); setNotice({ type: "success", text: "Swap confirmed. Your tokens are on the way." }); loadPool(); } catch (error) { setNotice({ type: "error", text: error.shortMessage || error.message }); } finally { setBusy(""); }
  }
  function flipTokens() { setInputIndex(outputIndex); setAmount(""); }

  return <div>
    <header><h1>miniDEX</h1><p>Network: Hardhat local</p><button onClick={connect}>{account ? shortAddress(account) : "Connect wallet"}</button></header>
    <main>
      <section><h2>Swap Token A and Token B</h2><p>Constant-product AMM with a 0.30% swap fee.</p><p>Pool reserves: {number(reserves.a)} TKA / {number(reserves.b)} TKB</p><p>Wallet: {account ? "Connected" : "Not connected"}</p><h3>Swap</h3>
        <label>You pay ({inputToken.symbol}) - balance {number(balance)}</label><br /><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /> <strong>{inputToken.symbol}</strong><br /><br />
        <button onClick={flipTokens}>Reverse tokens</button><br /><br />
        <label>You receive ({outputToken.symbol})</label><br /><input readOnly value={quote ? number(quote, 8) : ""} placeholder="0.00" /> <strong>{outputToken.symbol}</strong>
        <p>Rate: 1 {inputToken.symbol} = {quote && amount ? number(Number(quote) / Number(amount), 4) : "-"} {outputToken.symbol}</p><p>Price impact: {priceImpact ? `${number(priceImpact, 2)}%` : "-"}</p><p>Minimum received: {minReceived ? number(minReceived, 8) : "-"} {outputToken.symbol}</p><p>Slippage: {slippage}% <button onClick={() => setShowSettings(!showSettings)}>Change</button></p>
        {showSettings && <p>Slippage: {["0.5", "1.0", "2.0"].map((value) => <button key={value} onClick={() => setSlippage(value)}>{value}%</button>)}</p>}
        {notice.text && <p>{notice.type}: {notice.text}</p>}
        <button onClick={approve} disabled={!!busy || !amount}>{busy === "approve" ? "Approving..." : "Approve"}</button> <button onClick={swap} disabled={!!busy || !amount || !quote}>{busy === "swap" ? "Swapping..." : "Swap"}</button>
      </section>
      <section><h2>Liquidity pool</h2><p>Add liquidity using the deployed contract.</p><label>Token A amount</label><br /><input value={liquidityAmount} onChange={(event) => setLiquidityAmount(event.target.value)} placeholder="0.00" /><br /><button onClick={() => setNotice({ type: "success", text: "Approve both tokens, then add liquidity from your wallet." })}>Add liquidity</button></section>
      <section><h2>Recent transactions</h2>{transactions.length === 0 ? <p>No transactions yet.</p> : transactions.map((tx) => <p key={tx.hash}>{tx.label}: {tx.state} ({shortAddress(tx.hash)})</p>)}</section>
    </main><footer>miniDEX educational AMM demo</footer>
  </div>;
}
