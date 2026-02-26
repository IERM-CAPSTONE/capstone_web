import apiClient from "./client";

export interface ExamSeat {
  id: string;
  examSessionId: string;
  row: number;
  column: number;
  seatNumber: string;
  status: 'Available' | 'Locked' | 'Assigned' | 'Present' | 'Absent';
  createdAt: string;
  updatedAt: string;
}

export interface SwapSeatsResponse {
  success: boolean;
  message: string;
  data: {
    sourceSeatId: string;
    targetSeatId: string;
    swappedStudents?: {
      sourceSeatStudent?: {
        id: string;
        studentCode: string;
      };
      targetSeatStudent?: {
        id: string;
        studentCode: string;
      };
    };
  };
}

export const examSeatsApi = {
  // Swap two seats
  swapSeats: async (
    sourceSeatId: string,
    targetSeatId: string
  ): Promise<SwapSeatsResponse> => {
    const response = await apiClient.patch<SwapSeatsResponse>(
      `/exam-seats/${sourceSeatId}/swap`,
      { targetSeatId }
    );
    return response.data;
  },

  // Change seat status (lock/unlock)
  changeStatus: async (
    seatId: string,
    status: 'Available' | 'Locked'
  ): Promise<{ data: ExamSeat }> => {
    const response = await apiClient.patch<{ data: ExamSeat }>(
      `/exam-seats/${seatId}/status`,
      { status }
    );
    return response.data;
  },

  // Get all seats
  getAll: async (): Promise<{ data: ExamSeat[] }> => {
    const response = await apiClient.get<{ data: ExamSeat[] }>(
      "/exam-seats"
    );
    return response.data;
  },

  // Get seats by session
  getBySession: async (
    sessionId: string,
    status?: 'Available' | 'Locked' | 'Assigned' | 'Present' | 'Absent'
  ): Promise<{ data: ExamSeat[] }> => {
    const params = status ? { status } : {};
    const response = await apiClient.get<{ data: ExamSeat[] }>(
      `/exam-seats/session/${sessionId}`,
      { params }
    );
    return response.data;
  },
};
