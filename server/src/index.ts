import {createServer} from 'http';
import {Server} from 'socket.io';
import 'dotenv/config';
const express = require('express');

const PORT = process.env.PORT || 3000;
const app = express();
const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN,
    }
});

const users = new Map();

io.on('connection', (socket)=>{
    console.log('User connected', socket.id);
    socket.on('create-room', (uuid)=>{
        users.set(uuid, new Set([socket.id]));
        console.log('Room created with ID:', uuid);
        // io.to(uuid).emit('room-created', uuid);
        socket.join(uuid);
        // io.to(socket.id).emit('user-joined', {uuid, id: socket.id});
    });
    
    socket.on('join-room', (uuid)=>{
        if(users.has(uuid)){
            users.get(uuid).add(socket.id);
            console.log('User joined room with ID:', uuid);
            socket.join(uuid);
            socket.to(uuid).emit('user-joined', {uuid, id: socket.id});
        }else{
            console.log('Room not found');
            socket.emit('error', 'Room not found');
        }
    });

    socket.on('send-message', ({uuid, message})=>{
        socket.to(uuid).emit('receive-message', {uuid, message});
    });


    socket.on('disconnect', () => {
        // Remove the user from all rooms they were part of
        users.forEach((value, key) => {
            if (value.has(socket.id)) {
                value.delete(socket.id);
                if (value.size === 0) {
                    users.delete(key); // Delete the room if it's empty
                } else {
                    socket.to(key).emit('user-left', socket.id); // Notify others in the room
                }
            }
        });
        console.log('User disconnected', socket.id);
    });
})

server.listen(PORT, ()=>{
    console.log(`Server running on port ${PORT}`);
})