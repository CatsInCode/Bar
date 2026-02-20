import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import RecipesPage from "./pages/RecipesPage";
import EventsPage from "./pages/EventsPage";
import OrdersPage from "./pages/OrdersPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/orders" replace />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="*" element={<Navigate to="/orders" replace />} />
      </Routes>
    </Layout>
  );
}
