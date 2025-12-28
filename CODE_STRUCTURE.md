# CẤU TRÚC CODE - HƯỚNG DẪN ĐẶT FILE

> **Lưu ý:** File này hướng dẫn cách tổ chức code. Xem ví dụ mẫu ở **Room Management**.

## 📁 CẤU TRÚC THƯ MỤC

```
ierm-web/
├── app/                          # 📄 PAGES - Đặt ở đây
│   ├── (auth)/                   # Route group cho auth pages
│   │   └── login/
│   │       └── page.tsx          # ✅ Page: Login page
│   ├── (dashboard)/               # Route group cho dashboard pages
│   │   ├── rooms/
│   │   │   ├── page.tsx           # ✅ Page: Danh sách phòng thi
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx       # ✅ Page: Chi tiết phòng thi
│   │   │   └── create/
│   │   │       └── page.tsx       # ✅ Page: Tạo phòng thi mới
│   │   └── exams/
│   │       └── page.tsx           # ✅ Page: Danh sách kỳ thi
│   └── layout.tsx                 # Root layout
│
├── components/                    # 🧩 COMPONENTS - Đặt ở đây
│   ├── ui/                        # Base UI components
│   │   ├── button.tsx             # ✅ Component: Button
│   │   ├── input.tsx              # ✅ Component: Input
│   │   └── card.tsx                # ✅ Component: Card
│   ├── rooms/                     # Room-specific components
│   │   ├── room-card.tsx          # ✅ Component: RoomCard
│   │   ├── room-table.tsx         # ✅ Component: RoomTable
│   │   └── room-form.tsx          # ✅ Component: RoomForm
│   └── exams/                     # Exam-specific components
│       └── exam-card.tsx          # ✅ Component: ExamCard
│
├── lib/                           # 🔧 SERVICES - Đặt ở đây
│   ├── api/                       # API services
│   │   ├── client.ts              # Axios client setup
│   │   ├── rooms.ts               # ✅ Service: Rooms API
│   │   ├── exams.ts               # ✅ Service: Exams API
│   │   └── students.ts             # ✅ Service: Students API
│   ├── utils/                     # Utility functions
│   │   ├── cn.ts                  # Class name utility
│   │   └── format.ts              # Format functions
│   └── constants/                 # Constants
│       └── routes.ts              # Route constants
│
├── hooks/                         # 🪝 Custom hooks
│   ├── use-rooms.ts               # Hook: useRooms
│   └── use-exams.ts               # Hook: useExams
│
├── store/                         # 📦 State management
│   ├── auth-store.ts              # Auth state
│   └── ui-store.ts                # UI state
│
└── types/                         # 📝 TypeScript types
    └── index.ts                   # Type definitions
```

---

## 📄 PAGES - Đặt ở `app/`

### Quy tắc:
- Mỗi route = 1 folder với `page.tsx` bên trong
- Dynamic routes: `[id]/page.tsx`
- Route groups: `(auth)`, `(dashboard)`

### Ví dụ:

**1. Danh sách phòng thi:**
```
app/(dashboard)/rooms/page.tsx
```

**2. Chi tiết phòng thi:**
```
app/(dashboard)/rooms/[id]/page.tsx
```

**3. Tạo phòng thi:**
```
app/(dashboard)/rooms/create/page.tsx
```

### Template Page:
```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { roomsApi } from "@/lib/api/rooms";
import { RoomTable } from "@/components/rooms/room-table";

export default function RoomsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => roomsApi.getAll(),
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Danh sách phòng thi</h1>
      <RoomTable rooms={data?.data || []} />
    </div>
  );
}
```

---

## 🧩 COMPONENTS - Đặt ở `components/`

### Quy tắc:
- Base UI components: `components/ui/`
- Feature-specific components: `components/{feature}/`
- Component name: PascalCase (ví dụ: `RoomCard.tsx`)

### Ví dụ:

**1. Base UI Component:**
```
components/ui/button.tsx
```

**2. Feature Component:**
```
components/rooms/room-card.tsx
components/rooms/room-table.tsx
```

### Template Component:
```tsx
"use client";

import { Room } from "@/types";
import { Card } from "@/components/ui/card";

interface RoomCardProps {
  room: Room;
}

export function RoomCard({ room }: RoomCardProps) {
  return (
    <Card>
      <h3>{room.name}</h3>
      <p>Sức chứa: {room.capacity}</p>
    </Card>
  );
}
```

---

## 🔧 SERVICES - Đặt ở `lib/api/`

### Quy tắc:
- Mỗi feature = 1 file service
- File name: `{feature}.ts` (ví dụ: `rooms.ts`)
- Export object với các methods

### Ví dụ:

**Service cho Rooms:**
```
lib/api/rooms.ts
```

### Template Service:
```tsx
import apiClient from "./client";
import { Room, ApiResponse } from "@/types";

export const roomsApi = {
  // Get all rooms
  getAll: async (): Promise<Room[]> => {
    const response = await apiClient.get<ApiResponse<Room[]>>("/rooms");
    return response.data.data || [];
  },

  // Get room by ID
  getById: async (id: string): Promise<Room> => {
    const response = await apiClient.get<ApiResponse<Room>>(`/rooms/${id}`);
    return response.data.data!;
  },

  // Create room
  create: async (data: Partial<Room>): Promise<Room> => {
    const response = await apiClient.post<ApiResponse<Room>>("/rooms", data);
    return response.data.data!;
  },
};
```

---

## 🪝 HOOKS - Đặt ở `hooks/`

### Quy tắc:
- Custom hooks cho data fetching
- File name: `use-{feature}.ts`
- Export hook function

### Ví dụ:

**Hook cho Rooms:**
```
hooks/use-rooms.ts
```

### Template Hook:
```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { roomsApi } from "@/lib/api/rooms";
import { Room } from "@/types";

export function useRooms() {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: () => roomsApi.getAll(),
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
```

---

## 📝 TYPES - Đặt ở `types/`

### Quy tắc:
- Tất cả TypeScript types/interfaces
- File: `types/index.ts` hoặc `types/{feature}.ts`

### Ví dụ:
```tsx
// types/index.ts
export interface Room {
  id: string;
  name: string;
  capacity: number;
  status: "available" | "occupied" | "maintenance";
}
```

---

## 🔗 ROUTING

### Route Constants:
```tsx
// lib/constants/routes.ts
export const ROUTES = {
  ROOMS: "/rooms",
  ROOMS_CREATE: "/rooms/create",
  ROOMS_DETAIL: (id: string) => `/rooms/${id}`,
} as const;
```

### Sử dụng trong code:
```tsx
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

<Link href={ROUTES.ROOMS_CREATE}>Tạo phòng mới</Link>
<Link href={ROUTES.ROOMS_DETAIL(room.id)}>Xem chi tiết</Link>
```

---

## ✅ CHECKLIST KHI TẠO FEATURE MỚI

- [ ] Tạo types trong `types/index.ts`
- [ ] Tạo service trong `lib/api/{feature}.ts`
- [ ] Tạo hooks trong `hooks/use-{feature}.ts` (nếu cần)
- [ ] Tạo components trong `components/{feature}/`
- [ ] Tạo pages trong `app/(dashboard)/{feature}/`
- [ ] Thêm routes vào `lib/constants/routes.ts`
- [ ] Update sidebar menu (nếu cần)

---

## 📚 VÍ DỤ HOÀN CHỈNH

Xem các file ví dụ:
- **Page:** `app/(dashboard)/rooms/page.tsx`
- **Component:** `components/rooms/room-card.tsx`
- **Service:** `lib/api/rooms.ts`
- **Hook:** `hooks/use-rooms.ts`

