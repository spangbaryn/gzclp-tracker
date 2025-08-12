# GZCLP Workout Tracker

A modern Progressive Web App (PWA) for tracking GZCLP (GZCL Linear Progression) workouts with database persistence.

## Features

- **Dark, minimalist UI** - Matches your original design exactly
- **Database persistence** - All workout data is saved to SQLite database
- **Progressive Web App** - Works offline and can be installed on mobile devices
- **Workout tracking** - Track sets, reps, and AMRAP sets
- **Automatic progression** - Handles weight increases and stage progressions
- **History tracking** - View all past workouts
- **Progress overview** - See current weights and progression stages
- **Settings management** - Configure units (lbs/kg) and starting weights

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling (customized to match your dark theme)
- **Prisma** - Database ORM with SQLite
- **PWA** - Service worker for offline support

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run database migrations:
```bash
npx prisma db push
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Usage

1. **Initial Setup**: Go to Settings and enter your starting weights (85% of your 5RM)
2. **Workout**: The app tracks your current workout (A1 → B1 → A2 → B2)
3. **Complete Sets**: Tap on each set to mark it complete
4. **AMRAP Sets**: For the last set, enter the actual reps completed
5. **Progress**: The app automatically handles progression based on GZCLP rules

## Database

The app uses SQLite for data persistence. All workout data, settings, and progression tracking is stored locally.

To view the database:
```bash
npx prisma studio
```

## Building for Production

```bash
npm run build
npm start
```

## PWA Installation

On mobile devices:
- **iOS**: Open in Safari → Share → Add to Home Screen
- **Android**: Chrome will prompt to install, or use menu → Add to Home Screen

The app works offline once installed!!
