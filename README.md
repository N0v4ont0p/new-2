# 📸 George's Photo Gallery

A premium photo gallery website with Apple-inspired design, Cloudinary integration for permanent storage, and a secure admin panel. Built for deployment on Render.com.

## ✨ Features

### 🎨 Beautiful Gallery
- **Modern, responsive design** with Apple-inspired aesthetics
- **Smooth animations** and hover effects
- **Mobile-friendly layout** that works on all devices
- **Professional photography showcase** with clean grid layouts

### 🔐 Secure Admin Panel
- **Password-protected admin access** (Password: `Hanshow99@`)
- **Drag & drop photo upload** with metadata support
- **Easy photo management** (delete/edit collections)
- **Batch upload support** for multiple photos at once
- **Collection management** with create/delete functionality
- **Bulk operations** for efficient photo organization

### ☁️ PERMANENT STORAGE
- **Cloudinary integration** for permanent photo storage
- **Photos NEVER disappear** (even after server restarts)
- **Global CDN** for fast loading worldwide
- **25GB free storage** (thousands of photos)
- **Automatic fallback** if cloud storage fails
- **Database persistence** for all metadata and collections

## 🚀 Deployment on Render.com

### Prerequisites
1. **Cloudinary Account**: Sign up at [cloudinary.com](https://cloudinary.com) for free
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **GitHub Repository**: Push this code to your GitHub repository

### Step 1: Get Cloudinary Credentials
1. Log in to your Cloudinary dashboard
2. Copy your **Cloud Name**, **API Key**, and **API Secret**
3. Keep these credentials handy for the next step

### Step 2: Deploy to Render
1. **Connect Repository**:
   - Go to [render.com](https://render.com) and log in
   - Click "New +" → "Web Service"
   - Connect your GitHub repository containing this code

2. **Configure Service**:
   - **Name**: `georges-photo-gallery` (or your preferred name)
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python src/main.py`
   - **Plan**: Free (or paid for better performance)

3. **Set Environment Variables**:
   Add these environment variables in Render's dashboard:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name_here
   CLOUDINARY_API_KEY=your_api_key_here
   CLOUDINARY_API_SECRET=your_api_secret_here
   ADMIN_PASSWORD=Hanshow99@
   SECRET_KEY=your_secret_key_here
   FLASK_ENV=production
   ```

4. **Deploy**:
   - Click "Create Web Service"
   - Wait for deployment to complete (usually 2-5 minutes)
   - Your gallery will be available at `https://your-service-name.onrender.com`

### Step 3: Test Your Deployment
1. Visit your deployed URL
2. Test the public gallery (should show empty initially)
3. Click "Admin" and log in with password: `Hanshow99@`
4. Create a test collection
5. Upload a test photo to verify Cloudinary integration

## 📱 Usage Guide

### For Visitors (Public Gallery)
1. **Browse Collections**: View organized photo collections on the main page
2. **View Photos**: Click any collection to see photos within it
3. **Photo Preview**: Click individual photos to open in full-screen modal
4. **Download Photos**: Use the download button in photo preview
5. **Navigation**: Use the back button to return to main gallery

### For Admin (George)
1. **Access Admin Panel**: Click "Admin" button and enter password
2. **Upload Photos**:
   - Drag and drop photos onto the upload area, or click to select files
   - Add titles and descriptions for each photo
   - Assign photos to collections (optional)
   - Click "Upload Photos" to save to Cloudinary

3. **Manage Collections**:
   - Enter collection name and click "Add Collection"
   - Delete collections using the red "Delete" button
   - Photos remain when collections are deleted

4. **Manage Photos**:
   - View all uploaded photos with thumbnails
   - Change photo collections using dropdown menus
   - Delete individual photos with "Delete" button
   - Use bulk operations:
     - Select multiple photos with checkboxes
     - Assign selected photos to a collection
     - Delete multiple photos at once

## 🛠️ Technical Details

### Architecture
- **Backend**: Flask (Python) with SQLAlchemy ORM
- **Frontend**: Vanilla HTML/CSS/JavaScript with Apple-inspired design
- **Database**: SQLite (development) / PostgreSQL (production recommended)
- **Storage**: Cloudinary for photos, database for metadata
- **Hosting**: Render.com web service

### Key Technologies
- **Flask-CORS**: Cross-origin resource sharing
- **Cloudinary**: Cloud-based image management
- **SQLAlchemy**: Database ORM for persistent storage
- **Inter Font**: Modern typography matching Apple's design language

### Security Features
- Password-protected admin panel
- Session-based authentication
- CORS configuration for secure API access
- Environment variable configuration for sensitive data

## 🎨 Design Philosophy

This gallery embodies **Apple's design principles**:
- **Sleek minimalism** with generous white space
- **Smooth animations** and elegant transitions
- **Bold visual hierarchy** with clean typography
- **Intuitive navigation** with consistent interactions
- **Premium feel** through glassmorphism effects
- **Mobile-first responsive design**

## 📊 Storage & Performance

### Cloudinary Benefits
- **25GB free storage** (upgradeable)
- **Global CDN** for fast worldwide access
- **Automatic optimization** for different devices
- **Permanent storage** that survives server restarts
- **Professional image management** with transformations

### Performance Features
- **Lazy loading** for images
- **Responsive images** for different screen sizes
- **Efficient database queries** with proper indexing
- **Caching strategies** for optimal loading times

## 🔧 Maintenance

### Regular Tasks
- Monitor Cloudinary usage in dashboard
- Backup database periodically (if using paid hosting)
- Update dependencies as needed
- Monitor server performance in Render dashboard

### Troubleshooting
- **Photos not uploading**: Check Cloudinary credentials
- **Admin login fails**: Verify ADMIN_PASSWORD environment variable
- **Collections not saving**: Ensure database is properly configured
- **Slow loading**: Consider upgrading to paid Render plan

## 📞 Support

For technical issues or questions:
1. Check Render deployment logs
2. Verify Cloudinary dashboard for upload issues
3. Ensure all environment variables are set correctly
4. Test locally first if issues persist

---

**Built with ❤️ for George's photography collection**

*Featuring Apple-inspired design, permanent cloud storage, and professional photo management capabilities.*

