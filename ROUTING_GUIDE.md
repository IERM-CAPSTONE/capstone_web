# HƯỚNG DẪN ROUTING - NEXTJS APP ROUTER

> **Lưu ý:** Xem ví dụ routing ở **Room Management** (`app/(dashboard)/rooms/`)

## 📍 CẤU HÌNH ROUTING

### 1. Route Constants

Tất cả routes được định nghĩa trong `lib/constants/routes.ts`:

```tsx
// lib/constants/routes.ts
export const ROUTES = {
  ROOMS: "/rooms",
  ROOMS_CREATE: "/rooms/create",
  ROOMS_DETAIL: (id: string) => `/rooms/${id}`,
} as const;
```

### 2. Sử dụng Routes trong Code

#### Static Routes:
```tsx
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

<Link href={ROUTES.ROOMS}>Danh sách phòng</Link>
<Link href={ROUTES.ROOMS_CREATE}>Tạo phòng mới</Link>
```

#### Dynamic Routes:
```tsx
<Link href={ROUTES.ROOMS_DETAIL(room.id)}>Xem chi tiết</Link>
<Link href={ROUTES.ROOMS_EDIT(room.id)}>Chỉnh sửa</Link>
```

#### Programmatic Navigation:
```tsx
import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

const router = useRouter();
router.push(ROUTES.ROOMS);
router.push(ROUTES.ROOMS_DETAIL(roomId));
```

---

## 📁 CẤU TRÚC FOLDER = ROUTE STRUCTURE

### Quy tắc:
- Mỗi folder trong `app/` = 1 route
- File `page.tsx` = Page component
- File `layout.tsx` = Layout component
- Folder `[id]` = Dynamic route parameter

### Ví dụ:

```
app/
├── (auth)/                    # Route group (không ảnh hưởng URL)
│   └── login/
│       └── page.tsx           # → /login
│
├── (dashboard)/               # Route group
│   ├── rooms/
│   │   ├── page.tsx           # → /rooms
│   │   ├── create/
│   │   │   └── page.tsx       # → /rooms/create
│   │   └── [id]/              # Dynamic route
│   │       └── page.tsx       # → /rooms/:id
│   │
│   └── exams/
│       └── page.tsx           # → /exams
│
└── page.tsx                   # → /
```

---

## 🔐 PROTECTED ROUTES

### Middleware Protection:

File `middleware.ts` tự động protect routes:

```tsx
// middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  // Public routes
  const publicRoutes = ["/login", "/register"];
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  );

  // Redirect to login if accessing protected route without token
  if (!isPublicRoute && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
```

### Layout Protection:

```tsx
// app/(dashboard)/layout.tsx
"use client";

import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";

export default function DashboardLayout({ children }) {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  return <div>{children}</div>;
}
```

---

## 📄 DYNAMIC ROUTES

### Route với Parameter:

**Folder structure:**
```
app/(dashboard)/rooms/[id]/page.tsx
```

**Page component:**
```tsx
// app/(dashboard)/rooms/[id]/page.tsx
export default function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  // Sử dụng id...
}
```

**Route constant:**
```tsx
ROOMS_DETAIL: (id: string) => `/rooms/${id}`
```

---

## 🔄 NAVIGATION

### Client-side Navigation:

```tsx
import Link from "next/link";
import { useRouter } from "next/navigation";

// 1. Link component (recommended)
<Link href={ROUTES.ROOMS}>Phòng thi</Link>

// 2. Programmatic navigation
const router = useRouter();
router.push(ROUTES.ROOMS);
router.replace(ROUTES.ROOMS); // Replace history
router.back(); // Go back
```

### Server-side Navigation:

```tsx
import { redirect } from "next/navigation";

// In Server Component
if (!isAuthenticated) {
  redirect("/login");
}
```

---

## 📋 ROUTE GROUPS

Route groups `(folder)` không ảnh hưởng URL:

```
app/
├── (auth)/          # Route group
│   ├── login/       # → /login (không có /auth)
│   └── register/    # → /register
│
└── (dashboard)/     # Route group
    └── rooms/       # → /rooms (không có /dashboard)
```

**Lợi ích:**
- Tổ chức code tốt hơn
- Share layout cho nhóm routes
- Không ảnh hưởng URL structure

---

## ✅ BEST PRACTICES

1. **Luôn dùng ROUTES constants:**
   ```tsx
   // ✅ Good
   <Link href={ROUTES.ROOMS}>Phòng thi</Link>
   
   // ❌ Bad
   <Link href="/rooms">Phòng thi</Link>
   ```

2. **Type-safe dynamic routes:**
   ```tsx
   // ✅ Good
   <Link href={ROUTES.ROOMS_DETAIL(room.id)}>
   
   // ❌ Bad
   <Link href={`/rooms/${room.id}`}>
   ```

3. **Use route groups cho organization:**
   ```
   (auth)/      → Public routes
   (dashboard)/ → Protected routes
   ```

4. **Middleware cho global protection:**
   - Tự động redirect
   - Không cần check trong mỗi page

---

## 📚 VÍ DỤ HOÀN CHỈNH

Xem các file:
- **Route constants:** `lib/constants/routes.ts`
- **Middleware:** `middleware.ts`
- **Protected layout:** `app/(dashboard)/layout.tsx`
- **Dynamic route:** `app/(dashboard)/rooms/[id]/page.tsx`
- **Usage example:** `app/(dashboard)/rooms/page.tsx`

