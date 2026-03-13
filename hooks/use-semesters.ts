import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { semestersApi } from "@/lib/api/semesters";
import { PaginationParams } from "@/types";
import { toast } from "sonner";

export const useSemesters = (params?: PaginationParams & { search?: string }) => {
    return useQuery({
        queryKey: ["semesters", params],
        queryFn: () => semestersApi.getAll(params),
    });
};

export const useCreateSemester = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: semestersApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["semesters"] });
            toast.success("Semester created successfully");
        },
        onError: (error: any) => {
            toast.error("Tạo thất bại");
        },
    });
};

export const useUpdateSemester = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            semestersApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["semesters"] });
            toast.success("Semester updated successfully");
        },
        onError: (error: any) => {
            toast.error("Cập nhật thất bại");
        },
    });
};

export const useDeleteSemester = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: semestersApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["semesters"] });
            toast.success("Semester deleted successfully");
        },
        onError: (error: any) => {
            toast.error("Xóa thất bại");
        },
    });
};
