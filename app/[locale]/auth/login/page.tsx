"use client";

/* eslint-disable @next/next/no-img-element */
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#F37021] p-4 overflow-hidden">
      {/* Decorative background circles */}
      <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute left-1/4 top-1/3 h-64 w-64 rounded-full bg-orange-400/20 blur-3xl" />

      <div className="absolute right-6 top-6 z-10 flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 p-1 backdrop-blur-md shadow-sm">
        <button
          onClick={() => handleLocaleChange("vi")}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${locale === "vi" ? "bg-white text-[#F37021] shadow-sm" : "text-white hover:bg-white/10"}`}
        >
          VI
        </button>
        <button
          onClick={() => handleLocaleChange("en")}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${locale === "en" ? "bg-white text-[#F37021] shadow-sm" : "text-white hover:bg-white/10"}`}
        >
          EN
        </button>
      </div>

      <div className="relative z-10 mb-8 flex flex-col items-center text-center">
        <h1 className="mb-2 text-4xl font-black tracking-tight text-white drop-shadow-lg">
          {t("brandTitle")}
        </h1>
        <p className="max-w-[300px] text-base font-medium text-white/90 drop-shadow-md">
          {t("brandSubtitle")}
        </p>
      </div>

      <Card className="relative z-10 w-full max-w-[450px] overflow-hidden rounded-[2.5rem] border-none bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
        <CardHeader className="space-y-2 pb-6 pt-10 px-10">
          <CardTitle className="text-3xl font-black tracking-tight text-gray-900">
            {t("title")}
          </CardTitle>
          <p className="text-base font-medium text-gray-500">
            {t("subtitle")}
          </p>
        </CardHeader>
        <CardContent className="px-10 pb-12">
          <Button
            type="button"
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#F37021] py-8 text-lg font-black text-white shadow-[0_10px_20px_rgba(243,112,33,0.2)] transition-all hover:scale-[1.02] hover:bg-[#d95d15] hover:shadow-[0_15px_30px_rgba(243,112,33,0.3)] active:scale-[0.98] border-none"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white p-1.5 shadow-sm">
              <svg className="h-full w-full fill-current text-[#F37021]" viewBox="0 0 24 24">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
              </svg>
            </div>
            {t("loginButton")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
