# Bangkok Elite - Premium Male Wellness & Lifestyle Services

Premium React web application for a professional male massage therapy and tour guide service in Bangkok. Features verified staff profiles, identity verification flow, and a high-end user interface.

## Features

- 🏠 **Premium Home Page** - Hero section with gradient animations and feature highlights
- 👥 **Staff Profiles** - Verified professional profiles with certifications, specialties, and ratings
- 🔐 **Identity Verification** - Multi-step verification process for client safety and privacy
- 💼 **Service Catalog** - Comprehensive massage therapy, tour services, and wellness packages
- 📅 **Booking System** - Integrated appointment booking with date/time selection
- 🎨 **Premium Design** - Black/gold color scheme with smooth animations and responsive layout

## Tech Stack

- **React 19** with TypeScript for type-safe components
- **Vite** for fast development and optimized builds
- **React Router** for client-side routing
- **Lucide React** for premium iconography
- **Custom CSS** with premium design system

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository
```bash
git clone https://github.com/SiamUTK/malebangkok.git
cd malebangkok
```

2. Install dependencies
```bash
npm install
```

3. Start development server
```bash
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/        # Reusable components (Navigation)
├── pages/            # Page components
│   ├── Home.tsx      # Landing page
│   ├── StaffPage.tsx # Staff profiles
│   ├── VerificationPage.tsx # Identity verification
│   ├── ServicesPage.tsx     # Service catalog
│   ├── BookingPage.tsx      # Booking system
│   └── AboutPage.tsx        # About page
├── types/            # TypeScript type definitions
└── index.css         # Global styles with design system
```

## Design System

- **Primary Color**: Black (#0a0a0a)
- **Accent Color**: Gold (#d4af37)
- **Typography**: Inter font family
- **Responsive**: Mobile-first approach with breakpoints at 768px and 1024px

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
