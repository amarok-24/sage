import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomeRoute } from './components/HomeRoute';
import { LoginRoute } from './components/LoginRoute';
import { RegisterRoute } from './components/RegisterRoute';
import { DashboardV2 } from './v2/pages/DashboardV2';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/register" element={<RegisterRoute />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomeRoute />
          </ProtectedRoute>
        }
      />
      <Route
        path="/v2"
        element={
          <ProtectedRoute>
            <DashboardV2 />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
