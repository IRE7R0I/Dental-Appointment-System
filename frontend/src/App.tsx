import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NavigationRail from './components/NavigationRail';
import DashboardPage from './pages/DashboardPage';
import AgendaPage from './pages/AgendaPage';
import PagosPage from './pages/PagosPage';
import PerfilPacientePage from './pages/PerfilPacientePage';

function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden">
        <NavigationRail />
        <main className="flex-1 overflow-y-auto bg-[#F1F5F9] pb-16 md:pb-0">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/pagos" element={<PagosPage />} />
            <Route path="/pacientes" element={<PerfilPacientePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;