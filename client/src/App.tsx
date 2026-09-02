import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MobileNav from './components/MobileNav';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Buying from './pages/Buying';
import EvDeals from './pages/EvDeals';
import CarInsurance from './pages/CarInsurance';
import Browse from './pages/Browse';
import CarDetail from './pages/CarDetail';
import Compare from './pages/Compare';
import Sell from './pages/Sell';
import Simulator from './pages/Simulator';
import Login from './pages/Login';
import Register from './pages/Register';
import Saved from './pages/Saved';
import Admin from './pages/Admin';
import Investors from './pages/Investors';
import About from './pages/About';
import Specialists from './pages/Specialists';
import Safety from './pages/Safety';
import NotFound from './pages/NotFound';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    // Belt-and-suspenders for a Chrome compositing bug: after a client-side
    // route change, content under a sticky/fixed layer can stay unpainted until
    // a manual refresh. Nudge a repaint (negligible visual effect).
    requestAnimationFrame(() => {
      document.body.style.opacity = '0.99999';
      requestAnimationFrame(() => {
        document.body.style.opacity = '';
      });
    });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1 pb-36 md:pb-0">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/therapies" element={<Buying />} />
          <Route path="/research" element={<EvDeals />} />
          <Route path="/care" element={<CarInsurance />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/therapies/:id" element={<CarDetail />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/consultation" element={<Sell />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/saved"
            element={
              <ProtectedRoute>
                <Saved />
              </ProtectedRoute>
            }
          />
          <Route path="/admin" element={<Admin />} />
          <Route path="/investors" element={<Investors />} />
          <Route path="/about" element={<About />} />
          <Route path="/specialists" element={<Specialists />} />
          <Route path="/safety" element={<Safety />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <MobileNav />
    </div>
  );
}
