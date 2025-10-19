import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import GameSelection from "./pages/GameSelection";
import Game from "./pages/Game";
import Mines from "./pages/Mines";
import Shop from "./pages/Shop";
import LootBox from "./pages/LootBox";
import RuneBox from "./pages/RuneBox";
import Exchange from "./pages/Exchange";
import Admin from "./pages/Admin";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/game-selection" element={<GameSelection />} />
          <Route path="/game" element={<Game />} />
          <Route path="/mines" element={<Mines />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/lootbox" element={<LootBox />} />
          <Route path="/runebox" element={<RuneBox />} />
          <Route path="/exchange" element={<Exchange />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile" element={<Profile />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
