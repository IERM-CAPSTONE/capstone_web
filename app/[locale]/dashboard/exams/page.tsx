"use client";

import { useTranslations } from "next-intl";

export default function ExamsPage() {
    const t = useTranslations("Dashboard");

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">{t("exams")}</h1>
                <p className="text-gray-600 dark:text-gray-400">
                    {t("examOverview")}
                </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <p className="text-gray-500">Coming soon...</p>
            </div>
        </div>
    );
}
