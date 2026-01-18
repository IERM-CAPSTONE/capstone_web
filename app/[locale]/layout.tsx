import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { Inter } from "next/font/google";
import "../globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
    const t = await getTranslations({ locale, namespace: 'Metadata' });

    return {
        title: {
            template: '%s | IERM',
            default: t('title'), // "Hệ thống quản lý phòng thi thông minh"
        },
        description: t('description'),
        alternates: {
            canonical: `/${locale}`,
            languages: {
                'vi-VN': '/vi',
                'en-US': '/en',
            },
        },
        openGraph: {
            title: t('title'),
            description: t('description'),
            url: 'https://ierm.fpt.edu.vn', // Thay bằng domain thật của bạn
            siteName: 'IERM FPT',
            locale: locale === 'vi' ? 'vi_VN' : 'en_US',
            type: 'website',
        },
    };
}

export default async function LocaleLayout({
    children,
    params: { locale }
}: {
    children: React.ReactNode;
    params: { locale: string };
}) {
    // Providing all messages to the client
    // side is the easiest way to get started
    const messages = await getMessages();

    return (
        <html lang={locale}>
            <body className={inter.className}>
                <NextIntlClientProvider messages={messages}>
                    <Providers>{children}</Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
