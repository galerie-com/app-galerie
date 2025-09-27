import { useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Link } from "react-router-dom";
import { useState } from "react";
import LogoutButton from "../components/LogoutButton";
import { BalanceComponent } from "../components/GetBalance";
import { useSignTransaction, useSuiClient } from "@mysten/dapp-kit";
import { toBase64 } from "@mysten/sui/utils";
import Sidebar from "../components/Sidebar";

const BACKEND_URL = "http://localhost:3001";
const MONA_LISA_SALE_ID = "0xff119d7b7d56baca7e6bcc4a4291e6a3b713f0cd19bf064c4fff4661f98bc1ad";
const TEMPLATE_PACKAGE = "0x940d379eda1e4080460be94e20cc79b4f073cc60334e395cee9b798aff6a071b";
const USDC_TYPE = "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC";

async function getSuiCoin(
  tx: Transaction,
  owner: string,
  client: ReturnType<typeof useSuiClient>,
  amount: bigint
) {
  const clientRes = await client.getCoins({
    owner,
    coinType: "0x2::sui::SUI",
  });
  const coinObjects = clientRes?.data;
  if (!coinObjects.length) throw new Error("No coins");
  const totalBalance = coinObjects.reduce(
    (acc, coin) => acc + BigInt(coin.balance),
    0n
  );
  if (totalBalance < amount) {
    throw new Error("Insufficient SUI balance");
  }
  const primary = coinObjects[0].coinObjectId;
  if (coinObjects.length > 1) {
    const rest = coinObjects.slice(1).map((c) => c.coinObjectId);
    tx.mergeCoins(
      tx.object(primary),
      rest.map((id) => tx.object(id))
    );
  }
  const [sui_coin] = tx.splitCoins(primary, [amount]);
  return sui_coin;
}

async function sponsorAndExecute({
  tx,
  suiClient,
  signTransaction,
  currentAccount,
  allowedMoveCallTargets,
  allowedAddresses,
}: {
  tx: Transaction;
  suiClient: ReturnType<typeof useSuiClient>;
  signTransaction: ReturnType<typeof useSignTransaction>["mutateAsync"];
  currentAccount: any;
  allowedMoveCallTargets?: string[];
  allowedAddresses: string[];
}) {
  // 1. Build transaction bytes
  const txBytes = await tx.build({
    client: suiClient,
    onlyTransactionKind: true,
  });

  // 2. Request sponsorship from backend
  const sponsorResponse = await fetch(
    `${BACKEND_URL}/api/sponsor-transaction`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionKindBytes: toBase64(txBytes),
        sender: currentAccount.address,
        network: "testnet",
        ...(allowedMoveCallTargets && { allowedMoveCallTargets }),
        allowedAddresses,
      }),
    }
  );

  if (!sponsorResponse.ok) {
    const error = await sponsorResponse.json();
    throw new Error(`Sponsorship failed: ${error.error}`);
  }

  const { bytes, digest } = await sponsorResponse.json();

  // 3. Sign with user's zkLogin key
  const { signature } = await signTransaction({ transaction: bytes });
  if (!signature) {
    throw new Error("Error signing transaction");
  }

  // 4. Execute the transaction via backend
  const executeResponse = await fetch(
    `${BACKEND_URL}/api/execute-transaction`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ digest, signature }),
    }
  );

  if (!executeResponse.ok) {
    const error = await executeResponse.json();
    throw new Error(`Execution failed: ${error.error}`);
  }

  await executeResponse.json();
  return true;
}

export default function Market() {
  const currentAccount = useCurrentAccount();
  const [monaLisaShares, setMonaLisaShares] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suiClient = useSuiClient();
  const { mutateAsync: signTransaction } = useSignTransaction();

  if (!currentAccount) {
    return (
      <div>
        <h1>You are not logged in.</h1>
        <Link to="/">Go to Login</Link>
      </div>
    );
  }

  const handleAdd = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const tx = new Transaction();
      tx.moveCall({
        target:
          "0x3ada74eccbf36f560ebef40472df7ad365f61044f2f3a10f8b35d3cf8b9da5d9::smsui::add",
        arguments: [
          tx.object(
            "0x55909cda39176dabfc102a354f81868023ed2b4721a373f3684532e530b06a94"
          ),
        ],
      });

      await sponsorAndExecute({
        tx,
        suiClient,
        signTransaction,
        currentAccount,
        allowedMoveCallTargets: [
          "0x3ada74eccbf36f560ebef40472df7ad365f61044f2f3a10f8b35d3cf8b9da5d9::smsui::add",
        ],
        allowedAddresses: [currentAccount.address],
      });

      alert("Transaction sent successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyMonaLisaShares = async () => {
    const trimmedShares = monaLisaShares.trim();

    if (!trimmedShares) {
      setError("Please enter a share amount");
      return;
    }

    let shares: bigint;
    try {
      shares = BigInt(trimmedShares);
    } catch {
      setError("Share amount must be a whole number");
      return;
    }

    if (shares <= 0n) {
      setError("Share amount must be greater than zero");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const saleObj = await suiClient.getObject({
        id: MONA_LISA_SALE_ID,
        options: { showContent: true },
      });

      const saleFields = (saleObj as { data?: { content?: { fields: Record<string, unknown> } } })?.data?.content?.fields;

      if (!saleFields) {
        throw new Error("Unable to load Mona Lisa sale details");
      }

      const totalSupply = BigInt(saleFields.total_supply ?? 0);
      const totalPrice = BigInt(saleFields.total_price ?? 0);

      if (totalSupply <= 0n || totalPrice <= 0n) {
        throw new Error("Invalid sale configuration");
      }

      const pricePerShare = totalPrice / totalSupply;
      const cost = pricePerShare * shares;

      if (cost <= 0n) {
        throw new Error("Calculated cost must be greater than zero");
      }

      const tx = new Transaction();

      const usdcCoins = await suiClient.getCoins({
        owner: currentAccount.address,
        coinType: USDC_TYPE,
      });

      const usdcCoinData = usdcCoins.data ?? [];

      let totalBalance = 0n;
      const coinsToUse: string[] = [];

      for (const coin of usdcCoinData) {
        totalBalance += BigInt(coin.balance);
        coinsToUse.push(coin.coinObjectId);
        if (totalBalance >= cost) {
          break;
        }
      }

      if (totalBalance < cost) {
        throw new Error("Insufficient USDC balance for purchase");
      }

      if (!coinsToUse.length) {
        throw new Error("No USDC coins available for transaction");
      }

      const usdcCoin = tx.object(coinsToUse[0]);

      if (coinsToUse.length > 1) {
        tx.mergeCoins(
          usdcCoin,
          coinsToUse.slice(1).map((id) => tx.object(id))
        );
      }

      const [pay] = tx.splitCoins(usdcCoin, [tx.pure.u64(cost)]);

      const [fts, change] = tx.moveCall({
        target: `${TEMPLATE_PACKAGE}::template::buy`,
        typeArguments: [USDC_TYPE],
        arguments: [tx.object(MONA_LISA_SALE_ID), tx.pure.u64(shares), pay],
      }) as unknown as [unknown, unknown];

      tx.transferObjects([change, fts], tx.pure.address(currentAccount.address));
      tx.transferObjects([usdcCoin], tx.pure.address(currentAccount.address));

      await sponsorAndExecute({
        tx,
        suiClient,
        signTransaction,
        currentAccount,
        allowedMoveCallTargets: [
          `${TEMPLATE_PACKAGE}::template::buy`,
          "0x1::coin::balance_deposit",
        ],
        allowedAddresses: [currentAccount.address],
      });

      alert(`Purchased ${shares.toString()} Mona Lisa share(s) successfully!`);
      setMonaLisaShares("1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      backgroundColor: "#f9fafb",
      margin: 0,
      padding: 0,
      width: "100vw",
      overflow: "hidden",
      position: "fixed",
      top: 0,
      left: 0,
    }}>
      <Sidebar currentPage="market" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "24px 32px",
            backgroundColor: "#f9fafb",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "48px" }}>
            <svg style={{ width: "24px", height: "24px" }} fill="none" stroke="#000000" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <BalanceComponent ownerAddress={currentAccount.address} />
          </div>
        </header>

        <main
          style={{
            flex: 1,
            padding: "32px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
            overflow: "auto",
          }}
        >
          <section
            style={{
              backgroundColor: "#f9fafb",
              borderRadius: "16px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Mona Lisa Sale</h2>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.95rem" }}>
              Buy fractional shares on Sui testnet.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <label htmlFor="monaLisaSharesInput" style={{ fontWeight: 600 }}>
                Number of shares
              </label>
              <input
                id="monaLisaSharesInput"
                type="number"
                min="1"
                value={monaLisaShares}
                onChange={(e) => setMonaLisaShares(e.target.value)}
                style={{
                  width: "100px",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: "1px solid #d1d5db",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={handleBuyMonaLisaShares}
                disabled={isLoading}
                style={{
                  padding: "12px 24px",
                  borderRadius: "12px",
                  border: "none",
                  backgroundColor: "#4f46e5",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: isLoading ? "not-allowed" : "pointer",
                }}
              >
                {isLoading ? "Processing..." : "Buy Share Mona Lisa"}
              </button>
              <button
                onClick={handleAdd}
                disabled={isLoading}
                style={{
                  padding: "12px 24px",
                  borderRadius: "12px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "#ffffff",
                  color: "#374151",
                  fontWeight: 600,
                  cursor: isLoading ? "not-allowed" : "pointer",
                }}
              >
                {isLoading ? "Processing..." : "Add"}
              </button>
            </div>
            {error && <p style={{ color: "#dc2626", margin: 0 }}>{error}</p>}
          </section>
        </main>
      </div>
    </div>
  );
}
