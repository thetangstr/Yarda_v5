/**
 * Navigation Component
 *
 * Main site navigation matching yarda.pro design.
 *
 * Features:
 * - Logo on left
 * - Nav items in center/right
 * - Sign In / Account button
 * - Mobile responsive hamburger menu
 * - Transparent on hero, white on scroll
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useUserStore } from '@/store/userStore';

interface NavigationProps {
  transparent?: boolean;
}

export default function Navigation({ transparent = false }: NavigationProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useUserStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => router.pathname === path;

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/pricing', label: 'Pricing' },
    ...(isAuthenticated
      ? [
          { href: '/generate', label: 'Generate' },
          { href: '/history', label: 'History' },
          { href: '/account', label: 'Account' },
        ]
      : []),
  ];

  const bgClass = transparent && !scrolled
    ? 'bg-transparent'
    : 'bg-white shadow-sm';

  const textClass = transparent && !scrolled
    ? 'text-white'
    : 'text-neutral-800';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${bgClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex items-center">
              <svg
                className={`h-8 w-8 ${transparent && !scrolled ? 'text-white' : 'text-brand-green'}`}
                viewBox="0 0 40 40"
                fill="currentColor"
              >
                <path d="M20 5L5 15v10l15 10 15-10V15L20 5zm0 3.5L31 18v7l-11 7.5L9 25v-7l11-9.5z" />
                <circle cx="20" cy="20" r="4" />
              </svg>
              <span className={`ml-2 text-xl font-bold ${textClass}`}>
                Yarda
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors duration-200 ${
                  isActive(link.href)
                    ? 'text-brand-green'
                    : transparent && !scrolled
                    ? 'text-white hover:text-brand-cream'
                    : 'text-neutral-600 hover:text-brand-green'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <Link
                href="/account"
                className="btn-primary px-4 py-2 text-sm"
              >
                Account
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`text-sm font-medium ${
                    transparent && !scrolled
                      ? 'text-white hover:text-brand-cream'
                      : 'text-neutral-600 hover:text-brand-green'
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="btn-primary px-4 py-2 text-sm"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 rounded-lg ${textClass}`}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-neutral-200 py-4 animate-fade-in">
            <div className="space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-2 text-sm font-medium rounded-lg ${
                    isActive(link.href)
                      ? 'bg-brand-sage text-brand-dark-green'
                      : 'text-neutral-600 hover:bg-brand-cream'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 space-y-2 border-t border-neutral-200">
                {isAuthenticated ? (
                  <Link
                    href="/account"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2 text-sm font-medium text-white bg-brand-green rounded-lg text-center"
                  >
                    Account
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-brand-cream rounded-lg"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-4 py-2 text-sm font-medium text-white bg-brand-green rounded-lg text-center"
                    >
                      Get Started Free
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
