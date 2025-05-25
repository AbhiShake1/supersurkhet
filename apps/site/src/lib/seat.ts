import { Seat } from '../models';
import { IGunChainReference } from 'gun/types/chain';
import { useGun } from './gun/GunProvider';
import { useEffect, useState } from 'react';

const VENUE_SEATS_NODE_PREFIX = 'venues'; // Top-level node for all venues

// Helper to get the base Gun node for a venue's seats
const getVenueSeatsNode = (gun: IGunChainReference<any>, venueId: string): IGunChainReference<any> => {
  return gun.get(VENUE_SEATS_NODE_PREFIX).get(venueId).get('seats');
};

export const initializeSampleSeats = async (
  gun: IGunChainReference<any>, // Pass gun instance
  venueId: string
): Promise<void> => {
  try {
    const venueSeatsNode = getVenueSeatsNode(gun, venueId);

    // Check if seats are already initialized to prevent overwriting (optional)
    const existingSeatsData = await venueSeatsNode.then();
    if (existingSeatsData && Object.keys(existingSeatsData).length > 2) { // Check if more than just metadata _ exists
      console.log(`Seats for venue ${venueId} seem to be already initialized.`);
      // return; // Uncomment if you want to prevent re-initialization strictly
    }
    
    console.log(`Initializing sample seats for venue: ${venueId}`);

    const sampleSeats: Seat[] = [
      { id: "A1", venueId, description: "Row A, Seat 1", status: "available", price: 20 },
      { id: "A2", venueId, description: "Row A, Seat 2", status: "available", price: 20 },
      { id: "A3", venueId, description: "Row A, Seat 3", status: "booked", price: 20 },
      { id: "B1", venueId, description: "Row B, Seat 1", status: "available", price: 18 },
      { id: "B2", venueId, description: "Row B, Seat 2", status: "reserved", price: 18 },
      { id: "B3", venueId, description: "Row B, Seat 3", status: "available", price: 18 },
      { id: "C1", venueId, description: "Row C, Seat 1 (VIP)", status: "available", price: 35 },
      { id: "C2", venueId, description: "Row C, Seat 2 (VIP)", status: "available", price: 35 },
    ];

    for (const seat of sampleSeats) {
      // Use .get(seat.id).put(seat) to store each seat as a separate node under 'seats'
      // This allows for individual seat updates and subscriptions more easily.
      await venueSeatsNode.get(seat.id).put(seat as any);
    }
    console.log(`Successfully initialized ${sampleSeats.length} sample seats for venue ${venueId}.`);
  } catch (error) {
    console.error(`Error initializing sample seats for venue ${venueId}:`, error);
    throw error;
  }
};

export const useSeats = (venueId: string): Seat[] => {
  const { gun } = useGun();
  const [seats, setSeats] = useState<Seat[]>([]);

  useEffect(() => {
    if (!gun || !venueId) {
      setSeats([]); // Clear seats if gun or venueId is not available
      return;
    }

    const venueSeatsNode = getVenueSeatsNode(gun, venueId);
    let isMounted = true;
    const loadedSeats: Record<string, Seat> = {};

    // Gun's .map().on() is suitable for collections where each item is a node.
    // It iterates over the direct children of venueSeatsNode.
    const listener = venueSeatsNode.map().on((seatData, seatId) => {
      if (isMounted && seatData) {
        // Filter out Gun's metadata (nodes starting with '_')
        if (seatId && !seatId.startsWith('_') && typeof seatData === 'object' && seatData.id) {
          loadedSeats[seatId] = { ...seatData } as Seat;
          // Update the state with a new array of seat values
          setSeats(Object.values(loadedSeats));
        }
      }
    });
    
    // Initial fetch to populate quickly (optional, .on() might be enough)
    // venueSeatsNode.map().once(seatData => { ... }); // could be used

    return () => {
      isMounted = false;
      if (listener && typeof listener.off === 'function') {
        listener.off();
      } else if (gun) { // Fallback
        venueSeatsNode.off();
      }
      setSeats([]); // Clear seats on unmount or venueId change
    };
  }, [gun, venueId]);

  return seats;
};

export const updateSeatStatus = async (
  gun: IGunChainReference<any>, // Pass gun instance
  venueId: string,
  seatId: string,
  newStatus: "available" | "booked" | "reserved"
): Promise<void> => {
  try {
    const seatNode = getVenueSeatsNode(gun, venueId).get(seatId);
    const currentSeatData = await seatNode.then();

    if (currentSeatData && typeof currentSeatData === 'object' && currentSeatData.id === seatId) {
      const updatedSeat: Seat = { ...currentSeatData, status: newStatus } as Seat;
      await seatNode.put(updatedSeat as any);
      console.log(`Seat ${seatId} in venue ${venueId} updated to status: ${newStatus}`);
    } else {
      console.warn(`Seat ${seatId} not found in venue ${venueId} for status update.`);
      // Optionally, throw an error if the seat must exist
      // throw new Error(`Seat ${seatId} not found`);
    }
  } catch (error) {
    console.error(`Error updating status for seat ${seatId} in venue ${venueId}:`, error);
    throw error;
  }
};
