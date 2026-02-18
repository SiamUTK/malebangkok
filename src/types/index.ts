export interface Staff {
  id: string;
  name: string;
  age: number;
  image: string;
  specialties: string[];
  languages: string[];
  experience: number;
  rating: number;
  verified: boolean;
  bio: string;
  certifications: string[];
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  category: 'massage' | 'tour' | 'wellness';
}

export interface VerificationStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}
