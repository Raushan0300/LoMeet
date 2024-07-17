import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Lobby from './components/Lobby';
import Room from './components/Room';
import VideoCall from './components/VideoCall';

function App() {

  return (
    <>
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/:room" element={<Room />} />
        <Route path='/video' element={<VideoCall />} />
      </Routes>
      </BrowserRouter>
    </>
  )
};

export default App;
