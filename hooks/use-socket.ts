import { useEffect, useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '@/lib/socket';

export const useSocket = () => {
    // Use ref so socket is available synchronously on first render (no async setState)
    const socketRef = useRef<Socket>(getSocket());
    const socket = socketRef.current;
    const [isConnected, setIsConnected] = useState(socket.connected);
    // Store last joinRoom args so we can re-join after reconnect
    const roomRef = useRef<{ userId: string; campus?: string } | null>(null);

    useEffect(() => {
        const socketInstance = socketRef.current;

        if (socketInstance.connected) {
            setIsConnected(true);
        }

        const onConnect = () => {
            setIsConnected(true);
            // Re-join room after reconnect (covers race condition where user data loads after socket connects)
            if (roomRef.current) {
                const { userId, campus } = roomRef.current;
                socketInstance.emit('join_room', campus ? { userId, campus } : userId);
            }
        };
        const onDisconnect = () => setIsConnected(false);

        socketInstance.on('connect', onConnect);
        socketInstance.on('disconnect', onDisconnect);

        return () => {
            socketInstance.off('connect', onConnect);
            socketInstance.off('disconnect', onDisconnect);
        };
    }, []);

    const emit = useCallback((event: string, data: any) => {
        socket.emit(event, data);
    }, [socket]);

    const on = useCallback((event: string, callback: (...args: any[]) => void) => {
        socket.on(event, callback);
        return () => {
            socket.off(event, callback);
        };
    }, [socket]);

    /**
     * Join the socket room for this user so backend can sendToUser(userId, ...).
     * Optionally pass campus to also join campus:<CAMPUS> room for campus-scoped events.
     * Stores args and auto-rejoins after reconnect.
     */
    const joinRoom = useCallback((userId: string, campus?: string) => {
        if (userId) {
            roomRef.current = { userId, campus };
            socket.emit('join_room', campus ? { userId, campus } : userId);
        }
    }, [socket]);

    return {
        socket,
        isConnected,
        emit,
        on,
        joinRoom,
    };
};
