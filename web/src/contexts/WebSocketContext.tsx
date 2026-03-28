import React, { createContext, useContext, useEffect, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WebSocketMessage } from "../types";

interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  connect: (token: string) => void;
  disconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = React.useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = React.useRef<number>();
  const queryClient = useQueryClient();

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      setLastMessage(message);

      if (message.type === "scan_completed") {
        queryClient.invalidateQueries({ queryKey: ["detections"] });
        queryClient.invalidateQueries({ queryKey: ["detection", "latest"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
      } else if (message.type === "product_updated") {
        queryClient.invalidateQueries({ queryKey: ["products"] });
      } else if (message.type === "order_created") {
        queryClient.invalidateQueries({ queryKey: ["orders"] });
      }
    } catch (e) {
      console.error("Failed to parse WebSocket message:", e);
    }
  }, [queryClient]);

  const connect = useCallback((token: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      console.log("WebSocket connected");
    };

    ws.onmessage = handleMessage;

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log("WebSocket closed");
      
      reconnectTimeoutRef.current = window.setTimeout(() => {
        const storedToken = localStorage.getItem("auth_token");
        if (storedToken) {
          connect(storedToken);
        }
      }, 5000);
    };

    wsRef.current = ws;
  }, [handleMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return (
    <WebSocketContext.Provider value={{ isConnected, lastMessage, connect, disconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within WebSocketProvider");
  }
  return context;
}