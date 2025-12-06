## 🚀 Poly Chat: The Conversational Language Learning App

**Poly Chat** is a full-stack Progressive Web Application (PWA) that transforms language practice from a tedious task into an engaging, real-time conversation. It bridges the gap between study and fluency by enabling users to chat in any language they choose while providing powerful AI tools for translation, grammar correction, and structured practice, powered by modern Gemini models.

**Status: Beta (Actively Developed)**

---

## ✨ Key Features: Conversational Learning Pillars

Poly Chat is designed around three core pillars to make conversational learning effective and intuitive:

* **Private DM Chat:** Connect with other users by searching for their usernames and start a **one-on-one conversation** in your language of choice.
* **AI Tutor with Context Focus:** Practice solo with the Poly AI companion. Customize your session with specific **Grammar Focus** (e.g., Subjunctive Mood) and **Conversation Topics** (e.g., Ordering Food). This makes learning highly customized and effective.
* **Real-Time Correction & Vocabulary Notebook:** Receive **real-time grammar checks** and original text translation for messages sent in practice mode. Users can right-click any word to look up its definition and save it directly to their **Notebook** for later review.
* **Language Flexibility:** Supports chatting in **any language** available through the Gemini API (`gemini-2.5-flash`), with built-in translation assistance when composing messages in English.

---

## 🛠️ Installation & Local Development

This application is a learning and testing platform built using modern web standards and Firebase.

### Prerequisites

You must have the following installed on your local machine:

* **Git**
* **Node.js** (LTS version recommended)
* A **Firebase Project** for hosting, database, and Cloud Functions.
* **Firebase CLI** (Command Line Interface) installed and logged in.

### Setup Steps (Updated for Secure Proxy)

1.  **Clone the Repository:**

    ```bash
    git clone [https://github.com/amirhrafiei/poly-chat.git](https://github.com/amirhrafiei/poly-chat.git)
    cd poly-chat-app
    ```

2.  **Install Dependencies:**

    ```bash
    npm install
    ```

3.  **Configure Environment Variables & Secrets (CRITICAL SECURITY STEP):**
    This project uses a secure Firebase Cloud Function as an API proxy, meaning the Gemini API key is never exposed on the client.

    a. **Local Environment (`.env`):** Create a local file named `.env` in the project root and add your Firebase keys.

    ```
    VITE_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY_HERE
    # Note: GEMINI_API_KEY is NOT stored here anymore.
    ```

    b. **Firebase Function Secrets:** Set your Gemini API key as a secret on the Firebase project:

    ```bash
    firebase functions:secrets:set GEMINI_API_KEY
    # Enter your GEMINI_API_KEY when prompted.
    ```

4.  **Deploy Firebase Functions (API Proxy):**
    You must deploy the proxy function (`geminiProxy`) to get a public URL for the frontend.

    ```bash
    firebase deploy --only functions
    ```

5.  **Configure Frontend URL:**
    The deployment output will provide a unique URL (e.g., `https://geminiproxy-el6dny43aa-uc.a.run.app`). You **MUST** define this URL in your local environment file (`.env`).

    ```
    # Add your Cloud Function URL here:
    VITE_CLOUD_FUNCTION_URL="YOUR_UNIQUE_FUNCTION_URL_HERE"
    ```

6.  **Run the Application:**

    ```bash
    npm run dev
    ```

    The application will open in your browser, running locally on a `localhost` URL.

---

## 📖 Usage Guide

### Onboarding

The onboarding process is streamlined for student use:

* **Username Only:** Simply enter a **unique username** and select the **language you are learning**.

### Navigation

* Users navigate the app entirely through the **left sidebar (Navigation Bar)**. This is where you switch between the **Find User** screen, **Poly AI chat**, and your **Notebook**.

### Starting a Chat

1.  Click **Find User** in the navbar.
2.  Search for a partner's username using the search field.
3.  Click the user card to immediately initiate a new **Direct Message (DM) chat**.

---

## 🔒 Security

Security is enforced using strict Firebase Firestore Security Rules and a secure serverless architecture.

| Component | Security Mechanism | Access Control |
| :--- | :--- | :--- |
| **Gemini API Key** | Firebase Secrets and Cloud Functions Proxy | Key is stored securely on the server and is never exposed to the client's browser. |
| **DMs & AI History** | `chatId.includes(request.auth.uid)` | Only the two users whose IDs are contained within the chat room name can read or write messages. |
| **User Profiles (Write)** | `request.auth.uid == userId` | Users can only modify their own display name, photo, and language settings. |
| **Access** | `request.auth != null` | All application functions require a logged-in (authenticated) user. |