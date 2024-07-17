import { useEffect, useRef } from 'react';
import CallEndIcon from '@mui/icons-material/CallEnd';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import MicOffIcon from '@mui/icons-material/MicOff';
import { useSocket } from './context/SocketProvider';

const VideoCall = (props:any) => {
  const { room } = props;
  const socket = useSocket();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  // const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // const [isMuted, setIsMuted] = useState(true);
  // const [isVideoOff, setIsVideoOff] = useState(true);

  useEffect(() => {
    const startCall = async () => {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      const peerConnection = new RTCPeerConnection();
      peerConnectionRef.current = peerConnection;

      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });

      peerConnection.onicecandidate = event => {
        if (event.candidate) {
          socket?.emit("ice-candidate", { candidate: event.candidate, uuid: room });
        }
      };

      peerConnection.ontrack = event => {
        // setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          // console.log(event.streams[0]);
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket?.emit("offer", { offer, uuid: room });

      socket?.on("offer", async ({ offer }) => {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket?.emit("answer", { answer, uuid: room });
      });

      socket?.on("answer", async ({ answer }) => {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket?.on("ice-candidate", async ({ candidate }) => {
        if (candidate) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });
    };

    startCall();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      socket?.off("offer");
      socket?.off("answer");
      socket?.off("ice-candidate");
    };
  }, [socket, room, localStreamRef, peerConnectionRef, localVideoRef, remoteVideoRef]);

  return (
    <div className="flex flex-col justify-center items-center py-5">
      <div className="w-full px-5 relative">
        <video
          ref={remoteVideoRef}
          autoPlay
          // muted
          style={{ width: '100%', height: '85vh' }}
        ></video>
        <div className="absolute bottom-5 right-10 h-48 w-48 z-10">
         
            <video
              ref={localVideoRef}
              autoPlay
              // muted
              style={{ width: '100%', height: '100%' }}
            ></video>
          
        </div>
      </div>
      <div className="flex gap-5 mt-5">
        <button className="bg-red-500 px-4 py-2 rounded-full text-neutral-50"><CallEndIcon /></button>
        <button className="bg-green-500 px-4 py-2 rounded-full text-neutral-50"><VideocamOffIcon /></button>
        <button className="bg-blue-500 px-4 py-2 rounded-full text-neutral-50"><MicOffIcon /></button>
      </div>
    </div>
  );
};

export default VideoCall;