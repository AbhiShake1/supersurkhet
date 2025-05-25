import { Order, OrderItem, Cart, Seat, CartItem } from '../models';
import { IGunChainReference } from 'gun/types/chain'; // For typing Gun instance

// Helper to get a reference to the orders node in Gun
const getOrdersNode = (gun: IGunChainReference<any>): IGunChainReference<any> => {
  return gun.get('orders');
};

export const generateOrderId = (): string => {
  return `FNPY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const createPendingOrder = async (
  gun: IGunChainReference<any>,
  orderId: string,
  cart: Cart,
  selectedSeat: Seat | null, // Seat can be null if not applicable/selected
  totalAmount: number,
  userId?: string // Optional userId
): Promise<Order | null> => {
  try {
    if (!cart || !cart.items) {
      console.error("Cart or cart items are missing.");
      return null;
    }

    const orderItems: OrderItem[] = Object.values(cart.items).map((cartItem: CartItem) => ({
      productId: cartItem.productId,
      // productName would typically be fetched from a product service/node based on productId
      // For now, using productId as placeholder or assuming it's included if available.
      productName: `Product ${cartItem.productId}`, // Placeholder
      quantity: cartItem.quantity,
      priceAtOrder: cartItem.priceAtAddition,
    }));

    const orderData: Order = {
      id: orderId,
      userId: userId || 'guest_user', // Default to guest if no userId provided
      items: orderItems,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      currency: 'NPR',
      status: 'pending_payment',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      fonepayPRN: orderId, // Fonepay Product Reference Number is our order ID
      selectedSeatId: selectedSeat?.id || undefined,
      // Store venueId directly on the order for easier retrieval in callback
      // @ts-ignore - adding venueId dynamically for now, should be in Order model if always needed
      venueId: selectedSeat?.venueId || (selectedSeat?.id ? 'default_venue' : undefined), 
    };

    await getOrdersNode(gun).get(orderId).put(orderData as any); // Cast to any for Gun's flexible schema
    console.log(`Pending order ${orderId} created successfully. Seat: ${selectedSeat?.id}, Venue: ${orderData.venueId}`);
    return orderData;
  } catch (error) {
    console.error(`Error creating pending order ${orderId}:`, error);
    throw error; // Re-throw to allow caller to handle
  }
};

export const updateOrderAfterPayment = async (
  gun: IGunChainReference<any>,
  orderId: string,
  paymentDetails: {
    fonepayUID?: string; // UID might not be present on failure
    paidAmount?: number; // Amount might not be relevant on some failures
    fonepayStatus?: string; // Fonepay's response code or status
    newStatus: "paid" | "failed" | "cancelled";
  }
): Promise<Order | null> => {
  try {
    const orderNode = getOrdersNode(gun).get(orderId);
    const currentOrderData = await orderNode.then();

    if (currentOrderData && typeof currentOrderData === 'object' && currentOrderData.id === orderId) {
      const updatedOrderData: Partial<Order> = {
        status: paymentDetails.newStatus,
        fonepayUID: paymentDetails.fonepayUID,
        paidAmount: paymentDetails.paidAmount !== undefined ? parseFloat(paymentDetails.paidAmount.toFixed(2)) : undefined,
        fonepayStatus: paymentDetails.fonepayStatus,
        updatedAt: Date.now(),
      };
      
      // Merge updates with existing order data. Gun's put merges by default.
      await orderNode.put(updatedOrderData as any);
      console.log(`Order ${orderId} updated after payment. New status: ${paymentDetails.newStatus}, UID: ${paymentDetails.fonepayUID}`);
      
      // Return the full updated order by re-fetching (or merging manually if preferred)
      const finalOrderData = await orderNode.then();
      return finalOrderData as Order;

    } else {
      console.warn(`Order ${orderId} not found for updating after payment.`);
      return null;
    }
  } catch (error) {
    console.error(`Error updating order ${orderId} after payment:`, error);
    throw error;
  }
};


// Optional: useOrder hook (basic implementation)
import { useState, useEffect } from 'react';
import { useGun } from './gun/GunProvider'; // Assuming GunProvider is set up

export const useOrder = (orderId: string | null | undefined): Order | null => {
  const { gun } = useGun();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!gun || !orderId) {
      setOrder(null);
      return;
    }

    const orderNode = getOrdersNode(gun).get(orderId);
    let isMounted = true;

    orderNode.on((data, _key, _at, _ev) => {
      if (isMounted) {
        if (data && typeof data === 'object' && data.id === orderId) {
          setOrder(data as Order);
        } else if (data === null || data === undefined) {
          setOrder(null); // Order deleted or does not exist
        }
      }
    });
    
    // Initial fetch
    orderNode.then(data => {
        if (isMounted && data && typeof data === 'object' && data.id === orderId) {
            setOrder(data as Order);
        }
    });

    return () => {
      isMounted = false;
      orderNode.off(); // Detach listener
    };
  }, [gun, orderId]);

  return order;
};
