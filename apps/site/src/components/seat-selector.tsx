import React, { useState, useEffect } from 'react';
import { Seat } from '../models';
import { useSeats, updateSeatStatus } from '../lib/seat'; // Assuming updateSeatStatus might be used here directly later
import { useGun } from '../lib/gun/GunProvider'; // To get gun instance for potential direct updates

interface SeatSelectorProps {
  venueId: string;
  onSeatSelect: (seatId: string | null) => void;
  initiallySelectedSeatId?: string | null; // Optional: to set an initial selection
}

const SeatSelector: React.FC<SeatSelectorProps> = ({ venueId, onSeatSelect, initiallySelectedSeatId = null }) => {
  const seats = useSeats(venueId); // Fetches and subscribes to seats for the venue
  const { gun } = useGun(); // For potential direct actions like optimistic updates or reserving
  const [internalSelectedSeatId, setInternalSelectedSeatId] = useState<string | null>(initiallySelectedSeatId);

  // Effect to call onSeatSelect when internalSelectedSeatId changes
  useEffect(() => {
    onSeatSelect(internalSelectedSeatId);
  }, [internalSelectedSeatId, onSeatSelect]);
  
  // Effect to update internal state if initiallySelectedSeatId prop changes
  useEffect(() => {
    setInternalSelectedSeatId(initiallySelectedSeatId);
  }, [initiallySelectedSeatId]);

  const handleSeatClick = (seat: Seat) => {
    if (!gun) {
      console.warn("Gun instance not available. Cannot select seat.");
      alert("Cannot select seat. System not ready.");
      return;
    }

    if (seat.status === 'available') {
      if (internalSelectedSeatId === seat.id) {
        // Deselect if the same seat is clicked again
        setInternalSelectedSeatId(null);
        // Potentially update seat status back if it was 'reserved' locally (not implemented here)
      } else {
        // Select the new seat
        setInternalSelectedSeatId(seat.id);
        // Optionally, you could optimistically update the seat status to 'reserved' here
        // or mark it as 'pending_selection' if there's a temporary reservation process.
        // For now, selection is purely client-side state.
        // Example of an optimistic update (would require more logic for rollback if actual reservation fails):
        // updateSeatStatus(gun, venueId, seat.id, 'reserved'); 
      }
    } else if (seat.status === 'reserved' && internalSelectedSeatId === seat.id) {
        // Allow deselecting a seat that was 'reserved' by the current user (if applicable)
        // This logic needs to be more robust in a real app (e.g. check if current user reserved it)
        setInternalSelectedSeatId(null);
        // updateSeatStatus(gun, venueId, seat.id, 'available'); // Make it available again
    } else {
      // Seat is booked or otherwise not selectable
      alert(`Seat ${seat.id} is currently ${seat.status} and cannot be selected.`);
    }
  };

  if (!seats || seats.length === 0) {
    return <div className="p-4 text-center text-gray-600">Loading seats or no seats available for this venue...</div>;
  }

  // Simple grid layout (e.g. 5 seats per row)
  const seatsPerRow = 5;
  const rows: Seat[][] = [];
  for (let i = 0; i < seats.length; i += seatsPerRow) {
    rows.push(seats.slice(i, i + seatsPerRow));
  }

  return (
    <div className="p-4 border rounded-lg shadow-md bg-white">
      <h3 className="text-xl font-semibold mb-4 text-center text-gray-700">Select Your Seat</h3>
      <div className="space-y-3">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center space-x-2">
            {row.map((seat) => {
              const isSelected = internalSelectedSeatId === seat.id;
              let bgColor = 'bg-gray-300'; // Default for non-available
              let textColor = 'text-gray-500';
              let hoverEffect = '';
              let cursor = 'cursor-not-allowed';

              if (seat.status === 'available') {
                bgColor = isSelected ? 'bg-green-500' : 'bg-blue-500';
                textColor = 'text-white';
                hoverEffect = isSelected ? 'hover:bg-green-600' : 'hover:bg-blue-600';
                cursor = 'cursor-pointer';
              } else if (seat.status === 'booked') {
                bgColor = 'bg-red-500';
                textColor = 'text-white';
              } else if (seat.status === 'reserved') {
                // If reserved by current user (simulated by being selected), make it look different
                bgColor = isSelected ? 'bg-yellow-500' : 'bg-yellow-300';
                textColor = isSelected ? 'text-white' : 'text-gray-700';
                cursor = isSelected ? 'cursor-pointer' : 'cursor-not-allowed'; // allow deselect if selected
              }

              return (
                <button
                  key={seat.id}
                  onClick={() => handleSeatClick(seat)}
                  disabled={seat.status === 'booked' && !isSelected} // Allow clicking selected 'reserved' to deselect
                  className={`p-3 rounded-md w-20 h-16 flex flex-col justify-center items-center text-sm font-medium transition-colors ${bgColor} ${textColor} ${hoverEffect} ${cursor} shadow-sm`}
                  title={`Seat ${seat.id} - ${seat.description} (${seat.status}) - Price: $${seat.price}`}
                >
                  <span className="text-lg">{seat.id}</span>
                  <span className="text-xs capitalize">{seat.status}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {internalSelectedSeatId && (
        <p className="mt-4 text-center text-lg font-semibold text-green-700">
          Selected Seat: {internalSelectedSeatId}
        </p>
      )}
      {!internalSelectedSeatId && (
         <p className="mt-4 text-center text-sm text-gray-500">
          No seat selected.
        </p>
      )}
    </div>
  );
};

export default SeatSelector;
