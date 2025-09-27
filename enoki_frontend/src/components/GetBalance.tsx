import { useSuiClientQueries } from "@mysten/dapp-kit";
import React from "react";

const SUI_TYPE = "0x2::sui::SUI";
const USDC_TYPE = "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC";

interface BalanceComponentProps {
  ownerAddress: string;
  loadingMessage?: string;
  errorMessage?: string;
}

export const BalanceComponent: React.FC<BalanceComponentProps> = ({
  ownerAddress,
  loadingMessage = "Loading balances...",
  errorMessage = "Error fetching balances",
}) => {
  const { data, isPending, isError } = useSuiClientQueries({
    queries: [
      {
        method: "getBalance",
        params: {
          owner: ownerAddress,
          coinType: USDC_TYPE,
        },
      },
    ],
    combine: (result) => {
      return {
        data: result.map((res) => res.data),
        isSuccess: result.every((res) => res.isSuccess),
        isPending: result.some((res) => res.isPending),
        isError: result.some((res) => res.isError),
      };
    },
  });

  if (isPending) {
    return <div>{loadingMessage}</div>;
  }

  if (isError) {
    return <div>{errorMessage}</div>;
  }

  return (
    <div>
      {(() => {
        const [usdcBalance] = data ?? [];
        const totalUsdc = usdcBalance?.totalBalance ? Number(usdcBalance.totalBalance) / 1_000_000 : 0;

        return (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "-16px" }}>
            <svg style={{ width: "24px", height: "24px" }} fill="none" stroke="#000000" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span style={{ fontSize: "18px", fontWeight: "500", color: "#374151" }}>
              {totalUsdc.toFixed(2)} $
            </span>
          </div>
        );
      })()}
    </div>
  );
};
