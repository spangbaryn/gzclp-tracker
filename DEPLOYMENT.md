# Deployment Guide for GZCLP Tracker

## Deploying to Vercel (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account
2. Click "New Project"
3. Import your `spangbaryn/soulspang` repository
4. Select the `gzclp-tracker` directory as the root directory
5. Add your environment variable:
   - Name: `DATABASE_URL`
   - Value: Your Prisma Accelerate connection string
6. Click "Deploy"

Your app will be live at a URL like: `https://your-app.vercel.app`

## Deploying to Netlify (Alternative)

1. Go to [netlify.com](https://netlify.com) and sign in with GitHub
2. Click "New site from Git"
3. Choose your repository
4. Set build settings:
   - Base directory: `index.html/gzclp-tracker`
   - Build command: `npm run build`
   - Publish directory: `.next`
5. Add environment variable for `DATABASE_URL`
6. Deploy

## Why Not GitHub Pages?

GitHub Pages only hosts static HTML/CSS/JS files. Your Next.js app needs:
- Server-side rendering
- API routes for database operations
- Node.js runtime for Prisma

These features require a Node.js hosting platform, not a static file host.