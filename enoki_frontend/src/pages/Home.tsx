import { useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Link } from "react-router-dom";
import { useState } from "react";
import LogoutButton from "../components/LogoutButton";
import { BalanceComponent } from "../components/GetBalance";
import { useSignTransaction, useSuiClient } from "@mysten/dapp-kit";
import { toBase64 } from "@mysten/sui/utils";
import Sidebar from "../components/Sidebar";
import contemporaryImage from "../assets/contemporary.jpeg";
import investmentImage from "../assets/investment.jpeg";
import streetArtImage from "../assets/streetart.jpeg";

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
  // const sui_coin = tx.splitCoins(tx.gas, [amount]);
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

export default function Home() {
  const currentAccount = useCurrentAccount();
  const [monaLisaShares, setMonaLisaShares] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newsItems = [
    {
      id: "contemporary-art",
      title: "Contemporary Art Market Surges 45%",
      date: "June 18, 2025",
      description:
        "The contemporary art market has seen unprecedented growth with digital art and NFTs leading the charge. Major galleries report 45% increase in sales volume.",
      image: contemporaryImage,
    },
    {
      id: "performance-art",
      title: "Performance Art Investment Platform Launches",
      date: "June 20, 2025",
      description:
        "A revolutionary platform allowing investors to purchase shares in live performance art pieces has launched. The platform has already facilitated over $2.3M in transactions.",
      image: investmentImage,
    },
    {
      id: "street-art",
      title: "Street Art Becomes Premium Investment Class",
      date: "June 12, 2025",
      description:
        "Street art pieces are now being recognized as legitimate investment assets. Banksy's works have seen 300% appreciation, while emerging street artists are attracting institutional capital.",
      image: streetArtImage,
    },
  ];

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
      <Sidebar currentPage="home" />
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
            paddingTop: "8px",
            paddingRight: "20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: "32px",
            paddingBottom: "48px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "24px",
              alignItems: "flex-start",
              width: "100%",
            }}
          >
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "24px",
              }}
            >
              <section
                style={{
                  width: "100%",
                  minHeight: "560px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                borderRadius: "6px",
                padding: "24px",
                boxShadow: "0 10px 25px -16px rgba(15, 23, 42, 0.28)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "24px",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  Total Portfolio Value
                </h2>
              </section>
              <section
                style={{
                  width: "100%",
                  backgroundColor: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  padding: "24px",
                  boxShadow: "0 10px 25px -16px rgba(15, 23, 42, 0.28)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  alignItems: "flex-start",
                  minHeight: "200px",
                }}
              >
                <h2
                  style={{
                    margin: 0,
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  Account Management
                </h2>
                <div
                  style={{
                    width: "100%",
                    height: "1px",
                    backgroundColor: "#e5e7eb",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <svg
                    style={{ width: "24px", height: "24px" }}
                    fill="none"
                    stroke="#000000"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  <span style={{ fontSize: "1rem", fontWeight: 500, color: "#111827" }}>Wallet</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                  <a
                    href={`https://explorer.sui.io/address/${currentAccount.address}?network=testnet`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontFamily: "monospace",
                      fontSize: "0.95rem",
                      color: "#2563eb",
                      textDecoration: "none",
                      wordBreak: "break-all",
                    }}
                  >
                    {currentAccount.address}
                  </a>
                </div>
              </section>
            </div>
            <section
              style={{
                width: "420px",
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                padding: "16px",
                boxShadow: "0 10px 25px -16px rgba(15, 23, 42, 0.28)",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                textAlign: "left",
                alignItems: "stretch",
                minHeight: "360px",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.15rem",
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                News
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  alignItems: "stretch",
                }}
              >
                {newsItems.map((item, index) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "9px",
                      alignItems: "flex-start",
                    }}
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      style={{
                        width: "100%",
                        height: "96px",
                        objectFit: "cover",
                        borderRadius: "6px",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        width: "100%",
                      }}
                    >
                      <strong style={{ fontSize: "0.95rem", color: "#111827", textAlign: "left" }}>
                        {item.title}
                      </strong>
                      <span style={{ fontSize: "0.78rem", color: "#6b7280", textAlign: "left" }}>
                        {item.date}
                      </span>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.82rem",
                          color: "#4b5563",
                          lineHeight: 1.5,
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          textAlign: "left",
                        }}
                      >
                        {item.description}
                      </p>
                    </div>
                    {index < newsItems.length - 1 && (
                      <div
                        style={{
                          height: "1px",
                          backgroundColor: "#e5e7eb",
                          marginTop: "4px",
                          width: "100%",
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
