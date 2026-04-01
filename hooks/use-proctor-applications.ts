import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  proctorApplicationsApi,
  ProctorApplication,
  CreateProctorApplicationData,
  UpdateProctorApplicationData,
  UpdateProctorApplicationStatusData,
  ListAllProctorApplicationsParams,
} from "@/lib/api/proctor-applications";

// Get own applications (Proctor)
export function useMyProctorApplications() {
  return useQuery({
    queryKey: ["proctor-applications", "my-applications"],
    queryFn: () => proctorApplicationsApi.getMyApplications(),
  });
}

// Get all applications (Admin/ExamOfficer)
export function useProctorApplications(params?: ListAllProctorApplicationsParams) {
  return useQuery({
    queryKey: ["proctor-applications", "all", params],
    queryFn: () => proctorApplicationsApi.getAllApplications(params),
  });
}

// Get available dates
export function useAvailableDates(semesterId?: string) {
  return useQuery({
    queryKey: ["proctor-applications", "available-dates", semesterId],
    queryFn: () => proctorApplicationsApi.getAvailableDates(semesterId),
  });
}

// Create application
export function useCreateProctorApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProctorApplicationData) =>
      proctorApplicationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proctor-applications"] });
    },
  });
}

// Update application
export function useUpdateProctorApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProctorApplicationData }) =>
      proctorApplicationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proctor-applications"] });
    },
  });
}

// Cancel application
export function useCancelProctorApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => proctorApplicationsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proctor-applications"] });
    },
  });
}

// Update status (Admin/ExamOfficer)
export function useUpdateProctorApplicationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateProctorApplicationStatusData;
    }) => proctorApplicationsApi.updateStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proctor-applications"] });
    },
  });
}
