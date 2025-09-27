import { useCurrentAccount } from "@mysten/dapp-kit";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { BalanceComponent } from "../components/GetBalance";

const categories = [
  { 
    id: "all", 
    name: "All", 
    icon: (
      <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    )
  },
  { 
    id: "account", 
    name: "Account", 
    icon: (
      <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )
  },
  { 
    id: "wallet", 
    name: "Wallet", 
    icon: (
      <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    )
  },
  { 
    id: "trading", 
    name: "Trading", 
    icon: (
      <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    )
  },
  { 
    id: "nft", 
    name: "NFTs", 
    icon: (
      <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
  { 
    id: "security", 
    name: "Security", 
    icon: (
      <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )
  },
  { 
    id: "fees", 
    name: "Fees", 
    icon: (
      <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )
  },
];

const faqs = [
  {
    id: 1,
    category: "account",
    question: "How do I create an account on Galerie?",
    answer:
      "To create an account on Galerie, simply connect you with your google account. Once connected, your account will be automatically created.",
  },
  {
    id: 5,
    category: "trading",
    question: "How do I buy my first asset?",
    answer:
      "To buy your first asset: 1) Connect you with your google account, 2) Add funds to your wallet 3) Browse the market or secondary market, 4) Click on an asset you want to buy, 5) Click 'Buy Now' and it's done you are a shareholder.",
  },
  {
    id: 7,
    category: "nft",
    question: "How can I create and list my own NFT?",
    answer:
      "Galerie currently focuses on curated collections. NFT creation and listing features are planned for future releases.",
  },
  {
    id: 8,
    category: "nft",
    question: "Can I transfer my assets to another wallet?",
    answer:
      "Yes. Assets are standard tokens that you can transfer using our dashboard.",
  },
  {
    id: 9,
    category: "fees",
    question: "Do I need to pay blockchain fees?",
    answer:
      "No! Galerie covers all blockchain transaction fees for you. You only need USDC in your wallet to buy assets - we handle all the gas fees automatically.",
  },
  {
    id: 10,
    category: "account",
    question: "What happens if I lose access to my Google account?",
    answer:
      "Contact our support team immediately. We can help you recover your account and transfer your assets to a new Google account for security.",
  },
  {
    id: 11,
    category: "trading",
    question: "Can I sell my assets back?",
    answer:
      "Currently, Galerie focuses on primary sales. Secondary market features where you can sell your assets to other users are coming soon.",
  },
  {
    id: 12,
    category: "trading",
    question: "What is the minimum amount I can invest?",
    answer:
      "You can buy fractional shares starting from as little as $10 USDC, making art investment accessible to everyone.",
  },
  {
    id: 13,
    category: "account",
    question: "How do I add USDC to my wallet?",
    answer:
      "You can currently add USDC to your wallet through centralized exchanges (CEX) such as Coinbase or Binance, then transfer it to your wallet. Very soon, we'll be integrating a direct on-ramp solution so you'll be able to buy USDC straight into your wallet without going through an exchange.",
  },
  {
    id: 14,
    category: "trading",
    question: "How do I know if an asset is a good investment?",
    answer:
      "Each asset comes with detailed information about the artwork, artist, and market analysis. Our team curates high-quality pieces with strong investment potential.",
  },
  {
    id: 15,
    category: "security",
    question: "Is my investment safe on Galerie?",
    answer:
      "Yes. Your assets are secured by blockchain technology and smart contracts. We use industry-leading security practices and your ownership is permanently recorded on-chain.",
  },
  {
    id: 16,
    category: "nft",
    question: "What makes Galerie different from other NFT platforms?",
    answer:
      "Galerie focuses on real-world art tokenization with fractional ownership. You're buying shares in actual artworks, not just digital images.",
  },
  {
    id: 18,
    category: "account",
    question: "How do I track my portfolio performance?",
    answer:
      "Portfolio tracking features are coming soon! We're currently developing a comprehensive dashboard that will show real-time portfolio value, individual asset performance, and detailed analytics.",
  },
];

export default function FAQ() {
  const currentAccount = useCurrentAccount();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [openQuestion, setOpenQuestion] = useState<number | null>(null);

  const filteredFaqs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return faqs.filter((faq) => {
      const matchesCategory = selectedCategory === "all" || faq.category === selectedCategory;
      const matchesSearch =
        faq.question.toLowerCase().includes(query) || faq.answer.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const toggleQuestion = (id: number) => {
    setOpenQuestion((prev) => (prev === id ? null : id));
  };

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
      <Sidebar currentPage="faq" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "24px 32px",
            backgroundColor: "#f9fafb",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}></div>
          <div style={{ display: "flex", alignItems: "center", gap: "48px" }}>
            <svg style={{ width: "20px", height: "20px", color: "#111827" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <BalanceComponent ownerAddress={currentAccount.address} />
          </div>
        </header>

        <main
          style={{
            flex: 1,
            padding: "32px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "1040px",
              margin: "0 auto",
              display: "flex",
              flexDirection: "column",
              gap: "24px",
            }}
          >
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {categories.map((category) => {
                const isSelected = selectedCategory === category.id;

                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 14px",
                      borderRadius: "999px",
                      border: isSelected ? "1px solid #4338ca" : "1px solid #e5e7eb",
                      backgroundColor: isSelected ? "#eef2ff" : "#ffffff",
                      color: isSelected ? "#4338ca" : "#4b5563",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "#f9fafb";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = "#ffffff";
                    }}
                  >
                    {category.icon}
                    {category.name}
                  </button>
                );
              })}
            </div>

            <section
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 10px 25px -18px rgba(15, 23, 42, 0.15)",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb" }}>
                <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#111827" }}>
                  {filteredFaqs.length} question{filteredFaqs.length !== 1 ? "s" : ""} found
                </h3>
              </div>

              {filteredFaqs.map((faq, index) => (
                <div
                  key={faq.id}
                  style={{
                    padding: "18px 24px",
                    borderBottom: index === filteredFaqs.length - 1 ? "none" : "1px solid #e5e7eb",
                  }}
                >
                  <button
                    onClick={() => toggleQuestion(faq.id)}
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "16px",
                    }}
                  >
                    <span style={{ fontSize: "1rem", fontWeight: 600, color: "#111827" }}>{faq.question}</span>
                    <svg
                      style={{
                        width: "20px",
                        height: "20px",
                        color: "#6b7280",
                        transform: openQuestion === faq.id ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                      }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openQuestion === faq.id && (
                    <div style={{ marginTop: "12px", color: "#4b5563", lineHeight: 1.6, textAlign: "left" }}>{faq.answer}</div>
                  )}
                </div>
              ))}
            </section>

            <section
              style={{
                backgroundColor: "#eef2ff",
                borderRadius: "16px",
                border: "1px solid #c7d2fe",
                padding: "24px",
                textAlign: "center",
                boxShadow: "0 10px 25px -18px rgba(99, 102, 241, 0.35)",
              }}
            >
              <h4 style={{ margin: "0 0 8px", fontSize: "1.1rem", color: "#312e81" }}>
                Didn’t find what you were looking for?
              </h4>
              <p style={{ margin: "0 0 16px", color: "#4338ca", fontSize: "0.95rem" }}>
                Our support team is here to help you with any questions.
              </p>
              <button
                onClick={() => (window.location.href = "/support")}
                style={{
                  backgroundColor: "#4338ca",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 20px",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#3730a3")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#4338ca")}
              >
                Contact Support
              </button>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
