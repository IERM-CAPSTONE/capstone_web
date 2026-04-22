"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard } from "lucide-react";
import { API_URL } from "@/lib/constants";
import { useLocale, useTranslations } from "next-intl";
import { useCheckAuth } from "@/hooks/use-check-auth";
import { AuthLoadingSkeleton } from "@/components/ui/page-loading";

export default function LoginPage() {
  const t = useTranslations("Login");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  // If already authenticated, immediately route to role-based dashboard.
  const { isLoading } = useCheckAuth({ redirectIfAuthenticated: true });

  // Show skeleton while checking authentication
  if (isLoading) {
    return <AuthLoadingSkeleton />;
  }

  const handleGoogleLogin = () => {
    document.cookie = `preferred_locale=${locale}; path=/; max-age=31536000; samesite=lax`;
    // Redirect to Backend Google OAuth Endpoint
    window.location.href = `${API_URL}/auth/google`;
  };

  const handleLocaleChange = (newLocale: string) => {
    document.cookie = `preferred_locale=${newLocale}; path=/; max-age=31536000; samesite=lax`;
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.push(segments.join("/"));
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#1e3a8a] to-[#f97316] p-4">
      <div className="absolute right-6 top-6 flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 p-1 backdrop-blur-sm">
        <button
          onClick={() => handleLocaleChange("vi")}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${locale === "vi" ? "bg-white text-[#F37021]" : "text-white hover:bg-white/10"}`}
        >
          VI
        </button>
        <button
          onClick={() => handleLocaleChange("en")}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${locale === "en" ? "bg-white text-[#F37021]" : "text-white hover:bg-white/10"}`}
        >
          EN
        </button>
      </div>

      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-lg">
          <LayoutDashboard className="h-10 w-10 text-[#f97316]" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-white drop-shadow-md">
          {t("brandTitle")}
        </h1>
        <p className="text-sm font-medium text-white/90">
          {t("brandSubtitle")}
        </p>
      </div>

      <Card className="w-full max-w-[450px] overflow-hidden rounded-2xl border-none shadow-2xl">
        <CardHeader className="space-y-1 pb-4 pt-8 text-left">
          <CardTitle className="text-2xl font-semibold text-gray-800">
            {t("title")}
          </CardTitle>
          <p className="text-sm text-gray-500">
            {t("subtitle")}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button
            type="button"
            onClick={handleGoogleLogin}
            variant="ghost"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#F37021] py-6 font-bold text-white shadow-lg shadow-orange-500/30 transition-colors hover:bg-[#d95d15] focus:ring-4 focus:ring-[#f97316]/20"
          >
            <svg className="h-5 w-5 fill-current text-white" viewBox="0 0 24 24">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
            </svg>
            {t("loginButton")}
          </Button>
        </CardContent>
      </Card>

      <footer className="mt-8 text-center text-xs text-white/60">
        {t("footer")}
      </footer>
    </div>
  );
}
