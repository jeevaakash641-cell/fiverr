# AI-Bharat - Educational Platform

A full-stack educational platform with AI-powered features for Indian students and teachers.

## ✨ Features
- AI-powered chatbot and quizzes (AWS Bedrock)
- Video lectures upload and playback (AWS S3)
- Book management - PDF upload/download (AWS S3)
- User activity tracking (AWS DynamoDB)
- Focus and health tracking
- Multi-state curriculum support (CBSE, State Boards)
- Regional language support (Hindi, Tamil, Telugu, etc.)
- Interactive visualizations
- Career reality simulator

## 🚀 Quick Start

### Local Development

#### 1. Install Dependencies
```bash
# Frontend
npm install

# Backend
cd backend
npm install
cd ..
```

#### 2. Configure Environment Variables

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:3001
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**Backend (backend/.env):**
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
S3_BUCKET_NAME=your_bucket_name
DYNAMODB_TABLE_USER_HISTORY=UserHistory
PORT=3001
FRONTEND_URL=http://localhost:5173
```

See `.env.example` files for complete configuration.

#### 3. Run Application
```bash
# Option 1: Use batch file (Windows)
# Double-click START_APP.bat

# Option 2: Run manually
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
npm run dev
```

#### 4. Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

---

## 🌐 Deployment

### Deploy to Production

Your project is ready for deployment! Follow these guides:

1. **[DEPLOYMENT_READY.md](DEPLOYMENT_READY.md)** - Configuration summary
2. **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete deployment guide
3. **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Step-by-step checklist
4. **[QUICK_DEPLOY.md](QUICK_DEPLOY.md)** - Quick reference

### Recommended Platforms
- **Frontend**: Vercel (free tier available)
- **Backend**: Render (free tier available)

### Quick Deploy Steps
```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/ai-bharat-platform.git
git push -u origin main

# 2. Deploy Frontend on Vercel
# - Import from GitHub
# - Add environment variables
# - Deploy

# 3. Deploy Backend on Render
# - Create Web Service
# - Connect GitHub
# - Add environment variables
# - Deploy

# 4. Verify Deployment
node verify-deployment.js <frontend-url> <backend-url>
```

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions.

---

## 🛠️ Tech Stack

### Frontend
- React 18.2.0 + Vite 4.2.0
- React Router 6.8.0
- Lucide React (icons)
- Firebase Authentication
- Axios for API calls

### Backend
- Node.js + Express 4.18.2
- AWS SDK v3 (Bedrock, S3, DynamoDB, Translate)
- Multer for file uploads
- CORS enabled

### AWS Services
- **Bedrock**: AI models (Claude, Gemma)
- **S3**: File storage (videos, books)
- **DynamoDB**: User data and activity tracking
- **Translate**: Multi-language support
- **Comprehend**: Sentiment analysis

### Authentication
- Firebase Authentication (Email/Password + Google)

---

## 📚 Documentation

- **[PROJECT_EXPLANATION.md](PROJECT_EXPLANATION.md)** - Complete project documentation
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Deployment instructions
- **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** - Deployment verification
- **[FIREBASE_FILES_LOCATION.md](FIREBASE_FILES_LOCATION.md)** - Firebase setup guide

---

## 🔧 Requirements

### Development
- Node.js 16+
- npm or yarn
- Git

### Production
- AWS Account (Bedrock, S3, DynamoDB access)
- Firebase Project (Authentication)
- Vercel Account (Frontend hosting)
- Render Account (Backend hosting)

---

## 🎯 Key Features

### For Students
- AI-powered learning assistant
- Interactive quizzes with instant feedback
- Video lectures by subject and class
- Digital library with PDF books
- Interactive visualizations (Math, Science)
- Focus and health tracking
- Career exploration simulator
- Multi-language support

### For Teachers
- Upload video lectures
- Upload textbooks (PDFs)
- AI-powered teaching assistant
- Content management by state/class/subject

### For Admins
- User management
- Content moderation
- Platform analytics

---

## 🔐 Security

- ✅ HTTPS enforced (automatic on Vercel/Render)
- ✅ Environment variables for secrets
- ✅ Firebase Authentication
- ✅ CORS properly configured
- ✅ AWS IAM for service access
- ✅ No credentials in code

---

## 📊 Project Statistics

- 50+ React components
- 30+ API endpoints
- 20+ service modules
- 15+ subjects covered
- 10+ Indian languages supported
- Classes 1-12 curriculum

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

---

## 👨‍💻 Author

**Jeeva Akash**

---

## 🙏 Acknowledgments

- AWS for Bedrock AI services
- Firebase for authentication
- Vercel and Render for hosting
- Open source community

---

**Made with ❤️ for Indian Education** 🇮🇳


