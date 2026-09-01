import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:4000";

/**
 * Connect to the Whereहो Socket.io server.
 * Returns the socket instance and helpers for journey tracking.
 */
export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SERVER_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socket.on("connect", () => {
      console.log("[Socket] connected", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] disconnected", reason);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const subscribeJourney = useCallback((journeyId: string) => {
    socketRef.current?.emit("subscribe-journey", journeyId);
  }, []);

  const unsubscribeJourney = useCallback((journeyId: string) => {
    socketRef.current?.emit("unsubscribe-journey", journeyId);
  }, []);

  const onJourneyPosition = useCallback(
    (callback: (data: { lat: number; lng: number; timestamp: number }) => void) => {
      socketRef.current?.on("journey-position", callback);
      return () => {
        socketRef.current?.off("journey-position", callback);
      };
    },
    [],
  );

  const onJourneyStarted = useCallback(
    (callback: (data: { journeyId: string; userId: string; start: string; end: string; expectedArrival: number }) => void) => {
      socketRef.current?.on("journey-started", callback);
      return () => {
        socketRef.current?.off("journey-started", callback);
      };
    },
    [],
  );

  return {
    socket: socketRef,
    subscribeJourney,
    unsubscribeJourney,
    onJourneyPosition,
    onJourneyStarted,
  };
}
