import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Shield } from 'lucide-react';
import { useState } from 'react';
import './Navigation.css';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/services', label: 'Services' },
    { path: '/staff', label: 'Our Team' },
    { path: '/verification', label: 'Verification' },
    { path: '/about', label: 'About' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="navigation">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <Shield className="nav-logo-icon" />
          <span className="nav-logo-text">Bangkok Elite</span>
        </Link>

        <div className={`nav-menu ${isOpen ? 'active' : ''}`}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <Link to="/booking" className="nav-cta" onClick={() => setIsOpen(false)}>
            Book Now
          </Link>
        </div>

        <button
          className="nav-toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
