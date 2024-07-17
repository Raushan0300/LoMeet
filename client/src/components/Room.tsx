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
import { v4 as uuidv4 } from "uuid";
import VideoCall from "./VideoCall";

const Room = () => {
  const { room = "" } = useParams<{ room: string }>();
  const [copied, setCopied] = useState<boolean>(false);
  const [remoteSocketId, setRemoteSocketId] = useState<string>("");
  const [chats, setChats] = useState<any[]>([]);
  const [message, setMessage] = useState<string>("");
  const [receivedFile, setReceivedFile] = useState<Blob | null>(null);
  const [receivedFileName, setReceivedFileName] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const [isCalling, setIsCalling] = useState<boolean>(false);
  const [isReceivingCall, setIsReceivingCall] = useState<boolean>(false);
  const [callAccepted, setCallAccepted] = useState<boolean>(false);
  const [caller, setCaller] = useState<string>("");

  const messageRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const socket = useSocket();

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://lomeet.raushan.xyz/${room}`);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 4000);
  };

  const handleSendFile = (file: any) => {
    if (file) {
      console.log("Sending file:", file);
      const fileId = uuidv4();
      const chunkSize = 64 * 1024;
      let offset = 0;
      const sendNextChunk = () => {
        const chunk = file.slice(offset, offset + chunkSize);
        const reader = new FileReader();

        reader.onload = (e) => {
          if (e.target && e.target.result) {
            const isLastChunk = offset + chunkSize >= file.size;
            const chunkData = {
              fileId,
              name: file.name,
              type: file.type,
              chunk: Array.from(new Uint8Array(e.target.result as ArrayBuffer)),
              isLastChunk,
            };
            socket?.emit(
              "send-file-chunk",
              { uuid: room, chunkData },
              (response: string) => {
                console.log("Chunk sent:", response);
                if (!isLastChunk) {
                  offset += chunkSize;
                  setUploadProgress((offset / file.size) * 100);
                  setTimeout(sendNextChunk, 100);
                } else {
                  setUploadProgress(100);
                }
              }
            );
          }
        };
        reader.readAsArrayBuffer(chunk);
      };
      sendNextChunk();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (e.target.files[0].size > 1024 * 1024 * 5) {
        alert("File size should be less than 5MB");
      } else {
        console.log("File selected:", e.target.files[0]);
        handleSendFile(e.target.files[0]);
        setChats([
          ...chats,
          { sender: "You", message: `File: ${e.target.files[0].name}` },
        ]);
      }
    }
  };

  const handelDownloadFile = () => {
    if (receivedFile) {
      const url = URL.createObjectURL(receivedFile);
      const a = document.createElement("a");
      a.href = url;
      a.download = receivedFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setReceivedFile(null);
    }
  };

  const handleAttachFileClick = () => {
    fileInputRef.current?.click();
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

  const handleRecieveMessage = useCallback(
    (data: any) => {
      setChats([...chats, { sender: "User", message: data.message }]);
    },
    [socket, chats]
  );

  const handleRecieveFile = useCallback(
    (fileData: any) => {
      const { name, type, data } = fileData;
      const blob = new Blob([new Uint8Array(data)], { type });
      setReceivedFile(blob);
      setReceivedFileName(name);
      setChats([...chats, { sender: "User", message: `File: ${name}` }]);
      console.log("File received:", data);
    },
    [socket, chats, setReceivedFile, setReceivedFileName]
  );

  const initiateCall = () => {
    if (remoteSocketId) {
      if(!isReceivingCall){
        socket?.emit("initiate-call", { to: remoteSocketId, from: socket.id });
      setIsCalling(true);
      }
    }
  };

  const acceptCall = () => {
    setCallAccepted(true);
    setIsReceivingCall(false);
    socket?.emit("accept-call", { uuid: room, from: socket.id });
  };

  const callEnded=()=>{
    setCallAccepted(false);
    setIsReceivingCall(false);
    socket?.emit("end-call", { uuid: room, from: socket.id });
  };

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
    socket?.on("receive-file", handleRecieveFile);
    socket.on("receive-call", ({ from }) => {
      setIsReceivingCall(true);
      setCaller(from);
    });
    socket.on("call-accepted", ({ from }) => {
      setCallAccepted(true);
      setIsCalling(false);
      console.log("Call accepted from:", from);
    });
    socket.on("end-call", ({from}) => {
      setCallAccepted(false);
    setIsReceivingCall(false);
      console.log("Call ended by:", from);
    });

    return () => {
      socket?.off("user-joined", handleUserJoined);
      socket?.off("user-left", handleUserLeft);
      socket?.off("receive-message", handleRecieveMessage);
      socket?.off("receive-file", handleRecieveFile);
      socket.off("receive-call");
    };
  }, [
    socket,
    handleUserJoined,
    handleUserLeft,
    handleRecieveMessage,
    handleSendMessage,
    handleRecieveFile,
    setIsCalling,
    setCaller
  ]);

  return (
    <div>
    {callAccepted?<VideoCall room={room} callEnded={callEnded} />:(<div className="px-52 py-10">
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
            <VideoCallIcon className="cursor-pointer" onClick={initiateCall} />
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
            <div
              className="cursor-pointer"
              onClick={handleAttachFileClick}>
              <AttachFileIcon />
            </div>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileInputChange}
            />
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
      {isCalling && <p className="mt-5">Calling...</p>}
      {isReceivingCall && (
        <div className="mt-5">
          <p>Incoming call from {caller}</p>
          <button className="bg-green-500 px-5 py-1 mt-2 rounded" onClick={acceptCall}>Accept</button>
        </div>
      )}
      {receivedFile && (
        <div className="mt-5">
          <h3>Received File: {receivedFileName}</h3>
          <button
            className="bg-blue-500 px-2 py-1 rounded mt-2"
            onClick={handelDownloadFile}>
            Download File
          </button>
        </div>
      )}
      {uploadProgress > 0 && (
        <div className="flex gap-2 mt-5 items-center">
          <span>{uploadProgress < 100 ? "Sending File:" : "File Sent:"}</span>
          <progress
            value={uploadProgress}
            max="100"></progress>
          <span>{uploadProgress.toFixed(2)}%</span>
        </div>
      )}
    </div>)}
    </div>
  );
};

export default Room;
