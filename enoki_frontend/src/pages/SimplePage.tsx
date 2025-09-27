import { useCurrentAccount } from "@mysten/dapp-kit";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { BalanceComponent } from "../components/GetBalance";

interface SimplePageProps {
  currentPage: string;
}

export default function SimplePage({ currentPage }: SimplePageProps) {
  const currentAccount = useCurrentAccount();

  if (!currentAccount) {
    return (
      <div style={{ padding: "48px", fontFamily: "Inter, sans-serif" }}>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "16px" }}>You are not logged in.</h1>
        <Link to="/" style={{ color: "#4338ca" }}>
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        backgroundColor: "#f9fafb",
        width: "100vw",
        overflow: "hidden",
        position: "fixed",
        top: 0,
        left: 0,
      }}
    >
      <Sidebar currentPage={currentPage} />
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
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}></div>
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
          }}
        />
      </div>
    </div>
  );
}
