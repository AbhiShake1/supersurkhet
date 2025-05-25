import React, { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useCart } from '../lib/cart'; // Assuming useCart uses the hardcoded 'guest_cart'
import { useSeats } from '../lib/seat';
import { Cart, Seat, CartItem } from '../models'; // Import models for typing

// Define expected search parameters for this route
interface CheckoutSearch {
  cartId: string;
  seatId?: string; // SeatId is optional
  venueId?: string; // venueId for fetching seats, defaults if not provided
}

export const Route = createFileRoute('/checkout')({
  component: CheckoutComponent,
  validateSearch: (search: Record<string, unknown>): CheckoutSearch => {
    // Basic validation, can be more robust
    return {
      cartId: search.cartId as string || 'guest_cart', // Default or ensure it's there
      seatId: search.seatId as string | undefined,
      venueId: search.venueId as string || 'main_hall', // Default venue
    };
  },
});

// Helper to calculate total for cart items
const calculateCartTotal = (items: Record<string, CartItem> | undefined): number => {
  if (!items) return 0;
  return Object.values(items).reduce((sum, item) => sum + item.quantity * item.priceAtAddition, 0);
};

function CheckoutComponent() {
  const navigate = useNavigate();
  const searchParams = useSearch<CheckoutSearch>();
  
  const cart = useCart(); // useCart currently uses hardcoded 'guest_cart', matching our cartId
  const seats = useSeats(searchParams.venueId || 'main_hall'); // Fetch all seats for the venue
  
  const [selectedSeat, setSelectedSeat] = useState<Seat | null | undefined>(undefined); // undefined for loading, null for not found/not selected
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (cart === null || (searchParams.seatId && seats.length === 0)) {
      // Still waiting for cart or seats to load if seatId is present
      setIsLoading(true);
    } else {
      setIsLoading(false);
      if (searchParams.seatId && seats.length > 0) {
        const foundSeat = seats.find(s => s.id === searchParams.seatId);
        setSelectedSeat(foundSeat || null); // null if not found
      } else {
        setSelectedSeat(null); // No seatId passed or no seats
      }
    }
  }, [cart, seats, searchParams.seatId]);


  if (isLoading) {
    return <div className="p-6 text-center">Loading checkout details...</div>;
  }

  if (!cart || !cart.items || Object.keys(cart.items).length === 0) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-semibold mb-4">Your Cart is Empty</h1>
        <p className="mb-4">Please add items to your cart before proceeding to checkout.</p>
        <Link to="/cart" className="text-blue-600 hover:underline">Return to Cart</Link>
        <br />
        <Link to="/" className="text-blue-600 hover:underline mt-2 inline-block">Continue Shopping</Link>
      </div>
    );
  }
  
  const cartTotal = calculateCartTotal(cart.items);
  const seatPrice = selectedSeat?.price || 0;
  const overallTotal = cartTotal + seatPrice;

  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handlePayment = async () => {
    if (!cart || !cart.id) {
      alert("Cart details are missing. Cannot proceed.");
      return;
    }
    setIsProcessingPayment(true);
    try {
      // Assuming orderId is the cartId for simplicity here.
      // In a real app, you'd likely generate a unique order ID and persist the order.
      const orderId = cart.id; 
      const userId = "guest_user"; // Placeholder userId

      const response = await fetch('/api/fonepay/initiate', { // Updated path
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderId,
          totalAmount: overallTotal,
          userId: userId, 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Payment initiation failed with status: ${response.status}`);
      }

      const { redirectUrl } = await response.json();
      if (redirectUrl) {
        // Redirect the user to Fonepay's payment page
        window.location.href = redirectUrl;
      } else {
        throw new Error("No redirect URL received from payment initiation.");
      }
    } catch (error) {
      console.error("Fonepay initiation error:", error);
      alert(`Error during payment initiation: ${error instanceof Error ? error.message : String(error)}`);
      setIsProcessingPayment(false);
    }
    // No need to setIsProcessingPayment(false) here if redirecting, 
    // but good practice if the flow could continue on this page.
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-semibold mb-8 text-center text-gray-800">Order Checkout</h1>

      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2 text-gray-700">Order Summary</h2>
        
        {/* Cart Items */}
        <div className="mb-6">
          <h3 className="text-xl font-medium mb-3 text-gray-600">Items:</h3>
          {Object.values(cart.items).map(item => (
            <div key={item.productId} className="flex justify-between items-center py-2 border-b last:border-b-0">
              <div>
                <p className="font-medium text-gray-800">Product ID: {item.productId}</p>
                <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
              </div>
              <p className="text-gray-700">${(item.priceAtAddition * item.quantity).toFixed(2)}</p>
            </div>
          ))}
           <div className="flex justify-between items-center pt-2 font-semibold text-gray-800">
            <span>Cart Subtotal:</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Selected Seat */}
        {searchParams.seatId && (
          <div className="mb-6">
            <h3 className="text-xl font-medium mb-3 text-gray-600">Selected Seat:</h3>
            {selectedSeat === undefined && <p className="text-gray-500">Loading seat details...</p>}
            {selectedSeat === null && <p className="text-red-500">Seat {searchParams.seatId} could not be found for venue {searchParams.venueId}.</p>}
            {selectedSeat && (
              <div className="flex justify-between items-center py-2">
                <div>
                  <p className="font-medium text-gray-800">Seat ID: {selectedSeat.id}</p>
                  <p className="text-sm text-gray-500">{selectedSeat.description}</p>
                </div>
                <p className="text-gray-700">${selectedSeat.price?.toFixed(2) || 'N/A'}</p>
              </div>
            )}
          </div>
        )}
        {!searchParams.seatId && (
             <p className="text-sm text-gray-500 mb-6">No seat selected for this order.</p>
        )}


        {/* Overall Total */}
        <div className="border-t border-gray-300 pt-4">
          <div className="flex justify-between items-center text-2xl font-bold text-gray-900">
            <span>Overall Total:</span>
            <span>${overallTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Button */}
      <div className="text-center">
        <button
          onClick={handlePayment}
          disabled={isProcessingPayment || overallTotal <= 0}
          className="w-full max-w-xs bg-orange-500 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-orange-600 transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isProcessingPayment ? "Processing..." : "Pay with Fonepay"}
        </button>
      </div>
       <div className="mt-8 text-center">
        <Link to="/cart" className="text-blue-600 hover:underline">&larr; Back to Cart</Link>
      </div>
    </div>
  );
}
