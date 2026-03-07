import { Routes, Route } from 'react-router';
import { AuthProvider } from './context/AuthContext.js';
import Home from './pages/Home.js';
import LocalGame from './pages/LocalGame.js';
import OnlineGame from './pages/OnlineGame.js';
import Stats from './pages/Stats.js';
import Rules from './pages/Rules.js';
import Account from './pages/Account.js';
import Spectate from './pages/Spectate.js';
import ForgotPassword from './pages/ForgotPassword.js';
import ResetPassword from './pages/ResetPassword.js';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/local" element={<LocalGame />} />
        <Route path="/online" element={<OnlineGame />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/account" element={<Account />} />
        <Route path="/spectate" element={<Spectate />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </AuthProvider>
  );
}
