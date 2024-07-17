import "dotenv/config";
import { Socket } from "socket.io";
const { Server } = require("socket.io");

const io = new Server(process.env.PORT || 3000, {
  cors: {
    origin: process.env.CORS_ORIGIN,
  },
});

const users = new Map();

io.on("connection", (socket: Socket) => {
  console.log("User connected", socket.id);
  socket.on("create-room", (uuid) => {
    users.set(uuid, new Set([socket.id]));
    console.log("Room created with ID:", uuid);
    socket.join(uuid);
  });

  socket.on("join-room", (uuid) => {
    if (users.has(uuid)) {
      users.get(uuid).add(socket.id);
      console.log("User joined room with ID:", uuid);
      socket.join(uuid);
      socket.to(uuid).emit("user-joined", { uuid, id: socket.id });
    } else {
      console.log("Room not found");
      socket.emit("error", "Room not found");
    }
  });

  socket.on("send-message", ({ uuid, message }) => {
    socket.to(uuid).emit("receive-message", { uuid, message });
  });

  let receivedChunks: { [key: string]: Uint8Array[] } = {};
  let receivedFileInfo: { [key: string]: any } = {};

  socket.on("send-file-chunk", ({ chunkData, uuid }, callback) => {
    const { fileId, name, type, chunk, isLastChunk } = chunkData;
    if (!receivedChunks[fileId]) {
      receivedChunks[fileId] = [];
      receivedFileInfo[fileId] = { name, type };
    }
    receivedChunks[fileId].push(new Uint8Array(chunk));

    if (isLastChunk) {
      const fileBuffer = new Uint8Array(
        receivedChunks[fileId].reduce(
          (acc: any, val) => acc.concat(Array.from(val)),
          []
        )
      );
      socket
        .to(uuid)
        .emit("receive-file", {
          name: receivedFileInfo[fileId].name,
          type: receivedFileInfo[fileId].type,
          data: fileBuffer,
        });
      delete receivedChunks[fileId];
      delete receivedFileInfo[fileId];
    }
    callback("Chunk received");
  });

  socket.on("disconnect", () => {
    users.forEach((value, key) => {
      if (value.has(socket.id)) {
        value.delete(socket.id);
        if (value.size === 0) {
          users.delete(key);
        } else {
          socket.to(key).emit("user-left", socket.id);
        }
      }
    });
    console.log("User disconnected", socket.id);
  });
});
