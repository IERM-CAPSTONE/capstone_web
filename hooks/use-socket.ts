import { useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '@/lib/socket';

export const useSocket = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const socketInstance = getSocket();
        setSocket(socketInstance);

        if (socketInstance.connected) {
            setIsConnected(true);
        }

        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);

        socketInstance.on('connect', onConnect);
        socketInstance.on('disconnect', onDisconnect);

        return () => {
            socketInstance.off('connect', onConnect);
            socketInstance.off('disconnect', onDisconnect);
        };
    }, []);

    const emit = useCallback((event: string, data: any) => {
        if (socket) {
            socket.emit(event, data);
        }
    }, [socket]);

    const on = useCallback((event: string, callback: (...args: any[]) => void) => {
        if (socket) {
            socket.on(event, callback);
            return () => {
                socket.off(event, callback);
            };
        }
    }, [socket]);

    return {
        socket,
        isConnected,
        emit,
        on,
    };
};
