import React, { useEffect, useState } from 'react';
import './HeroSection.css';

// Sample transaction data for the animated ticker
const TRANSACTIONS = [
  { from: '0x1a2B...9c4D', to: '0x5e6F...3a8B', amount: '2.45 ETH', usd: '$7,821.50', chain: 'Ethereum', time: '2s ago', color: '#627EEA' },
  { from: '0x7c8D...1e2F', to: '0x3a4B...5c6D', amount: '150.00 USDT', usd: '$150.00', chain: 'BSC', time: '5s ago', color: '#F3BA2F' },
  { from: '0x9e0F...7a8B', to: '0x2c3D...4e5F', amount: '0.85 BTC', usd: '$52,340.00', chain: 'Bitcoin', time: '8s ago', color: '#F7931A' },
  { from: '0x4a5B...6c7D', to: '0x8e9F...0a1B', amount: '500.00 SOL', usd: '$72,500.00', chain: 'Solana', time: '12s ago', color: '#9945FF' },
  { from: '0x6c7D...8e9F', to: '0x0a1B...2c3D', amount: '1,200 MATIC', usd: '$960.00', chain: 'Polygon', time: '15s ago', color: '#8247E5' },
  { from: '0x2c3D...4e5F', to: '0x6c7D...8e9F', amount: '3.20 ETH', usd: '$10,208.00', chain: 'Arbitrum', time: '18s ago', color: '#28A0F0' },
  { from: '0x8e9F...0a1B', to: '0x4a5B...6c7D', amount: '75.50 AVAX', usd: '$2,265.00', chain: 'Avalanche', time: '22s ago', color: '#E84142' },
  { from: '0x0a1B...2c3D', to: '0x9e0F...7a8B', amount: '10,000 TRX', usd: '$1,150.00', chain: 'Tron', time: '25s ago', color: '#FF0013' },
];

function HeroSection() {
  const [visibleTxns, setVisibleTxns] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Stagger hero text animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Animate transactions appearing one by one from the bottom
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index < TRANSACTIONS.length) {
        setVisibleTxns(prev => [TRANSACTIONS[index], ...prev]);
        index++;
      } else {
        // Loop: reset and start again
        index = 0;
        setVisibleTxns([]);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="hero-section">
      {/* Floating particles background */}
      <div className="hero-particles">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="hero-particle" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
          }} />
        ))}
      </div>

      {/* Main content */}
      <div className="hero-content">
        {/* Badge */}
        <div className={`hero-badge ${isLoaded ? 'hero-animate-in' : ''}`} style={{ animationDelay: '0.1s' }}>
          <span className="hero-badge-year">2025</span>
          <span className="hero-badge-text">Private Liquidity Swap</span>
        </div>

        {/* Title */}
        <h1 className={`hero-title ${isLoaded ? 'hero-animate-in' : ''}`} style={{ animationDelay: '0.3s' }}>
          <span className="hero-title-line1">Swap Crypto Seamlessly</span>
          <span className="hero-title-line2">Fast & Secure Exchange</span>
        </h1>

        {/* Subtitle */}
        <p className={`hero-subtitle ${isLoaded ? 'hero-animate-in' : ''}`} style={{ animationDelay: '0.5s' }}>
          Exchange between multiple crypto pairs with minimal friction
          and competitive rates. Multi-asset swaps, cross-chain compatibility,
          transparent pricing — no unnecessary complexity.
        </p>

        {/* CTA Buttons */}
        <div className={`hero-cta-buttons ${isLoaded ? 'hero-animate-in' : ''}`} style={{ animationDelay: '0.7s' }}>
          <button className="hero-btn hero-btn-primary" onClick={() => {
            const main = document.querySelector('main');
            if (main) main.scrollIntoView({ behavior: 'smooth' });
          }}>
            Start Swapping
          </button>
          <button className="hero-btn hero-btn-secondary" onClick={() => {
            const main = document.querySelector('main');
            if (main) main.scrollIntoView({ behavior: 'smooth' });
          }}>
            Learn More
          </button>
        </div>
      </div>

      {/* Glowing Circle & Transactions */}
      <div className="hero-glow-area">
        {/* The purple/blue glow circle */}
        <div className="hero-glow-circle"></div>
        <div className="hero-glow-circle hero-glow-circle-2"></div>

        {/* Transaction ticker rising from below */}
        <div className="hero-txn-container">
          {visibleTxns.slice(0, 5).map((txn, index) => (
            <div
              key={`${txn.from}-${txn.amount}-${index}`}
              className="hero-txn-card"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="hero-txn-chain" style={{ background: txn.color }}>
                {txn.chain.charAt(0)}
              </div>
              <div className="hero-txn-info">
                <div className="hero-txn-addresses">
                  <span className="hero-txn-from">{txn.from}</span>
                  <span className="hero-txn-arrow">→</span>
                  <span className="hero-txn-to">{txn.to}</span>
                </div>
                <div className="hero-txn-chain-name">{txn.chain} • {txn.time}</div>
              </div>
              <div className="hero-txn-amount">
                <div className="hero-txn-crypto">{txn.amount}</div>
                <div className="hero-txn-usd">{txn.usd}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
