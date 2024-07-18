import { useEffect, useRef, useState } from "react";
import CallEndIcon from "@mui/icons-material/CallEnd";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import MicOffIcon from "@mui/icons-material/MicOff";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import { useSocket } from "./context/SocketProvider";

const VideoCall = (props: any) => {
  const { room, callEnded } = props;
  const socket = useSocket();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  useEffect(() => {
    const startCall = async () => {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.muted = true;
      }

      const peerConnection = new RTCPeerConnection();
      peerConnectionRef.current = peerConnection;

      localStreamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket?.emit("ice-candidate", {
            candidate: event.candidate,
            uuid: room,
          });
        }
      };

      peerConnection.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket?.emit("offer", { offer, uuid: room });

      socket?.on("offer", async ({ offer }) => {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket?.emit("answer", { answer, uuid: room });
      });

      socket?.on("answer", async ({ answer }) => {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
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
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      socket?.off("offer");
      socket?.off("answer");
      socket?.off("ice-candidate");
    };
  }, [socket, room]);

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        if (track.enabled) {
          track.stop();
          socket?.emit("toggle-video", { uuid: room, isVideoEnabled: false });
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
          }
        } else {
          navigator.mediaDevices
            .getUserMedia({ video: true })
            .then((newStream) => {
              const newTrack = newStream.getVideoTracks()[0];
              const sender = peerConnectionRef.current
                ?.getSenders()
                .find((s) => s.track?.kind === "video");
              sender?.replaceTrack(newTrack);
              localStreamRef.current?.removeTrack(track);
              localStreamRef.current?.addTrack(newTrack);
              localVideoRef.current!.srcObject = localStreamRef.current;
              socket?.emit("toggle-video", {
                uuid: room,
                isVideoEnabled: true,
              });
            });
        }
        track.enabled = !track.enabled;
        setIsVideoEnabled(track.enabled);
      });
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
        setIsAudioEnabled(track.enabled);
      });
    }
  };

  const startScreenShare = async () => {
    if (localStreamRef.current) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        const screenTrack = screenStream.getVideoTracks()[0];

        screenTrack.onended = () => {
          stopScreenShare();
        };

        const sender = peerConnectionRef.current
          ?.getSenders()
          .find((s) => s.track?.kind === "video");
        sender?.replaceTrack(screenTrack);

        localVideoRef.current!.srcObject = screenStream;
        setIsScreenSharing(true);
      } catch (error) {
        console.error("Error sharing screen:", error);
      }
    }
  };

  const stopScreenShare = async () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];

      const sender = peerConnectionRef.current
        ?.getSenders()
        .find((s) => s.track?.kind === "video");
      sender?.replaceTrack(videoTrack);

      localVideoRef.current!.srcObject = localStreamRef.current;
      setIsScreenSharing(false);
    }
  };

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    callEnded();
  };

  useEffect(() => {
    socket?.on("toggle-video", ({ isVideoEnabled }) => {
      if (!isVideoEnabled && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      } else if (remoteStream && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });
    return () => {
      socket?.off("toggle-video");
    };
  }, [socket, remoteStream]);

  return (
    <div className="flex flex-col justify-center items-center py-5">
      <div className="w-full px-5 relative">
        <video
          ref={remoteVideoRef}
          autoPlay
          // muted
          style={{ width: "100%", height: "85vh" }}></video>
        <div className="absolute bottom-5 right-10 h-48 w-48 z-10">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            style={{ width: "100%", height: "100%" }}></video>
        </div>
      </div>
      <div className="flex gap-5 mt-5">
        <button
          className="bg-red-500 px-4 py-2 rounded-full text-neutral-50"
          onClick={endCall}>
          <CallEndIcon />
        </button>
        <button
          className={`${
            isVideoEnabled ? "bg-neutral-500" : "bg-red-500"
          } px-4 py-2 rounded-full text-neutral-50`}
          onClick={toggleVideo}>
          <VideocamOffIcon />
        </button>
        <button
          className={`${
            isAudioEnabled ? "bg-neutral-500" : "bg-red-500"
          } px-4 py-2 rounded-full text-neutral-50`}
          onClick={toggleAudio}>
          <MicOffIcon />
        </button>
        <button
          className={`px-4 py-2 rounded-full text-neutral-50 ${
            isScreenSharing ? "bg-red-500" : "bg-neutral-500"
          }`}
          onClick={isScreenSharing ? stopScreenShare : startScreenShare}>
          {isScreenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
        </button>
      </div>
    </div>
  );
};

export default VideoCall;
