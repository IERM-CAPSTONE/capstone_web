import { Room, PaginatedResponse, PaginationParams } from "@/types";
import { PAGINATION } from "@/lib/constants";

const MOCK_ROOMS: Room[] = [
  {
    id: "room-001",
    name: "Phòng thi A101",
    capacity: 50,
    location: "Tầng 1, Tòa nhà A",
    status: "available",
    equipment: ["camera", "microphone", "projector"],
    createdAt: new Date(2026, 0, 1).toISOString(),
    updatedAt: new Date(2026, 0, 11).toISOString(),
  },
  {
    id: "room-002",
    name: "Phòng thi A102",
    capacity: 40,
    location: "Tầng 1, Tòa nhà A",
    status: "occupied",
    equipment: ["camera", "microphone"],
    createdAt: new Date(2026, 0, 2).toISOString(),
    updatedAt: new Date(2026, 0, 10).toISOString(),
  },
  {
    id: "room-003",
    name: "Phòng thi B201",
    capacity: 60,
    location: "Tầng 2, Tòa nhà B",
    status: "available",
    equipment: ["camera", "microphone", "projector", "speaker"],
    createdAt: new Date(2026, 0, 3).toISOString(),
    updatedAt: new Date(2026, 0, 11).toISOString(),
  },
  {
    id: "room-004",
    name: "Phòng thi B202",
    capacity: 50,
    location: "Tầng 2, Tòa nhà B",
    status: "maintenance",
    equipment: ["camera"],
    createdAt: new Date(2026, 0, 4).toISOString(),
    updatedAt: new Date(2026, 0, 5).toISOString(),
  },
  {
    id: "room-005",
    name: "Phòng thi C301",
    capacity: 80,
    location: "Tầng 3, Tòa nhà C",
    status: "available",
    equipment: ["camera", "microphone", "projector", "speaker", "ac"],
    createdAt: new Date(2026, 0, 5).toISOString(),
    updatedAt: new Date(2026, 0, 9).toISOString(),
  },
  {
    id: "room-006",
    name: "Phòng thi C302",
    capacity: 70,
    location: "Tầng 3, Tòa nhà C",
    status: "available",
    equipment: ["camera", "microphone"],
    createdAt: new Date(2026, 0, 6).toISOString(),
    updatedAt: new Date(2026, 0, 8).toISOString(),
  },
  {
    id: "room-007",
    name: "Phòng thi D401",
    capacity: 45,
    location: "Tầng 4, Tòa nhà D",
    status: "occupied",
    equipment: ["camera", "microphone", "projector"],
    createdAt: new Date(2026, 0, 7).toISOString(),
    updatedAt: new Date(2026, 0, 11).toISOString(),
  },
  {
    id: "room-008",
    name: "Phòng thi D402",
    capacity: 55,
    location: "Tầng 4, Tòa nhà D",
    status: "available",
    equipment: ["camera", "speaker"],
    createdAt: new Date(2026, 0, 8).toISOString(),
    updatedAt: new Date(2026, 0, 10).toISOString(),
  },
];

/**
 * Mock API for exam rooms (until backend is ready)
 */
export const mockRoomsApi = {
  getAll: async (params?: PaginationParams): Promise<PaginatedResponse<Room>> => {
    const page = params?.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = params?.limit ?? PAGINATION.DEFAULT_LIMIT;

    // Simulate pagination
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedRooms = MOCK_ROOMS.slice(start, end);
    const totalPages = Math.ceil(MOCK_ROOMS.length / limit);

    return {
      success: true,
      data: paginatedRooms,
      pagination: {
        page,
        limit,
        total: MOCK_ROOMS.length,
        totalPages,
      },
    };
  },

  getById: async (id: string): Promise<Room> => {
    const room = MOCK_ROOMS.find((r) => r.id === id);
    if (!room) {
      throw new Error("Room not found");
    }
    return room;
  },

  getAvailable: async (params?: PaginationParams): Promise<PaginatedResponse<Room>> => {
    const availableRooms = MOCK_ROOMS.filter((r) => r.status === "available");
    const page = params?.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = params?.limit ?? PAGINATION.DEFAULT_LIMIT;

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedRooms = availableRooms.slice(start, end);
    const totalPages = Math.ceil(availableRooms.length / limit);

    return {
      success: true,
      data: paginatedRooms,
      pagination: {
        page,
        limit,
        total: availableRooms.length,
        totalPages,
      },
    };
  },
};
