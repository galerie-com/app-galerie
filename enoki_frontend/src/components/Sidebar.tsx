import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import grandLogoGalerie from '../assets/grand_logo_galerie.png';

interface SidebarProps {
  currentPage?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage }) => {
  const location = useLocation();
  const currentAccount = useCurrentAccount();
  const navigate = useNavigate();
  const { mutate: disconnect } = useDisconnectWallet();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Function to extract username from email
  const getUsernameFromEmail = (email: string): string => {
    if (!email || !email.includes('@')) return 'User';
    return email.split('@')[0];
  };

  // Get user info from zkLogin - try to extract from currentAccount
  // zkLogin stores user info in the account object, often in claims or metadata
  const getUserInfo = () => {
    if (!currentAccount) return { email: '', username: 'User', initial: 'U' };
    
    // Try to get email from various possible locations in currentAccount
    let email = '';
    
    // Check if email is in the account object (common zkLogin pattern)
    if (currentAccount.userInfo?.email) {
      email = currentAccount.userInfo.email;
    } else if (currentAccount.claims?.email) {
      email = currentAccount.claims.email;
    } else if (currentAccount.email) {
      email = currentAccount.email;
    } else {
      // Fallback: try to extract from address if it contains email-like pattern
      const addressStr = currentAccount.address || '';
      const emailMatch = addressStr.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        email = emailMatch[1];
      }
    }
    
    const username = getUsernameFromEmail(email);
    const initial = username.charAt(0).toUpperCase();
    
    return { email, username, initial };
  };

  const { email: userEmail, username, initial: userInitial } = getUserInfo();
  
  // Debug: log currentAccount to console to see its structure
  console.log('Sidebar - currentAccount:', currentAccount);
  console.log('Sidebar - extracted email:', userEmail);
  console.log('Sidebar - extracted username:', username);

  const handleLogout = () => {
    disconnect();
    navigate('/');
    setShowUserMenu(false);
  };

  const menuItems = [
    { 
      id: 'home', 
      label: 'Home', 
      path: '/home',
      active: location.pathname === '/home' || currentPage === 'home',
      icon: (
        <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    { 
      id: 'portfolio', 
      label: 'Portfolio', 
      path: '/portfolio',
      active: location.pathname === '/portfolio' || currentPage === 'portfolio',
      icon: (
        <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    { 
      id: 'market', 
      label: 'Market', 
      path: '/market',
      active: location.pathname === '/market' || currentPage === 'market',
      icon: (
        <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    { 
      id: 'secondary', 
      label: 'Secondary Market', 
      path: '/secondary',
      active: location.pathname === '/secondary' || currentPage === 'secondary',
      disabled: true,
      icon: (
        <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
    { 
      id: 'invite', 
      label: 'Invite', 
      path: '/invite',
      active: location.pathname === '/invite' || currentPage === 'invite',
      disabled: true,
      icon: (
        <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
  ];

  const helpItems = [
    { 
      id: 'faq', 
      label: 'FAQ', 
      path: '/faq',
      active: location.pathname === '/faq' || currentPage === 'faq',
      icon: (
        <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    { 
      id: 'support', 
      label: 'Support', 
      path: '/support',
      icon: (
        <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ];

  const handleNavigation = (path: string, disabled?: boolean) => {
    if (disabled) return;
    navigate(path);
  };

  const isActive = (path: string) => {
    if (path === '/home') {
      return currentPage === 'home' || location.pathname === '/home';
    }
    return location.pathname === path;
  };

  return (
    <div
      style={{
        height: '100vh',
        width: '216px', // Réduit de 224px à 216px
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <img 
            src={grandLogoGalerie} 
            alt="Galerie" 
            style={{
              height: '32px',
              width: 'auto',
            }}
          />
        </div>
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {menuItems.map((item) => {
          const active = isActive(item.path);
          
          return (
            <div key={item.id} style={{ position: 'relative' }}>
              <button
                onClick={() => handleNavigation(item.path, item.disabled)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  borderRadius: '8px',
                  border: 'none',
                  textAlign: 'left',
                  cursor: item.disabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: active ? '#eef2ff' : 'transparent',
                  color: active ? '#4338ca' : '#374151',
                }}
                onMouseEnter={(e) => {
                  if (item.disabled) {
                    setHoveredItem(item.id);
                  }
                  if (!active && !item.disabled) {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                    e.currentTarget.style.color = '#111827';
                  }
                }}
                onMouseLeave={(e) => {
                  if (item.disabled) {
                    setHoveredItem(null);
                  }
                  if (!active && !item.disabled) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#374151';
                  }
                }}
              >
                <span
                  style={{
                    marginRight: '12px',
                    color: active ? '#4338ca' : '#374151',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {item.icon}
                </span>
                {item.label}
                {active && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      color: '#4338ca',
                    }}
                  >
                    <svg style={{ width: '16px', height: '16px' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </button>
              
              {/* Coming Soon Tooltip */}
              {item.disabled && (
                <div
                  style={{
                    position: 'absolute',
                    left: '100%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    marginLeft: '6px',
                    padding: '6px 8px',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    boxShadow: '0 10px 20px -12px rgba(15, 23, 42, 0.45)',
                    opacity: hoveredItem === item.id ? 1 : 0,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    zIndex: 50,
                    transition: 'opacity 0.18s ease',
                  }}
                  className="tooltip"
                >
                  Coming Soon
                  <span
                    style={{
                      position: 'absolute',
                      left: '-4px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 0,
                      height: 0,
                      borderTop: '4px solid transparent',
                      borderBottom: '4px solid transparent',
                      borderRight: '4px solid #0f172a',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Help Section */}
      <div style={{ padding: '16px' }}>
        <div
          style={{
            marginBottom: '12px',
            paddingLeft: '0px',
            fontSize: '12px',
            fontWeight: '600',
            color: '#374151',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            textAlign: 'left',
          }}
        >
          HELP
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {helpItems.map((item) => {
            const active = isActive(item.path);
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  borderRadius: '8px',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: active ? '#eef2ff' : 'transparent',
                  color: active ? '#4338ca' : '#374151',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                    e.currentTarget.style.color = '#111827';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#374151';
                  }
                }}
              >
                <span
                  style={{
                    marginRight: '12px',
                    color: active ? '#4338ca' : '#374151',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* User Section */}
      <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              padding: '8px 12px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#d1d5db',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#374151',
                }}
              >
                {userInitial}
              </span>
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#111827',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {username}
              </div>
            </div>
            <svg
              style={{
                width: '16px',
                height: '16px',
                color: '#374151',
                transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                marginBottom: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                zIndex: 50,
              }}
            >
              <div style={{ padding: '8px' }}>
                <button
                  onClick={() => {
                    handleLogout();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 16px',
                    fontSize: '14px',
                    color: '#374151',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <svg
                    style={{
                      width: '16px',
                      height: '16px',
                      marginRight: '12px',
                      color: '#374151',
                    }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
