import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useCallback, useEffect, useRef, useState } from "react";
import DoneIcon from "@mui/icons-material/Done";
import VideoCallIcon from "@mui/icons-material/VideoCall";
import CallIcon from "@mui/icons-material/Call";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import SendIcon from "@mui/icons-material/Send";
import { useParams } from "react-router-dom";
import { useSocket } from "./context/SocketProvider";
import { CirclesWithBar } from "react-loader-spinner";

const Room = () => {
  const { room = "" } = useParams<{ room: string }>();
  const [copied, setCopied] = useState<boolean>(false);
  const [remoteSocketId, setRemoteSocketId] = useState<string>("");
  const [chats, setChats] = useState<any[]>([]);
  const [message, setMessage] = useState<string>("");

  const messageRef = useRef<HTMLInputElement>(null);

  const socket = useSocket();

  const handleSendMessage = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (message) {
        setChats([...chats, { sender: "You", message }]);
        socket?.emit("send-message", { uuid: room, message });
        setMessage("");
      }
    },
    [socket, message, chats]
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(`http://localhost:5173/${room}`);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 4000);
  };

  const handleJoinRoom = useCallback(() => {
    console.log("Joining room with ID:", room);
    socket?.emit("join-room", room);
  }, [socket, room]);

  useEffect(() => {
    handleJoinRoom();
  }, [handleJoinRoom, remoteSocketId]);

  const handleUserJoined = useCallback(
    (data: any) => {
      const { uuid, id } = data;
      console.log(`User ${id} joined with ID: ${uuid}`);
      setRemoteSocketId(id);
    },
    [socket, setRemoteSocketId]
  );

  const handleUserLeft = useCallback(
    (id: string) => {
      console.log("User left with ID:", id);
      setRemoteSocketId("");
    },
    [socket, setRemoteSocketId]
  );

  const handleRecieveMessage = useCallback(
    (data: any) => {
      setChats([...chats, { sender: "User", message: data.message }]);
    },
    [socket, chats]
  );

  const scrollToBottom = () => {
    messageRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chats]);

  useEffect(() => {
    if (!socket) return;

    socket?.on("user-joined", handleUserJoined);
    socket?.on("user-left", handleUserLeft);
    socket?.on("receive-message", handleRecieveMessage);

    return () => {
      socket?.off("user-joined", handleUserJoined);
      socket?.off("user-left", handleUserLeft);
      socket?.off("receive-message", handleRecieveMessage);
    };
  }, [
    socket,
    handleUserJoined,
    handleUserLeft,
    handleRecieveMessage,
    handleSendMessage,
  ]);

  return (
    <div className="px-52 py-10">
      <h1 className="text-4xl font-bold text-center text-neutral-50">
        LoMeet - Your private room
      </h1>
      <div className="flex flex-col mt-10 rounded-lg border-emerald-400 border">
        <div className="flex items-center justify-between py-5 px-5 border-b">
          <div className="flex justify-center items-center gap-2">
            <h2 className="text-2xl font-bold text-center text-neutral-50">
              Room ID: {room}
            </h2>
            {copied ? (
              <DoneIcon />
            ) : (
              <ContentCopyIcon
                className="cursor-pointer"
                onClick={handleCopy}
              />
            )}
          </div>
          <div className="flex gap-10">
            <VideoCallIcon className="cursor-pointer" />
            <CallIcon className="cursor-pointer" />
          </div>
        </div>
        <div className="flex flex-col p-5 h-96 overflow-y-scroll">
          {remoteSocketId ? (
            chats.map((chat, index) => (
              <div
                key={index}
                className="flex gap-2 py-2">
                <span className="font-bold">{chat.sender}:</span>
                <span>{chat.message}</span>
              </div>
            ))
          ) : (
            <div className="flex flex-col justify-center items-center gap-10">
              <div className="text-2xl text-center text-neutral-50">
                Waiting for user to join
              </div>
              <CirclesWithBar
                height="100"
                width="100"
                color="#4fa94d"
                outerCircleColor="#4fa94d"
                innerCircleColor="#4fa94d"
                barColor="#4fa94d"
                ariaLabel="circles-with-bar-loading"
                wrapperStyle={{}}
                wrapperClass=""
                visible={true}
              />
            </div>
          )}
          <div ref={messageRef}></div>
        </div>
        {remoteSocketId && (
          <form
            className="px-5 py-2 border-t flex justify-between items-center gap-5"
            onSubmit={handleSendMessage}>
            <AttachFileIcon className="cursor-pointer" />
            <input
              type="text"
              placeholder="Enter Your Message"
              className="border border-emerald-400 p-2 rounded-lg w-full text-black outline-none"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
              }}
            />
            <button
              type="submit"
              className="flex gap-2 bg-emerald-400 text-neutral-50 px-4 py-2 rounded-lg">
              <SendIcon />
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Room;
