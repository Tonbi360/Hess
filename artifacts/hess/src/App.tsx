import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useOnlineGame } from "@/lib/useOnlineGame";
import { LobbyPage } from "@/pages/LobbyPage";
import GamePage from "@/pages/GamePage";

const queryClient = new QueryClient();

function HessApp() {
  const { state, actions } = useOnlineGame();

  const inGame = (
    state.status === 'ready' ||
    state.status === 'opponent_away' ||
    state.status === 'disconnected'
  ) && state.gameState !== null;

  if (inGame) {
    return <GamePage state={state} actions={actions} onLeave={actions.disconnect} />;
  }

  return <LobbyPage state={state} actions={actions} />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <HessApp />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
