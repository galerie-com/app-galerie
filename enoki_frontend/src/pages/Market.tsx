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
        } catch {}
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

      alert(`Purchased ${shares.toString()} share(s) successfully!`);
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
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            overflow: "auto",
          }}
        >
          {!selectedSaleId ? (
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
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', padding: 4, borderRadius: 9999, border: '1px solid #e5e7eb' }}>
                  <button onClick={() => setFilter('All')} style={{ padding: "6px 16px", borderRadius: 9999, border: 'none', background: filter === 'All' ? "#3b82f6" : "transparent", color: filter === 'All' ? '#fff' : '#6b7280', fontWeight: 500, cursor: 'pointer', fontSize: 14 }}>All</button>
                  <button onClick={() => setFilter('Available')} style={{ padding: "6px 16px", borderRadius: 9999, border: 'none', background: filter === 'Available' ? "#3b82f6" : "transparent", color: filter === 'Available' ? '#fff' : '#6b7280', fontWeight: 500, cursor: 'pointer', fontSize: 14 }}>Available</button>
                  <button onClick={() => setFilter('Sold Out')} style={{ padding: "6px 16px", borderRadius: 9999, border: 'none', background: filter === 'Sold Out' ? "#3b82f6" : "transparent", color: filter === 'Sold Out' ? '#fff' : '#6b7280', fontWeight: 500, cursor: 'pointer', fontSize: 14 }}>Sold Out</button>
                </div>
              </div>
              {!sales ? (
                <p>Loading…</p>
              ) : (sales as any[]).length === 0 ? (
                <p>No sales found.</p>
              ) : (
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.1fr 1fr 1fr 1.2fr 40px", padding: "12px 16px", color: "#6b7280", fontSize: 12, borderBottom: "1px solid #e5e7eb", textTransform: 'uppercase' }}>
                    <div>Asset</div>
                    <div>Shares Sold</div>
                    <div>Available</div>
                    <div>Share Price</div>
                    <div>Progress</div>
                    <div />
                  </div>
                  {(sales as any[]).map((s: any, i: number) => {
                    const sold = s.sold as bigint | undefined;
                    const available = s.available as bigint | undefined;
                    const totalSupply = s.totalSupply as bigint;
                    const percent = Number(totalSupply === 0n ? 0 : (Number(sold ?? 0) / Number(totalSupply)) * 100);
                    return (
                      <div key={s.id} onClick={() => setSelectedSaleId(s.id)} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.1fr 1fr 1fr 1.2fr 40px", padding: "14px 16px", alignItems: "center", cursor: "pointer", borderTop: i === 0 ? "none" : "1px solid #f3f4f6" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 6, overflow: "hidden", background: "#f3f4f6" }}>
                            <img src={s.image} alt={s.symbol} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <strong style={{ fontSize: 14 }}>{s.name}</strong>
                            <span style={{ fontSize: 12, color: "#6b7280" }}>Token ID: #{(s.index || (i+1))}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 14 }}>{sold !== undefined ? `${formatInt(sold)} / ${formatInt(totalSupply)}` : `${formatInt(0n)} / ${formatInt(totalSupply)}`}</div>
                        <div>
                          <span style={{ background: "#e8fff1", color: "#059669", padding: "4px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{formatInt(available ?? (totalSupply))} shares</span>
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{formatUSDC(s.pps as bigint)} $</div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>per share</div>
                        </div>
                        <div>
                          <div style={{ height: 6, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(100, Math.max(0, percent)).toFixed(1)}%`, height: 6, background: "#3b82f6" }} />
                          </div>
                          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{percent.toFixed(1)}% complete</div>
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
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "48px", alignItems: "flex-start", marginTop: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "2.5rem" }}>{product?.name}</h2>
                  <div style={{ color: "#6b7280", fontSize: '1rem', marginTop: 4 }}>Token ID: #{sales?.find(s => s.id === selectedSaleId)?.index || ''}</div>
                  <div style={{ marginTop: 24, borderRadius: 12, overflow: "hidden", background: "#fff", border: "1px solid #e5e7eb" }}>
                    <img src={product?.image} alt={product?.name || 'Asset'} style={{ width: "100%", height: "auto", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  </div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 14, color: "#6b7280" }}>Share Price</div>
                    <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{product ? `${formatUSDC(product.totalPrice / product.totalSupply)} $` : '-'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                      <div style={{ fontSize: 20, fontWeight: 600 }}>{product ? formatInt(product.totalSupply) : '-'}</div>
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
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{product ? `${(100 * (Number(product.totalSupply - (product as any).remaining) / Number(product.totalSupply))).toFixed(1)}%` : '0.0%'}</div>
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
                    <div style={{ fontSize: 14, color: '#6b7280' }}>Number of shares</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #d1d5db', borderRadius: 8, padding: '4px 8px', marginTop: 8 }}>
                      <button onClick={() => handleBuyAmountChange(-1)} style={{ background: 'transparent', border: 'none', fontSize: 24, cursor: 'pointer', color: '#9ca3af', width: 32, height: 32 }}>-</button>
                      <input type="text" value={buyAmount} onChange={(e) => setBuyAmount(e.target.value.replace(/[^0-9]/g, ''))} style={{ border: 'none', textAlign: 'center', fontWeight: 600, fontSize: 18, width: '100%' }} />
                      <button onClick={() => handleBuyAmountChange(1)} style={{ background: 'transparent', border: 'none', fontSize: 24, cursor: 'pointer', color: '#9ca3af', width: 32, height: 32 }}>+</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 14, color: '#6b7280' }}>Total:</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{product ? `${formatUSDC((product.totalPrice / product.totalSupply) * BigInt(buyAmount || '0'))} $` : '-'}</div>
                  </div>
                  <button onClick={handleBuySelectedSale} disabled={isLoading} style={{ width: '100%', padding: "12px 16px", borderRadius: 10, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 600, cursor: isLoading ? "not-allowed" : "pointer", fontSize: 16 }}>
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
