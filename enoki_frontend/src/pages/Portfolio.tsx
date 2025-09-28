import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSuiClient } from "@mysten/dapp-kit";
import { Link } from "react-router-dom";
import { useState } from "react";
import { BalanceComponent } from "../components/GetBalance";
import Sidebar from "../components/Sidebar";
import { useQuery } from "@tanstack/react-query";
import { TEMPLATE_PACKAGE } from "../const.ts";

interface Asset {
  id: string;
  name: string;
  image: string;
  quantity: bigint;
  purchasePrice: number;
  currentPrice: number;
  value: number;
  allocation: number;
  color: string;
}

const ASSET_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', 
  '#6366f1', '#06b6d4', '#84cc16', '#f97316', '#ec4899'
];

export default function Portfolio() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const [selectedPeriod, setSelectedPeriod] = useState('1M');

  const formatUSDC = (amount: number) => {
    return `${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };

  const formatInt = (n: bigint) => Number(n).toLocaleString('en-US');

  function parseSaleShareCoinType(saleType: string): string | null {
    const m = saleType.match(/::template::Sale<(.+)>$/);
    return m ? m[1] : null;
  }

  // Fetch user's portfolio assets
  const { data: portfolioAssets } = useQuery({
    queryKey: ["portfolio", currentAccount?.address],
    enabled: !!currentAccount?.address,
    queryFn: async () => {
      if (!currentAccount?.address) return { assets: [], totalValue: 0 };

      // Get all sales to match with user's holdings
      const salesEvents = await suiClient.queryEvents({
        query: { MoveEventType: `${TEMPLATE_PACKAGE}::template::SaleStarted` },
        order: "descending",
        limit: 100,
      });

      const saleIds = salesEvents.data.map((e: any) => e.parsedJson?.sale_id ?? e.parsedJson?.object_id).filter(Boolean);
      const uniqueSaleIds = Array.from(new Set(saleIds));

      if (uniqueSaleIds.length === 0) return { assets: [], totalValue: 0 };

      const sales = await suiClient.multiGetObjects({ 
        ids: uniqueSaleIds, 
        options: { showContent: true, showType: true } 
      });

      const userAssets: Asset[] = [];
      let totalValue = 0;

      for (let i = 0; i < sales.length; i++) {
        const sale = sales[i];
        const fields: any = sale?.data?.content?.fields;
        const saleType: string = sale?.data?.type || '';
        const shareCoinType = parseSaleShareCoinType(saleType);
        
        if (!shareCoinType) continue;

        const nft = fields?.vault?.fields?.nft?.fields;
        const totalSupply = BigInt(fields?.vault?.fields?.total_supply || 0);
        const totalPrice = BigInt(fields?.vault?.fields?.total_price || 0);
        const pricePerShare = Number(totalPrice) / Number(totalSupply) / 1_000_000; // Convert from USDC

        try {
          // Check if user has this asset
          const userCoins = await suiClient.getCoins({ 
            owner: currentAccount.address, 
            coinType: shareCoinType 
          });

          if (userCoins.data.length > 0) {
            const totalBalance = userCoins.data.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
            
            if (totalBalance > 0n) {
              let shareDecimals = 0;
              try {
                const meta = await suiClient.getCoinMetadata({ coinType: shareCoinType });
                shareDecimals = meta?.decimals ?? 0;
              } catch {}

              const scale = 10n ** BigInt(shareDecimals || 0);
              const actualShares = shareDecimals > 0 ? totalBalance / scale : totalBalance;
              const assetValue = Number(actualShares) * pricePerShare;
              totalValue += assetValue;

              userAssets.push({
                id: sale?.data?.objectId || '',
                name: nft?.name || 'Unknown Asset',
                image: nft?.image_url || 'https://via.placeholder.com/64x64?text=No+Image',
                quantity: actualShares,
                purchasePrice: pricePerShare,
                currentPrice: pricePerShare,
                value: assetValue,
                allocation: 0, // Will be calculated after
                color: ASSET_COLORS[i % ASSET_COLORS.length]
              });
            }
          }
        } catch (error) {
          console.log(`Error checking asset ${nft?.name}:`, error);
        }
      }

      // Calculate allocations
      userAssets.forEach(asset => {
        asset.allocation = totalValue > 0 ? (asset.value / totalValue) * 100 : 0;
      });

      return { assets: userAssets, totalValue };
    },
  });

  const assets = portfolioAssets?.assets || [];
  const totalPortfolioValue = portfolioAssets?.totalValue || 0;

  if (!currentAccount) {
    return (
      <div>
        <h1>You are not logged in.</h1>
        <Link to="/">Go to Login</Link>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      backgroundColor: "#f9fafb",
      margin: 0,
      padding: 0,
      width: "100vw",
      overflow: "hidden",
    }}>
      <Sidebar currentPage="portfolio" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          backgroundColor: "#f9fafb",
        }}>
          <div></div>
          <div style={{ display: "flex", alignItems: "center", gap: "48px" }}>
            <svg style={{ width: "24px", height: "24px" }} fill="none" stroke="#000000" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <BalanceComponent ownerAddress={currentAccount.address} />
          </div>
        </header>

        <main style={{ flex: 1, padding: "12px", display: "flex", flexDirection: "column", gap: "24px", overflow: "auto", height: "calc(100vh - 80px)" }}>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
            <section style={{ backgroundColor: "#ffffff", borderRadius: "6px", padding: "24px", border: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600, color: "#111827" }}>
                  Total Portfolio Value
                </h3>
                
                {/* Time Period Selector */}
                <div style={{ display: "flex", backgroundColor: "#f3f4f6", borderRadius: "12px", padding: "4px" }}>
                  {['1D', '1W', '1M', '1Y'].map((period) => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriod(period)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: "none",
                        background: selectedPeriod === period ? "#6366f1" : "transparent",
                        color: selectedPeriod === period ? "#ffffff" : "#6b7280",
                        fontWeight: selectedPeriod === period ? 600 : 500,
                        cursor: "pointer",
                        fontSize: "14px",
                        transition: "all 0.2s ease",
                        outline: "none"
                      }}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{ fontSize: "48px", fontWeight: 800, color: "#111827", marginBottom: "24px", textAlign: "center" }}>
                {formatUSDC(totalPortfolioValue)}$
              </div>
              
              <h3 style={{ margin: "0 0 35px 0", fontSize: "18px", fontWeight: 600, color: "#111827", textAlign: "left", paddingLeft: "0" }}>
                Portfolio Allocation
              </h3>
              {assets.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  {/* Vertical Bar Chart */}
                  <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: "12px", height: "280px", padding: "0 8px" }}>
                    {assets.sort((a, b) => b.allocation - a.allocation).map((asset, index) => (
                      <div key={asset.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, maxWidth: "120px" }}>
                        {/* Bar */}
                        <div
                          style={{
                            width: "100%",
                            height: `${Math.max(asset.allocation * 6, 30)}px`, // Increased multiplier and min height
                            backgroundColor: asset.color,
                            borderRadius: "12px 12px 0 0",
                            marginBottom: "16px",
                            transition: "all 0.3s ease"
                          }}
                          title={`${asset.name}: ${asset.allocation.toFixed(1)}%`}
                        />
                        
                        {/* Label */}
                        <div style={{ textAlign: "center", width: "100%" }}>
                          <div style={{
                            fontSize: "13px",
                            color: "#374151",
                            fontWeight: 500,
                            marginBottom: "6px",
                            lineHeight: "1.3",
                            height: "auto",
                            overflow: "visible",
                            whiteSpace: "normal",
                            wordWrap: "break-word"
                          }}>
                            {(() => {
                              const words = asset.name.split(' ');
                              if (words.length <= 2) {
                                return asset.name;
                              } else {
                                return words.slice(0, 2).join(' ') + '...';
                              }
                            })()}
                          </div>
                          <div style={{ 
                            fontSize: "15px", 
                            color: "#111827", 
                            fontWeight: 700 
                          }}>
                            {asset.allocation.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "#6b7280", padding: "40px" }}>
                  No assets found in your portfolio
                </div>
              )}
            </section>

            <section style={{ backgroundColor: "#ffffff", borderRadius: "6px", padding: "24px", border: "1px solid #e5e7eb" }}>
              <h3 style={{ margin: "0 0 24px 0", fontSize: "20px", fontWeight: 600, color: "#111827" }}>
                Allocation
              </h3>
              {assets.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
                  {assets.sort((a, b) => b.allocation - a.allocation).map((asset) => (
                    <div key={asset.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: asset.color }} />
                        <span style={{ fontSize: "20px", color: "#374151", fontWeight: 500 }}>{asset.name}</span>
                      </div>
                      <span style={{ fontSize: "20px", fontWeight: 700, color: "#111827" }}>
                        {asset.allocation.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", color: "#6b7280", padding: "40px" }}>
                  No allocation data available
                </div>
              )}
            </section>
          </div>

          <section style={{ backgroundColor: "#ffffff", borderRadius: "6px", padding: "24px", border: "1px solid #e5e7eb" }}>
            <h3 style={{ margin: "0 0 24px 0", fontSize: "18px", fontWeight: 600, color: "#111827" }}>
              My Assets
            </h3>
            {assets.length > 0 ? (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px" }}>
                {/* Table Header */}
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.1fr 1fr 1fr 40px", padding: "12px 16px", color: "#6b7280", fontSize: 12, borderBottom: "1px solid #e5e7eb", textTransform: 'uppercase', textAlign: 'left' }}>
                  <div>Asset</div>
                  <div>Quantity</div>
                  <div>Purchase Price</div>
                  <div>Value</div>
                  <div />
                </div>

                {/* Table Rows */}
                {assets.map((asset, index) => {
                  const assetValue = Number(asset.quantity) * asset.purchasePrice;
                  return (
                    <div
                      key={asset.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.5fr 1.1fr 1fr 1fr 40px",
                        padding: "20px 16px",
                        alignItems: "center",
                        borderTop: index === 0 ? "none" : "1px solid #f3f4f6"
                      }}
                    >
                      {/* Asset Info */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 56, height: 56, borderRadius: 8, overflow: "hidden", background: "#f3f4f6" }}>
                          <img src={asset.image} alt={asset.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <div style={{ fontSize: 14, color: "#374151" }}>{asset.name}</div>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div style={{ fontSize: 14, color: "#374151", textAlign: "left" }}>
                        {formatInt(asset.quantity)}
                      </div>

                      {/* Purchase Price */}
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: 600, color: "#1f2937" }}>{formatUSDC(asset.purchasePrice)}$</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>per share</div>
                      </div>

                      {/* Value */}
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: 600, color: "#1f2937" }}>{formatUSDC(assetValue)}$</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>total value</div>
                      </div>

                      {/* Empty cell for spacing */}
                      <div></div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ 
                textAlign: "center", 
                color: "#6b7280", 
                padding: "60px 20px",
                border: "2px dashed #e5e7eb",
                borderRadius: "12px"
              }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📊</div>
                <div style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>No Assets Found</div>
                <div style={{ fontSize: "14px" }}>
                  Purchase some shares from the Market to see them in your portfolio
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
