import React from 'react';
import { createFileRoute, Link, useSearch } from '@tanstack/react-router';

// Define expected search parameters for this route
interface CheckoutFailureSearch {
  orderId?: string;
  reason?: string; // e.g., 'payment_failed', 'dv_mismatch', 'missing_params', 'internal_server_error'
  ps?: string; // Payment status from Fonepay
  rc?: string; // Response code from Fonepay
  // Potentially, we might want to pass cartId and seatId back to reconstruct the checkout attempt
  cartId?: string; 
  seatId?: string;
  venueId?: string;
}

export const Route = createFileRoute('/checkout/failure')({
  component: CheckoutFailureComponent,
  validateSearch: (search: Record<string, unknown>): CheckoutFailureSearch => {
    // Basic validation, can be more robust
    return {
      orderId: search.orderId as string | undefined,
      reason: search.reason as string | undefined,
      ps: search.ps as string | undefined,
      rc: search.rc as string | undefined,
      cartId: search.cartId as string | undefined,
      seatId: search.seatId as string | undefined,
      venueId: search.venueId as string | undefined,
    };
  },
});

function CheckoutFailureComponent() {
  const searchParams = useSearch<CheckoutFailureSearch>();

  let failureMessage = "Your payment could not be processed.";
  if (searchParams.reason === 'payment_failed') {
    failureMessage = "The payment was declined or failed at Fonepay.";
  } else if (searchParams.reason === 'dv_mismatch') {
    failureMessage = "There was an issue verifying the payment. Please contact support.";
  } else if (searchParams.reason === 'missing_params') {
    failureMessage = "Payment callback was incomplete. Please contact support.";
  } else if (searchParams.reason === 'internal_server_error') {
     failureMessage = "An unexpected error occurred on our server. Please try again later or contact support.";
  }
  
  const retryCheckoutSearchParams = {
    cartId: searchParams.cartId || 'guest_cart', // Default if not passed
    seatId: searchParams.seatId || undefined,
    venueId: searchParams.venueId || 'main_hall', // Default if not passed
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto text-center bg-red-50 min-h-screen flex flex-col justify-center items-center">
      <div className="bg-white shadow-2xl rounded-xl p-8 md:p-12">
        <svg className="w-20 h-20 text-red-500 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h1 className="text-3xl md:text-4xl font-bold text-red-700 mb-4">Payment Failed</h1>
        
        <p className="text-lg text-gray-700 mb-2">{failureMessage}</p>

        {searchParams.orderId && (
          <p className="text-md text-gray-600 mb-1">
            Attempted Order ID: <span className="font-semibold text-gray-800">{searchParams.orderId}</span>
          </p>
        )}
        {searchParams.rc && (
          <p className="text-sm text-gray-500 mb-1">
            Fonepay Response Code: <span className="font-semibold">{searchParams.rc}</span>
          </p>
        )}
         {searchParams.ps && searchParams.ps !== "true" && (
          <p className="text-sm text-gray-500 mb-4">
            Fonepay Status: <span className="font-semibold">{searchParams.ps}</span>
          </p>
        )}

        <p className="text-gray-600 text-sm mb-8">
          Please try the payment again. If the issue persists, contact our customer support.
        </p>

        <div className="space-y-4 md:space-y-0 md:space-x-4">
          <Link
            to="/checkout"
            search={retryCheckoutSearchParams} // Pass original cart/seat info back
            className="inline-block bg-yellow-500 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-yellow-600 transition-colors shadow-md"
          >
            Retry Payment
          </Link>
          <Link
            to="/cart"
            className="inline-block bg-gray-300 text-gray-700 px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-400 transition-colors"
          >
            Back to Cart
          </Link>
        </div>
         <Link
            to="/"
            className="block mt-8 text-blue-600 hover:underline"
          >
            Go to Homepage
          </Link>
      </div>
    </div>
  );
}
