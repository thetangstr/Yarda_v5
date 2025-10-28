import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '@/store/userStore'
import { useGenerationStore } from '@/store/generationStore'
import { GenerationHistory } from '@/components/GenerationHistory'
import { GenerationModal } from '@/components/GenerationModal'

export const History: React.FC = () => {
  const navigate = useNavigate()
  const user = useUserStore((state) => state.user)
  const isAuthenticated = useUserStore((state) => state.isAuthenticated)
  const { selectedGeneration, clearSelectedGeneration } = useGenerationStore()

  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    // Redirect if email not verified
    if (!user?.email_verified) {
      navigate('/verify-email')
      return
    }
  }, [isAuthenticated, user, navigate])

  if (!isAuthenticated || !user?.email_verified) {
    return null
  }

  return (
    <div className="history-page">
      <div className="history-container">
        <header className="page-header">
          <div className="logo">
            <h1>Landscape Designer</h1>
          </div>
          <nav className="page-nav">
            <a href="/dashboard" className="nav-link">
              Dashboard
            </a>
            <a href="/generate" className="nav-link">
              Generate
            </a>
            <a href="/account" className="nav-link">
              Account
            </a>
          </nav>
        </header>

        <main className="history-main">
          <div className="page-title">
            <h2>Generation History</h2>
            <p>View all your landscape design generations</p>
          </div>

          <GenerationHistory />
        </main>

        <footer className="page-footer">
          <div className="footer-content">
            <p>&copy; 2025 Landscape Designer. All rights reserved.</p>
            <div className="footer-links">
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
              <a href="/support">Support</a>
            </div>
          </div>
        </footer>
      </div>

      {/* Generation detail modal */}
      {selectedGeneration && (
        <GenerationModal generation={selectedGeneration} onClose={clearSelectedGeneration} />
      )}

      <style>{`
        .history-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding: 20px;
        }

        .history-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 0;
          margin-bottom: 30px;
        }

        .logo h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .page-nav {
          display: flex;
          gap: 20px;
        }

        .nav-link {
          color: #4a5568;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }

        .nav-link:hover {
          color: #667eea;
        }

        .history-main {
          max-width: 100%;
        }

        .page-title {
          text-align: center;
          margin-bottom: 40px;
        }

        .page-title h2 {
          font-size: 36px;
          font-weight: 700;
          margin: 0 0 12px 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .page-title p {
          color: #718096;
          font-size: 18px;
          margin: 0;
        }

        .page-footer {
          margin-top: 60px;
          padding: 30px 0;
          text-align: center;
          color: #718096;
        }

        .footer-content p {
          margin: 0 0 16px 0;
          font-size: 14px;
        }

        .footer-links {
          display: flex;
          justify-content: center;
          gap: 24px;
        }

        .footer-links a {
          color: #718096;
          text-decoration: none;
          font-size: 14px;
          transition: color 0.2s;
        }

        .footer-links a:hover {
          color: #667eea;
        }

        @media (max-width: 768px) {
          .history-page {
            padding: 10px;
          }

          .page-header {
            flex-direction: column;
            gap: 16px;
          }

          .page-nav {
            width: 100%;
            justify-content: center;
          }

          .page-title h2 {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  )
}
