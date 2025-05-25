import React from 'react';
import { createFileRoute, Link, useSearch } from '@tanstack/react-router';

// Define expected search parameters for this route
interface CheckoutSuccessSearch {
  orderId?: string;
  uid?: string; // Fonepay transaction ID
  amount?: string; // Amount paid
  status?: string; // Payment status from Fonepay
  rc?: string; // Response code from Fonepay
}

export const Route = createFileRoute('/checkout/success')({
  component: CheckoutSuccessComponent,
  validateSearch: (search: Record<string, unknown>): CheckoutSuccessSearch => {
    // Basic validation, can be more robust
    return {
      orderId: search.orderId as string | undefined,
      uid: search.uid as string | undefined,
      amount: search.amount as string | undefined,
      status: search.status as string | undefined,
      rc: search.rc as string | undefined,
    };
  },
});

function CheckoutSuccessComponent() {
  const searchParams = useSearch<CheckoutSuccessSearch>();

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto text-center bg-green-50 min-h-screen flex flex-col justify-center items-center">
      <div className="bg-white shadow-2xl rounded-xl p-8 md:p-12">
        <svg className="w-20 h-20 text-green-500 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h1 className="text-3xl md:text-4xl font-bold text-green-700 mb-4">Payment Successful!</h1>
        
        {searchParams.orderId && (
          <p className="text-lg text-gray-700 mb-2">
            Your Order ID is: <span className="font-semibold text-gray-900">{searchParams.orderId}</span>
          </p>
        )}
        {searchParams.uid && (
          <p className="text-md text-gray-600 mb-2">
            Fonepay Transaction ID: <span className="font-semibold text-gray-800">{searchParams.uid}</span>
          </p>
        )}
        {searchParams.amount && (
          <p className="text-md text-gray-600 mb-6">
            Amount Paid: <span className="font-semibold text-gray-800">NPR {searchParams.amount}</span>
          </p>
        )}

        <p className="text-gray-600 text-sm mb-8">
          Thank you for your purchase. Your order details have been updated, and if applicable, your seat has been booked.
          You should receive a confirmation email shortly.
        </p>

        <Link
          to="/"
          className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors shadow-md"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
