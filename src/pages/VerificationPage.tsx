import { useState } from 'react';
import { CheckCircle, Shield, FileText, Camera, UserCheck, Lock } from 'lucide-react';
import type { VerificationStep } from '../types';
import './VerificationPage.css';

const VerificationPage = () => {
  const [currentStep, setCurrentStep] = useState(0);

  const verificationSteps: VerificationStep[] = [
    {
      id: '1',
      title: 'Identity Verification',
      description: 'Upload a government-issued ID to verify your identity',
      completed: false
    },
    {
      id: '2',
      title: 'Photo Verification',
      description: 'Take a selfie to match with your ID photo',
      completed: false
    },
    {
      id: '3',
      title: 'Contact Information',
      description: 'Provide and verify your contact details',
      completed: false
    },
    {
      id: '4',
      title: 'Privacy Agreement',
      description: 'Review and accept our privacy and confidentiality terms',
      completed: false
    }
  ];

  const features = [
    {
      icon: Shield,
      title: 'Secure Process',
      description: 'Bank-level encryption protects your personal data'
    },
    {
      icon: Lock,
      title: 'Complete Privacy',
      description: 'Your information is never shared with third parties'
    },
    {
      icon: UserCheck,
      title: 'Verified Professionals',
      description: 'All staff undergo the same rigorous verification'
    }
  ];

  return (
    <div className="verification-page">
      <section className="verification-hero">
        <div className="container">
          <h1>Identity Verification</h1>
          <p>Ensuring a safe and professional experience for all clients</p>
        </div>
      </section>

      <section className="verification-content">
        <div className="container">
          <div className="verification-layout">
            <div className="verification-main">
              <div className="verification-intro">
                <h2>Why We Verify</h2>
                <p>
                  Our verification process ensures the safety and security of both our clients and staff.
                  All information is encrypted and stored securely, and we maintain strict confidentiality policies.
                </p>
              </div>

              <div className="steps-container">
                <h3>Verification Steps</h3>
                <div className="steps-list">
                  {verificationSteps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`step-item ${index === currentStep ? 'active' : ''} ${step.completed ? 'completed' : ''}`}
                    >
                      <div className="step-number">
                        {step.completed ? (
                          <CheckCircle size={24} />
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </div>
                      <div className="step-content">
                        <h4>{step.title}</h4>
                        <p>{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="verification-form">
                  {currentStep === 0 && (
                    <div className="form-step">
                      <div className="form-header">
                        <FileText size={32} />
                        <h3>Upload Identity Document</h3>
                      </div>
                      <div className="upload-area">
                        <Camera size={48} />
                        <p>Click to upload or drag and drop</p>
                        <span>Passport, Driver's License, or National ID</span>
                      </div>
                      <button className="next-btn" onClick={() => setCurrentStep(1)}>
                        Continue
                      </button>
                    </div>
                  )}

                  {currentStep === 1 && (
                    <div className="form-step">
                      <div className="form-header">
                        <Camera size={32} />
                        <h3>Take a Selfie</h3>
                      </div>
                      <div className="camera-area">
                        <div className="camera-placeholder">
                          <Camera size={64} />
                          <p>Position your face in the frame</p>
                        </div>
                      </div>
                      <div className="step-actions">
                        <button className="back-btn" onClick={() => setCurrentStep(0)}>
                          Back
                        </button>
                        <button className="next-btn" onClick={() => setCurrentStep(2)}>
                          Continue
                        </button>
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="form-step">
                      <div className="form-header">
                        <UserCheck size={32} />
                        <h3>Contact Information</h3>
                      </div>
                      <div className="form-fields">
                        <input type="tel" placeholder="Phone Number" />
                        <input type="email" placeholder="Email Address" />
                        <button className="verify-btn">Send Verification Code</button>
                      </div>
                      <div className="step-actions">
                        <button className="back-btn" onClick={() => setCurrentStep(1)}>
                          Back
                        </button>
                        <button className="next-btn" onClick={() => setCurrentStep(3)}>
                          Continue
                        </button>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="form-step">
                      <div className="form-header">
                        <Lock size={32} />
                        <h3>Privacy Agreement</h3>
                      </div>
                      <div className="agreement-content">
                        <div className="agreement-text">
                          <h4>Our Commitment to Your Privacy</h4>
                          <ul>
                            <li>All personal information is encrypted and securely stored</li>
                            <li>Your data is never shared with third parties</li>
                            <li>Complete discretion and confidentiality guaranteed</li>
                            <li>You can request data deletion at any time</li>
                          </ul>
                        </div>
                        <label className="checkbox-label">
                          <input type="checkbox" />
                          <span>I agree to the privacy policy and terms of service</span>
                        </label>
                      </div>
                      <div className="step-actions">
                        <button className="back-btn" onClick={() => setCurrentStep(2)}>
                          Back
                        </button>
                        <button className="submit-btn">
                          Complete Verification
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="verification-sidebar">
              <div className="security-features">
                <h3>Security Features</h3>
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div key={index} className="security-item">
                      <div className="security-icon">
                        <Icon size={24} />
                      </div>
                      <div>
                        <h4>{feature.title}</h4>
                        <p>{feature.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="support-box">
                <h4>Need Help?</h4>
                <p>Our support team is available 24/7 to assist with the verification process.</p>
                <button className="contact-btn">Contact Support</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default VerificationPage;
