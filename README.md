Poly Chat: The Conversational Language Learning App

Poly Chat is a full-stack Progressive Web Application that transforms language practice from a tedious task into an engaging, real-time conversation. It bridges the gap between study and fluency by enabling users to chat in any language they choose while providing powerful AI tools for translation, grammar correction, and structured practice.

Status: Beta (Actively Developed)

Key Features

Poly Chat is designed around three core pillars of conversational learning:

Private DM Chat: Connect with other users by searching for their usernames and start a one-on-one conversation in your language of choice.

AI Tutor with Context Focus: Practice solo with the Poly AI companion, customizing your session with specific Grammar Focus (e.g., Subjunctive Mood) and Conversation Topics (e.g., Ordering Food). This makes learning highly customized and effective.

Real-Time Correction & Vocabulary Notebook: Receive real-time grammar checks and original text translation for messages sent in practice mode. Users can right-click any word to look up its definition and save it directly to their Notebook for later review.

Language Flexibility: Supports chatting in any language available through the Gemini API, with built-in translation assistance when composing messages in English.

Installation & Local Development

This application is a learning and testing platform built using modern web standards and Firebase.

Prerequisites

You must have the following installed on your local machine:

Git

Node.js (LTS version recommended)

A Firebase Project for hosting and database access.

Setup Steps

Clone the Repository:

git clone [https://github.com/amirhrafiei/poly-chat.git](https://github.com/YOUR-USERNAME/poly-chat.git)
cd poly-chat-app



Install Dependencies:

npm install



Configure Environment Variables (CRITICAL SECURITY STEP):
Before running, create a local file named .env in the project root and add your secret keys. Never commit the .env file to GitHub.

VITE_FIREBASE_API_KEY (for Firestore and Auth)

VITE_GEMINI_API_KEY (for AI services)

Run the Application:

npm run dev



The application will open in your browser, running locally on a localhost URL.

Usage Guide

Onboarding

Username Only: The onboarding process is streamlined for student use. Simply enter a unique username and select the language you are learning.

Navigation

Users navigate the app entirely through the left sidebar (Navigation Bar). This is where you switch between the Find User screen, Poly AI chat, and your Notebook.

Starting a Chat

Click Find User in the navbar.

Search for a partner's username using the search field.

Click the user card to immediately initiate a new Direct Message (DM) chat.

Security

Security is enforced using strict Firebase Firestore Security Rules to ensure private chats remain private.

Data Type

Security Rule

Access Control

DMs & AI History

chatId.includes(request.auth.uid)

Only the two users whose IDs are contained within the chat room name can read or write messages.

User Profiles (Write)

request.auth.uid == userId

Users can only modify their own display name, photo, and language settings.

Access

request.auth != null

All application functions require a logged-in (authenticated) user.