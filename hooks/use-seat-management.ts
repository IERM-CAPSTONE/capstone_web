import { useState, useCallback } from 'react';
import apiClient from '@/lib/api/client';
import { examSeatsApi } from '@/lib/api/exam-seats';

export interface ExamSeat {
  id: string;
  examSessionId: string;
  row: number;
  col: number;
  status: 'Available' | 'Locked' | 'Assigned' | 'Present' | 'Absent';
  createdAt: string;
  updatedAt: string;
}

interface SeatResponse {
  success: boolean;
  data: ExamSeat[];
  message?: string;
}

interface SeatUpdateResponse {
  success: boolean;
  data: ExamSeat;
  message?: string;
}

export const useSeatManagement = (examSessionId: string) => {
  const [seats, setSeats] = useState<ExamSeat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all seats for a session
  const fetchSeats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/exam-seats/session/${examSessionId}`);
      
      if (response.data?.success) {
        setSeats(response.data.data || []);
      } else {
        setError(response.data?.message || 'Failed to fetch seats');
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Error fetching seats';
      setError(errorMsg);
      console.error('Error fetching seats:', err);
    } finally {
      setLoading(false);
    }
  }, [examSessionId]);

  // Update seat status (lock/unlock)
  const updateSeatStatus = useCallback(
    async (seatId: string, newStatus: ExamSeat['status']) => {
      try {
        setError(null);
        const response = await apiClient.patch(`/exam-seats/${seatId}/status`, {
          status: newStatus,
        });

        if (response.data?.success) {
          // Update local state
          setSeats(prevSeats =>
            prevSeats.map(seat =>
              seat.id === seatId ? { ...seat, status: newStatus } : seat
            )
          );
          return { success: true, data: response.data.data };
        } else {
          const errorMsg = response.data?.message || 'Failed to update seat';
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }
      } catch (err: any) {
        const errorMsg = err?.response?.data?.message || 'Error updating seat';
        setError(errorMsg);
        console.error('Error updating seat:', err);
        return { success: false, error: errorMsg };
      }
    },
    []
  );

  // Lock seat
  const lockSeat = useCallback(
    (seatId: string) => updateSeatStatus(seatId, 'Locked'),
    [updateSeatStatus]
  );

  // Unlock seat
  const unlockSeat = useCallback(
    (seatId: string) => updateSeatStatus(seatId, 'Available'),
    [updateSeatStatus]
  );

  // Swap two seats
  const swapSeats = useCallback(
    async (sourceSeatId: string, targetSeatId: string) => {
      try {
        setError(null);
        const response = await examSeatsApi.swapSeats(sourceSeatId, targetSeatId);

        if (response.success) {
          // Refetch seats to get updated state
          // This will be handled by the calling component
          return { success: true, data: response.data };
        } else {
          setError(response.message || 'Failed to swap seats');
          return { success: false, error: response.message || 'Failed to swap seats' };
        }
      } catch (err: any) {
        const errorMsg = err?.response?.data?.message || 'Error swapping seats';
        setError(errorMsg);
        console.error('Error swapping seats:', err);
        return { success: false, error: errorMsg };
      }
    },
    []
  );

  // Get seat by coordinates
  const getSeatByCoordinate = useCallback(
    (row: number, col: number): ExamSeat | undefined => {
      return seats.find(seat => seat.row === row && seat.col === col);
    },
    [seats]
  );

  return {
    seats,
    loading,
    error,
    fetchSeats,
    updateSeatStatus,
    lockSeat,
    unlockSeat,
    swapSeats,
    getSeatByCoordinate,
  };
};
