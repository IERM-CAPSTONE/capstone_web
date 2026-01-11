"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { User, CreateUserData, UpdateUserData, UserRole } from "@/lib/api/users";
import { useCreateUser, useUpdateUser } from "@/hooks/use-users";

interface AccountFormModalProps {
  user?: User | null;
  onClose: () => void;
}

export function AccountFormModal({ user, onClose }: AccountFormModalProps) {
  const isEdit = !!user;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [formData, setFormData] = useState({
    email: user?.email || "",
    fullName: user?.fullName || "",
    code: user?.code || "",
    avatarUrl: user?.avatarUrl || "",
    role: (user?.role || "STUDENT") as UserRole,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || "",
        fullName: user.fullName || "",
        code: user.code || "",
        avatarUrl: user.avatarUrl || "",
        role: (user.role || "STUDENT") as UserRole,
      });
    }
  }, [user]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!isEdit && !formData.email) {
      newErrors.email = "Email is required";
    } else if (!isEdit && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      if (isEdit) {
        const updateData: UpdateUserData = {
          fullName: formData.fullName || undefined,
          code: formData.code || undefined,
          avatarUrl: formData.avatarUrl || undefined,
        };
        await updateUser.mutateAsync({ id: user.id, data: updateData });
      } else {
        const createData: CreateUserData = {
          email: formData.email,
          fullName: formData.fullName || undefined,
          code: formData.code || undefined,
          avatarUrl: formData.avatarUrl || undefined,
          role: formData.role,
        };
        await createUser.mutateAsync(createData);
      }
      onClose();
    } catch (error) {
      console.error("Error saving user:", error);
    }
  };

  const isLoading = createUser.isPending || updateUser.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{isEdit ? "Edit Account" : "Create Account"}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isEdit && (
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={isLoading}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <Input
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Code</label>
              <Input
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                disabled={isLoading}
                placeholder="Student ID or teacher code"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Avatar URL</label>
              <Input
                value={formData.avatarUrl}
                onChange={(e) =>
                  setFormData({ ...formData, avatarUrl: e.target.value })
                }
                disabled={isLoading}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            {!isEdit && (
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as UserRole })
                  }
                  disabled={isLoading}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="STUDENT">Student</option>
                  <option value="PROCTOR">Proctor</option>
                  <option value="EXAM_OFFICER">Exam Officer</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            )}

            {isEdit && (
              <div className="text-sm text-gray-500">
                <p>Email: {user.email}</p>
                <p>Role: {user.role || "No Role"}</p>
                <p>Status: {user.isActive ? "Active" : "Locked"}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : isEdit ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
