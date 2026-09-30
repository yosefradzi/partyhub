import React from 'react';
import { SocketProvider, usePartySocket } from './context/SocketContext';
import { Home } from './components/Home';
import { Lobby } from './components/Lobby';
import { TuttiFruttiView } from './components/games/TuttiFruttiView';
import { ImpostorView } from './components/games/ImpostorView';
import { BombaView } from './components/games/BombaView';
import { FloatingReactions } from './components/FloatingReactions';

const GameRouter: React.FC = () => {
  const { room } = usePartySocket();

  if (!room) {
    return <Home />;
  }

  if (room.status === 'LOBBY') {
    return <Lobby />;
  }

  // Active game view
  if (room.status === 'PLAYING') {
    if (room.selectedGame === 'tutifruti') {
      return <TuttiFruttiView />;
    }
    if (room.selectedGame === 'impostor') {
      return <ImpostorView />;
    }
    if (room.selectedGame === 'bomba') {
      return <BombaView />;
    }
  }

  return <Lobby />;
};

export function App() {
  return (
    <SocketProvider>
      <div className="min-h-screen bg-slate-950 text-white relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
        <FloatingReactions />
        <GameRouter />
      </div>
    </SocketProvider>
  );
}

export default App;
