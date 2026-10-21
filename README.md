# Tony Mobile And Property Dealers — React website

Responsive React + Vite demo website for a property business in Jalandhar, Punjab.

## Features
- Responsive home page and property cards
- Search by title, type, location, and sale/rent status
- Category, purpose, and budget filters
- Price sorting
- Property detail views
- Save/favourite toggle (in-memory only)
- WhatsApp links with pre-filled inquiry messages
- Sample/demo labels on listings and images

## Important before going live
All listings, prices, sizes, addresses, and availability are sample data. Photos are illustrative and are not guaranteed to show the properties described. Replace the `properties` array in `src/main.jsx` with verified details and authorized photos. Replace `91XXXXXXXXXX` with the business WhatsApp number including country code, digits only. Add real contact information and any required privacy/legal details before publishing.

## Run locally
1. Install Node.js LTS from https://nodejs.org/
2. Extract this ZIP and open a terminal in the project folder.
3. Run `npm install`
4. Run `npm run dev`
5. Open the local URL printed by Vite, usually `http://localhost:5173`.

## Build for production
Run `npm run build`. The website is generated in `dist/`. Test with `npm run preview`.

## Deploy on Vercel
1. Upload the project to a GitHub repository.
2. Import the repository at https://vercel.com/
3. Build command: `npm run build`
4. Output directory: `dist`
5. Deploy.

## Deploy on Netlify
1. Import the GitHub repository at https://app.netlify.com/
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Deploy.

## Customize properties
Edit the `properties` array near the top of `src/main.jsx`. Keep numeric `price` and display `priceLabel` consistent because budget filters use `price`.

## Admin panel (demo)
- Click **Admin panel** in the website navigation.
- Demo password: `tony123` (for local testing only; do not use this for a public website).
- Add, edit, and delete listings. Data is saved to this browser's `localStorage`.
- The admin form currently accepts a photo URL; upload-based photo storage is not included.
- `localStorage` data is device/browser-specific and can be cleared. It does not sync to your father's phone or other computers. For a public production site, add real authentication and a shared database/backend (for example, Supabase or Firebase) before relying on it.
