import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  examSchedulesApi,
  ExamSchedule,
  ListExamSchedulesParams,
  CreateExamScheduleData,
  UpdateExamScheduleData,
  PaginatedExamScheduleResponse,
  ImportScheduleData,
  AutoGenerateScheduleData,
} from "@/lib/api/exam-schedules";

const EXAM_SCHEDULES_QUERY_KEY = ["exam-schedules"];

export function useAutoGenerateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AutoGenerateScheduleData) => examSchedulesApi.autoGenerate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXAM_SCHEDULES_QUERY_KEY });
    },
  });
}

export function usePublishExamSessions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { sessionIds?: string[]; semesterId?: string; campus?: string }) => examSchedulesApi.publish(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXAM_SCHEDULES_QUERY_KEY });
    },
  });
}

export function useExamSchedules(params?: ListExamSchedulesParams, queryOptions?: Record<string, any>) {
  return useQuery({
    queryKey: [...EXAM_SCHEDULES_QUERY_KEY, params],
    queryFn: () =>
      examSchedulesApi.list({
        page: 1,
        limit: 10,
        ...params,
      }),
    staleTime: 0,
    gcTime: 0,
    ...queryOptions,
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

export function useExportExamSchedules() {
  return useMutation({
    mutationFn: (params: any) => examSchedulesApi.export(params),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `exam_sessions_${new Date().getTime()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    },
  });
}

export function useDownloadTemplate() {
  return useMutation({
    mutationFn: (type: 'proctor' | 'registration' | 'course') => examSchedulesApi.downloadTemplate(type),
    onSuccess: (blob, type) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const extension = (type === 'proctor' || type === 'registration') ? 'csv' : 'xlsx';
      const filenames = {
        proctor: 'ProctorList_Template',
        registration: 'StudSub',
        course: 'ClassSchedule_Template'
      };
      link.setAttribute("download", `${filenames[type]}.${extension}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
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

// Hook for the new import-schedule API with parsed data (typed version)
export function useImportScheduleWithData() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ImportScheduleData) => examSchedulesApi.importSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXAM_SCHEDULES_QUERY_KEY });
    },
  });
}

// Alias for useImportScheduleWithData (backward compatibility)
export function useImportWithStudents() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ImportScheduleData) =>
      examSchedulesApi.importWithStudents(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXAM_SCHEDULES_QUERY_KEY });
    },
  });
}

export function useImportProctors() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { importType: string; proctors: any[]; batchId?: string; totalItems?: number }) =>
      examSchedulesApi.importProctors(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXAM_SCHEDULES_QUERY_KEY });
    },
  });
}

export function useImportCodes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { importType: string; codes: any[] }) =>
      examSchedulesApi.importCodes(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXAM_SCHEDULES_QUERY_KEY });
    },
  });
}
