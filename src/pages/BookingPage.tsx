import { useState } from 'react';
import { Calendar, Clock, User } from 'lucide-react';
import './BookingPage.css';

const BookingPage = () => {
  const [selectedService, setSelectedService] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');

  return (
    <div className="booking-page">
      <section className="booking-hero">
        <div className="container">
          <h1>Book Your Experience</h1>
          <p>Schedule your appointment with our verified professionals</p>
        </div>
      </section>

      <section className="booking-content">
        <div className="container">
          <div className="booking-form-container">
            <form className="booking-form">
              <div className="form-section">
                <h3>Service Selection</h3>
                <div className="form-group">
                  <label htmlFor="service">Choose Service</label>
                  <select 
                    id="service" 
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                  >
                    <option value="">Select a service</option>
                    <option value="thai-massage">Traditional Thai Massage</option>
                    <option value="deep-tissue">Deep Tissue Massage</option>
                    <option value="aromatherapy">Aromatherapy Massage</option>
                    <option value="city-tour">City Highlights Tour</option>
                    <option value="cultural-tour">Cultural Heritage Tour</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="staff">Preferred Professional</label>
                  <select 
                    id="staff"
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                  >
                    <option value="">Select a professional</option>
                    <option value="somchai">Somchai - Massage Therapist</option>
                    <option value="krit">Krit - Massage Therapist</option>
                    <option value="narong">Narong - Tour Guide</option>
                    <option value="pong">Pong - Massage Therapist</option>
                  </select>
                </div>
              </div>

              <div className="form-section">
                <h3>Date & Time</h3>
                <div className="form-group">
                  <label htmlFor="date">
                    <Calendar size={18} />
                    Preferred Date
                  </label>
                  <input type="date" id="date" />
                </div>

                <div className="form-group">
                  <label htmlFor="time">
                    <Clock size={18} />
                    Preferred Time
                  </label>
                  <select id="time">
                    <option value="">Select a time</option>
                    <option value="09:00">09:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="13:00">01:00 PM</option>
                    <option value="14:00">02:00 PM</option>
                    <option value="15:00">03:00 PM</option>
                    <option value="16:00">04:00 PM</option>
                    <option value="17:00">05:00 PM</option>
                    <option value="18:00">06:00 PM</option>
                  </select>
                </div>
              </div>

              <div className="form-section">
                <h3>Contact Information</h3>
                <div className="form-group">
                  <label htmlFor="name">
                    <User size={18} />
                    Full Name
                  </label>
                  <input type="text" id="name" placeholder="Enter your name" />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input type="tel" id="phone" placeholder="+66 XX XXX XXXX" />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input type="email" id="email" placeholder="your.email@example.com" />
                </div>
              </div>

              <div className="form-section">
                <h3>Additional Information</h3>
                <div className="form-group">
                  <label htmlFor="notes">Special Requests</label>
                  <textarea 
                    id="notes" 
                    rows={4}
                    placeholder="Any special requests or preferences..."
                  ></textarea>
                </div>
              </div>

              <button type="submit" className="submit-booking-btn">
                Confirm Booking
              </button>
            </form>

            <div className="booking-summary">
              <h3>Booking Summary</h3>
              <div className="summary-content">
                <p className="summary-note">
                  Select a service to see booking details
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BookingPage;
