"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import PublicSaleABI from "../abis/PublicSale.json";

// const PUBLIC_SALE_ADDRESS = "0x5f423380a767f5B168f34fD5cE927C1FEBE138b3";
// const PUBLIC_SALE_ADDRESS = "0xFBaDe37f4fE4ab9Fdbc8ad93C6aC3374f3B06730";
// const PUBLIC_SALE_ADDRESS = "0x9a159d3AAa96234061828E785F0c455C2262259D";
const PUBLIC_SALE_ADDRESS = "0x675Dae3cBdf311878dF75e04e802e9A8F24073b2";
const CHAINLINK_FEED_ADDRESS = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // native/USD feed on Ethereum mainnet

const Button = ({ children, onClick, disabled = false, className = "" }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded text-white ${
      disabled
        ? "bg-gray-400 cursor-not-allowed"
        : "bg-blue-500 hover:bg-blue-600"
    } ${className}`}
  >
    {children}
  </button>
);

export default function PresalePage() {
  const [address, setAddress] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);

  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  // Contract state
  const [saleActive, setSaleActive] = useState(false);
  const [purchasedAmount, setPurchasedAmount] = useState("0");
  const [totalSold, setTotalSold] = useState("0");
  const [maxPerWallet, setMaxPerWallet] = useState("0");
  const [tgeTimestamp, setTgeTimestamp] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [claimed, setClaimed] = useState(false);

  

  // Connect wallet & contract
  async function connectWallet() {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      await newProvider.send("eth_requestAccounts", []);
      const newSigner = await newProvider.getSigner();
      const userAddress = await newSigner.getAddress();

      setProvider(newProvider);
      setSigner(newSigner);
      setAddress(userAddress);



      const saleContract = new ethers.Contract(
        PUBLIC_SALE_ADDRESS,
        PublicSaleABI,
        newSigner
      );
      setContract(saleContract);
    } catch (err) {
      console.error("Connection error:", err);
      alert("Connection failed: " + (err.message || err));
    }
  }

  // Disconnect wallet
  const disconnectWallet = () => {
    setAddress("");
    setProvider(null);
    setSigner(null);
    setContract(null);
    setAmount("");
    setSaleActive(false);
    setPurchasedAmount("0");
    setTotalSold("0");
    setMaxPerWallet("0");
    setClaimed(false);
  };

  // Fetch sale-related info from contract on load and on address change
  useEffect(() => {
    if (!contract || !address) return;

    async function fetchSaleData() {
      try {
        const active = await contract.saleActive();
        console.log('Sale active:', active);

        const purchased = await contract.purchased(address);
        console.log('Purchased by address:', purchased);

        const total = await contract.totalSold();
        console.log('Total sold:', total);

        const maxWallet = await contract.maxPerWallet();
        console.log('Max per wallet:', maxWallet);

        const tge = await contract.tgeTimestamp();
        console.log('TGE timestamp:', tge);

        const hasClaimed = await contract.claimed(address);
        console.log('Has claimed:', hasClaimed);

        const now = Math.floor(Date.now() / 1000);
        console.log('Current timestamp:', now);

        const canClaimTokens = now >= tge && !hasClaimed;
        console.log('Can claim tokens:', canClaimTokens);


        setSaleActive(active);
        setPurchasedAmount(ethers.formatUnits(purchased, 18));
        setTotalSold(ethers.formatUnits(total, 18));
        setMaxPerWallet(ethers.formatUnits(maxWallet, 18));
        setTgeTimestamp(tge.toNumber ? tge.toNumber() : tge); // support ethers v6 BigNumber
        setClaimed(hasClaimed);
        setCanClaim(canClaimTokens);
      } catch (err) {
        console.error("Error fetching sale data:", err);
      }
    }

    fetchSaleData();
  }, [contract, address, loading]);

  // Buy function: buyWithNative
  async function handleBuy() {
    if (!contract || !signer) return alert("Please connect your wallet");

    if (!amount || isNaN(amount) || Number(amount) <= 0)
      return alert("Enter a valid RCX amount");

    setLoading(true);
    try {
      const rcxAmount18 = ethers.parseUnits(amount, 18);

      // Get native coin cost
      const nativeValue = await contract.nativeCost(rcxAmount18);

      if (nativeValue === 0n) {
        alert("Calculated native cost is zero. Price feed might be stale.");
        setLoading(false);
        return;
      }

      const tx = await contract.buyWithNative(rcxAmount18, {
        value: nativeValue,
      });

      await tx.wait();

      alert("Tokens purchased successfully!");

      // Refresh sale info
      setAmount("");
    } catch (err) {
      console.error("Buy failed:", err);
      alert("Error: " + (err?.message ?? "Transaction failed"));
    } finally {
      setLoading(false);
    }
  }

  // Claim vesting function
  async function handleClaim() {
    if (!contract) return alert("Not connected");
    setLoading(true);
    try {
      const tx = await contract.claimToVesting();
      await tx.wait();
      alert("Vesting claim successful!");
    } catch (err) {
      console.error(err);
      alert("Error: " + (err?.message ?? "Claim failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center p-10 max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-6">🚀 RCX Presale</h1>

      {!address ? (
        <Button onClick={connectWallet}>Connect MetaMask</Button>
      ) : (
        <>
          <p className="mb-2 text-sm text-gray-600">Connected: {address}</p>
          <p className="mb-2">
            <b>Sale Status:</b>{" "}
            {saleActive ? (
              <span className="text-green-600 font-semibold">Active</span>
            ) : (
              <span className="text-red-600 font-semibold">Inactive</span>
            )}
          </p>
          <p className="mb-2">
            <b>Purchased:</b> {purchasedAmount} RCX / Max per wallet: {maxPerWallet} RCX
          </p>
          <p className="mb-4">
            <b>Total Sold:</b> {totalSold} RCX
          </p>

          {saleActive && (
            <>
              <input
                type="number"
                placeholder="RCX amount"
                value={amount}
                min="0"
                step="any"
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border p-2 rounded mb-4"
                disabled={loading}
              />

              <Button onClick={handleBuy} disabled={loading || !amount}>
                {loading ? "Processing..." : "Buy RCX with Native Coin"}
              </Button>
            </>
          )}

          <hr className="my-6 w-full" />

          <div className="flex flex-col space-y-3 w-full">
            <Button
              onClick={handleClaim}
              disabled={loading || !canClaim}
              className="bg-green-500 hover:bg-green-600"
            >
              {loading
                ? "Processing..."
                : claimed
                ? "Already Claimed"
                : canClaim
                ? "Claim Vesting"
                : `Claim Disabled (TGE at ${new Date(
                    tgeTimestamp * 1000
                  ).toLocaleString()})`}
            </Button>

            <Button
              onClick={disconnectWallet}
              className="bg-red-500 hover:bg-red-600"
              disabled={loading}
            >
              Disconnect Wallet
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
