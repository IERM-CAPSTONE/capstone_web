import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subjectsApi } from "@/lib/api/subjects";
import { PaginationParams } from "@/types";

export function useSubjects(params?: PaginationParams & { semester?: string; department?: string; search?: string }) {
    return useQuery({
        queryKey: ["subjects", params],
        queryFn: () => subjectsApi.getAll(params),
    });
}

export function useSubject(id: string) {
    return useQuery({
        queryKey: ["subjects", id],
        queryFn: () => subjectsApi.getById(id),
        enabled: !!id,
    });
}

export function useCreateSubject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => subjectsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
        },
    });
}

export function useUpdateSubject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            subjectsApi.update(id, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
            queryClient.invalidateQueries({ queryKey: ["subjects", variables.id] });
        },
    });
}

export function useDeleteSubject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => subjectsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
        },
    });
}

export function useImportSubjects() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ file, semesterId }: { file: File; semesterId?: string }) => subjectsApi.import(file, semesterId),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
        },
    });
}
