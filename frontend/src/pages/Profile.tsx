import React, { useEffect } from 'react'
import { useUserStore } from '@/store/userStore'
import { TokenBalance } from '@/components/TokenBalance'

export const Profile: React.FC = () => {
  const user = useUserStore((state) => state.user)
  const tokenAccount = useUserStore((state) => state.tokenAccount)
  const fetchTokenAccount = useUserStore((state) => state.fetchTokenAccount)

  useEffect(() => {
    fetchTokenAccount()
  }, [fetchTokenAccount])

  if (!user) {
    return (
      <div className="profile-page">
        <p>Please log in to view your profile.</p>
        <style>{`
          .profile-page {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <h1>User Profile</h1>

      <section className="profile-section">
        <h2>Account Information</h2>
        <div className="info-grid">
          <div className="info-item">
            <label>Email</label>
            <span>{user.email}</span>
          </div>
          <div className="info-item">
            <label>Email Verified</label>
            <span>{user.email_verified ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </section>

      <section className="profile-section" data-testid="token-account-section">
        <h2>Token Account</h2>
        <TokenBalance />
      </section>

      <style>{`
        .profile-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .profile-page h1 {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 32px;
          color: #333;
        }

        .profile-section {
          margin-bottom: 32px;
        }

        .profile-section h2 {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #444;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .info-item label {
          font-size: 13px;
          color: #666;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-item span {
          font-size: 16px;
          color: #333;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .profile-page {
            padding: 20px;
          }

          .profile-page h1 {
            font-size: 24px;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
