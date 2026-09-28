import React from 'react';

function VirtualUSDT({ presetUsdValue, swapCompleted }) {
  if (!swapCompleted) {
    return null;
  }

  const displayAmount = presetUsdValue != null ? presetUsdValue : 0;

  return (
    <div className="virtual-usdt-container withdraw-banner">
      <div className="virtual-usdt-header">
        <div className="virtual-usdt-info">
          <span className="lock-icon">🔐</span>
          <div className="virtual-usdt-amount">
            <img
              src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png"
              alt="USDT"
              className="usdt-icon"
            />
            <span>{displayAmount.toLocaleString()} USDT</span>
          </div>
        </div>
        <button className="withdraw-btn" disabled>
          Withdraw
        </button>
      </div>
    </div>
  );
}

export default VirtualUSDT;
