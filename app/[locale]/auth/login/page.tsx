"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard } from "lucide-react";
import { API_URL } from "@/lib/constants";
import { useTranslations } from "next-intl";
import { useCheckAuth } from "@/hooks/use-check-auth";
import { AuthLoadingSkeleton } from "@/components/ui/page-loading";

export default function LoginPage() {
  const t = useTranslations("Login");

  // If already authenticated, immediately route to role-based dashboard.
  const { isLoading } = useCheckAuth({ redirectIfAuthenticated: true });

  // Show skeleton while checking authentication
  if (isLoading) {
    return <AuthLoadingSkeleton />;
  }

  const handleGoogleLogin = () => {
    // Redirect to Backend Google OAuth Endpoint
    window.location.href = `${API_URL}/auth/google`;
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#1e3a8a] to-[#f97316] p-4">
      {/* Branding Header */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-lg">
          <LayoutDashboard className="h-10 w-10 text-[#f97316]" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-white drop-shadow-md">
          FPT Exam Management
        </h1>
        <p className="text-white/90 text-sm font-medium">
          Secure Examination Management System
        </p>
      </div>

      {/* Login Card */}
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
            className="flex w-full items-center justify-center gap-2 rounded-lg py-6 font-bold text-white transition-colors focus:ring-4 focus:ring-[#f97316]/20 bg-[#F37021] hover:bg-[#d95d15] shadow-lg shadow-orange-500/30"
          >
            <svg className="h-5 w-5 fill-current text-white" viewBox="0 0 24 24">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
            </svg>
            {t("loginButton")}
          </Button>
        </CardContent>
      </Card>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-white/60">
        © 2026 FPT University. All rights reserved.
      </footer>
    </div>
  );
}
