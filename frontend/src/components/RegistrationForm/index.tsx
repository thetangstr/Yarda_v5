import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { apiClient } from '@/services/api';
import type { RegisterRequest } from '@/types';

interface ValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export const RegistrationForm: React.FC = () => {
  const navigate = useNavigate();
  const setUser = useUserStore((state) => state.setUser);

  const [formData, setFormData] = useState<RegisterRequest & { confirmPassword: string }>({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!passwordRegex.test(formData.password)) {
      newErrors.password =
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name as keyof ValidationErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const { confirmPassword, ...registerData } = formData;
      const user = await apiClient.register(registerData);

      setUser(user);
      setIsSuccess(true);

      // Redirect to email verification page after 2 seconds
      setTimeout(() => {
        navigate('/verify-email');
      }, 2000);
    } catch (error) {
      console.error('Registration error:', error);

      if (error instanceof Error) {
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          setErrors({ email: 'This email is already registered' });
        } else {
          setErrors({ general: error.message });
        }
      } else {
        setErrors({ general: 'An unexpected error occurred. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="registration-form" data-testid="registration-success">
        <div className="success-message">
          <h2>Registration Successful!</h2>
          <p>Welcome! You have been granted 3 trial credits to get started.</p>
          <p>Please check your email to verify your account.</p>
          <p className="redirect-notice">Redirecting to verification page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="registration-form">
      <h2>Create Your Account</h2>
      <p className="subtitle">Sign up to receive 3 free trial credits</p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? 'error' : ''}
            disabled={isLoading}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          {errors.email && (
            <span
              className="error-message"
              role="alert"
              data-testid={errors.email.includes('already registered') ? 'duplicate-email-error' : 'email-error'}
            >
              {errors.email}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={errors.password ? 'error' : ''}
            disabled={isLoading}
            placeholder="Create a strong password"
            autoComplete="new-password"
            required
          />
          {errors.password && (
            <span className="error-message" role="alert" data-testid="password-error">
              {errors.password}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={errors.confirmPassword ? 'error' : ''}
            disabled={isLoading}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            required
          />
          {errors.confirmPassword && (
            <span className="error-message" role="alert" data-testid="password-mismatch-error">
              {errors.confirmPassword}
            </span>
          )}
        </div>

        {errors.general && (
          <div className="general-error" role="alert">
            {errors.general}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="submit-button"
        >
          {isLoading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>

      <div className="form-footer">
        <p>
          Already have an account?{' '}
          <a href="/login">Sign in</a>
        </p>
      </div>
    </div>
  );
};
