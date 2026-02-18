import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import ServicesPage from './pages/ServicesPage';
import StaffPage from './pages/StaffPage';
import VerificationPage from './pages/VerificationPage';
import AboutPage from './pages/AboutPage';
import BookingPage from './pages/BookingPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/verification" element={<VerificationPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/booking" element={<BookingPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
