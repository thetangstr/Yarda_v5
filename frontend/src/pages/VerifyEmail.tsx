import React from 'react';
import { EmailVerification } from '@/components/EmailVerification';

export const VerifyEmail: React.FC = () => {
  return (
    <div className="verify-email-page">
      <div className="verify-container">
        <header className="page-header">
          <div className="logo">
            <h1>Landscape Designer</h1>
          </div>
        </header>

        <main className="verify-main">
          <EmailVerification />
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

      <style>{`
        .verify-email-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .verify-container {
          max-width: 600px;
          width: 100%;
        }

        .page-header {
          text-align: center;
          padding: 20px 0;
          color: white;
        }

        .logo h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }

        .verify-main {
          background: white;
          border-radius: 12px;
          padding: 48px 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          margin: 40px 0;
        }

        .email-verification {
          text-align: center;
        }

        .verification-status h2 {
          margin: 0 0 16px 0;
          font-size: 28px;
          font-weight: 600;
          color: #1a202c;
        }

        .verification-status p {
          margin: 12px 0;
          color: #4a5568;
          font-size: 16px;
          line-height: 1.6;
        }

        .verification-status strong {
          color: #2d3748;
          font-weight: 600;
        }

        /* Icons */
        .email-icon,
        .success-icon,
        .error-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px auto;
          font-size: 40px;
        }

        .email-icon {
          background-color: #edf2f7;
          color: #667eea;
        }

        .success-icon {
          background-color: #c6f6d5;
          color: #38a169;
          font-weight: 700;
        }

        .error-icon {
          background-color: #fed7d7;
          color: #e53e3e;
          font-weight: 700;
        }

        .spinner {
          width: 60px;
          height: 60px;
          border: 4px solid #edf2f7;
          border-top-color: #667eea;
          border-radius: 50%;
          margin: 0 auto 24px auto;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Status specific styles */
        .verification-status.verifying {
          padding: 20px 0;
        }

        .verification-status.success {
          padding: 20px 0;
        }

        .credit-info {
          margin-top: 32px;
          padding: 24px;
          background-color: #f7fafc;
          border-radius: 8px;
          border: 2px solid #e2e8f0;
        }

        .credits-badge {
          font-size: 20px;
          font-weight: 700;
          color: #38a169;
          margin: 0 0 8px 0;
        }

        .credits-description {
          font-size: 14px;
          color: #718096;
          margin: 0;
        }

        .instructions {
          font-size: 15px;
          color: #2d3748;
          margin: 16px 0;
        }

        .expiry-notice {
          margin: 24px 0;
          padding: 12px 16px;
          background-color: #fef5e7;
          border: 1px solid #f9e79f;
          border-radius: 8px;
        }

        .expiry-notice p {
          margin: 0;
          font-size: 14px;
          color: #7d6608;
        }

        .info-message {
          margin: 20px 0;
          padding: 12px 16px;
          background-color: #ebf8ff;
          border: 1px solid #90cdf4;
          border-radius: 8px;
          color: #2c5282;
          font-size: 14px;
        }

        .resend-section {
          margin: 32px 0 0 0;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
        }

        .resend-section p {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #718096;
        }

        .resend-button {
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          margin-top: 8px;
        }

        .resend-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .resend-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .help-section {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
        }

        .help-text {
          font-size: 13px;
          color: #718096;
          margin: 0;
        }

        .help-text a {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
        }

        .help-text a:hover {
          text-decoration: underline;
        }

        .page-footer {
          padding: 30px 0;
          color: white;
          text-align: center;
        }

        .footer-content p {
          margin: 0 0 16px 0;
          font-size: 14px;
          opacity: 0.8;
        }

        .footer-links {
          display: flex;
          justify-content: center;
          gap: 24px;
        }

        .footer-links a {
          color: white;
          text-decoration: none;
          font-size: 14px;
          opacity: 0.8;
          transition: opacity 0.2s;
        }

        .footer-links a:hover {
          opacity: 1;
        }

        @media (max-width: 640px) {
          .verify-main {
            padding: 32px 24px;
          }

          .verification-status h2 {
            font-size: 24px;
          }

          .email-icon,
          .success-icon,
          .error-icon {
            width: 60px;
            height: 60px;
            font-size: 32px;
          }
        }
      `}</style>
    </div>
  );
};
