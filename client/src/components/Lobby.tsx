import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "./context/SocketProvider";

const Lobby = () => {
  const navigate = useNavigate();
  const socket = useSocket();
  const [UUID, setUUID] = useState("");

  const generateUUID = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    const segmentLengths = [3, 3, 3];

    const getRandomChar = () => chars[Math.floor(Math.random() * chars.length)];

    const generateSegment = (length: any) => {
      let segment = "";
      for (let i = 0; i < length; i++) {
        segment += getRandomChar();
      }
      return segment;
    };

    const segments = segmentLengths.map(generateSegment);
    return segments.join("-");
  };

  const handleCreateRoom = () => {
    const uuid = generateUUID();
    setUUID(uuid);
    console.log("Room created with ID:", uuid);
    socket?.emit("create-room", uuid);
    navigate(`/${uuid}`);
  };

  useEffect(()=>{
    socket?.on('connect', ()=>{
      console.log('Connected to server');
    });
    socket?.on('disconnect', ()=>{
      console.log('Disconnected from server');
    });
    socket?.on('room-created', (uuid: string)=>{
      console.log('Room created with ID:', uuid);
    });
    return ()=>{
      socket?.off('connect');
      socket?.off('disconnect');
      socket?.off('room-created');
    }
  },[socket]);

  return (
    <div className="flex flex-col px-40 py-10">
      <h1 className="text-4xl font-bold text-center text-neutral-50">
        LoMeet - Create your private room
      </h1>
      <div className="flex flex-col items-center mt-10">
        <button
          className="bg-blue-500 hover:bg-blue-700 font-bold py-2 px-4 rounded"
          onClick={handleCreateRoom}>
          {UUID ? "Create another room" : "Create room"}
        </button>
        {UUID && (
          <div className="mt-5">
            <p>Room ID: {UUID}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Lobby;
