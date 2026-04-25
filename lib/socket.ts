import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

const resolveSocketUrl = (explicitUrl?: string) => {
    const configuredUrl = explicitUrl || process.env.NEXT_PUBLIC_SOCKET_URL;

    if (configuredUrl) {
        return configuredUrl;
    }

    if (typeof window !== "undefined") {
        const sameOriginNotifications = `${window.location.origin}/notifications`;
        return sameOriginNotifications;
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
