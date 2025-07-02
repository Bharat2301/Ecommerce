'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import { Mail, Lock, Code } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/utils/api';

export default function ResetPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const { handleRequest } = useApi();
  const router = useRouter();

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(timer - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await handleRequest(api.post('/api/auth/request-reset-otp', { email }));
      if (response.success) {
        toast.success('OTP sent to your email');
        setStep(2);
        setTimer(300); // 5 minutes
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await handleRequest(
        api.post('/api/auth/reset-password', { email, otp, newPassword })
      );
      if (response.success) {
        toast.success('Password reset successful');
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
      {step === 1 ? (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div className="flex items-center border rounded p-2">
            <Mail className="mr-2" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Sending OTP...' : 'Request OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="flex items-center border rounded p-2">
            <Code className="mr-2" />
            <input
              type="text"
              placeholder="OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full outline-none"
              required
            />
          </div>
          <div className="flex items-center border rounded p-2">
            <Lock className="mr-2" />
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full outline-none"
              required
            />
          </div>
          <p className="text-sm">Time remaining: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</p>
          <button
            type="submit"
            disabled={loading || timer === 0}
            className="w-full bg-primary text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full text-blue-500 hover:underline"
          >
            Back
          </button>
        </form>
      )}
    </div>
  );
}