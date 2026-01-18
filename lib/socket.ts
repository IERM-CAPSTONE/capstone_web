import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (url?: string): Socket => {
    if (!socket) {
        const socketUrl = url || process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000/notifications";
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
