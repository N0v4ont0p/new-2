# 📸 Premium Photo Gallery

A beautiful, Apple-inspired photo gallery with permanent cloud storage, collection management, and admin panel.

## ✨ Features

### 🎨 Beautiful Gallery
- Modern, responsive Apple-style design
- Smooth animations and hover effects
- Mobile-friendly layout
- Professional photography showcase
- Enhanced glassmorphism and frosted glass effects

### 🔐 Secure Admin Panel
- Password-protected admin access (configurable)
- Drag & drop photo upload with HEIC support
- Easy photo management (delete/edit)
- Batch upload support (up to 10 files)
- Collection creation and management

### ☁️ PERMANENT STORAGE
- **Cloudinary integration** for permanent photo storage
- **Photos NEVER disappear** (even after server restarts)
- **Collections stored as Cloudinary folders** - truly permanent
- Global CDN for fast loading worldwide
- 25GB free storage (thousands of photos)
- Automatic fallback if cloud storage fails

### 📱 File Format Support
- **HEIC/HEIF support** - iPhone photos work perfectly
- JPG, JPEG, PNG, GIF, WebP, BMP, TIFF
- AVIF, SVG support
- Automatic HEIC to JPG conversion
- 10MB file size limit per photo

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Cloudinary account (free tier available)

### Environment Variables
Create a `.env` file with:

```env
# Cloudinary Configuration (Required)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Admin Configuration (Required)
ADMIN_PASSWORD=your_custom_admin_password

# Flask Configuration (Optional)
SECRET_KEY=your_secret_key_for_sessions
DATABASE_DIR=/tmp
```

### Local Development

1. **Clone and setup:**
```bash
cd photo-gallery
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Configure environment:**
   - Copy `.env.example` to `.env`
   - Add your Cloudinary credentials
   - Set your custom admin password

3. **Run the application:**
```bash
python src/main.py
```

4. **Access the gallery:**
   - Open http://localhost:5000
   - Click "Admin" and login with your password

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
| `ADMIN_PASSWORD` | Your custom admin password | ✅ |
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

### Admin Password
- Set `ADMIN_PASSWORD` environment variable
- Use a strong, unique password
- This password protects your admin panel

### File Upload Limits
- Maximum 10 files per upload
- 10MB per file limit
- Supports all major image formats including HEIC

## 📁 Project Structure

```
photo-gallery/
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
│       ├── styles.css       # Apple-inspired CSS with glassmorphism
│       └── script.js        # JavaScript functionality
├── requirements.txt         # Python dependencies
├── render.yaml             # Render.com configuration
└── README.md               # This file
```

## 🎨 Design Features

### Apple-Inspired Aesthetics
- Clean white backgrounds with subtle gradients
- SF Pro Display typography hierarchy
- Precise spacing using 8pt grid system
- Subtle shadows and rounded corners

### Enhanced Glassmorphism
- Frosted glass navigation bar
- Translucent cards and modals
- Backdrop blur effects
- Smooth animations and transitions

### Responsive Design
- Mobile-first approach
- Touch-friendly interactions
- Adaptive layouts for all screen sizes

## 🔒 Security Features

- Environment variable-based configuration
- Session-based authentication
- Secure file upload validation
- CORS protection
- Input sanitization

## 🚀 Performance

- Cloudinary CDN for global fast loading
- Lazy loading for images
- Optimized image delivery
- Progressive web app features

## 📱 Mobile Support

- Touch-friendly interface
- Responsive grid layouts
- Mobile-optimized upload experience
- Swipe gestures for navigation

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

**Admin login fails:**
- Verify `ADMIN_PASSWORD` environment variable
- Check for typos in password
- Clear browser cache

### Getting Help

1. Check the browser console for errors
2. Verify all environment variables are set
3. Test Cloudinary connection
4. Check server logs for detailed error messages

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️ using Flask, Cloudinary, and Apple-inspired design principles.**

