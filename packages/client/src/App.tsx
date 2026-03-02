import { Routes, Route } from 'react-router';
import Home from './pages/Home.js';
import LocalGame from './pages/LocalGame.js';
import OnlineGame from './pages/OnlineGame.js';
import Stats from './pages/Stats.js';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/local" element={<LocalGame />} />
      <Route path="/online" element={<OnlineGame />} />
      <Route path="/stats" element={<Stats />} />
    </Routes>
  );
}
