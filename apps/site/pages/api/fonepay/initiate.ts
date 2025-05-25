import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { generateOrderId, createPendingOrder } from '../../../lib/order'; // Adjusted path
import { Cart, Seat, CartItem } from '../../../../models'; // Adjusted path for models

// Placeholder for Gun.js initialization - in a real Next.js API route,
// you'd need a persistent Gun peer or a way to connect to one.
const Gun = require('gun'); // Or import Gun from 'gun'; if using ES modules and Gun supports it server-side
// const gun = Gun({ web: require('http').createServer().listen(8765), peers: ['http://localhost:8765/gun'] }); // Example of a more persistent setup
const gun = Gun(); // Simplest form, data might not persist reliably across serverless invocations without a peer.

// --- Fonepay Configuration (Simulated - Use Environment Variables in Real App) ---
const FONEPAY_PID = process.env.FONEPAY_PID || "TESTMERCHANT"; // Merchant Code
const FONEPAY_SHARED_SECRET_KEY = process.env.FONEPAY_SECRET_KEY || "SECRETKEY123"; // Secret Key
const FONEPAY_DEV_URL = "https://dev-clientapi.fonepay.com/api/merchantRequest"; // Fonepay's API URL

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"; // Frontend URL
const FONEPAY_RETURN_URL = `${APP_BASE_URL}/api/fonepay/callback`; // Callback URL for this API

const MD = "P"; // Payment Mode: P (Payment)
const CRN = "NPR"; // Currency: NPR

// --- HMAC SHA512 Helper ---
function calculateDV_HMACSHA512(data: string, secret: string): string {
  try {
    const hmac = crypto.createHmac('sha512', secret);
    hmac.update(data);
    return hmac.digest('hex');
  } catch (error) {
    console.error("Error calculating HMAC SHA512 DV:", error);
    return "error_generating_hash"; // Should be handled by caller
  }
}

// Helper to calculate total amount from cart and seat
const calculateTotal = (cart: Cart, selectedSeat: Seat | null): number => {
  let total = 0;
  if (cart && cart.items) {
    total += Object.values(cart.items).reduce(
      (sum, item: CartItem) => sum + item.quantity * item.priceAtAddition,
      0
    );
  }
  if (selectedSeat && selectedSeat.price) {
    total += selectedSeat.price;
  }
  return parseFloat(total.toFixed(2));
};


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { cart, selectedSeat, userId } = req.body as { cart: Cart; selectedSeat: Seat | null; userId?: string };

    if (!cart || !cart.id || !cart.items) { // Ensure cart and items are present
      return res.status(400).json({ error: "Missing or invalid cart data." });
    }
    // selectedSeat can be null, so no direct validation for its presence here unless required by business logic

    const orderId = generateOrderId(); // Generate a unique order ID (PRN for Fonepay)
    const totalAmount = calculateTotal(cart, selectedSeat);

    if (totalAmount <= 0) {
        return res.status(400).json({ error: "Total amount must be greater than zero." });
    }

    // Create a pending order in Gun.js
    const pendingOrder = await createPendingOrder(gun, orderId, cart, selectedSeat, totalAmount, userId);
    if (!pendingOrder) {
      return res.status(500).json({ error: "Failed to create pending order." });
    }

    const PRN = orderId; // Use the generated orderId as Fonepay's Product Reference Number
    const AMT = totalAmount.toFixed(2); // Amount, formatted to two decimal places

    const now = new Date();
    const DT = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}/${now.getFullYear()}`;

    const R1 = `Order ${PRN}`; // Remarks field
    const R2 = userId || "Guest"; // Additional remarks or user identifier

    // Data string for DV calculation (must match Fonepay's expected order)
    // FONEPAY_PID,MD,PRN,AMT,CRN,DT,R1,R2,FONEPAY_RETURN_URL
    const dataToHash = `${FONEPAY_PID},${MD},${PRN},${AMT},${CRN},${DT},${R1},${R2},${FONEPAY_RETURN_URL}`;
    const DV = calculateDV_HMACSHA512(dataToHash, FONEPAY_SHARED_SECRET_KEY);

    if (DV === "error_generating_hash") {
      // Potentially update order status to 'failed' here if it was already created
      console.error("Hash generation failed for order:", orderId);
      return res.status(500).json({ error: "Could not generate payment hash." });
    }

    // Construct Fonepay redirect URL with URL-encoded parameters
    const params = new URLSearchParams({
      PID: FONEPAY_PID,
      MD: MD,
      PRN: PRN,
      AMT: AMT,
      CRN: CRN,
      DT: DT,
      R1: R1,
      R2: R2,
      DV: DV,
      RU: FONEPAY_RETURN_URL,
    });
    const redirectUrl = `${FONEPAY_DEV_URL}?${params.toString()}`;
    
    console.log(`Fonepay Initiation for Order ${orderId}:`, { dataToHash, DV, redirectUrl, returnUrl: FONEPAY_RETURN_URL });

    return res.status(200).json({ redirectUrl });

  } catch (error) {
    console.error("Error in /api/fonepay/initiate:", error);
    // Ensure error is an instance of Error for consistent message access
    const message = error instanceof Error ? error.message : "Internal server error during payment initiation.";
    return res.status(500).json({ error: message });
  }
}
