# Turf Booking Management System

A full-stack turf booking app built with React.js, Firebase, and Razorpay.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
Copy `.env.example` to `.env` and fill in your keys:
```
cp .env.example .env
```

### 3. Set Up Firebase
- Create project at https://console.firebase.google.com
- Enable Authentication > Email/Password
- Set up Firestore Database
- Copy config keys into `.env`

### 4. Set Up Razorpay
- Create account at https://razorpay.com
- Get test Key ID from Settings > API Keys
- Add to `.env` as `VITE_RAZORPAY_KEY_ID`

### 5. Run the App
```bash
npm run dev
```

## Features
- Firebase Authentication (Email/Password)
- Browse & search turfs
- Time slot booking with date picker
- Razorpay payment integration (demo)
- Wallet system with top-up, deduction, refunds
- Booking history with cancellation
- Available Players feature
- Star rating & review system
- Fully responsive UI

## Tech Stack
- **Frontend:** React 18, React Router 6, Vite
- **Auth & Database:** Firebase (Authentication + Firestore)
- **Payments:** Razorpay (test mode)
- **Styling:** Custom CSS (no UI library dependency)
