import { createFileRoute, Link } from '@tanstack/react-router';
import { useCart, updateCartItemQuantity, removeCartItem } from '../lib/cart'; 
import { useGun } from '../lib/gun/GunProvider'; 
import SeatSelector from '../components/seat-selector'; // Import SeatSelector
import React, { useState } from 'react'; // Import useState
// import { CartItem } from '../models';

export const Route = createFileRoute('/cart')({
  component: CartComponent,
});

// Helper function to calculate total price
const calculateTotal = (items: Record<string, { quantity: number; priceAtAddition: number }>) => {
  if (!items || typeof items !== 'object') return 0; // Ensure items is a valid object
  return Object.values(items).reduce((sum, item) => {
    // Ensure item and its properties are valid numbers before calculation
    const quantity = Number(item.quantity);
    const price = Number(item.priceAtAddition);
    if (isNaN(quantity) || isNaN(price)) {
      console.warn("Invalid item data in cart:", item);
      return sum;
    }
    return sum + quantity * price;
  }, 0);
};

function CartComponent() {
  const cart = useCart();
  const { gun } = useGun(); // Gun instance is needed for actions
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const SAMPLE_VENUE_ID = "main_hall"; // Sample venue ID for SeatSelector

  const handleSeatSelected = (seatId: string | null) => {
    setSelectedSeatId(seatId);
    console.log("Selected seat in CartComponent:", seatId);
    // Here you might want to also update the Order/Cart in Gun.js with the selected seat
    // For example: if (gun && cart) { gun.get('guest_cart').get('selectedSeatId').put(seatId); }
  };
  
  // Handle the loading state: useCart returns null while loading or if gun is not ready.
  if (cart === null || !gun) { // Also check for gun instance
    return (
      <div className="p-4 text-center">
        <p>Loading cart or gun not available...</p>
      </div>
    );
  }

  const cartIsEmpty = !cart.items || Object.keys(cart.items).length === 0;

  // Handle the case where the cart is empty (after loading)
  // We still want to show seat selector if cart is empty, maybe they select seat first?
  // Or, adjust logic: only show SeatSelector if cart is NOT empty.
  // For this example, we'll show it regardless, but disable checkout if cart is empty.

  // if (cartIsEmpty) {
  //   return (
  //     <div className="p-4 md:p-8 max-w-3xl mx-auto text-center">
  //       <h1 className="text-2xl font-bold mb-4">Your Cart is Empty</h1>
  //       <p className="mb-6 text-gray-600">Looks like you haven't added anything to your cart yet.</p>
  //       <Link 
  //         to="/" 
  //         className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-semibold"
  //       >
  //         Continue Shopping
  //       </Link>
  //     </div>
  //   );
  // }
        <Link 
          to="/" 
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-semibold"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  const total = calculateTotal(cart.items);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-semibold mb-8 text-center text-gray-800">Your Order</h1>
      
      {cartIsEmpty ? (
        <div className="p-4 md:p-8 max-w-3xl mx-auto text-center bg-white shadow-lg rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Your Cart is Empty</h2>
          <p className="mb-6 text-gray-600">Please add items to your cart before selecting a seat.</p>
          <Link 
            to="/" 
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-semibold"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-gray-700">Cart Items</h2>
          <div className="space-y-5 mb-8">
            {Object.values(cart.items).map((item) => {
              if (!item || typeof item.productId === 'undefined' || typeof item.quantity === 'undefined' || typeof item.priceAtAddition === 'undefined') {
                console.warn("Malformed item in cart, skipping render:", item);
                return null; 
              }
              return (
                <div 
                  key={item.productId} 
                  className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 rounded-lg shadow-md bg-gray-50"
                >
                  <div className="flex-grow mb-4 md:mb-0">
                    <h3 className="text-lg font-medium text-gray-900">Product ID: {item.productId}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Unit Price: <span className="font-semibold">${item.priceAtAddition.toFixed(2)}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Quantity: <span className="font-semibold">{item.quantity}</span>
                    </p>
                  </div>
                  <div className="flex items-center space-x-3 self-start md:self-center">
                    <button
                      onClick={async () => { if (gun) { try { await updateCartItemQuantity(gun, item.productId, item.quantity - 1); } catch (e) { console.error(e); alert("Update failed"); } } }}
                      className="px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                      disabled={item.quantity <= 0}
                    > &ndash; </button>
                    <span className="text-lg font-medium text-gray-800">{item.quantity}</span>
                    <button
                      onClick={async () => { if (gun) { try { await updateCartItemQuantity(gun, item.productId, item.quantity + 1); } catch (e) { console.error(e); alert("Update failed"); } } }}
                      className="px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                    > + </button>
                    <button
                      onClick={async () => { if (gun && confirm(`Remove ${item.productId}?`)) { try { await removeCartItem(gun, item.productId); } catch (e) { console.error(e); alert("Remove failed"); } } }}
                      className="px-4 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                    > Remove </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Seat Selector - shown even if cart is empty, could be conditional */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
        <SeatSelector venueId={SAMPLE_VENUE_ID} onSeatSelect={handleSeatSelected} initiallySelectedSeatId={selectedSeatId} />
      </div>
      
      {selectedSeatId && (
        <div className="my-4 p-3 bg-blue-100 border border-blue-300 rounded-md text-center">
          <p className="font-semibold text-blue-700">Selected Seat: {selectedSeatId}</p>
        </div>
      )}

      <div className="border-t border-gray-300 pt-6 bg-white shadow-lg rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">Total:</h3>
          <h3 className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</h3>
        </div>
        <Link
          to="/checkout"
          search={{ 
            cartId: cart?.id || 'guest_cart', // Pass cartId, default to guest_cart if cart is null/undefined
            seatId: selectedSeatId || undefined, // Pass selectedSeatId, ensure it's undefined if null
            venueId: SAMPLE_VENUE_ID // Pass the venueId used for seat selection
          }}
          className={`w-full block text-center bg-green-600 text-white px-6 py-3 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors ${ (cartIsEmpty || !selectedSeatId) ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={cartIsEmpty || !selectedSeatId} // Keep disabled state for visual cue, Link handles actual prevention if needed
        >
          Proceed to Checkout (with seat {selectedSeatId || 'not selected'})
        </Link>
      </div>
      
      {/* Debugging information - can be removed for production */}
      <div className="mt-10 p-4 bg-gray-100 rounded-md text-xs text-gray-700">
        <p className="font-semibold mb-1">Debug Info:</p>
        <p><span className="font-medium">Cart ID:</span> {cart.id}</p>
        <p><span className="font-medium">Cart Last Updated:</span> {new Date(cart.lastUpdated).toLocaleString()}</p>
        <p><span className="font-medium">Selected Seat ID:</span> {selectedSeatId || "None"}</p>
        <p><span className="font-medium">Venue ID for Seats:</span> {SAMPLE_VENUE_ID}</p>
        {/* <pre className="mt-2 text-xs overflow-x-auto">{JSON.stringify(cart, null, 2)}</pre> */}
      </div>
    </div>
  );
}
