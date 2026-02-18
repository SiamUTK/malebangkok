import { useState } from 'react';
import { Star, Shield, Languages, Award, Calendar } from 'lucide-react';
import type { Staff } from '../types';
import './StaffPage.css';

const StaffPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'massage' | 'tour'>('all');

  const staffMembers: Staff[] = [
    {
      id: '1',
      name: 'Somchai',
      age: 28,
      image: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop',
      specialties: ['Thai Massage', 'Sports Massage', 'Aromatherapy'],
      languages: ['Thai', 'English', 'Japanese'],
      experience: 5,
      rating: 4.9,
      verified: true,
      bio: 'Certified massage therapist with extensive training in traditional Thai techniques and modern wellness practices.',
      certifications: ['Thai Massage Certification', 'Sports Therapy License', 'Aromatherapy Specialist']
    },
    {
      id: '2',
      name: 'Krit',
      age: 32,
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      specialties: ['Deep Tissue', 'Swedish Massage', 'Reflexology'],
      languages: ['Thai', 'English', 'Chinese'],
      experience: 8,
      rating: 4.8,
      verified: true,
      bio: 'Expert in therapeutic massage with a focus on pain relief and muscle recovery. Trained in international wellness centers.',
      certifications: ['International Massage Therapy Certificate', 'Deep Tissue Specialist', 'Reflexology Expert']
    },
    {
      id: '3',
      name: 'Narong',
      age: 26,
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
      specialties: ['City Tours', 'Cultural Experiences', 'Nightlife Guide'],
      languages: ['Thai', 'English', 'German', 'French'],
      experience: 4,
      rating: 4.9,
      verified: true,
      bio: 'Professional tour guide with deep knowledge of Bangkok\'s culture, history, and hidden gems. Passionate about sharing authentic experiences.',
      certifications: ['Licensed Tour Guide', 'Cultural Heritage Expert', 'Hospitality Professional']
    },
    {
      id: '4',
      name: 'Pong',
      age: 30,
      image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
      specialties: ['Hot Stone Massage', 'Prenatal Massage', 'Shiatsu'],
      languages: ['Thai', 'English', 'Korean'],
      experience: 7,
      rating: 4.9,
      verified: true,
      bio: 'Holistic wellness practitioner specializing in relaxation and stress relief techniques. Known for gentle yet effective treatments.',
      certifications: ['Advanced Massage Therapy', 'Shiatsu Practitioner', 'Hot Stone Certification']
    }
  ];

  const categories = [
    { id: 'all', label: 'All Staff' },
    { id: 'massage', label: 'Massage Therapists' },
    { id: 'tour', label: 'Tour Guides' }
  ];

  const filteredStaff = selectedCategory === 'all' 
    ? staffMembers 
    : staffMembers.filter(staff => 
        selectedCategory === 'massage' 
          ? staff.specialties.some(s => s.toLowerCase().includes('massage'))
          : staff.specialties.some(s => s.toLowerCase().includes('tour'))
      );

  return (
    <div className="staff-page">
      <section className="staff-hero">
        <div className="container">
          <h1>Our Professional Team</h1>
          <p>Meet our verified and certified wellness professionals</p>
        </div>
      </section>

      <section className="staff-content">
        <div className="container">
          <div className="category-filter">
            {categories.map((category) => (
              <button
                key={category.id}
                className={`filter-btn ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id as 'all' | 'massage' | 'tour')}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="staff-grid">
            {filteredStaff.map((staff) => (
              <div key={staff.id} className="staff-card">
                <div className="staff-image-wrapper">
                  <img src={staff.image} alt={staff.name} className="staff-image" />
                  {staff.verified && (
                    <div className="verified-badge">
                      <Shield size={16} />
                      <span>Verified</span>
                    </div>
                  )}
                </div>
                
                <div className="staff-info">
                  <div className="staff-header">
                    <h3>{staff.name}</h3>
                    <div className="staff-rating">
                      <Star size={16} fill="currentColor" />
                      <span>{staff.rating}</span>
                    </div>
                  </div>

                  <p className="staff-bio">{staff.bio}</p>

                  <div className="staff-details">
                    <div className="detail-item">
                      <Calendar size={18} />
                      <span>{staff.experience} years experience</span>
                    </div>
                    <div className="detail-item">
                      <Languages size={18} />
                      <span>{staff.languages.join(', ')}</span>
                    </div>
                  </div>

                  <div className="staff-specialties">
                    {staff.specialties.map((specialty, index) => (
                      <span key={index} className="specialty-tag">
                        {specialty}
                      </span>
                    ))}
                  </div>

                  <div className="staff-certifications">
                    <div className="cert-header">
                      <Award size={18} />
                      <span>Certifications</span>
                    </div>
                    <ul>
                      {staff.certifications.map((cert, index) => (
                        <li key={index}>{cert}</li>
                      ))}
                    </ul>
                  </div>

                  <button className="book-staff-btn">Book Appointment</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default StaffPage;
