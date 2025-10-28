import React from 'react'
import { useUserStore } from '@/store/userStore'

export const PurchaseTokens: React.FC = () => {
  const credits = useUserStore((state) => state.credits)

  return (
    <div className="purchase-page">
      <h1>Purchase Tokens</h1>

      <div className="current-balance">
        <h3>Current Balance</h3>
        <div className="balance-grid">
          <div className="balance-item">
            <label>Trial Credits</label>
            <strong>{credits.trial}</strong>
          </div>
          <div className="balance-item">
            <label>Token Balance</label>
            <strong>{credits.tokens}</strong>
          </div>
          <div className="balance-item">
            <label>Total Credits</label>
            <strong>{credits.total}</strong>
          </div>
        </div>
      </div>

      <div className="token-packages">
        <h3>Token Packages</h3>
        <p className="coming-soon">Payment integration coming soon...</p>

        <div className="package-grid">
          <div className="package">
            <h4>Starter</h4>
            <p className="price">$9.99</p>
            <p className="tokens">10 Tokens</p>
            <button className="package-button" disabled>
              Coming Soon
            </button>
          </div>

          <div className="package popular">
            <span className="badge">Popular</span>
            <h4>Pro</h4>
            <p className="price">$24.99</p>
            <p className="tokens">30 Tokens</p>
            <button className="package-button" disabled>
              Coming Soon
            </button>
          </div>

          <div className="package">
            <h4>Enterprise</h4>
            <p className="price">$49.99</p>
            <p className="tokens">75 Tokens</p>
            <button className="package-button" disabled>
              Coming Soon
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .purchase-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .purchase-page h1 {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 32px;
          color: #333;
          text-align: center;
        }

        .current-balance {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin-bottom: 40px;
        }

        .current-balance h3 {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #333;
        }

        .balance-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
        }

        .balance-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 16px;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          border-radius: 8px;
        }

        .balance-item label {
          font-size: 13px;
          color: #666;
          font-weight: 500;
        }

        .balance-item strong {
          font-size: 24px;
          color: #333;
          font-weight: 700;
        }

        .token-packages {
          margin-top: 40px;
        }

        .token-packages h3 {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #333;
          text-align: center;
        }

        .coming-soon {
          text-align: center;
          color: #666;
          font-size: 14px;
          margin-bottom: 24px;
          font-style: italic;
        }

        .package-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
        }

        .package {
          background: white;
          border-radius: 12px;
          padding: 32px 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          text-align: center;
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
        }

        .package:hover {
          transform: translateY(-4px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        .package.popular {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          transform: scale(1.05);
        }

        .package.popular:hover {
          transform: scale(1.05) translateY(-4px);
        }

        .badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: #ffd700;
          color: #333;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .package h4 {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .price {
          font-size: 36px;
          font-weight: 700;
          margin-bottom: 8px;
          color: #667eea;
        }

        .package.popular .price {
          color: white;
        }

        .tokens {
          font-size: 16px;
          margin-bottom: 24px;
          color: #666;
        }

        .package.popular .tokens {
          color: rgba(255, 255, 255, 0.9);
        }

        .package-button {
          width: 100%;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: not-allowed;
          background: #e0e0e0;
          color: #999;
          transition: all 0.3s ease;
        }

        .package-button:not(:disabled) {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          cursor: pointer;
        }

        .package-button:not(:disabled):hover {
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .package.popular .package-button {
          background: white;
          color: #667eea;
        }

        .package.popular .package-button:disabled {
          background: rgba(255, 255, 255, 0.3);
          color: rgba(255, 255, 255, 0.7);
        }

        @media (max-width: 768px) {
          .purchase-page {
            padding: 20px;
          }

          .purchase-page h1 {
            font-size: 24px;
          }

          .package-grid {
            grid-template-columns: 1fr;
          }

          .package.popular {
            transform: scale(1);
          }

          .package.popular:hover {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </div>
  )
}
