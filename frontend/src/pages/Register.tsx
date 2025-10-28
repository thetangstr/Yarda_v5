import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RegistrationForm } from '@/components/RegistrationForm';
import { useUserStore } from '@/store/userStore';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  const user = useUserStore((state) => state.user);

  // Redirect if already authenticated and email verified
  useEffect(() => {
    if (isAuthenticated && user?.email_verified) {
      navigate('/dashboard');
    } else if (isAuthenticated && !user?.email_verified) {
      navigate('/verify-email');
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="register-page">
      <div className="register-container">
        <header className="page-header">
          <div className="logo">
            <h1>Landscape Designer</h1>
          </div>
          <nav className="page-nav">
            <a href="/" className="nav-link">
              Home
            </a>
            <a href="/login" className="nav-link">
              Sign In
            </a>
          </nav>
        </header>

        <main className="register-main">
          <div className="hero-section">
            <h2>Transform Your Outdoor Space</h2>
            <p className="hero-description">
              AI-powered landscape design at your fingertips. Create stunning designs in minutes.
            </p>
            <div className="feature-list">
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span>3 Free Trial Credits</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span>Instant AI-Generated Designs</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">✓</span>
                <span>Save & Access Your History</span>
              </div>
            </div>
          </div>

          <div className="form-section">
            <RegistrationForm />
          </div>
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
        .register-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .register-container {
          max-width: 1200px;
          width: 100%;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 0;
          color: white;
        }

        .logo h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }

        .page-nav {
          display: flex;
          gap: 20px;
        }

        .nav-link {
          color: white;
          text-decoration: none;
          font-weight: 500;
          transition: opacity 0.2s;
        }

        .nav-link:hover {
          opacity: 0.8;
        }

        .register-main {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          margin: 40px 0;
        }

        @media (max-width: 768px) {
          .register-main {
            grid-template-columns: 1fr;
            gap: 30px;
          }
        }

        .hero-section {
          color: white;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .hero-section h2 {
          font-size: 42px;
          font-weight: 700;
          margin: 0 0 20px 0;
          line-height: 1.2;
        }

        .hero-description {
          font-size: 18px;
          margin: 0 0 40px 0;
          opacity: 0.9;
        }

        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 16px;
        }

        .feature-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          font-weight: 700;
        }

        .form-section {
          background: white;
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .registration-form h2 {
          margin: 0 0 8px 0;
          font-size: 28px;
          font-weight: 600;
          color: #1a202c;
        }

        .subtitle {
          margin: 0 0 32px 0;
          color: #718096;
          font-size: 14px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #2d3748;
          font-size: 14px;
        }

        .form-group input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 16px;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }

        .form-group input:focus {
          outline: none;
          border-color: #667eea;
        }

        .form-group input.error {
          border-color: #f56565;
        }

        .form-group input:disabled {
          background-color: #f7fafc;
          cursor: not-allowed;
        }

        .error-message {
          display: block;
          margin-top: 6px;
          color: #f56565;
          font-size: 13px;
        }

        .general-error {
          padding: 12px 16px;
          background-color: #fff5f5;
          border: 1px solid #feb2b2;
          border-radius: 8px;
          color: #c53030;
          font-size: 14px;
          margin-bottom: 20px;
        }

        .submit-button {
          width: 100%;
          padding: 14px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .form-footer {
          margin-top: 24px;
          text-align: center;
          font-size: 14px;
          color: #718096;
        }

        .form-footer a {
          color: #667eea;
          text-decoration: none;
          font-weight: 500;
        }

        .form-footer a:hover {
          text-decoration: underline;
        }

        .success-message {
          text-align: center;
          padding: 40px 20px;
        }

        .success-message h2 {
          color: #48bb78;
          margin-bottom: 16px;
        }

        .success-message p {
          color: #2d3748;
          margin: 8px 0;
          font-size: 16px;
        }

        .redirect-notice {
          margin-top: 24px;
          font-size: 14px;
          color: #718096;
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
      `}</style>
    </div>
  );
};
