import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import NavigationRail from './components/NavigationRail';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AgendaPage from './pages/AgendaPage';
import PagosPage from './pages/PagosPage';
import PerfilPacientePage from './pages/PerfilPacientePage';
import HistorialPacientePage from './pages/HistorialPacientePage';
import AdminPage from './pages/AdminPage';
import CatalogoPage from './pages/CatalogoPage';

function AppLayout() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      {isAuthenticated && <NavigationRail />}
      <main className="flex-1 overflow-y-auto bg-[#F1F5F9] pb-16 md:pb-0">
        <Routes>
          {/* Pública */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protegidas */}
          <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
          <Route path="/agenda" element={<PrivateRoute><AgendaPage /></PrivateRoute>} />
          <Route path="/pagos" element={<PrivateRoute><PagosPage /></PrivateRoute>} />
          <Route path="/pacientes/:dni/historial" element={<PrivateRoute><HistorialPacientePage /></PrivateRoute>} />
          <Route path="/pacientes" element={<PrivateRoute><PerfilPacientePage /></PrivateRoute>} />
          <Route path="/admin/usuarios" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
          <Route path="/catalogo" element={<PrivateRoute><CatalogoPage /></PrivateRoute>} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
