import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { roomsApi } from "@/lib/api/rooms";
import { Room, PaginationParams } from "@/types";
import { PAGINATION } from "@/lib/constants";

export function useRooms(params?: PaginationParams) {
  return useQuery({
    queryKey: ["rooms", params],
    queryFn: () => roomsApi.getAll(params),
  });
}

export function useRoom(id: string) {
  return useQuery({
    queryKey: ["rooms", id],
    queryFn: () => roomsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Room>) => roomsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Room> }) =>
      roomsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["rooms", variables.id] });
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => roomsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useAvailableRooms(params?: PaginationParams) {
  return useQuery({
    queryKey: ["rooms", "available", params],
    queryFn: () => roomsApi.getAvailable(params),
  });
}


