🌟 Main Features
Easy Upload: Drag and drop or click to upload two images

Compare Images: Shows how similar the two images are

Highlight Differences: Red marks show where the changes are

Get Details: See color, shape, and position differences

Works on Any Device: Mobile-friendly and fast

🔧 Tech Used
Frontend: React (with TypeScript), Tailwind CSS, Vite

Backend: Node.js, Express.js

Image Tools: Sharp, Pixelmatch, Multer for upload

✅ What You Need
Node.js (v16+)

npm or yarn

At least 2GB RAM

Any modern browser (Chrome, Firefox, etc.)

🚀 How to Start
1. Clone the project

git clone <repository-url>
cd image-comparison-app
 
2. Install all packages

npm install
cd server
npm install
cd ..
3. Run the app

npm run dev
Frontend will run at http://localhost:5173

Backend runs at http://localhost:3001

🖼️ How It Works
Upload two images

The app checks if they are valid (max 10MB)

It compares them pixel by pixel

It creates a new image showing the differences

You get a summary with:

Similarity score (like 85% similar)

Image details (size, format, etc.)

List of color or design changes

🧪 Example Use Cases
Comparing design updates

Checking UI layout changes

Doing quality control for images

Detecting small differences quickly

🔐 Safety & Limits
Only images allowed (JPEG, PNG, etc.)

Max file size: 10MB

Temporary file storage (not permanent)

Unique filenames to avoid overwriting

🛠 Common Problems
Upload error?
→ Make sure you selected 2 valid image files under 10MB.

App not loading?
→ Check if both frontend and backend are running.

Port error?

lsof -ti:3001 | xargs kill -9  # free the port
📦 Deploying
To build and run in production:

npm run build
cd server
npm start
Create a .env file:


PORT=3001
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
🤝 Contributing
Want to help improve the app?

Fork the repo

Create a new branch: git checkout -b my-feature

Make changes and commit

Push and open a pull request

🙏 Thanks To
Pixelmatch for image diffing

Sharp for image editing

React and Express communities

Tailwind CSS for clean UI

# Project
