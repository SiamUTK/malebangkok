import { Shield, Award, Heart, Users } from 'lucide-react';
import './AboutPage.css';

const AboutPage = () => {
  return (
    <div className="about-page">
      <section className="about-hero">
        <div className="container">
          <h1>About Bangkok Elite</h1>
          <p>Setting the standard for premium wellness and lifestyle services</p>
        </div>
      </section>

      <section className="about-content">
        <div className="container">
          <div className="about-story">
            <h2>Our Story</h2>
            <p>
              Bangkok Elite was founded with a vision to provide the highest quality wellness and lifestyle
              services in Bangkok. We understand the importance of discretion, professionalism, and excellence
              in everything we do.
            </p>
            <p>
              Our team consists of carefully selected, thoroughly verified professionals who share our
              commitment to delivering exceptional experiences. Each member undergoes rigorous background
              checks, professional certification verification, and continuous training.
            </p>
          </div>

          <div className="values-grid">
            <div className="value-card">
              <Shield size={48} />
              <h3>Safety & Security</h3>
              <p>Comprehensive verification and background checks for all staff members</p>
            </div>
            <div className="value-card">
              <Award size={48} />
              <h3>Professional Excellence</h3>
              <p>Certified practitioners with years of experience and continuous training</p>
            </div>
            <div className="value-card">
              <Heart size={48} />
              <h3>Client-Centered Care</h3>
              <p>Personalized services tailored to your unique needs and preferences</p>
            </div>
            <div className="value-card">
              <Users size={48} />
              <h3>Complete Discretion</h3>
              <p>Privacy and confidentiality are our top priorities in every interaction</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
