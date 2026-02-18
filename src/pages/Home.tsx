import { Link } from 'react-router-dom';
import { Shield, Star, Users, Award } from 'lucide-react';
import './Home.css';

const Home = () => {
  const features = [
    {
      icon: Shield,
      title: 'Verified Professionals',
      description: 'All staff undergo rigorous background checks and certification verification'
    },
    {
      icon: Star,
      title: 'Premium Service',
      description: 'Luxury experience with highly trained therapists and tour guides'
    },
    {
      icon: Users,
      title: 'Discreet & Private',
      description: 'Complete confidentiality and privacy for all our valued clients'
    },
    {
      icon: Award,
      title: 'Certified Excellence',
      description: 'Award-winning service with internationally recognized standards'
    }
  ];

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">
            Bangkok's Premier
            <span className="hero-title-accent"> Male Wellness</span>
            <br />& Elite Lifestyle Services
          </h1>
          <p className="hero-subtitle">
            Experience luxury therapy and personalized tour services with verified professionals.
            Discretion, excellence, and authenticity guaranteed.
          </p>
          <div className="hero-actions">
            <Link to="/staff" className="btn-primary">
              Meet Our Team
            </Link>
            <Link to="/verification" className="btn-secondary">
              Verification Process
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <div className="section-header">
            <h2>Why Choose Bangkok Elite</h2>
            <p>Setting the standard for premium wellness and lifestyle services</p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="feature-card">
                  <div className="feature-icon">
                    <Icon size={32} />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Experience Excellence?</h2>
            <p>Book your appointment with our verified professionals today</p>
            <Link to="/booking" className="btn-primary">
              Book Now
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
