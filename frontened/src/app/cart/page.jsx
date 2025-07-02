'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '../stores/cartStore';
import { useApi } from '@/hooks/useApi';
import CartItem from '../components/CartItem';
import toast from 'react-hot-toast';
import { CreditCard } from 'lucide-react';
import api from '@/utils/api';

export default function Cart() {
  const { cart, total, clearCart } = useCartStore();
  const [offerCode, setOfferCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { handleRequest } = useApi();
  const router = useRouter();

  const handleApplyOffer = async () => {
    try {
      const response = await handleRequest(
        api.post('/api/offers/apply', { code: offerCode, cartTotal: total })
      );
      if (response.success) {
        setDiscount(response.data.discount);
        toast.success('Offer applied!');
      }
    } catch (error) {
      toast.error('Invalid or expired offer code');
    }
  };

  const handleCheckout = () => {
    router.push('/checkout');
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Your Cart</h1>
      {cart.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            {cart.map((item) => (
              <CartItem key={`${item.productId}-${item.size}`} item={item} />
            ))}
          </div>
          <div className="md:w-1/3">
            <div className="border p-4 rounded">
              <h2 className="text-lg font-semibold mb-2">Order Summary</h2>
              <p>Subtotal: ₹{total}</p>
              <p>Discount: -₹{discount}</p>
              <p className="font-bold">Total: ₹{total - discount}</p>
              <div className="mt-4 flex">
                <input
                  type="text"
                  placeholder="Offer Code"
                  value={offerCode}
                  onChange={(e) => setOfferCode(e.target.value)}
                  className="border rounded p-2 flex-1"
                />
                <button
                  onClick={handleApplyOffer}
                  className="ml-2 bg-secondary text-white px-4 py-2 rounded hover:bg-purple-700"
                >
                  Apply
                </button>
              </div>
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full mt-4 bg-primary text-white py-2 rounded hover:bg-blue-600 flex items-center justify-center disabled:opacity-50"
              >
                <CreditCard className="mr-2" />
                {loading ? 'Processing...' : 'Proceed to Checkout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}