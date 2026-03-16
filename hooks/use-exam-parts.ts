import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { examPartsApi } from "@/lib/api/exam-parts";
import { ExamPart } from "@/types";

export function useExamParts() {
    return useQuery({
        queryKey: ["exam-parts"],
        queryFn: () => examPartsApi.getAll(),
    });
}

export function useCreateExamPart() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Partial<ExamPart>) => examPartsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["exam-parts"] });
        },
    });
}

export function useUpdateExamPart() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ExamPart> }) =>
            examPartsApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["exam-parts"] });
        },
    });
}

export function useDeleteExamPart() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => examPartsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["exam-parts"] });
        },
    });
}
