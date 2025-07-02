'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../stores/authStore';
import { useApi } from '@/hooks/useApi';
import toast from 'react-hot-toast';
import { User, Edit, Mail } from 'lucide-react';
import api from '@/utils/api';

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(false);
  const { handleRequest } = useApi();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/profile');
    } else {
      setFormData({ name: user.name, email: user.email });
    }
  }, [user, router]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await handleRequest(api.put('/api/users/profile', { name: formData.name, email: formData.email }));
      if (response.success) {
        updateUser(response.data);
        toast.success('Profile updated');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="container mx-auto p-4 max-w-md">
      <h1 className="text-2xl font-bold mb-4">Your Profile</h1>
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
            aria-label="Full Name"
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
            aria-label="Email"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 flex items-center justify-center disabled:opacity-50"
          aria-label="Update Profile"
        >
          <Edit className="mr-2" />
          {loading ? 'Updating...' : 'Update Profile'}
        </button>
      </form>
    </div>
  );
}