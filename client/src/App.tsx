import React from 'react';
import { SocketProvider, usePartySocket } from './context/SocketContext';
import { Home } from './components/Home';
import { Lobby } from './components/Lobby';
import { TuttiFruttiView } from './components/games/TuttiFruttiView';
import { ImpostorView } from './components/games/ImpostorView';
import { BombaView } from './components/games/BombaView';
import { GarticView } from './components/games/GarticView';
import { HivemindView } from './components/games/HivemindView';
import { MostLikelyView } from './components/games/MostLikelyView';
import { FibbageView } from './components/games/FibbageView';
import { FiveSecondsView } from './components/games/FiveSecondsView';
import { TabooView } from './components/games/TabooView';
import { FloatingReactions } from './components/FloatingReactions';
import { GameIntroScreen } from './components/GameIntroScreen';
import { GameTopBar } from './components/GameTopBar';

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
    if (room.introState?.active) {
      return <GameIntroScreen />;
    }

    const renderGame = () => {
      switch (room.selectedGame) {
        case 'tutifruti':
          return <TuttiFruttiView />;
        case 'impostor':
          return <ImpostorView />;
        case 'bomba':
          return <BombaView />;
        case 'gartic':
          return <GarticView />;
        case 'hivemind':
          return <HivemindView />;
        case 'mostlikely':
          return <MostLikelyView />;
        case 'fibbage':
          return <FibbageView />;
        case 'fiveseconds':
          return <FiveSecondsView />;
        case 'taboo':
          return <TabooView />;
        default:
          return <Lobby />;
      }
    };

    return (
      <div className="min-h-screen flex flex-col">
        <GameTopBar />
        <div className="flex-1">{renderGame()}</div>
      </div>
    );
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
