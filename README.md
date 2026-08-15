# Wanderlust

Wanderlust is a full-stack web application designed for booking vacation rentals, apartments, and unique homes, similar to Airbnb. 

## Features
- View, create, edit, and delete listings.
- Upload images to Cloudinary.
- Leave reviews and ratings on listings.
- User authentication and authorization.
- Geocoding and map display.
- Responsive design.

## Prerequisites

Before running the app, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [MongoDB](https://www.mongodb.com/) (Local or Atlas)
- A [Cloudinary](https://cloudinary.com/) account for image uploads.

## Environment Variables

Copy the `.env.example` file to `.env` and fill in your values. Do not commit `.env` to version control.

```bash
cp .env.example .env
```

Required variables:
- `MONGO_URL`: Your MongoDB connection string (e.g. `mongodb+srv://...` or `mongodb://127.0.0.1:27017/wanderlust`)
- `SESSION_SECRET`: A secure random string for encrypting session cookies.
- `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name.
- `CLOUDINARY_KEY`: Your Cloudinary API key.
- `CLOUDINARY_SECRET`: Your Cloudinary API secret.
- `PORT`: (Optional) The port your app runs on. Defaults to 8080.

## Installation

Install dependencies:
```bash
npm install
```

## Running the Application

### Development
Start the application locally:
```bash
npm start
```
The application will run on `http://localhost:8080` (or whatever `PORT` you configured).

## Deployment

This application is ready to be deployed on platforms like Render, Railway, or Heroku.

**General Deployment Steps:**
1. Connect your GitHub repository to your hosting platform.
2. Set the Environment Variables (`MONGO_URL`, `SESSION_SECRET`, `CLOUDINARY_*`) in the platform's configuration panel.
3. The platform will automatically install dependencies using `npm install`.
4. Set the Start Command to: `npm start` (or `node app.js`).
5. Ensure your MongoDB cluster accepts connections from your platform's IP addresses (set to `0.0.0.0/0` in MongoDB Atlas for universal access if required).
