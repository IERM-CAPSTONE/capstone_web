# HƯỚNG DẪN SETUP PROJECT

## 📋 Yêu cầu

- Node.js 18+
- npm hoặc yarn
- Git

## 🚀 Các bước setup

### 1. Cài đặt dependencies

```bash
npm install
```

hoặc

```bash
yarn install
```

### 2. Setup environment variables

Tạo file `.env.local` từ file `env.example`:

```bash
cp env.example .env.local
```

Sau đó chỉnh sửa các giá trị trong `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-in-production
NEXT_PUBLIC_APP_NAME=IERM
NEXT_PUBLIC_APP_VERSION=1.0.0
```

**Lưu ý:**

- `NEXT_PUBLIC_API_URL`: URL của NestJS backend API
- `NEXTAUTH_SECRET`: Tạo một secret key ngẫu nhiên (có thể dùng: `openssl rand -base64 32`)

### 3. Chạy development server

```bash
npm run dev
```

hoặc

```bash
yarn dev
```

Mở [http://localhost:3001](http://localhost:3001) trong browser.

### 4. Build cho production

```bash
npm run build
npm start
```

## 📁 Cấu trúc project

```
ierm-web/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Public routes (login, register)
│   ├── (dashboard)/        # Protected routes
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/             # React components
│   ├── ui/                 # Base UI components
│   ├── layouts/            # Layout components
│   └── providers.tsx       # Context providers
├── lib/                    # Utilities & configs
│   ├── api/                # API client
│   ├── constants/          # Constants
│   └── utils/              # Helper functions
├── hooks/                  # Custom React hooks
├── store/                  # Zustand stores
├── types/                  # TypeScript types
└── public/                 # Static assets
```

## 🔧 Scripts

- `npm run dev` - Chạy development server
- `npm run build` - Build cho production
- `npm run start` - Chạy production server
- `npm run lint` - Chạy ESLint
- `npm run type-check` - Kiểm tra TypeScript types

## 📝 Notes

- Project sử dụng Next.js 14 với App Router
- Tailwind CSS cho styling
- TypeScript cho type safety
- Zustand cho state management
- React Query cho data fetching
- Axios cho HTTP requests

## 🐛 Troubleshooting

### Lỗi module not found

```bash
rm -rf node_modules package-lock.json
npm install
```

### Lỗi TypeScript

```bash
npm run type-check
```

### Lỗi ESLint

```bash
npm run lint
```

## 📚 Tài liệu tham khảo

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [React Query](https://tanstack.com/query/latest)
