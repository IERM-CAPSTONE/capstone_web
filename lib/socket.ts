import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const resolveSocketUrl = (explicitUrl?: string) => {
    const configuredUrl = explicitUrl || process.env.NEXT_PUBLIC_SOCKET_URL;

    if (typeof window !== "undefined") {
        const sameOriginNotifications = `${window.location.origin}/notifications`;

        if (configuredUrl) {
            try {
                const parsed = new URL(configuredUrl);
                const isLocalhostConfig =
                    parsed.hostname === "localhost" ||
                    parsed.hostname === "127.0.0.1" ||
                    parsed.hostname === "::1";
                const isLocalhostPage =
                    window.location.hostname === "localhost" ||
                    window.location.hostname === "127.0.0.1" ||
                    window.location.hostname === "::1";

                if (isLocalhostConfig && !isLocalhostPage) {
                    return sameOriginNotifications;
                }
            } catch {
                return sameOriginNotifications;
            }
        }

        return configuredUrl || sameOriginNotifications;
    }

    if (configuredUrl) {
        return configuredUrl;
    }

    return "";
};

export const getSocket = (url?: string): Socket => {
    if (!socket) {
        const socketUrl = resolveSocketUrl(url);
        socket = io(socketUrl, {
            transports: ["websocket"],
            reconnection: true,
        });
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
