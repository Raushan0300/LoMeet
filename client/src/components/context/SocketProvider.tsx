import { createContext, useContext, useMemo } from "react";
import { io, Socket } from "socket.io-client";

const SocketContext = createContext<Socket | null>(null);

export const useSocket = ()=>{
    const socket = useContext(SocketContext);
    return socket;
};

export const SocketProvider = (props:any)=>{
    const socket = useMemo(()=> io('http://localhost:3000'), []);

    return(
        <SocketContext.Provider value={socket}>
            {props.children}
        </SocketContext.Provider>
    )
}