import { useCartStore } from '../stores/cartStore';
import { useCartActions } from '@/hooks/useCartActions';
import { Plus, Minus, Trash2 } from 'lucide-react';

export default function CartItem({ item }) {
  const { updateQuantity, removeFromCart } = useCartActions();
  useCartStore(); // Assuming your store has this action

  return (
    <div className="flex items-center p-4 border rounded mb-2">
      <img 
        src={item.image} 
        alt={item.name} 
        className="w-16 h-16 object-cover mr-4" 
      />
      <div className="flex-1">
        <h3 className="font-semibold">{item.name}</h3>
        {item.size !== 'default' && <p className="text-sm text-gray-600">Size: {item.size}</p>}
        <p className="text-sm">₹{item.price}</p>
      </div>
      <div className="flex items-center">
        <div className="flex items-center mr-2">
          <button
            onClick={() => updateQuantity(item.productId, item.size ?? 'default', item.quantity - 1)}
            className="p-button bg-gray-200 p-1 rounded"
            disabled={item.quantity <= 1}
          >
            <Minus size={16} />
          </button>
          <span className="px-4">{item.quantity}</span>
          <button
            onClick={() => updateQuantity(item.productId, item.size ?? 'default', item.quantity + 1)}
            className="button bg-gray-200 p-1 rounded"
          >
            <Plus size={16} />
          </button>
        </div>
        <button
          onClick={() => removeFromCart(item.productId, item.size ?? 'default')}
          className="ml-4 text-red-600"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}