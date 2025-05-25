import { Cart, CartItem, Product } from '../models'; // Product might not be used directly here but good for context
import { IGunChainReference } from 'gun/types/chain';
import { useGun } from './gun/GunProvider'; 
import { useEffect, useState } from 'react';
// Assuming useGet is for fetching static data, for live updates using .on directly
// import { useGet } from './gun/hooks'; 

const CART_NODE_ID = 'guest_cart';

// Helper to get Gun node reference.
// In a real app, useGun() might provide the gun instance directly scoped or you might have a global/contextual gun instance.
// For this implementation, assuming useGun() from GunProvider gives the root gun instance.
const getResolvedGunNode = (gun: IGunChainReference<any>, nodeId: string): IGunChainReference<any> => {
  return gun.get(nodeId);
};


export const addToCart = async (
  gun: IGunChainReference<any>, 
  productId: string,
  quantity: number,
  priceAtAddition: number,
  // productName and imageUrl are passed as arguments as per the requirement,
  // but they are not stored in CartItem based on the models.ts definition.
  // They are marked with an underscore to indicate they might be used for other logic
  // (e.g., events, analytics) but not for direct storage in the cart item itself.
  _productName: string, 
  _imageUrl?: string   
): Promise<void> => {
  try {
    const cartNode = getResolvedGunNode(gun, CART_NODE_ID);
    
    // Fetch the current cart data once.
    const currentCartData = await cartNode.then();

    let cart: Cart;

    // Check if cartData exists and is a valid cart object.
    // Gun.js might return undefined or just the node if it has no properties.
    if (currentCartData && typeof currentCartData === 'object' && currentCartData.id === CART_NODE_ID) {
      cart = currentCartData as Cart;
      // Ensure items object exists, as Gun might not create it if it was empty previously
      if (!cart.items) {
        cart.items = {};
      }
    } else {
      // Initialize a new cart if no valid one is found
      console.log("Initializing new cart with ID:", CART_NODE_ID);
      cart = {
        id: CART_NODE_ID,
        items: {},
        lastUpdated: Date.now(),
      };
    }

    const existingItem = cart.items[productId];

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      // Create CartItem without productName and imageUrl as per models.ts
      cart.items[productId] = {
        productId,
        quantity,
        priceAtAddition,
      };
    }

    cart.lastUpdated = Date.now();

    await cartNode.put(cart as any); // Cast to any for Gun's flexible schema
    console.log(`Product ${productId} processed for cart. Cart ID: ${cart.id}.`);
  } catch (error) {
    console.error(`Error adding product ${productId} to cart:`, error);
    throw error; // Re-throw to allow caller to handle
  }
};

export const useCart = (): Cart | null => {
  const { gun } = useGun(); // Access the gun instance from context
  const [cart, setCart] = useState<Cart | null>(null);
  // Optional: add a loading state if complex initial fetch or processing is needed
  // const [isLoading, setIsLoading] = useState(true); 

  useEffect(() => {
    if (!gun) {
      // setIsLoading(false); // if using loading state
      // console.warn("Gun instance not available in useCart.");
      // Set a default empty cart structure if gun is not available,
      // or handle as an error/empty state as per application requirements.
      setCart({ id: CART_NODE_ID, items: {}, lastUpdated: 0 });
      return;
    }

    const cartNode = getResolvedGunNode(gun, CART_NODE_ID);
    let isMounted = true; // Guard against setting state on unmounted component

    // Initial fetch of the cart data
    cartNode.then(data => {
      if (isMounted) {
        if (data && typeof data === 'object' && data.id === CART_NODE_ID) {
          setCart({ ...data, items: data.items || {} } as Cart);
        } else {
          // If no cart exists or data is malformed, initialize with a default empty cart.
          setCart({ id: CART_NODE_ID, items: {}, lastUpdated: Date.now() });
        }
        // setIsLoading(false); // if using loading state
      }
    }).catch(err => {
      console.error("Error fetching initial cart data:", err);
      if (isMounted) {
        // It might be appropriate to set an error state or a default cart here too.
        setCart({ id: CART_NODE_ID, items: {}, lastUpdated: Date.now() }); // Default on error
        // setIsLoading(false); // if using loading state
      }
    });
    
    // Subscribe to live updates for the cart
    const listener = cartNode.on((data, _key, _message, _event) => {
      if (isMounted) {
        if (data && typeof data === 'object' && data.id === CART_NODE_ID) {
          // Ensure items is always an object to prevent render issues
          const updatedCart = { ...data, items: data.items || {} } as Cart;
          setCart(updatedCart);
        } else if (data === null || data === undefined) {
          // Handle cases where the cart node might be explicitly deleted or becomes empty
          // Re-initialize to a default empty cart.
          setCart({ id: CART_NODE_ID, items: {}, lastUpdated: Date.now() });
        }
      }
    });

    return () => {
      isMounted = false;
      if (listener && typeof listener.off === 'function') { // Gun's .on() returns an event emitter
         listener.off(); // Detach the listener
      } else if (gun) { // Fallback if listener structure is different or to ensure node itself is "offed"
         cartNode.off(); // General cleanup for the node path
      }
    };
  }, [gun]); // Effect dependencies

  // Return the cart. It will be null initially if not using a loading state,
  // or until the initial fetch completes and sets a default cart.
  // Or, always return a cart object:
  return cart || { id: CART_NODE_ID, items: {}, lastUpdated: 0 };
};

export const updateCartItemQuantity = async (
  gun: IGunChainReference<any>,
  productId: string,
  newQuantity: number
): Promise<void> => {
  try {
    const cartNode = getResolvedGunNode(gun, CART_NODE_ID);
    const currentCartData = await cartNode.then();

    if (currentCartData && typeof currentCartData === 'object' && currentCartData.id === CART_NODE_ID) {
      const cart = currentCartData as Cart;
      if (!cart.items) {
        cart.items = {}; // Should not happen if cart is initialized correctly
      }

      const item = cart.items[productId];

      if (item) {
        if (newQuantity > 0) {
          item.quantity = newQuantity;
          cart.lastUpdated = Date.now();
          await cartNode.put(cart as any);
          console.log(`Quantity updated for product ${productId} to ${newQuantity}.`);
        } else {
          // If new quantity is 0 or less, remove the item
          delete cart.items[productId];
          cart.lastUpdated = Date.now();
          await cartNode.put(cart as any);
          console.log(`Product ${productId} removed from cart due to zero quantity.`);
        }
      } else {
        console.warn(`Product ${productId} not found in cart for quantity update.`);
      }
    } else {
      console.warn("Cart not found or malformed for updating item quantity.");
    }
  } catch (error) {
    console.error(`Error updating quantity for product ${productId}:`, error);
    throw error;
  }
};

export const removeCartItem = async (
  gun: IGunChainReference<any>,
  productId: string
): Promise<void> => {
  try {
    const cartNode = getResolvedGunNode(gun, CART_NODE_ID);
    const currentCartData = await cartNode.then();

    if (currentCartData && typeof currentCartData === 'object' && currentCartData.id === CART_NODE_ID) {
      const cart = currentCartData as Cart;
      if (cart.items && cart.items[productId]) {
        delete cart.items[productId];
        cart.lastUpdated = Date.now();
        await cartNode.put(cart as any);
        console.log(`Product ${productId} removed from cart.`);
      } else {
        console.warn(`Product ${productId} not found in cart for removal.`);
      }
    } else {
      console.warn("Cart not found or malformed for removing item.");
    }
  } catch (error) {
    console.error(`Error removing product ${productId} from cart:`, error);
    throw error;
  }
};
