import { useCurrentAccount } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Link } from "react-router-dom";
import { useState } from "react";
import { BalanceComponent } from "../components/GetBalance";
import { useSignTransaction, useSuiClient } from "@mysten/dapp-kit";
import { toBase64 } from "@mysten/sui/utils";
import Sidebar from "../components/Sidebar";
import { useQuery } from "@tanstack/react-query";
import { TEMPLATE_PACKAGE, USDC_TYPE } from "../const.ts";

const BACKEND_URL = "http://localhost:3001";

// (unused helper removed)

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
    client: suiClient as unknown as import('@mysten/sui/client').SuiClient,
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
  const [buyAmount, setBuyAmount] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suiClient = useSuiClient();
  const { mutateAsync: signTransaction } = useSignTransaction();

  // Utility: format USDC (6 decimals)
  const formatUSDC = (amount: bigint) => {
    const dollars = Number(amount) / 1_000_000;
    return `${dollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  function parseSaleShareCoinType(saleType: string): string | null {
    const m = saleType.match(/::template::Sale<(.+)>$/);
    return m ? m[1] : null;
  }

  const formatInt = (n: bigint) => Number(n).toLocaleString('en-US');

  // Simple in-page routing: list vs product detail
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');

  if (!currentAccount) {
    return (
      <div>
        <h1>You are not logged in.</h1>
        <Link to="/">Go to Login</Link>
      </div>
    );
  }

  // (unused demo action removed)

  // ---------- Explore: fetch all sales via events ----------
  const { data: sales } = useQuery({
    queryKey: ["sales_v2", TEMPLATE_PACKAGE],
    enabled: !!TEMPLATE_PACKAGE,
    queryFn: async () => {
      const ev = await suiClient.queryEvents({
        query: { MoveEventType: `${TEMPLATE_PACKAGE}::template::SaleStarted` },
        order: "descending",
        limit: 100,
      });
      const saleIds: string[] = ev.data.map((e: any) => e.parsedJson?.sale_id ?? e.parsedJson?.object_id).filter(Boolean);
      const unique = Array.from(new Set(saleIds));
      if (unique.length === 0) return [] as any[];

      const sales = await suiClient.multiGetObjects({ ids: unique, options: { showContent: true, showType: true } });
      const items = await Promise.all(sales.map(async (sale: any, idx: number) => {
        const id: string = sale?.data?.objectId;
        const fields: any = sale?.data?.content?.fields;
        const saleType: string = sale?.data?.type;
        const shareCoinType = saleType ? parseSaleShareCoinType(saleType) : null;
        const nft = fields?.vault?.fields?.nft?.fields;
        const totalSupply = BigInt(fields?.vault?.fields?.total_supply || 0);
        const totalPrice = BigInt(fields?.vault?.fields?.total_price || 0);
        const pps = totalSupply > 0n ? totalPrice / totalSupply : 0n;
        let symbol = 'SHARE';
        let shareDecimals = 0;
        let circulatingRaw = 0n;
        try {
          if (shareCoinType) {
            const meta = await suiClient.getCoinMetadata({ coinType: shareCoinType });
            if (meta?.symbol) symbol = meta.symbol;
            shareDecimals = meta?.decimals ?? 0;
            const supplyResult = await suiClient.getTotalSupply({ coinType: shareCoinType });
            circulatingRaw = BigInt(supplyResult?.value ?? '0');
          }
        } catch (_) {
          try {
            if (shareCoinType) {
              const ev = await suiClient.queryEvents({
                query: { MoveEventType: `${TEMPLATE_PACKAGE}::template::ShareBought` },
                order: 'descending',
                limit: 1000,
              });
              const minted = ev.data
                .filter((e: any) => {
                  const sid = e.parsedJson?.sale_id ?? e.parsedJson?.object_id;
                  return sid === id;
                })
                .reduce((sum: bigint, e: any) => sum + BigInt(e.parsedJson?.amount ?? 0), 0n);
              circulatingRaw = minted;
            }
        } catch {}
        }
        const scale = 10n ** BigInt(shareDecimals || 0);
        const sold = shareDecimals > 0 ? (circulatingRaw / scale) : circulatingRaw;
        const available = totalSupply > sold ? (totalSupply - sold) : 0n;
        return {
          id,
          index: idx + 1,
          name: nft?.name || 'Unknown Asset',
          description: nft?.description || '',
          image: nft?.image_url || 'https://via.placeholder.com/300x300?text=No+Image',
          totalSupply,
          totalPrice,
          pps,
          symbol,
          shareCoinType,
          sold,
          available,
        };
      }));
      return items;
    },
  });

  // ---------- Product: fetch details for selected sale ----------
  const { data: product } = useQuery({
    queryKey: ["product", selectedSaleId],
    enabled: !!selectedSaleId,
    queryFn: async () => {
      const saleObj = await suiClient.getObject({ id: selectedSaleId!, options: { showContent: true, showType: true, showPreviousTransaction: true } });
      const fields: any = (saleObj as any).data?.content?.fields;
      const nft = fields?.vault?.fields?.nft?.fields;
      const name = nft?.name ?? 'Unknown Asset';
      const description = nft?.description ?? '';
      const image = nft?.image_url ?? 'https://via.placeholder.com/300x300?text=No+Image';

      const saleType: string = (saleObj as any).data?.type;
      const shareCoinType = saleType ? parseSaleShareCoinType(saleType) : null;

      let circulating = 0n;
      let shareDecimals = 0;
      if (shareCoinType) {
        try {
          const meta = await suiClient.getCoinMetadata({ coinType: shareCoinType });
          shareDecimals = meta?.decimals ?? 0;
          const supplyResult = await suiClient.getTotalSupply({ coinType: shareCoinType });
          circulating = BigInt(supplyResult?.value ?? '0');
        } catch (_) {
          try {
            const ev = await suiClient.queryEvents({
              query: { MoveEventType: `${TEMPLATE_PACKAGE}::template::ShareBought` },
              order: 'descending',
              limit: 1000,
            });
            const minted = ev.data
              .filter((e: any) => {
                const sid = e.parsedJson?.sale_id ?? e.parsedJson?.object_id;
                return sid === selectedSaleId;
              })
              .reduce((sum: bigint, e: any) => sum + BigInt(e.parsedJson?.amount ?? 0), 0n);
            circulating = minted;
          } catch {}
        }
      }

      const totalSupplyBig = BigInt(fields?.vault?.fields?.total_supply || 0);
      const totalPriceBig = BigInt(fields?.vault?.fields?.total_price || 0);
      const scale = 10n ** BigInt(shareDecimals);
      const circulatingShares = shareDecimals > 0 ? (circulating / scale) : circulating;
      const remaining = totalSupplyBig > circulatingShares ? (totalSupplyBig - circulatingShares) : 0n;

      let symbol = 'SHARE';
      try { if (shareCoinType) { const meta = await suiClient.getCoinMetadata({ coinType: shareCoinType }); if (meta?.symbol) symbol = meta.symbol; } } catch {}

      return { id: selectedSaleId!, totalSupply: totalSupplyBig, totalPrice: totalPriceBig, remaining, symbol, name, description, image, shareCoinType, shareDecimals };
    },
  });

  const { data: perAssetHoldings } = useQuery({
    queryKey: ["perAssetHoldings", selectedSaleId, currentAccount?.address, (product as any)?.shareCoinType],
    enabled: !!selectedSaleId && !!currentAccount?.address && !!(product as any)?.shareCoinType,
    queryFn: async () => {
      try {
        const shareCoinType = (product as any)?.shareCoinType as string;
        const coins = await suiClient.getCoins({ owner: currentAccount!.address, coinType: shareCoinType });
        return coins.data.reduce((sum: bigint, c: any) => sum + BigInt(c.balance), 0n);
      } catch { return 0n; }
    },
  });

  const handleBuyAmountChange = (increment: number) => {
    const currentAmount = BigInt(buyAmount || '0');
    const newAmount = currentAmount + BigInt(increment);
    if (newAmount > 0) {
      setBuyAmount(newAmount.toString());
    }
  };

  // ---------- Product: buy from selected sale using USDC ----------
  const handleBuySelectedSale = async () => {
    const trimmed = buyAmount.trim();
    if (!trimmed) { setError("Please enter a share amount"); return; }
    let shares: bigint;
    try { shares = BigInt(trimmed); } catch { setError("Share amount must be a whole number"); return; }
    if (shares <= 0n) { setError("Share amount must be greater than zero"); return; }
    if (!selectedSaleId) { setError("No sale selected"); return; }

    try {
      setIsLoading(true);
      setError(null);

      const saleObj = await suiClient.getObject({ id: selectedSaleId, options: { showContent: true, showType: true } });
      const saleFields = (saleObj as { data?: { content?: { fields: Record<string, unknown> } } })?.data?.content?.fields as any;
      if (!saleFields) throw new Error("Unable to load sale details");
      const vfields = saleFields?.vault?.fields as any;
      if (!vfields) throw new Error("Invalid sale structure: missing vault fields");
      const saleType: string | undefined = (saleObj as any)?.data?.type;
      const shareCoinType = saleType ? parseSaleShareCoinType(saleType) : null;
      if (!shareCoinType) throw new Error("Unable to resolve share coin type for sale");

      const totalSupply = BigInt(vfields.total_supply ?? 0);
      const totalPrice = BigInt(vfields.total_price ?? 0);
      if (totalSupply <= 0n || totalPrice <= 0n) throw new Error(`Invalid sale configuration: totalSupply=${totalSupply.toString()} totalPrice=${totalPrice.toString()}`);

      const pricePerShare = totalPrice / totalSupply;
      const cost = pricePerShare * shares;
      if (cost <= 0n) throw new Error("Calculated cost must be greater than zero");

      const tx = new Transaction();

      const usdcCoins = await suiClient.getCoins({ owner: currentAccount.address, coinType: USDC_TYPE });
      const usdcCoinData = usdcCoins.data ?? [];
      let totalBalance = 0n;
      const coinsToUse: string[] = [];
      for (const coin of usdcCoinData) {
        totalBalance += BigInt(coin.balance);
        coinsToUse.push(coin.coinObjectId);
        if (totalBalance >= cost) break;
      }
      if (totalBalance < cost) throw new Error("Insufficient USDC balance for purchase");
      if (!coinsToUse.length) throw new Error("No USDC coins available for transaction");

      const usdcCoin = tx.object(coinsToUse[0]);
      if (coinsToUse.length > 1) {
        tx.mergeCoins(usdcCoin, coinsToUse.slice(1).map((id) => tx.object(id)));
      }
      const [pay] = tx.splitCoins(usdcCoin, [tx.pure.u64(cost)]);

      const [fts, change] = tx.moveCall({
        target: `${TEMPLATE_PACKAGE}::template::buy`,
        typeArguments: [USDC_TYPE, shareCoinType],
        arguments: [tx.object(selectedSaleId), tx.pure.u64(shares), pay],
      }) as unknown as [
        import('@mysten/sui/transactions').TransactionObjectArgument,
        import('@mysten/sui/transactions').TransactionObjectArgument
      ];

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

      // Purchase successful - no notification needed
      setBuyAmount("1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex",
        minHeight: "100vh",
      backgroundColor: "#f9fafb",
      margin: 0,
      padding: 0,
      width: "100vw",
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
            padding: "16px 20px",
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
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            overflow: "hidden",
          }}
        >
          {!selectedSaleId ? (
          <section
            style={{
              backgroundColor: "#f9fafb",
              borderRadius: "16px",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              overflow: "hidden",
            }}
          >
              {/* Grande barre arrondie englobant tout */}
              <div style={{ 
                display: "inline-flex", 
                alignItems: "center", 
                gap: 16,
                padding: "8px 16px",
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: 50,
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
              }}>
                {/* Filter Icon */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 6H20M7 12H17M10 18H14" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span style={{ fontSize: 14, color: "#6b7280", fontWeight: 500 }}>Filter</span>
                </div>
                
                {/* Filter Buttons */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: 4,
                  borderRadius: 25,
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0'
                }}>
                  <button 
                    onClick={() => setFilter('All')} 
                    style={{
                      padding: "8px 16px",
                      borderRadius: 20,
                      border: 'none',
                      background: filter === 'All' ? "#e0e7ff" : "transparent",
                      color: filter === 'All' ? '#4338ca' : '#6b7280',
                      fontWeight: filter === 'All' ? 600 : 500,
                      cursor: 'pointer',
                      fontSize: 14,
                      transition: 'all 0.2s ease',
                      boxShadow: filter === 'All' ? '0 1px 2px rgba(67, 56, 202, 0.1)' : 'none',
                      outline: 'none'
                    }}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setFilter('Available')} 
                    style={{
                      padding: "8px 16px",
                      borderRadius: 20,
                      border: 'none',
                      background: filter === 'Available' ? "#e0e7ff" : "transparent",
                      color: filter === 'Available' ? '#4338ca' : '#6b7280',
                      fontWeight: filter === 'Available' ? 600 : 500,
                      cursor: 'pointer',
                      fontSize: 14,
                      transition: 'all 0.2s ease',
                      boxShadow: filter === 'Available' ? '0 1px 2px rgba(67, 56, 202, 0.1)' : 'none',
                      outline: 'none'
                    }}
                  >
                    Available
                  </button>
                  <button 
                    onClick={() => setFilter('Sold Out')} 
                    style={{
                      padding: "8px 16px",
                      borderRadius: 20,
                      border: 'none',
                      background: filter === 'Sold Out' ? "#e0e7ff" : "transparent",
                      color: filter === 'Sold Out' ? '#4338ca' : '#6b7280',
                      fontWeight: filter === 'Sold Out' ? 600 : 500,
                      cursor: 'pointer',
                      fontSize: 14,
                      transition: 'all 0.2s ease',
                      boxShadow: filter === 'Sold Out' ? '0 1px 2px rgba(67, 56, 202, 0.1)' : 'none',
                      outline: 'none'
                    }}
                  >
                    Sold Out
                  </button>
                </div>
              </div>
              {!sales ? (
                <p>Loading…</p>
              ) : (sales as any[]).length === 0 ? (
                <p>No sales found.</p>
              ) : (
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.1fr 1fr 1fr 1.2fr 40px", padding: "12px 16px", color: "#6b7280", fontSize: 12, borderBottom: "1px solid #e5e7eb", textTransform: 'uppercase', textAlign: 'left' }}>
                    <div>Asset</div>
                    <div>Shares Sold</div>
                    <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Available</div>
                    <div>Share Price</div>
                    <div>Progress</div>
                    <div />
                  </div>
                  {(sales as any[])
                    .filter((s: any) => {
                      if (filter === 'All') return true;
                      const available = s.available as bigint | undefined;
                      if (filter === 'Available') return (available ?? 0n) > 0n;
                      if (filter === 'Sold Out') return (available ?? 0n) === 0n;
                      return true;
                    })
                    .map((s: any, i: number) => {
                    const sold = s.sold as bigint | undefined;
                    const available = s.available as bigint | undefined;
                    const totalSupply = s.totalSupply as bigint;
                    const percent = Number(totalSupply === 0n ? 0 : (Number(sold ?? 0) / Number(totalSupply)) * 100);
                    return (
                       <div key={s.id} onClick={() => setSelectedSaleId(s.id)} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.1fr 1fr 1fr 1.2fr 40px", padding: "20px 16px", alignItems: "center", cursor: "pointer", borderTop: i === 0 ? "none" : "1px solid #f3f4f6", transition: "background-color 0.2s ease" }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f9fafb"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 56, height: 56, borderRadius: 8, overflow: "hidden", background: "#f3f4f6" }}>
                            <img src={s.image} alt={s.symbol} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ fontSize: 16, color: "#374151" }}>{s.name}</div>
                          </div>
                        </div>
                          <div style={{ fontSize: 15, color: "#374151", textAlign: 'left' }}>{sold !== undefined ? `${formatInt(sold)} / ${formatInt(totalSupply)}` : `${formatInt(0n)} / ${formatInt(totalSupply)}`}</div>
                        <div style={{ textAlign: 'left' }}>
                            <span style={{ background: "#e8fff1", color: "#059669", padding: "6px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600 }}>{formatInt(available ?? (totalSupply))} shares</span>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 600, color: "#374151", fontSize: 16 }}>{formatUSDC(s.pps as bigint)}$</div>
                          <div style={{ fontSize: 13, color: "#6b7280" }}>per share</div>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ height: 8, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(100, Math.max(0, percent)).toFixed(1)}%`, height: 8, background: "#3b82f6" }} />
                          </div>
                          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>{percent.toFixed(1)}% complete</div>
                        </div>
                        <div style={{ textAlign: "right", color: "#9ca3af", fontSize: 18 }}>›</div>
                      </div>
                    );
                  })}
            </div>
              )}
            </section>
          ) : (
            <section
                style={{
                backgroundColor: "#f9fafb",
              }}
            >
              <button onClick={() => setSelectedSaleId(null)} style={{ alignSelf: "flex-start", padding: "6px 10px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#6b7280' }}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.84182 3.13514C9.04327 3.32401 9.05348 3.64042 8.86462 3.84188L5.43521 7.49991L8.86462 11.1579C9.05348 11.3594 9.04327 11.6758 8.84182 11.8647C8.64036 12.0535 8.32394 12.0433 8.13508 11.8419L4.31894 7.84188C4.19448 7.71742 4.19448 7.50868 4.31894 7.38422L8.13508 3.38422C8.32394 3.18276 8.64036 3.14628 8.84182 3.13514Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                Back to Market
              </button>
               <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px", alignItems: "flex-start", marginTop: 16, overflow: "hidden" }}>
                <div style={{ overflow: "hidden" }}>
                  <h2 style={{ margin: 0, fontSize: "2.5rem", color: "#111827" }}>{product?.name}</h2>
                  <div style={{ color: "#6b7280", fontSize: '1rem', marginTop: 4 }}>{product?.description || `NFT #${sales?.find(s => s.id === selectedSaleId)?.index || ''}`}</div>
                   <div style={{ marginTop: 24, borderRadius: 12, overflow: "hidden", background: "#fff", border: "1px solid #e5e7eb", maxWidth: "500px", margin: "24px auto 0 auto" }}>
                       <img src={product?.image} alt={product?.name || 'Asset'} style={{ width: "100%", height: "auto", objectFit: "cover", maxHeight: "650px" }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 20, overflow: "hidden", marginTop: "160px", marginLeft: "-60px" }}>
                  <div>
                    <div style={{ fontSize: 14, color: "#6b7280" }}>Share Price</div>
                    <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: "#111827" }}>{product ? `${formatUSDC(product.totalPrice / product.totalSupply)}$` : '-'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                      <div style={{ fontSize: 20, fontWeight: 600, color: "#1f2937" }}>{product ? formatInt(product.totalSupply) : '-'}</div>
                      <div style={{ fontSize: 14, color: '#6b7280' }}>Total Shares</div>
                    </div>
                    <div style={{ flex: 1, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                      <div style={{ fontSize: 20, fontWeight: 600, color: '#10b981' }}>{product ? formatInt((product as any).remaining) : '-'}</div>
                      <div style={{ fontSize: 14, color: '#6b7280' }}>Available</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 14, color: '#6b7280' }}>Sales Progress</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>{product ? `${(100 * (Number(product.totalSupply - (product as any).remaining) / Number(product.totalSupply))).toFixed(1)}%` : '0.0%'}</div>
                    </div>
                    <div style={{ height: 8, background: "#e5e7eb", borderRadius: 999, overflow: "hidden", marginTop: 8 }}>
                      <div style={{ width: product ? `${(100 * (Number(product.totalSupply - (product as any).remaining) / Number(product.totalSupply))).toFixed(1)}%` : '0%', height: 8, background: "#3b82f6" }} />
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                      {product ? `${formatInt(product.totalSupply - (product as any).remaining)} of ${formatInt(product.totalSupply)} sold` : ''}
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid #e5e7eb' }} />
                  <div>
                    <div style={{ fontSize: 16, color: '#374151', fontWeight: 600, marginBottom: 12 }}>Number of shares</div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                      border: '2px solid #e2e8f0', 
                      borderRadius: 20, 
                      padding: '8px', 
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      {/* Effet de lueur en arrière-plan */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(90deg, transparent 0%, rgba(99, 102, 241, 0.05) 50%, transparent 100%)',
                        animation: 'shimmer 3s ease-in-out infinite',
                        pointerEvents: 'none'
                      }} />
                      
                      <button
                        onClick={() => handleBuyAmountChange(-1)}
                        style={{
                          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                          border: 'none',
                          fontSize: 22,
                          cursor: 'pointer',
                          color: '#ffffff',
                          width: 48,
                          height: 48,
                          borderRadius: 16,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          fontWeight: 800,
                          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                          outline: 'none',
                          position: 'relative',
                          zIndex: 1
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';
                          e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
                          e.currentTarget.style.transform = 'scale(1) translateY(0px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                        }}
                        onMouseDown={(e) => {
                          e.currentTarget.style.transform = 'scale(0.95) translateY(0px)';
                        }}
                        onMouseUp={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
                        }}
                      >−</button>
                      
                      <div style={{ 
                        flex: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        margin: '0 16px',
                        position: 'relative'
                      }}>
                        <input
                          type="text"
                          value={buyAmount}
                          onChange={(e) => setBuyAmount(e.target.value.replace(/[^0-9]/g, ''))}
                          style={{
                            border: 'none',
                            textAlign: 'center',
                            fontWeight: 900,
                            fontSize: 24,
                            width: '100%',
                            outline: 'none',
                            backgroundColor: 'transparent',
                            color: '#1f2937',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            letterSpacing: '0.5px'
                          }}
                          placeholder="1"
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: '-2px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '60%',
                          height: '2px',
                          background: 'linear-gradient(90deg, transparent 0%, #6366f1 50%, transparent 100%)',
                          borderRadius: '1px'
                        }} />
                      </div>
                      
                      <button
                        onClick={() => handleBuyAmountChange(1)}
                        style={{
                          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                          border: 'none',
                          fontSize: 22,
                          cursor: 'pointer',
                          color: '#ffffff',
                          width: 48,
                          height: 48,
                          borderRadius: 16,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          fontWeight: 800,
                          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                          outline: 'none',
                          position: 'relative',
                          zIndex: 1
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';
                          e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 8px 20px rgba(99, 102, 241, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)';
                          e.currentTarget.style.transform = 'scale(1) translateY(0px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                        }}
                        onMouseDown={(e) => {
                          e.currentTarget.style.transform = 'scale(0.95) translateY(0px)';
                        }}
                        onMouseUp={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
                        }}
                      >+</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                    <div style={{ fontSize: 14, color: '#6b7280' }}>Total:</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1f2937", marginLeft: 'auto' }}>{product ? `${formatUSDC((product.totalPrice / product.totalSupply) * BigInt(buyAmount || '0'))}$` : '-'}</div>
                  </div>
                  <button 
                    onClick={handleBuySelectedSale} 
                    disabled={isLoading} 
                    style={{ 
                      width: '100%', 
                      padding: "16px 20px", 
                      borderRadius: 12, 
                      border: "none", 
                      background: "#6366f1", 
                      color: "#ffffff", 
                      fontWeight: 700, 
                      cursor: isLoading ? "not-allowed" : "pointer", 
                      fontSize: 16,
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 6px rgba(99, 102, 241, 0.25)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.backgroundColor = '#4f46e5';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 12px rgba(99, 102, 241, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isLoading) {
                        e.currentTarget.style.backgroundColor = '#6366f1';
                        e.currentTarget.style.transform = 'translateY(0px)';
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(99, 102, 241, 0.25)';
                      }
                    }}
                  >
                    {isLoading ? "Processing..." : `Buy ${buyAmount} Share${buyAmount !== '1' ? 's' : ''}`}
              </button>
                  {error && <p style={{ color: "#dc2626", margin: 0, textAlign: 'center' }}>{error}</p>}
                </div>
            </div>
          </section>
          )}
        </main>
      </div>
    </div>
  );
}
