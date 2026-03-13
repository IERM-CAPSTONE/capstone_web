import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { examTypesApi } from "@/lib/api/exam-types";
import { ExamType } from "@/types";

export function useExamTypes() {
    return useQuery({
        queryKey: ["exam-types"],
        queryFn: () => examTypesApi.getAll(),
    });
}

export function useCreateExamType() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Partial<ExamType>) => examTypesApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["exam-types"] });
        },
    });
}

export function useUpdateExamType() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ExamType> }) =>
            examTypesApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["exam-types"] });
        },
    });
}

export function useDeleteExamType() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => examTypesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["exam-types"] });
        },
    });
}
