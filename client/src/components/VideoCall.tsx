import CallEndIcon from '@mui/icons-material/CallEnd';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import MicOffIcon from '@mui/icons-material/MicOff';

const VideoCall = () => {
  return (
    <div className="flex flex-col justify-center items-center py-5">
        <div className="w-full px-5 relative">
          <div className="absolute bottom-5 right-10 h-28 w-28 bg-green-500 z-10"></div>
          <div className="w-full bg-blue-500" style={{height:"85vh"}}></div>
        </div>
        <div className="flex gap-5 mt-5">
          <button className="bg-red-500 px-4 py-2 rounded-full text-neutral-50"><CallEndIcon /></button>
          <button className="bg-green-500 px-4 py-2 rounded-full text-neutral-50"><VideocamOffIcon /></button>
          <button className="bg-blue-500 px-4 py-2 rounded-full text-neutral-50"><MicOffIcon /></button>
        </div>
    </div>
  )
};

export default VideoCall;