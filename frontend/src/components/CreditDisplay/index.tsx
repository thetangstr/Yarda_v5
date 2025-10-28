import React, { useEffect } from 'react'
import { useUserStore } from '@/store/userStore'

export const CreditDisplay: React.FC = () => {
  const credits = useUserStore((state) => state.credits)
  const tokenAccount = useUserStore((state) => state.tokenAccount)
  const fetchCredits = useUserStore((state) => state.fetchCredits)
  const fetchTokenAccount = useUserStore((state) => state.fetchTokenAccount)

  useEffect(() => {
    fetchCredits().catch((err) => console.error('Failed to fetch credits:', err))
    fetchTokenAccount().catch((err) => console.error('Failed to fetch token account:', err))
  }, [fetchCredits, fetchTokenAccount])

  return (
    <div className="credit-display" data-testid="credit-display">
      {/* Trial Credits Section */}
      <div className="credit-card trial-credits" data-testid="trial-credits-section">
        <div className="credit-icon">🎁</div>
        <div className="credit-info">
          <div className="credit-label">Trial Credits</div>
          <div className="credit-value" data-testid="trial-credits">
            {credits.trial}
          </div>
        </div>
      </div>

      {/* Token Balance Section */}
      <div className="credit-card token-balance" data-testid="token-balance-section">
        <div className="credit-icon">💎</div>
        <div className="credit-info">
          <div className="credit-label">Token Balance</div>
          <div className="credit-value" data-testid="token-balance">
            {credits.tokens}
          </div>
        </div>
      </div>

      {/* Total Credits Section */}
      <div className="credit-card total-available total" data-testid="total-credits-section">
        <div className="credit-icon">✨</div>
        <div className="credit-info">
          <div className="credit-label">Total Credits</div>
          <div className="credit-value" data-testid="total-credits">
            {credits.total}
          </div>
        </div>
      </div>

      {/* Purchase CTA when balance is zero */}
      {credits.total === 0 && (
        <button
          className="purchase-cta"
          data-testid="purchase-tokens-cta"
          onClick={() => window.location.href = '/purchase-tokens'}
        >
          Purchase Tokens
        </button>
      )}

      <style>{`
        .credit-display {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
          position: relative;
        }

        .credit-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 16px;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .credit-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .trial-credits {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .token-balance {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
        }

        .total-available {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: white;
        }

        .credit-icon {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
          flex-shrink: 0;
        }

        .credit-info {
          flex: 1;
        }

        .credit-label {
          font-size: 13px;
          opacity: 0.9;
          margin-bottom: 4px;
          font-weight: 500;
        }

        .credit-value {
          font-size: 32px;
          font-weight: 700;
          line-height: 1;
        }

        .purchase-cta {
          grid-column: 1 / -1;
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
          color: white;
          border: none;
          padding: 16px 32px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(238, 90, 111, 0.3);
          margin-top: 10px;
        }

        .purchase-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(238, 90, 111, 0.4);
        }

        .purchase-cta:active {
          transform: translateY(0);
        }

        @media (max-width: 768px) {
          .credit-display {
            grid-template-columns: 1fr;
          }

          .credit-card {
            padding: 16px;
          }

          .credit-icon {
            width: 40px;
            height: 40px;
            font-size: 20px;
          }

          .credit-value {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  )
}
