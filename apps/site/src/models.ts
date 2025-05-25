export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
}

export interface Cart {
  id: string;
  items: Record<string, CartItem>;
  lastUpdated: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
  priceAtAddition: number;
}

export interface Order {
  id: string;
  userId?: string;
  items: OrderItem[];
  totalAmount: number;
  paidAmount?: number;
  currency: string;
  status: "pending_payment" | "paid" | "failed" | "cancelled";
  createdAt: number;
  updatedAt: number;
  fonepayPRN: string;
  fonepayUID?: string;
  fonepayStatus?: string;
  selectedSeatId?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  priceAtOrder: number;
}

export interface Seat {
  id: string;
  venueId?: string;
  description: string;
  status: "available" | "booked" | "reserved";
  price?: number;
}
