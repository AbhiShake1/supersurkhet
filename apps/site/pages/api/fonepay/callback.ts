import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { updateOrderAfterPayment, /* getOrderById - if we had it */ } from '../../../lib/order'; // Adjusted path
import { updateSeatStatus } from '../../../lib/seat'; // Adjusted path
import { Order } from '../../../../models'; // Adjusted path for Order model

// Placeholder for Gun.js initialization
const Gun = require('gun');
// const gun = Gun({ web: require('http').createServer().listen(8765), peers: ['http://localhost:8765/gun'] });
const gun = Gun(); // Simplest form

// --- Fonepay Configuration (Simulated - Use Environment Variables in Real App) ---
const FONEPAY_PID = process.env.FONEPAY_PID || "TESTMERCHANT"; // Merchant Code
const FONEPAY_SHARED_SECRET_KEY = process.env.FONEPAY_SECRET_KEY || "SECRETKEY123"; // Secret Key

// Base URL for frontend redirection
const FRONTEND_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"; // Frontend URL

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { PRN, PID, PS, RC, UID, DV, BC, INI, P_AMT, R_AMT } = req.query;

    // Ensure all required parameters are strings, as Fonepay sends them this way
    const requiredParams = { PRN, PID, PS, RC, UID, DV, BC, INI, P_AMT, R_AMT };
    for (const [key, value] of Object.entries(requiredParams)) {
      if (typeof value !== 'string') {
        console.error(`Fonepay callback missing or invalid parameter: ${key}. Value: ${value}`, req.query);
        return res.redirect(302, `${FRONTEND_BASE_URL}/checkout/failure?error=missing_params&param=${key}`);
      }
    }
    
    // Cast parameters to string now that we've checked they are strings
    const orderId = PRN as string;
    const fonepayPID = PID as string;
    const paymentStatus = PS as string;
    const responseCode = RC as string;
    const fonepayUID = UID as string;
    const dvFromFonepay = DV as string;
    const bankCode = BC as string;
    const initiator = INI as string;
    const processedAmountStr = P_AMT as string;
    const requestedAmountStr = R_AMT as string;

    // Construct data string for DV verification (must match Fonepay's expected order)
    // PRN,PID,PS,RC,UID,BC,INI,P_AMT,R_AMT
    const dataToVerify = `${orderId},${fonepayPID},${paymentStatus},${responseCode},${fonepayUID},${bankCode},${initiator},${processedAmountStr},${requestedAmountStr}`;
    const calculatedDV = calculateDV_HMACSHA512(dataToVerify, FONEPAY_SHARED_SECRET_KEY);

    console.log(`Fonepay Callback for Order ${orderId}:`, {
      received: req.query,
      dataForVerification: dataToVerify,
      calculatedDV,
      receivedDV: dvFromFonepay
    });

    if (calculatedDV !== dvFromFonepay) {
      console.warn(`DV mismatch for order ${orderId}. Calculated: ${calculatedDV}, Received: ${dvFromFonepay}`);
      // Update order status to 'failed' due to DV mismatch
      await updateOrderAfterPayment(gun, orderId, {
        fonepayUID: fonepayUID, // May still be useful to store UID
        paidAmount: parseFloat(processedAmountStr) || 0,
        fonepayStatus: responseCode,
        newStatus: "failed",
      });
      return res.redirect(302, `${FRONTEND_BASE_URL}/checkout/failure?orderId=${orderId}&reason=dv_mismatch&rc=${responseCode}`);
    }

    // DV is valid, now check payment status
    if (paymentStatus === "true") {
      console.log(`Payment successful for order ${orderId}. UID: ${fonepayUID}, Amount: ${processedAmountStr}`);
      
      const updatedOrder = await updateOrderAfterPayment(gun, orderId, {
        fonepayUID: fonepayUID,
        paidAmount: parseFloat(processedAmountStr) || 0,
        fonepayStatus: responseCode,
        newStatus: "paid",
      });

      if (updatedOrder && updatedOrder.selectedSeatId) {
        // @ts-ignore - Assuming venueId was stored on the order object, as planned in createPendingOrder
        const venueId = updatedOrder.venueId || 'main_hall'; // Fallback if venueId wasn't on order
        try {
          await updateSeatStatus(gun, venueId, updatedOrder.selectedSeatId, "booked");
          console.log(`Seat ${updatedOrder.selectedSeatId} in venue ${venueId} booked for order ${orderId}.`);
        } catch (seatError) {
          console.error(`Failed to update seat status for order ${orderId}, seat ${updatedOrder.selectedSeatId}:`, seatError);
          // This is a secondary failure; payment is still successful. Log and monitor.
        }
      }
      // TODO (Real App): Clear cart if applicable.

      res.redirect(302, `${FRONTEND_BASE_URL}/checkout/success?orderId=${orderId}&uid=${fonepayUID}&amount=${processedAmountStr}&status=${paymentStatus}&rc=${responseCode}`);
    
    } else { // Payment not successful (PS !== "true")
      console.warn(`Payment failed for order ${orderId}. Status: ${paymentStatus}, RC: ${responseCode}`);
      await updateOrderAfterPayment(gun, orderId, {
        fonepayUID: fonepayUID, // Store UID even on failure if available
        paidAmount: parseFloat(processedAmountStr) || 0, // Store amount if available
        fonepayStatus: responseCode,
        newStatus: "failed",
      });
      res.redirect(302, `${FRONTEND_BASE_URL}/checkout/failure?orderId=${orderId}&reason=payment_failed&ps=${paymentStatus}&rc=${responseCode}`);
    }

  } catch (error) {
    console.error("Critical error in /api/fonepay/callback:", error);
    const orderId = req.query.PRN as string | undefined; // Try to get orderId for error page
    const message = error instanceof Error ? error.message : "internal_server_error";
    res.redirect(302, `${FRONTEND_BASE_URL}/checkout/failure?error=${message}&orderId=${orderId || 'unknown'}`);
  }
}
