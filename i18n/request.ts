import { getRequestConfig } from 'next-intl/server';

const locales = ['en', 'vi'];

export default getRequestConfig(async ({ requestLocale }) => {
    // Await the locale from the request
    let locale = await requestLocale;

    // Ensure we have a valid locale, or fallback to default
    if (!locale || !locales.includes(locale)) {
        locale = 'vi';
    }

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default
    };
});
