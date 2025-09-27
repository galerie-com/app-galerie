import React from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { BalanceComponent } from "../components/GetBalance";

export default function Support() {
  const currentAccount = useCurrentAccount();

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
      position: "fixed",
      top: 0,
      left: 0,
    }}>
      <Sidebar currentPage="support" />
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
            alignItems: "center",
            gap: "32px",
            paddingBottom: "48px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "800px",
              display: "flex",
              flexDirection: "column",
              gap: "32px",
            }}
          >
            {/* Contact Support Section */}
            <section
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                padding: "48px 32px",
                textAlign: "center",
                boxShadow: "0 10px 25px -18px rgba(15, 23, 42, 0.15)",
              }}
            >
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  backgroundColor: "#dbeafe",
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 24px",
                }}
              >
                <svg style={{ width: "32px", height: "32px", color: "#3b82f6" }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </div>
              <h2 style={{ margin: "0 0 16px", fontSize: "1.5rem", fontWeight: 600, color: "#111827" }}>
                Contact Support
              </h2>
              <p style={{ margin: "0 0 32px", color: "#6b7280", fontSize: "1rem" }}>
                Need help? Send us an email and we'll get back to you within 24 hours.
              </p>
              <button
                onClick={() => window.location.href = "mailto:support@galerie.app"}
                style={{
                  backgroundColor: "#3b82f6",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px 32px",
                  fontSize: "1rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "background-color 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2563eb")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#3b82f6")}
              >
                support@galerie.app
              </button>
            </section>

            {/* Quick Help Section */}
            <section
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                padding: "32px",
                boxShadow: "0 10px 25px -18px rgba(15, 23, 42, 0.15)",
              }}
            >
              <h3 style={{ margin: "0 0 24px", fontSize: "1.25rem", fontWeight: 600, color: "#111827" }}>
                Quick Help
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "16px",
                    padding: "24px",
                    borderRadius: "12px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
                  }}
                  onClick={() => window.location.href = "/faq"}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px 0 rgba(0, 0, 0, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                    e.currentTarget.style.transform = "translateY(0px)";
                    e.currentTarget.style.boxShadow = "0 1px 3px 0 rgba(0, 0, 0, 0.1)";
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      backgroundColor: "#eff6ff",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg style={{ width: "24px", height: "24px", color: "#2563eb" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 600, color: "#111827" }}>
                      Frequently Asked Questions
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "#6b7280", lineHeight: 1.5 }}>
                      Get instant answers to common questions about Galerie
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "16px",
                    padding: "24px",
                    borderRadius: "12px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#fffbeb";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px 0 rgba(0, 0, 0, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                    e.currentTarget.style.transform = "translateY(0px)";
                    e.currentTarget.style.boxShadow = "0 1px 3px 0 rgba(0, 0, 0, 0.1)";
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      backgroundColor: "#fef3c7",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg style={{ width: "24px", height: "24px", color: "#d97706" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 600, color: "#111827" }}>
                      System Status
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "#6b7280", lineHeight: 1.5 }}>
                      Real-time monitoring of all Galerie services and platform availability
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "16px",
                    padding: "24px",
                    borderRadius: "12px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f0fdf4";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px 0 rgba(0, 0, 0, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                    e.currentTarget.style.transform = "translateY(0px)";
                    e.currentTarget.style.boxShadow = "0 1px 3px 0 rgba(0, 0, 0, 0.1)";
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      backgroundColor: "#dcfce7",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg style={{ width: "24px", height: "24px", color: "#16a34a" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 600, color: "#111827" }}>
                      Learning Center
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "#6b7280", lineHeight: 1.5 }}>
                      Step-by-step guides and video tutorials to master art investment
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "16px",
                    padding: "24px",
                    borderRadius: "12px",
                    backgroundColor: "#ffffff",
                    border: "1px solid #e5e7eb",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#faf5ff";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px 0 rgba(0, 0, 0, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                    e.currentTarget.style.transform = "translateY(0px)";
                    e.currentTarget.style.boxShadow = "0 1px 3px 0 rgba(0, 0, 0, 0.1)";
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      backgroundColor: "#f3e8ff",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg style={{ width: "24px", height: "24px", color: "#7c3aed" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: "0 0 8px", fontSize: "1.1rem", fontWeight: 600, color: "#111827" }}>
                      Community Hub
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "#6b7280", lineHeight: 1.5 }}>
                      Connect with fellow art investors, share insights, and get tips
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
