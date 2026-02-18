import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { 
  Menu, X, Home, Users, Calculator, Shield, Briefcase, 
  Star, Filter, MapPin, Clock, DollarSign, Upload, 
  Phone, Mail, Instagram, CheckCircle, ChevronDown, User
} from 'lucide-react'

// Navigation Component
const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  
  const isActive = (path) => location.pathname === path

  return (
    <nav className="fixed w-full z-50 bg-luxury-black/95 backdrop-blur-sm border-b border-luxury-amber/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="text-2xl font-serif font-bold text-luxury-amber">
              Male<span className="text-white">Bangkok</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className={`flex items-center space-x-2 transition-colors ${isActive('/') ? 'text-luxury-amber' : 'text-white hover:text-luxury-amber'}`}
            >
              <Home size={18} />
              <span>Home</span>
            </Link>
            <Link 
              to="/therapists" 
              className={`flex items-center space-x-2 transition-colors ${isActive('/therapists') ? 'text-luxury-amber' : 'text-white hover:text-luxury-amber'}`}
            >
              <Users size={18} />
              <span>Therapists</span>
            </Link>
            <Link 
              to="/calculator" 
              className={`flex items-center space-x-2 transition-colors ${isActive('/calculator') ? 'text-luxury-amber' : 'text-white hover:text-luxury-amber'}`}
            >
              <Calculator size={18} />
              <span>Price Calculator</span>
            </Link>
            <Link 
              to="/verification" 
              className={`flex items-center space-x-2 transition-colors ${isActive('/verification') ? 'text-luxury-amber' : 'text-white hover:text-luxury-amber'}`}
            >
              <Shield size={18} />
              <span>Verification</span>
            </Link>
            <Link 
              to="/recruitment" 
              className={`flex items-center space-x-2 transition-colors ${isActive('/recruitment') ? 'text-luxury-amber' : 'text-white hover:text-luxury-amber'}`}
            >
              <Briefcase size={18} />
              <span>Join Us</span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-luxury-amber"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-luxury-darkgray border-t border-luxury-amber/20">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md ${isActive('/') ? 'bg-luxury-amber/20 text-luxury-amber' : 'text-white hover:bg-luxury-gray'}`}
              onClick={() => setIsOpen(false)}
            >
              <Home size={18} />
              <span>Home</span>
            </Link>
            <Link
              to="/therapists"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md ${isActive('/therapists') ? 'bg-luxury-amber/20 text-luxury-amber' : 'text-white hover:bg-luxury-gray'}`}
              onClick={() => setIsOpen(false)}
            >
              <Users size={18} />
              <span>Therapists</span>
            </Link>
            <Link
              to="/calculator"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md ${isActive('/calculator') ? 'bg-luxury-amber/20 text-luxury-amber' : 'text-white hover:bg-luxury-gray'}`}
              onClick={() => setIsOpen(false)}
            >
              <Calculator size={18} />
              <span>Price Calculator</span>
            </Link>
            <Link
              to="/verification"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md ${isActive('/verification') ? 'bg-luxury-amber/20 text-luxury-amber' : 'text-white hover:bg-luxury-gray'}`}
              onClick={() => setIsOpen(false)}
            >
              <Shield size={18} />
              <span>Verification</span>
            </Link>
            <Link
              to="/recruitment"
              className={`flex items-center space-x-2 px-3 py-2 rounded-md ${isActive('/recruitment') ? 'bg-luxury-amber/20 text-luxury-amber' : 'text-white hover:bg-luxury-gray'}`}
              onClick={() => setIsOpen(false)}
            >
              <Briefcase size={18} />
              <span>Join Us</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  )
}

// Hero Section Component
const Hero = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-luxury-black via-luxury-darkgray to-luxury-black">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle, #d4af37 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-8">
          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
            <span className="text-luxury-amber">Premium</span>
            <br />
            <span className="text-white">Male Therapy Experience</span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Discover Bangkok's finest elite male therapists and lifestyle guides. 
            Discreet, professional, and tailored to your sophisticated needs.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <Link to="/therapists" className="btn-primary w-full sm:w-auto">
              Browse Therapists
            </Link>
            <Link to="/calculator" className="btn-secondary w-full sm:w-auto">
              Calculate Pricing
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16">
            <div className="card p-6 hover:shadow-2xl hover:shadow-luxury-amber/20 transition-all">
              <Shield className="text-luxury-amber mx-auto mb-4" size={48} />
              <h3 className="text-xl font-semibold mb-2">Verified & Secure</h3>
              <p className="text-gray-400">All therapists are verified and background checked</p>
            </div>
            <div className="card p-6 hover:shadow-2xl hover:shadow-luxury-amber/20 transition-all">
              <Star className="text-luxury-amber mx-auto mb-4" size={48} />
              <h3 className="text-xl font-semibold mb-2">Premium Quality</h3>
              <p className="text-gray-400">Handpicked elite professionals for discerning clients</p>
            </div>
            <div className="card p-6 hover:shadow-2xl hover:shadow-luxury-amber/20 transition-all">
              <Clock className="text-luxury-amber mx-auto mb-4" size={48} />
              <h3 className="text-xl font-semibold mb-2">24/7 Concierge</h3>
              <p className="text-gray-400">Round-the-clock service for your convenience</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Therapist Card Component
const TherapistCard = ({ therapist }) => {
  return (
    <div className="card hover:shadow-2xl hover:shadow-luxury-amber/30 transition-all">
      <div className="relative h-80 bg-gradient-to-br from-luxury-gray to-luxury-darkgray">
        <div className="absolute top-4 right-4 bg-luxury-amber text-luxury-black px-3 py-1 rounded-full text-sm font-bold">
          {therapist.rating} ★
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <User size={120} className="text-luxury-amber/30" />
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-2xl font-semibold mb-2">{therapist.name}</h3>
        <div className="space-y-2 text-gray-400">
          <p className="flex items-center gap-2">
            <MapPin size={16} className="text-luxury-amber" />
            Age: {therapist.age}
          </p>
          <p className="flex items-center gap-2">
            <Star size={16} className="text-luxury-amber" />
            Type: {therapist.type}
          </p>
          <p className="flex items-center gap-2">
            <Briefcase size={16} className="text-luxury-amber" />
            Role: {therapist.role}
          </p>
        </div>
        <button className="btn-primary w-full mt-6">
          Book Session
        </button>
      </div>
    </div>
  )
}

// Therapists Page Component
const TherapistsPage = () => {
  const [filters, setFilters] = useState({
    age: 'all',
    type: 'all',
    role: 'all'
  })

  const therapists = [
    { id: 1, name: "Alex", age: 25, type: "Traditional Thai", role: "Therapist", rating: 4.9 },
    { id: 2, name: "Marcus", age: 28, type: "Sports Massage", role: "Guide", rating: 4.8 },
    { id: 3, name: "David", age: 30, type: "Deep Tissue", role: "Therapist", rating: 4.9 },
    { id: 4, name: "James", age: 27, type: "Aromatherapy", role: "Therapist", rating: 4.7 },
    { id: 5, name: "Ryan", age: 26, type: "Traditional Thai", role: "Guide", rating: 4.8 },
    { id: 6, name: "Chris", age: 29, type: "Sports Massage", role: "Therapist", rating: 4.9 },
  ]

  const filteredTherapists = therapists.filter(therapist => {
    if (filters.age !== 'all') {
      const ageRange = filters.age.split('-')
      if (therapist.age < parseInt(ageRange[0]) || therapist.age > parseInt(ageRange[1])) {
        return false
      }
    }
    if (filters.type !== 'all' && therapist.type !== filters.type) return false
    if (filters.role !== 'all' && therapist.role !== filters.role) return false
    return true
  })

  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-luxury-amber mb-4">
          Our Therapists
        </h1>
        <p className="text-gray-400 text-lg mb-12">
          Browse our exclusive selection of elite male therapists and lifestyle guides
        </p>

        {/* Filters */}
        <div className="card p-6 mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="text-luxury-amber" size={24} />
            <h2 className="text-xl font-semibold">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-400">Age Range</label>
              <select
                value={filters.age}
                onChange={(e) => setFilters({ ...filters, age: e.target.value })}
                className="input-field"
              >
                <option value="all">All Ages</option>
                <option value="21-25">21-25</option>
                <option value="26-30">26-30</option>
                <option value="31-35">31-35</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-400">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="input-field"
              >
                <option value="all">All Types</option>
                <option value="Traditional Thai">Traditional Thai</option>
                <option value="Sports Massage">Sports Massage</option>
                <option value="Deep Tissue">Deep Tissue</option>
                <option value="Aromatherapy">Aromatherapy</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-400">Role</label>
              <select
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                className="input-field"
              >
                <option value="all">All Roles</option>
                <option value="Therapist">Therapist</option>
                <option value="Guide">Lifestyle Guide</option>
              </select>
            </div>
          </div>
        </div>

        {/* Therapist Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTherapists.map(therapist => (
            <TherapistCard key={therapist.id} therapist={therapist} />
          ))}
        </div>

        {filteredTherapists.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-xl">No therapists found matching your filters</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Price Calculator Component
const PriceCalculator = () => {
  const [service, setService] = useState('traditional-thai')
  const [duration, setDuration] = useState(60)
  const [outcall, setOutcall] = useState(false)
  const [location, setLocation] = useState('sukhumvit')

  const baseRates = {
    'traditional-thai': 2000,
    'sports-massage': 2500,
    'deep-tissue': 2800,
    'aromatherapy': 3000,
    'premium-experience': 5000
  }

  const calculatePrice = () => {
    let price = baseRates[service]
    
    // Duration multiplier
    if (duration === 90) price *= 1.4
    else if (duration === 120) price *= 1.7
    
    // Outcall surcharge
    if (outcall) {
      const locationSurcharge = {
        'sukhumvit': 500,
        'silom': 500,
        'sathorn': 600,
        'riverside': 800,
        'airport': 1500
      }
      price += locationSurcharge[location]
    }
    
    return price
  }

  const totalPrice = calculatePrice()

  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-luxury-amber mb-4">
          Price Calculator
        </h1>
        <p className="text-gray-400 text-lg mb-12">
          Calculate the cost of your premium therapy experience
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calculator Form */}
          <div className="card p-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Calculator className="text-luxury-amber" size={28} />
              Service Details
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">Service Type</label>
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="input-field"
                >
                  <option value="traditional-thai">Traditional Thai Massage</option>
                  <option value="sports-massage">Sports Massage</option>
                  <option value="deep-tissue">Deep Tissue Massage</option>
                  <option value="aromatherapy">Aromatherapy</option>
                  <option value="premium-experience">Premium Experience</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">Duration (minutes)</label>
                <div className="grid grid-cols-3 gap-3">
                  {[60, 90, 120].map(d => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`py-3 rounded-lg font-semibold transition-all ${
                        duration === d
                          ? 'bg-luxury-amber text-luxury-black'
                          : 'bg-luxury-gray text-white hover:bg-luxury-amber/20'
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={outcall}
                    onChange={(e) => setOutcall(e.target.checked)}
                    className="w-5 h-5 rounded border-luxury-gray bg-luxury-darkgray text-luxury-amber focus:ring-luxury-amber"
                  />
                  <span className="text-gray-400">Outcall Service (Hotel/Residence)</span>
                </label>
              </div>

              {outcall && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-400">Location</label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="input-field"
                  >
                    <option value="sukhumvit">Sukhumvit</option>
                    <option value="silom">Silom</option>
                    <option value="sathorn">Sathorn</option>
                    <option value="riverside">Riverside</option>
                    <option value="airport">Airport Area</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Price Summary */}
          <div className="space-y-6">
            <div className="card p-8">
              <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <DollarSign className="text-luxury-amber" size={28} />
                Price Summary
              </h2>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between py-3 border-b border-luxury-gray">
                  <span className="text-gray-400">Base Service</span>
                  <span className="font-semibold">฿{baseRates[service].toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-luxury-gray">
                  <span className="text-gray-400">Duration</span>
                  <span className="font-semibold">{duration} minutes</span>
                </div>
                {outcall && (
                  <div className="flex justify-between py-3 border-b border-luxury-gray">
                    <span className="text-gray-400">Outcall Surcharge</span>
                    <span className="font-semibold">Included</span>
                  </div>
                )}
              </div>

              <div className="bg-luxury-amber/10 border border-luxury-amber rounded-lg p-6">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-semibold">Total Price</span>
                  <span className="text-3xl font-bold text-luxury-amber">
                    ฿{totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>

              <button className="btn-primary w-full mt-6">
                Book Now
              </button>
            </div>

            <div className="card p-6 bg-luxury-darkgray/50">
              <p className="text-sm text-gray-400 leading-relaxed">
                <strong className="text-luxury-amber">Note:</strong> Prices are in Thai Baht (THB). 
                All services are provided by verified professionals. Payment is accepted in cash or 
                via secure digital payment methods.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Verification Page Component
const VerificationPage = () => {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    passportFile: null,
    hotelName: '',
    roomNumber: '',
    checkInDate: '',
    checkOutDate: '',
    phoneNumber: ''
  })

  const handleFileChange = (e) => {
    setFormData({ ...formData, passportFile: e.target.files[0] })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (step < 3) {
      setStep(step + 1)
    }
  }

  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-luxury-amber mb-4">
          Identity Verification
        </h1>
        <p className="text-gray-400 text-lg mb-12">
          Secure and discreet verification for your protection and ours
        </p>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map(s => (
              <React.Fragment key={s}>
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                    step >= s ? 'bg-luxury-amber text-luxury-black' : 'bg-luxury-gray text-gray-400'
                  }`}>
                    {step > s ? <CheckCircle size={24} /> : s}
                  </div>
                  <span className="text-sm mt-2 text-gray-400">
                    {s === 1 ? 'Passport' : s === 2 ? 'Stay Info' : 'Complete'}
                  </span>
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-1 mx-4 ${
                    step > s ? 'bg-luxury-amber' : 'bg-luxury-gray'
                  }`}></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="card p-8">
          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Upload className="text-luxury-amber" size={28} />
                  Upload Passport
                </h2>
                <p className="text-gray-400 mb-6">
                  We require passport verification to ensure the safety of all parties. 
                  Your information is encrypted and handled with strict confidentiality.
                </p>
                
                <div className="border-2 border-dashed border-luxury-gray rounded-lg p-12 text-center hover:border-luxury-amber transition-all cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="passport-upload"
                  />
                  <label htmlFor="passport-upload" className="cursor-pointer">
                    <Upload className="mx-auto text-luxury-amber mb-4" size={48} />
                    <p className="text-lg mb-2">
                      {formData.passportFile ? formData.passportFile.name : 'Click to upload passport'}
                    </p>
                    <p className="text-sm text-gray-400">
                      Supported formats: JPG, PNG, PDF (Max 10MB)
                    </p>
                  </label>
                </div>

                <div className="bg-luxury-amber/10 border border-luxury-amber rounded-lg p-4">
                  <p className="text-sm text-gray-400">
                    <Shield className="inline text-luxury-amber mr-2" size={16} />
                    All documents are encrypted and automatically deleted after 30 days
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="text-luxury-amber" size={28} />
                  Stay Information
                </h2>
                <p className="text-gray-400 mb-6">
                  Please provide your accommodation details for outcall services
                </p>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-400">Hotel/Residence Name</label>
                  <input
                    type="text"
                    value={formData.hotelName}
                    onChange={(e) => setFormData({ ...formData, hotelName: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Mandarin Oriental Bangkok"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-400">Room Number</label>
                  <input
                    type="text"
                    value={formData.roomNumber}
                    onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                    className="input-field"
                    placeholder="e.g., 1205"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-400">Check-in Date</label>
                    <input
                      type="date"
                      value={formData.checkInDate}
                      onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-400">Check-out Date</label>
                    <input
                      type="date"
                      value={formData.checkOutDate}
                      onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-400">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="input-field"
                    placeholder="+66 XX XXX XXXX"
                    required
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="text-center space-y-6">
                <CheckCircle className="text-luxury-amber mx-auto" size={80} />
                <h2 className="text-3xl font-semibold">Verification Complete!</h2>
                <p className="text-gray-400 text-lg">
                  Your verification has been submitted successfully. Our team will review your 
                  information within 2-4 hours and contact you via phone or email.
                </p>
                <div className="card p-6 bg-luxury-darkgray/50 text-left">
                  <h3 className="font-semibold mb-3 text-luxury-amber">What's Next?</h3>
                  <ul className="space-y-2 text-gray-400">
                    <li>✓ Our team reviews your verification</li>
                    <li>✓ You'll receive a confirmation via SMS/Email</li>
                    <li>✓ Browse and book our premium services</li>
                    <li>✓ Enjoy a secure and discreet experience</li>
                  </ul>
                </div>
                <Link to="/therapists" className="btn-primary inline-block">
                  Browse Therapists
                </Link>
              </div>
            )}

            {step < 3 && (
              <div className="flex gap-4 mt-8">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="btn-secondary flex-1"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  {step === 2 ? 'Submit Verification' : 'Continue'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

// Recruitment Page Component
const RecruitmentPage = () => {
  const [role, setRole] = useState('therapist')
  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    email: '',
    phone: '',
    experience: '',
    languages: '',
    availability: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    alert('Application submitted! We will contact you within 48 hours.')
  }

  return (
    <div className="min-h-screen pt-28 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-luxury-amber mb-4">
          Join Our Team
        </h1>
        <p className="text-gray-400 text-lg mb-12">
          Become part of Bangkok's most prestigious male therapy and lifestyle guide network
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Therapist Card */}
          <div className={`card p-8 cursor-pointer transition-all ${
            role === 'therapist' ? 'ring-2 ring-luxury-amber' : ''
          }`}
            onClick={() => setRole('therapist')}
          >
            <Briefcase className="text-luxury-amber mb-4" size={48} />
            <h3 className="text-2xl font-semibold mb-3">Professional Therapist</h3>
            <ul className="space-y-2 text-gray-400">
              <li>• Competitive rates: ฿3,000-8,000 per session</li>
              <li>• Flexible schedule</li>
              <li>• Premium client base</li>
              <li>• Professional development</li>
              <li>• Verified and secure platform</li>
            </ul>
          </div>

          {/* City Guide Card */}
          <div className={`card p-8 cursor-pointer transition-all ${
            role === 'guide' ? 'ring-2 ring-luxury-amber' : ''
          }`}
            onClick={() => setRole('guide')}
          >
            <Users className="text-luxury-amber mb-4" size={48} />
            <h3 className="text-2xl font-semibold mb-3">Elite Lifestyle Guide</h3>
            <ul className="space-y-2 text-gray-400">
              <li>• Premium compensation</li>
              <li>• Experience luxury venues</li>
              <li>• International clientele</li>
              <li>• Networking opportunities</li>
              <li>• Concierge support</li>
            </ul>
          </div>
        </div>

        {/* Application Form */}
        <div className="card p-8">
          <h2 className="text-2xl font-semibold mb-6">
            Apply as {role === 'therapist' ? 'Professional Therapist' : 'Elite Lifestyle Guide'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">Full Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">Age</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="input-field"
                  min="21"
                  max="40"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-400">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-400">
                {role === 'therapist' ? 'Massage Experience & Certifications' : 'Experience & Background'}
              </label>
              <textarea
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                className="input-field"
                rows="4"
                required
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-400">Languages Spoken</label>
              <input
                type="text"
                value={formData.languages}
                onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                className="input-field"
                placeholder="e.g., English, Thai, Japanese"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-400">Availability</label>
              <select
                value={formData.availability}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                className="input-field"
                required
              >
                <option value="">Select availability</option>
                <option value="full-time">Full-time (5-7 days/week)</option>
                <option value="part-time">Part-time (3-4 days/week)</option>
                <option value="flexible">Flexible schedule</option>
              </select>
            </div>

            <div className="bg-luxury-amber/10 border border-luxury-amber rounded-lg p-4">
              <p className="text-sm text-gray-400">
                <Shield className="inline text-luxury-amber mr-2" size={16} />
                All applications are reviewed confidentially. Background checks and verification required.
              </p>
            </div>

            <button type="submit" className="btn-primary w-full">
              Submit Application
            </button>
          </form>
        </div>

        {/* Requirements */}
        <div className="mt-12 card p-8 bg-luxury-darkgray/50">
          <h3 className="text-xl font-semibold mb-4 text-luxury-amber">Requirements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-400">
            <ul className="space-y-2">
              <li>✓ Age 21-40</li>
              <li>✓ Professional appearance</li>
              <li>✓ Excellent communication skills</li>
              <li>✓ Clean background check</li>
            </ul>
            <ul className="space-y-2">
              <li>✓ Reliable and punctual</li>
              <li>✓ Discreet and professional</li>
              <li>✓ English proficiency</li>
              <li>✓ Valid ID/Work permit</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// Footer Component
const Footer = () => {
  return (
    <footer className="bg-luxury-darkgray border-t border-luxury-amber/20 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="text-2xl font-serif font-bold text-luxury-amber mb-4">
              Male<span className="text-white">Bangkok</span>
            </div>
            <p className="text-gray-400 mb-4">
              Premium Male Therapy & Elite Lifestyle Guide Platform in Bangkok. 
              Secure, discreet, and professional.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-luxury-amber hover:text-luxury-gold transition-colors">
                <Instagram size={24} />
              </a>
              <a href="#" className="text-luxury-amber hover:text-luxury-gold transition-colors">
                <Phone size={24} />
              </a>
              <a href="#" className="text-luxury-amber hover:text-luxury-gold transition-colors">
                <Mail size={24} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link to="/" className="hover:text-luxury-amber transition-colors">Home</Link></li>
              <li><Link to="/therapists" className="hover:text-luxury-amber transition-colors">Therapists</Link></li>
              <li><Link to="/calculator" className="hover:text-luxury-amber transition-colors">Pricing</Link></li>
              <li><Link to="/recruitment" className="hover:text-luxury-amber transition-colors">Join Us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-lg mb-4">Contact</h4>
            <ul className="space-y-2 text-gray-400">
              <li>Bangkok, Thailand</li>
              <li>+66 XX XXX XXXX</li>
              <li>info@malebangkok.com</li>
              <li>24/7 Concierge Service</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-luxury-gray mt-8 pt-8 text-center text-gray-400 text-sm">
          <p>&copy; 2026 MaleBangkok.com. All rights reserved. Premium, Discreet, Professional.</p>
        </div>
      </div>
    </footer>
  )
}

// Main App Component
function App() {
  return (
    <Router>
      <div className="App min-h-screen bg-luxury-black">
        <Navigation />
        <Routes>
          <Route path="/" element={<Hero />} />
          <Route path="/therapists" element={<TherapistsPage />} />
          <Route path="/calculator" element={<PriceCalculator />} />
          <Route path="/verification" element={<VerificationPage />} />
          <Route path="/recruitment" element={<RecruitmentPage />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  )
}

export default App
