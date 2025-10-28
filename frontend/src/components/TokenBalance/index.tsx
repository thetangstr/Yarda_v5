import React, { useEffect } from 'react'
import { useUserStore } from '@/store/userStore'

export const TokenBalance: React.FC = () => {
  const tokenAccount = useUserStore((state) => state.tokenAccount)
  const fetchTokenAccount = useUserStore((state) => state.fetchTokenAccount)

  useEffect(() => {
    fetchTokenAccount()
  }, [fetchTokenAccount])

  if (!tokenAccount) {
    return <div>Loading token account...</div>
  }

  return (
    <div className="token-balance" data-testid="token-balance-component">
      <h3>Token Account</h3>

      <div className="token-stats">
        <div className="stat">
          <label>Current Balance</label>
          <span className="stat-value" data-testid="token-balance">
            {tokenAccount.balance}
          </span>
        </div>

        <div className="stat">
          <label>Total Purchased</label>
          <span className="stat-value" data-testid="total-purchased">
            {tokenAccount.total_purchased}
          </span>
        </div>

        <div className="stat">
          <label>Total Consumed</label>
          <span className="stat-value" data-testid="total-consumed">
            {tokenAccount.total_consumed}
          </span>
        </div>

        <div className="stat">
          <label>Account ID</label>
          <span className="account-id stat-value" data-testid="token-account-id">
            {tokenAccount.id}
          </span>
        </div>
      </div>

      <style>{`
        .token-balance {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .token-balance h3 {
          margin: 0 0 20px 0;
          font-size: 20px;
          font-weight: 600;
          color: #333;
        }

        .token-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .stat {
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding: 16px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .stat label {
          font-size: 13px;
          color: #666;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #333;
        }

        .account-id {
          font-size: 12px;
          font-family: monospace;
          word-break: break-all;
          font-weight: 400;
        }

        @media (max-width: 768px) {
          .token-stats {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
