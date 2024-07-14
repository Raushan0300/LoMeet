import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Lobby from './components/Lobby';
import Room from './components/Room';

function App() {

  return (
    <>
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/:room" element={<Room />} />
      </Routes>
      </BrowserRouter>
    </>
  )
};

export default App;
