'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import Link from 'next/link';
import { Mail, Lock, User, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/utils/api';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    question1: '',
    answer1: '',
    question2: '',
    answer2: '',
  });
  const [loading, setLoading] = useState(false);
  const { handleRequest } = useApi();
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await handleRequest(
        api.post('/api/auth/register', {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          securityQuestions: [
            { question: formData.question1, answer: formData.answer1 },
            { question: formData.question2, answer: formData.answer2 },
          ],
        })
      );
      if (response.success) {
        toast.success('Registration successful! Please log in.');
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Register</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center border rounded p-2">
          <User className="mr-2" />
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            className="w-full outline-none"
            required
          />
        </div>
        <div className="flex items-center border rounded p-2">
          <Mail className="mr-2" />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full outline-none"
            required
          />
        </div>
        <div className="flex items-center border rounded p-2">
          <Lock className="mr-2" />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full outline-none"
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center border rounded p-2">
            <HelpCircle className="mr-2" />
            <select
              name="question1"
              value={formData.question1}
              onChange={handleChange}
              className="w-full outline-none"
              required
            >
              <option value="">Select Security Question 1</option>
              <option value="What is your pet's name?">What is your pet's name?</option>
              <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
            </select>
          </div>
          <input
            type="text"
            name="answer1"
            placeholder="Answer"
            value={formData.answer1}
            onChange={handleChange}
            className="w-full border rounded p-2"
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center border rounded p-2">
            <HelpCircle className="mr-2" />
            <select
              name="question2"
              value={formData.question2}
              onChange={handleChange}
              className="w-full outline-none"
              required
            >
              <option value="">Select Security Question 2</option>
              <option value="What is your favorite color?">What is your favorite color?</option>
              <option value="What is your favorite book?">What is your favorite book?</option>
            </select>
          </div>
          <input
            type="text"
            name="answer2"
            placeholder="Answer"
            value={formData.answer2}
            onChange={handleChange}
            className="w-full border rounded p-2"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      <p className="mt-4 text-center">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-500 hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}