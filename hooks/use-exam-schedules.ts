import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  examSchedulesApi,
  ExamSchedule,
  ListExamSchedulesParams,
  CreateExamScheduleData,
  UpdateExamScheduleData,
  PaginatedExamScheduleResponse,
} from "@/lib/api/exam-schedules";

const EXAM_SCHEDULES_QUERY_KEY = ["exam-schedules"];

export function useExamSchedules(params?: ListExamSchedulesParams) {
  return useQuery({
    queryKey: [...EXAM_SCHEDULES_QUERY_KEY, params],
    queryFn: () =>
      examSchedulesApi.list({
        page: 1,
        limit: 10,
        ...params,
      }),
    staleTime: 0, // Always refetch
    gcTime: 0, // Don't cache
  });
}

export function useExamScheduleById(id: string) {
  return useQuery({
    queryKey: [...EXAM_SCHEDULES_QUERY_KEY, id],
    queryFn: () => examSchedulesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateExamSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateExamScheduleData) =>
      examSchedulesApi.create(data),
    onSuccess: () => {
      // Force refetch all exam schedules queries
      queryClient.invalidateQueries({ 
        queryKey: EXAM_SCHEDULES_QUERY_KEY,
        refetchType: 'active'
      });
      queryClient.refetchQueries({ 
        queryKey: EXAM_SCHEDULES_QUERY_KEY 
      });
    },
  });
}

export function useUpdateExamSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateExamScheduleData;
    }) => examSchedulesApi.update(id, data),
    onSuccess: () => {
      // Force refetch all exam schedules queries
      queryClient.invalidateQueries({ 
        queryKey: EXAM_SCHEDULES_QUERY_KEY,
        refetchType: 'active'
      });
      queryClient.refetchQueries({ 
        queryKey: EXAM_SCHEDULES_QUERY_KEY 
      });
    },
  });
}

export function useDeleteExamSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => examSchedulesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXAM_SCHEDULES_QUERY_KEY });
    },
  });
}

export function useArchiveExamSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => examSchedulesApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXAM_SCHEDULES_QUERY_KEY });
    },
  });
}

export function useImportExamSchedules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => examSchedulesApi.import(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXAM_SCHEDULES_QUERY_KEY });
    },
  });
}
