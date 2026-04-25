import { getRequestConfig } from 'next-intl/server';

const locales = ['en', 'vi'];

function decodeLegacyVietnamese(value: string): string {
    // Attempt to fix common UTF-8 -> Latin1 mojibake patterns found in legacy Vietnamese JSON files.
    if (!/[ÃÂâ]/.test(value)) {
        return value;
    }

    try {
        const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0));
        const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        if (decoded.includes('�')) {
            return value;
        }
        return decoded;
    } catch {
        return value;
    }
}

function normalizeMessages<T>(input: T): T {
    if (typeof input === 'string') {
        return decodeLegacyVietnamese(input) as T;
    }
    if (Array.isArray(input)) {
        return input.map((item) => normalizeMessages(item)) as T;
    }
    if (input && typeof input === 'object') {
        return Object.fromEntries(
            Object.entries(input).map(([key, value]) => [key, normalizeMessages(value)]),
        ) as T;
    }
    return input;
}

export default getRequestConfig(async ({ requestLocale }) => {
    let locale = await requestLocale;

    if (!locale || !locales.includes(locale)) {
        locale = 'vi';
    }

    const rawMessages = (await import(`../messages/${locale}.json`)).default;

    return {
        locale,
        messages: locale === 'vi' ? normalizeMessages(rawMessages) : rawMessages,
    };
});
