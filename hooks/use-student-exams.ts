import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentExamsApi, ListStudentExamsParams } from "@/lib/api/student-exams";

export const useStudentExams = (params: ListStudentExamsParams) => {
    return useQuery({
        queryKey: ["student-exams", params],
        queryFn: () => studentExamsApi.list(params),
        enabled: !!(params.examSessionId || params.studentId),
    });
};

export const useStudentExamsBySession = (examSessionId: string) => {
    return useStudentExams({ examSessionId, limit: 100 }); // High limit to get all students for a session
};

export const useStudentExamById = (id: string) => {
    return useQuery({
        queryKey: ["student-exams", id],
        queryFn: () => studentExamsApi.getById(id),
        enabled: !!id,
    });
};

export const useUpdateStudentExamPart = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => studentExamsApi.updatePart(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ["student-exams"] });
        },
    });
};
