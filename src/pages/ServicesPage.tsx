import { Sparkles, MapPin, Heart, Clock } from 'lucide-react';
import './ServicesPage.css';

const ServicesPage = () => {
  const services = [
    {
      category: 'Massage Therapy',
      icon: Sparkles,
      items: [
        { name: 'Traditional Thai Massage', duration: 90, price: 2500 },
        { name: 'Deep Tissue Massage', duration: 60, price: 2000 },
        { name: 'Aromatherapy Massage', duration: 90, price: 2800 },
        { name: 'Sports Massage', duration: 60, price: 2200 },
        { name: 'Hot Stone Massage', duration: 90, price: 3000 },
        { name: 'Swedish Massage', duration: 60, price: 1900 }
      ]
    },
    {
      category: 'Tour Services',
      icon: MapPin,
      items: [
        { name: 'City Highlights Tour', duration: 240, price: 3500 },
        { name: 'Cultural Heritage Tour', duration: 300, price: 4000 },
        { name: 'Nightlife Experience', duration: 180, price: 3000 },
        { name: 'Temple Tour', duration: 240, price: 3200 },
        { name: 'Food & Market Tour', duration: 180, price: 2800 },
        { name: 'Custom Private Tour', duration: 360, price: 5000 }
      ]
    },
    {
      category: 'Wellness Packages',
      icon: Heart,
      items: [
        { name: 'Relaxation Package', duration: 180, price: 5500 },
        { name: 'Full Day Wellness', duration: 480, price: 9000 },
        { name: 'Weekend Retreat', duration: 1440, price: 25000 },
        { name: 'Executive Relief', duration: 120, price: 4500 }
      ]
    }
  ];

  return (
    <div className="services-page">
      <section className="services-hero">
        <div className="container">
          <h1>Our Services</h1>
          <p>Premium experiences tailored to your needs</p>
        </div>
      </section>

      <section className="services-content">
        <div className="container">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <div key={index} className="service-category">
                <div className="category-header">
                  <Icon size={32} />
                  <h2>{service.category}</h2>
                </div>
                <div className="services-grid">
                  {service.items.map((item, idx) => (
                    <div key={idx} className="service-card">
                      <h3>{item.name}</h3>
                      <div className="service-details">
                        <div className="service-info">
                          <Clock size={18} />
                          <span>{item.duration >= 60 ? `${Math.floor(item.duration / 60)} hours` : `${item.duration} min`}</span>
                        </div>
                        <div className="service-price">฿{item.price.toLocaleString()}</div>
                      </div>
                      <button className="book-service-btn">Book Now</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default ServicesPage;
