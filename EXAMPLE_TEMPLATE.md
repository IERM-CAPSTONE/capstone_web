# VÍ DỤ MẪU - ROOM MANAGEMENT

## ✅ Đây là template hoàn chỉnh để tham khảo

### 📄 PAGES (app/(dashboard)/rooms/)

1. **`page.tsx`** - Danh sách phòng thi
   - ✅ Sử dụng hook `useRooms()` để fetch data
   - ✅ Sử dụng component `RoomTable` để hiển thị
   - ✅ Search, Pagination, Delete

2. **`[id]/page.tsx`** - Chi tiết phòng thi
   - ✅ Dynamic route với parameter `id`
   - ✅ Sử dụng hook `useRoom(id)` để fetch detail

3. **`create/page.tsx`** - Tạo phòng thi mới
   - ✅ Form với React Hook Form + Zod validation
   - ✅ Sử dụng mutation `useCreateRoom()`

### 🧩 COMPONENTS (components/rooms/)

1. **`room-card.tsx`** - Card component hiển thị thông tin phòng
2. **`room-table.tsx`** - Table component với actions

### 🔧 SERVICE (lib/api/rooms.ts)

- ✅ Type-safe API calls
- ✅ CRUD operations: getAll, getById, create, update, delete

### 🪝 HOOKS (hooks/use-rooms.ts)

- ✅ React Query hooks: useRooms, useRoom
- ✅ Mutations: useCreateRoom, useUpdateRoom, useDeleteRoom

---

## 📋 ÁP DỤNG CHO FEATURE MỚI

Khi tạo feature mới (ví dụ: Exams), làm theo pattern này:

1. **Tạo types** trong `types/index.ts`
2. **Tạo service** `lib/api/exams.ts` (copy từ `rooms.ts`)
3. **Tạo hooks** `hooks/use-exams.ts` (copy từ `use-rooms.ts`)
4. **Tạo components** `components/exams/` (copy từ `components/rooms/`)
5. **Tạo pages** `app/(dashboard)/exams/` (copy từ `app/(dashboard)/rooms/`)
6. **Thêm routes** vào `lib/constants/routes.ts`

---

**Xem chi tiết trong CODE_STRUCTURE.md và ROUTING_GUIDE.md**


