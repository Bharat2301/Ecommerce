// components/Newsletter.jsx
'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useApi } from '@/hooks/useApi';
import api from '@/utils/api';
import { validateEmail } from '@/utils/validation';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const { loading, handleRequest } = useApi();
  const [isValid, setIsValid] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();

    if (!validateEmail(trimmedEmail)) {
      setIsValid(false);
      toast.error('Please enter a valid email address.');
      return;
    }

    setIsValid(true);

    try {
      await handleRequest(api.post('/api/subscriptions', { email: trimmedEmail }));
      toast.success('Subscribed successfully! Check your inbox for offers.');
      setEmail('');
      // Optional: Track subscription event
      // analytics.track('Newsletter Subscription', { email: trimmedEmail });
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to subscribe. Please try again.';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="bg-gray-800 text-white p-6 rounded-lg text-center max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4" id="newsletter-title">
        Join Our Newsletter
      </h2>
      <p className="mb-4 text-gray-300">Get exclusive offers and updates!</p>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row justify-center gap-2"
        aria-labelledby="newsletter-title"
      >
        <input
          id="newsletter-email"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setIsValid(true);
          }}
          className={`w-full sm:w-64 p-2 rounded-lg border ${
            isValid ? 'border-gray-300' : 'border-red-500'
          } bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50`}
          disabled={loading}
          aria-label="Email address for newsletter"
        />
        <button
          type="submit"
          className="w-full sm:w-auto bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-500 transition flex items-center justify-center"
          disabled={loading}
          aria-label="Subscribe to newsletter"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 mr-2 text-white"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Subscribing...
            </>
          ) : (
            'Subscribe'
          )}
        </button>
      </form>
    </div>
  );
}