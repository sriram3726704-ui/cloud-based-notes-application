# ☁️ CloudNotes - Cloud-Based Realtime Notes App

A clean, modern, beginner-friendly cloud notes application built with **HTML5, CSS3, Vanilla JavaScript, and Firebase Firestore**.

Notes are synchronized to Google Cloud Firestore in real time, persisting permanently across page reloads, browser sessions, and devices.

---

## ✨ Features

- 🔄 **Real-Time Cloud Synchronization**: Powered by Firebase Firestore `onSnapshot` listeners — updates reflect instantly across all open tabs and devices without needing a page refresh.
- 📝 **Full CRUD Support**: Create, read/view, inline edit, and delete notes effortlessly.
- 📌 **Pin to Top**: Keep critical thoughts, todo lists, and reminders prioritized.
- 🎨 **Color Coding**: Choose from soft visual accent themes (Coral, Amber, Emerald, Sky, Purple, and Default).
- 🏷️ **Categorization & Filters**: Organize notes into *General*, *Work*, *Personal*, *Ideas*, *Tasks*, and *Study* with live badge counts.
- 🔍 **Instant Search**: Real-time filtering across both note titles and content.
- 🌓 **Dark & Light Mode**: Fluid theme toggle with persistence in `localStorage` and system preference auto-detection.
- ⚡ **Zero-Build Architecture**: Uses modern ES Modules with the Firebase v10 CDN — no npm install, Webpack, or bundler required to run!
- 🛡️ **Instant Demo Mode**: Works immediately out-of-the-box in local storage mode if Firebase credentials are not yet configured.

---

## 🚀 Quick Start (Running Locally)

Because the app uses JavaScript ES Modules (`import/export`), it should be served via a local web server (or opened through VS Code Live Server).

### Option 1: Using Python (Already installed on your system)
Open your terminal in this folder and run:
```bash
python -m http.server 3000
```
Then open your browser at:
👉 **[http://localhost:3000](http://localhost:3000)**

### Option 2: Using Node.js `npx serve`
```bash
npx serve .
```

### Option 3: Using VS Code Live Server
Right-click on `index.html` in VS Code and select **"Open with Live Server"**.

---

## 🔥 Step-by-Step Guide: Connecting Firebase Firestore

Setting up Firebase is free and takes less than 5 minutes:

### 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Sign in with your Google account.
3. Click **"Add project"** (or **"Create a project"**).
4. Enter a name (e.g., `my-cloud-notes`), disable Google Analytics (optional for simplicity), and click **Create Project**.

### 2. Create the Firestore Database
1. In your Firebase Project overview, click **Build > Firestore Database** from the left-hand menu.
2. Click **Create database**.
3. Choose your database location (select one close to your region).
4. For security rules, select **Start in test mode** (allows read and write access for 30 days during development/learning).
5. Click **Enable**.

### 3. Register your Web App & Get Config
1. In the Project Overview page, click the **Web icon `</>`** (or go to **Project Settings** ⚙️ > **General** > scroll down to **Your apps** and click **Add app**).
2. Enter an app nickname (e.g., `CloudNotes Web`) and click **Register app**.
3. Firebase will display your `firebaseConfig` object snippet:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "my-cloud-notes.firebaseapp.com",
     projectId: "my-cloud-notes",
     storageBucket: "my-cloud-notes.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:abcdef"
   };
   ```

### 4. Connect Your Credentials to the App

You can connect your credentials using either of these simple methods:

#### Method A (Easiest — directly in the UI):
1. Open the app in your browser at `http://localhost:3000`.
2. Click the **Firebase Settings (gear icon ⚙️)** or the **"Connect Firebase"** banner at the top.
3. Paste the entire `firebaseConfig` snippet into the **"Paste Firebase Config"** box.
4. Click **Save & Connect**.
5. Your status indicator will instantly glow **green ("Cloud Synced")**!

#### Method B (Via Code):
Open [`firebase-config.js`](file:///c:/Users/Sriram/OneDrive/Desktop/cloud%20baesd%20notes%20app/firebase-config.js) in your editor and replace the placeholder values:
```javascript
export const firebaseConfig = {
  apiKey: "YOUR_COPIED_API_KEY",
  authDomain: "YOUR_COPIED_AUTH_DOMAIN",
  projectId: "YOUR_COPIED_PROJECT_ID",
  storageBucket: "YOUR_COPIED_STORAGE_BUCKET",
  messagingSenderId: "YOUR_COPIED_MESSAGING_SENDER_ID",
  appId: "YOUR_COPIED_APP_ID"
};
```
Save the file and refresh the page.

---

## 🔒 Firestore Security Rules Reference

When your 30-day test mode approaches expiration, you can maintain access by configuring rules in **Firestore Database > Rules**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /notes/{noteId} {
      // Allow read and write for the notes collection
      allow read, write: if true;
    }
  }
}
```

*(For production apps with user authentication, you can restrict read/write rules based on `request.auth.uid`)*.

---

## 📁 Project Structure

```
cloud-based-notes-app/
├── index.html           # Main semantic HTML structure & modals
├── style.css            # Modern responsive design system (light & dark)
├── app.js               # Firebase Firestore logic, CRUD, filters & events
├── firebase-config.js   # Firebase configuration credentials
└── README.md            # Step-by-step setup and user documentation
```

---

## 💡 Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom Variables, Glassmorphism, Responsive CSS Grid & Flexbox)
- **Logic**: Vanilla Modern JavaScript (ES Modules, Async/Await)
- **Backend & Cloud Database**: Google Firebase Cloud Firestore (SDK v10 Modular CDN)
