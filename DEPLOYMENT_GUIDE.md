# Photo Gallery - Apple-Inspired Design 🍎📸

## Overview
A beautiful, modern photo gallery with Apple-inspired design, featuring:
- ✨ Clean, minimalist Apple.com aesthetic
- 📁 Collection-based photo organization
- 🔐 Password-protected admin interface
- 📤 Drag & drop photo upload with Cloudinary integration
- 📱 Fully responsive design
- 🖼️ Photo preview with download/delete functionality

## Features Implemented

### ✅ Fixed Issues
- **Collection Creation**: Now works perfectly with admin interface
- **Photo Upload**: Drag & drop functionality with Cloudinary storage
- **Upload Feedback**: Visual drag states and progress indicators
- **Admin Interface**: Complete admin dashboard with password protection

### 🎨 Apple-Inspired Design
- Clean navigation with blur effects
- Gradient hero section
- Card-based layouts with hover animations
- Apple's color palette and typography
- Smooth transitions and micro-interactions
- Responsive design for all devices

### 🔧 Admin Features
- Password protection (Password: `Hanshow99@`)
- Create/delete collections
- Drag & drop photo upload
- Photo management (view/delete)
- Collection selection for uploads
- Real-time feedback and alerts

## Build & Start Commands

### For Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your Cloudinary credentials

# Start development server
cd src && python main.py
```

### For Production (Render.com)
```bash
# Build Command
pip install -r requirements.txt

# Start Command
cd src && gunicorn --bind 0.0.0.0:$PORT main:app
```

## Deployment on Render.com

### 1. Environment Variables Required
Set these in your Render dashboard:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
ADMIN_PASSWORD=Hanshow99@
SECRET_KEY=your_secret_key_here
```

### 2. Deployment Steps
1. **Upload to GitHub**: Push this code to your GitHub repository
2. **Create Render Service**: 
   - Go to Render.com dashboard
   - Click "New" → "Web Service"
   - Connect your GitHub repository
3. **Configure Service**:
   - **Runtime**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `cd src && gunicorn --bind 0.0.0.0:$PORT main:app`
   - **Plan**: Free (or paid for better performance)
4. **Set Environment Variables**: Add all required env vars in Render dashboard
5. **Deploy**: Click "Create Web Service"

### 3. Cloudinary Setup
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Get your credentials from the dashboard
3. Add them to Render environment variables

## File Structure
```
photo-gallery/
├── src/
│   ├── main.py              # Flask application
│   ├── static/
│   │   ├── index.html       # Main HTML file
│   │   ├── styles.css       # Apple-inspired CSS
│   │   └── script.js        # Frontend JavaScript
│   └── collections/         # Local collections (for development)
├── requirements.txt         # Python dependencies
├── render.yaml             # Render deployment config
├── .env                    # Environment variables
└── DEPLOYMENT_GUIDE.md     # This file
```

## Usage

### Public Gallery
- Browse collections on the homepage
- Click collections to view photos
- Click photos to open preview modal
- Download photos using the download button

### Admin Interface
1. Navigate to `/#admin` or click "Admin" in navigation
2. Enter password: `Hanshow99@`
3. **Create Collections**: Click "+ Create Collection"
4. **Upload Photos**: 
   - Select a collection from dropdown
   - Drag & drop files or click to select
   - Photos are uploaded to Cloudinary automatically
5. **Manage Photos**: View, download, or delete photos
6. **Delete Collections**: Use delete button on collection cards

## Technical Details

### Backend (Flask)
- **Framework**: Flask with CORS enabled
- **Storage**: Cloudinary for photos, JSON files for metadata
- **Authentication**: Simple password-based admin access
- **API Endpoints**: RESTful API for collections and photos

### Frontend (Vanilla JS)
- **Design**: Apple-inspired with CSS custom properties
- **Interactions**: Smooth animations and hover effects
- **Responsive**: Mobile-first design approach
- **Upload**: Drag & drop with visual feedback

### Deployment
- **Platform**: Render.com (free tier compatible)
- **Server**: Gunicorn WSGI server
- **Storage**: Cloudinary for persistent photo storage
- **Config**: Environment variables for sensitive data

## Troubleshooting

### Common Issues
1. **Photos not loading**: Check Cloudinary credentials
2. **Upload failing**: Verify collection is selected and Cloudinary is configured
3. **Admin not accessible**: Ensure password is correct (`Hanshow99@`)
4. **502 errors**: Check Render logs, usually environment variable issues

### Development Tips
- Use local development server for testing: `python src/main.py`
- Check browser console for JavaScript errors
- Verify API endpoints are responding correctly
- Test drag & drop functionality thoroughly

## Performance Notes
- Photos are served via Cloudinary CDN for fast loading
- Responsive images with proper aspect ratios
- Lazy loading for better performance
- Optimized CSS with minimal dependencies

---

**Ready for deployment!** 🚀 Just upload to GitHub and deploy on Render.com with the provided configuration.

