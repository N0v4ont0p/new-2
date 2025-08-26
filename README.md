# 📸 Photo Gallery

A clean, Apple-inspired photo gallery with permanent cloud storage and admin panel.

## ✨ Features

### 🎨 Beautiful Gallery
- Clean Apple-style design with minimal animations
- Responsive layout for all devices
- Professional photo showcase
- Collection-based organization

### 🔐 Secure Admin Panel
- Cookie-based authentication (remembers login)
- Password-protected admin access
- Drag & drop photo upload with HEIC support
- Collection management
- Batch upload support (up to 10 files)

### ☁️ PERMANENT STORAGE
- **Cloudinary integration** for permanent photo storage
- **Photos NEVER disappear** (even after server restarts)
- **Collections stored as Cloudinary folders**
- Global CDN for fast loading worldwide
- 25GB free storage (thousands of photos)

### 📱 File Format Support
- **HEIC/HEIF support** - iPhone photos work perfectly
- JPG, JPEG, PNG, GIF, WebP, BMP, TIFF, AVIF
- Automatic HEIC to JPG conversion
- 10MB file size limit per photo

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Cloudinary account (free tier available)

### Environment Variables
Set these in your deployment environment:

```env
# Cloudinary Configuration (Required)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Flask Configuration (Optional)
SECRET_KEY=your_secret_key_for_sessions
DATABASE_DIR=/tmp
```

### Local Development

1. **Setup:**
```bash
cd photo-gallery-v2
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Configure environment:**
   - Add your Cloudinary credentials to `.env`

3. **Run:**
```bash
python src/main.py
```

4. **Access:**
   - Open http://localhost:5000
   - Click "Admin" to access admin panel

## 🌐 Deployment on Render.com

### Step 1: Prepare Repository
1. Push your code to GitHub
2. Ensure all files are committed

### Step 2: Create Render Service
1. Go to [Render.com](https://render.com)
2. Connect your GitHub repository
3. Choose "Web Service"

### Step 3: Configure Build Settings
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `python src/main.py`
- **Environment:** Python

### Step 4: Set Environment Variables
In Render dashboard, add these environment variables:

| Variable | Value | Required |
|----------|-------|----------|
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name | ✅ |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key | ✅ |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret | ✅ |
| `SECRET_KEY` | Random secret for sessions | ⚠️ |

### Step 5: Deploy
1. Click "Create Web Service"
2. Wait for deployment (2-5 minutes)
3. Access your live gallery!

## 🔧 Configuration

### Cloudinary Setup
1. Create free account at [cloudinary.com](https://cloudinary.com)
2. Get your credentials from the dashboard
3. Add them to your environment variables

### Admin Access
- Admin authentication is cookie-based
- Login persists for 30 days
- Secure session management

### File Upload Limits
- Maximum 10 files per upload
- 10MB per file limit
- Supports all major image formats including HEIC

## 📁 Project Structure

```
photo-gallery-v2/
├── src/
│   ├── main.py              # Flask application entry point
│   ├── models/
│   │   └── photo.py         # Database models and Cloudinary manager
│   ├── routes/
│   │   ├── auth.py          # Authentication routes
│   │   ├── photos.py        # Photo management routes
│   │   └── collections.py   # Collection management routes
│   └── static/
│       ├── index.html       # Main HTML template
│       ├── styles.css       # Clean Apple-inspired CSS
│       └── script.js        # JavaScript functionality
├── requirements.txt         # Python dependencies
├── render.yaml             # Render.com configuration
└── README.md               # This file
```

## 🎨 Design Features

### Apple-Inspired Aesthetics
- Clean white backgrounds
- Subtle shadows and rounded corners
- Professional typography hierarchy
- Minimal animations (only on hover)

### Responsive Design
- Mobile-first approach
- Touch-friendly interactions
- Adaptive layouts for all screen sizes

## 🔒 Security Features

- Cookie-based session management
- Secure file upload validation
- CORS protection
- Input sanitization

## 🚀 Performance

- Cloudinary CDN for global fast loading
- Lazy loading for images
- Optimized image delivery
- Clean, efficient code

## 📱 Mobile Support

- Touch-friendly interface
- Responsive grid layouts
- Mobile-optimized upload experience

## 🛠️ Troubleshooting

### Common Issues

**Upload fails:**
- Check Cloudinary credentials
- Verify file format is supported
- Ensure file size is under 10MB

**Collections not showing:**
- Verify Cloudinary connection
- Check browser console for errors
- Refresh the page

**Admin login issues:**
- Clear browser cache and cookies
- Check for JavaScript errors
- Verify admin password

### Getting Help

1. Check the browser console for errors
2. Verify all environment variables are set
3. Test Cloudinary connection
4. Check server logs for detailed error messages

## 📄 License

This project is open source and available under the MIT License.

---

**Built with ❤️ using Flask, Cloudinary, and Apple-inspired design principles.**

