import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  where,
  limit,
  deleteDoc
} from 'firebase/firestore';
import { 
  Send, Loader2, Menu, X, Mic, Volume2, GraduationCap, 
  ArrowRight, CheckCircle2, AlertCircle, Users, Sparkles, 
  BadgeCheck, Book, Star, Trash2, RefreshCw
} from 'lucide-react';

/* ==========================================
  CUSTOM ICONS & UTILS
  ==========================================
*/
const PolyLogo = ({ className, style }) => (
  <svg viewBox="0 0 100 100" className={className} style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="6" fill="none" />
    <text x="50" y="72" fontSize="55" textAnchor="middle" fill="currentColor" fontFamily="sans-serif" fontWeight="900">P</text>
  </svg>
);

const getAvatarColor = (name) => {
  const colors = ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff'];
  let hash = 0;
  if (!name) return colors[0];
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const Avatar = ({ url, name, size = 40, className = '' }) => {
  if (url) {
    return <img src={url} alt={name} className={`avatar-img ${className}`} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  }
  return (
    <div className={`avatar-placeholder ${className}`} style={{ width: size, height: size, borderRadius: '50%', background: getAvatarColor(name), color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: size * 0.4 }}>
      {name ? name[0].toUpperCase() : '?'}
    </div>
  );
};

/* ==========================================
  FIREBASE CONFIGURATION
  ==========================================
*/
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: "poly-ch.firebasestorage.app",
  messagingSenderId: "903667685982",
  appId: "1:903667685982:web:18d709a19d18f9c5fcf2cf"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'poly-local-dev';

/* ==========================================
  CONSTANTS & UTILS
  ==========================================
*/
const LANGUAGES = [
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'es-ES', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'French', flag: '🇫🇷' },
  { code: 'de-DE', name: 'German', flag: '🇩🇪' },
  { code: 'ja-JP', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko-KR', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh-CN', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ru-RU', name: 'Russian', flag: '🇷🇺' },
  { code: 'it-IT', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt-BR', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'hi-IN', name: 'Hindi', flag: '🇮🇳' },
];

const CLOUD_FUNCTION_BASE_URL = import.meta.env.VITE_CLOUD_FUNCTION_BASE_URL;

/* --- API FUNCTIONS --- */
const translateText = async (text, targetLang) => {
  if (!text || !text.trim() || targetLang === 'English') return { translated: text, error: null };
  try {
    const response = await fetch(CLOUD_FUNCTION_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({action: 'translate', text, targetLang })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return { translated: data.translatedText || text, error: data.error || null };
  } catch (error) { 
    console.error("Translation API Error:", error);
    return { translated: text, error: "Translation service failed." };
  }
};

const explainText = async (text) => {
  if (!text || !text.trim()) return { result: '', error: null };
  try {
    const response = await fetch(CLOUD_FUNCTION_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'explain', text })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return { result: data.definition || "No definition found.", error: data.error || null };
  } catch (error) { 
    console.error("Definition API Error:", error);
    return { result: "Could not load definition.", error: "Definition service failed." };
  }
};

const checkGrammar = async (text, lang) => {
  try {
    const response = await fetch(CLOUD_FUNCTION_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'checkGrammar', text, lang })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return { 
        hasError: data.hasError || false, 
        correction: data.correction || "", 
        reason: data.reason || "", 
        error: data.error || null 
    };
  } catch (err) { 
    console.error("Grammar Check API Error:", err);
    return { hasError: false, error: "Grammar check failed." }; 
  }
};

const generateAIResponse = async (userText, userName, lang, context) => {
    try {
        const response = await fetch(CLOUD_FUNCTION_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({action: 'generateAIResponse', userText, userName, lang, context })
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return { response: data.response, error: data.error || null };
    } catch (err) { 
        console.error("AI Response API Error:", err);
        return { response: null, error: "AI failed to generate response." }; 
    }
};

const playGeminiTTS = async (text, langCode) => {
  const u = new SpeechSynthesisUtterance(text); 
  u.lang = langCode; 
  window.speechSynthesis.speak(u);
};

const createDmNotification = async (senderUid, recipientUid) => {
  if (senderUid === recipientUid) return;
  try {
    const dmNotificationRef = doc(db, 'artifacts', appId, 'users', recipientUid, 'dm_notifications', senderUid);
    await setDoc(dmNotificationRef, {
        senderUid: senderUid,
        timestamp: serverTimestamp(),
        trigger: Date.now() 
    }, { merge: true });
  } catch (error) {
    console.error("Failed to create DM notification:", error);
  }
};

/* ==========================================
  CSS STYLES
  ==========================================
*/
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; background: #f0f2f5; color: #111827; }
  button { cursor: pointer; border: none; background: none; font-family: inherit; }
  input, select, textarea { font-family: inherit; }
  
  /* Layout */
  .app-container { display: flex; height: 100vh; width: 100vw; overflow: hidden; background: linear-gradient(135deg, #f0f9ff 0%, #f0fdf4 100%); }
  .main-area { flex: 1; display: flex; flex-direction: column; position: relative; min-width: 0; background: linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%); height: 100%; box-shadow: -2px 0 10px rgba(0,0,0,0.02); }
  
  /* Sidebar */
  .sidebar { width: 300px; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column; background: #ffffff; height: 100%; z-index: 50; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 2px 0 15px rgba(0,0,0,0.03); }
  .sidebar.closed { margin-left: -300px; } 
  .sidebar-mobile-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 40; backdrop-filter: blur(4px); animation: fadeIn 0s cubic-bezier(0.1, 0.9, 0.2, 1); }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  
  .sidebar-header { height: 70px; display: flex; align-items: center; padding: 0 24px; font-size: 1.3rem; font-weight: 800; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; letter-spacing: -0.5px; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.15); }
  .sidebar-content { flex: 1; overflow-y: auto; padding: 16px; }
  .sidebar-section { font-size: 0.7rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; margin: 24px 12px 8px; letter-spacing: 0.8px; }
  .sidebar-footer { padding: 20px; border-top: 1px solid #f3f4f6; display: flex; align-items: center; gap: 12px; background: linear-gradient(to bottom, #f9fafb, #ffffff); }
  
  /* Nav Buttons */
  .nav-btn { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-radius: 12px; margin-bottom: 4px; text-align: left; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); color: #4b5563; font-weight: 500; position: relative; overflow: hidden; }
  .nav-btn::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); opacity: 0; transition: opacity 0.2s; border-radius: 12px; }
  .nav-btn:hover { background: #f9fafb; color: #111; transform: translateX(4px); }
  .nav-btn.active { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); color: #059669; font-weight: 600; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1); }
  .nav-btn.active::before { opacity: 1; }
  .nav-content { display: flex; align-items: center; gap: 12px; position: relative; z-index: 1; }
  .nav-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 10px; background: #f3f4f6; color: #666; font-size: 0.8rem; font-weight: bold; flex-shrink: 0; transition: all 0.2s; }
  .nav-btn.active .nav-icon { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #fff; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3); }
  .nav-btn:hover .nav-icon { background: #e5e7eb; }
  
  /* Right side Nav Actions (Badge + Delete) */
  .nav-right { display: flex; align-items: center; gap: 8px; position: relative; z-index: 2; }
  
  .delete-icon { opacity: 0; transition: all 0.2s; color: #ef4444; padding: 6px; border-radius: 8px; display: flex; align-items: center; }
  .delete-icon:hover { background: #fee2e2; transform: scale(1.1); }
  .nav-btn:hover .delete-icon { opacity: 1; }
  
  .unread-badge { 
    background: #016747ff; 
    color: white; 
    font-size: 0.75rem; 
    font-weight: 700; 
    min-width: 20px; 
    height: 20px; 
    border-radius: 10px; 
    display: flex; 
    align-items: center; 
    justify-content: center;
    padding: 0 6px;
    box-shadow: 0 2px 5px rgba(239, 68, 68, 0.3);
  }
  .nav-btn.active .unread-badge { background: white; color: #059669; border: 1px solid #d1fae5; }

  /* Headers */
  .header { height: 70px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; background: white; z-index: 10; box-shadow: 0 1px 3px rgba(0,0,0,0.04); flex-shrink: 0; backdrop-filter: blur(10px); }
  .header-title { font-weight: 700; font-size: 1.15rem; display: flex; align-items: center; gap: 10px; color: #1f2937; }
  .menu-btn { color: #6b7280; margin-right: 16px; transition: color 0.2s; }
  .menu-btn:hover { color: #059669; }
  
  /* Language Selector */
  .lang-container { position: relative; }
  .lang-btn { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border: 1.5px solid #e5e7eb; border-radius: 99px; background: #ffffff; font-size: 0.9rem; font-weight: 600; transition: all 0.2s; color: #374151; box-shadow: 0 2px 4px rgba(0,0,0,0.04); }
  .lang-btn:hover { border-color: #059669; background: #f9fafb; box-shadow: 0 4px 8px rgba(5, 150, 105, 0.1); transform: translateY(-1px); }
  .lang-menu { position: absolute; top: 120%; right: 0; width: 220px; background: white; border: 1px solid #e5e7eb; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); overflow: hidden; z-index: 60; max-height: 320px; overflow-y: auto; animation: slideDown 0.2s ease; }
  @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
  .lang-option { width: 100%; padding: 12px 20px; text-align: left; display: flex; align-items: center; gap: 12px; font-size: 0.9rem; color: #374151; transition: all 0.15s; font-weight: 500; }
  .lang-option:hover { background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); color: #059669; }
  
  /* Lobby/Search Grid */
  .lobby-view { padding: 40px; overflow-y: auto; flex: 1; width: 100%; background: linear-gradient(to bottom, #ffffff, #f9fafb); }
  .lobby-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; width: 100%; }
  .lobby-card { padding: 28px; border-radius: 24px; background: white; border: 1.5px solid #f3f4f6; box-shadow: 0 4px 6px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.01); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: pointer; display: flex; flex-direction: column; position: relative; overflow: hidden; }
  .lobby-card::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(5, 150, 105, 0.03) 0%, rgba(16, 185, 129, 0.03) 100%); opacity: 0; transition: opacity 0.3s; }
  .lobby-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,0.08), 0 8px 16px rgba(0,0,0,0.04); border-color: #d1fae5; }
  .lobby-card:hover::before { opacity: 1; }
  .card-header { display: flex; justify-content: space-between; margin-bottom: 16px; position: relative; z-index: 1; }
  .card-badge { font-size: 0.7rem; font-weight: 700; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); color: #059669; padding: 6px 12px; border-radius: 99px; height: fit-content; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.15); }
  .card-title { font-size: 1.3rem; font-weight: 700; margin: 0 0 6px 0; color: #111; position: relative; z-index: 1; }
  .card-subtitle { font-size: 0.9rem; color: #6b7280; display: flex; align-items: center; gap: 6px; position: relative; z-index: 1; }
  .card-meta { margin-top: auto; padding-top: 20px; font-size: 0.85rem; display: flex; flex-direction: column; gap: 10px; color: #4b5563; border-top: 1.5px solid #f3f4f6; position: relative; z-index: 1; }
  .meta-row { display: flex; align-items: center; gap: 8px; }
  .meta-label { font-weight: 700; color: #9ca3af; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; }
  
  /* Chat Area */
  .chat-view { flex: 1; display: flex; flex-direction: column; height: 100%; width: 100%; background: #fff; overflow: hidden; min-height: 0; position: relative; }
  .chat-messages { flex: 1; overflow-y: auto; padding: 28px; display: flex; flex-direction: column; gap: 16px; background: linear-gradient(to bottom, #fafafa, #ffffff); }
  .load-more-btn { width: 100%; padding: 10px; font-size: 0.85rem; color: #9ca3af; display: flex; justify-content: center; align-items: center; gap: 8px; transition: all 0.2s; border-radius: 12px; font-weight: 500; }
  .load-more-btn:hover { color: #059669; background: #f9fafb; }
  
  .msg-row { display: flex; width: 100%; gap: 12px; align-items: flex-end; margin-bottom: 4px; animation: slideUp 0.3s ease; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .msg-row.me { justify-content: flex-end; }
  .msg-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold; background: #f4f4f5; color: #666; flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
  
  /* BUBBLES */
  .msg-bubble { max-width: 75%; padding: 12px 16px; border-radius: 16px; position: relative; font-size: 0.95rem; line-height: 1.5; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: all 0.2s; }
  .msg-bubble:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.12); transform: translateY(-1px); }
  .msg-row.me .msg-bubble { background: linear-gradient(135deg, #dcfce7 0%, #d9fdd3 100%); color: #111; border-top-right-radius: 4px; border: 1px solid #bbf7d0; }
  .msg-row.them .msg-bubble { background: #ffffff; color: #111; border: 1px solid #e5e7eb; border-top-left-radius: 4px; }
  
  .msg-meta { display: flex; align-items: center; justify-content: flex-end; margin-top: 6px; font-size: 0.7rem; opacity: 0.65; gap: 10px; }
  .msg-btn { cursor: pointer; opacity: 0.6; transition: all 0.2s; padding: 4px; border-radius: 6px; display: flex; align-items: center; }
  .msg-btn:hover { opacity: 1; background: rgba(0,0,0,0.05); transform: scale(1.1); }
  .correction-btn { position: absolute; top: -20px; right: -10px; background: #ffffff; color: #d97706; border: 1px solid #fcd34d; padding: 4px; border-radius: 50%; cursor: pointer; box-shadow: 0 4px 8px rgba(217, 119, 6, 0.2); z-index: 0; transition: all 0.2s; }
  .msg-row.me .correction-btn { left: -10px; right: auto; }
  .correction-btn:hover { transform: scale(1.15); box-shadow: 0 6px 12px rgba(217, 119, 6, 0.3); }
  
  /* Popup */
  .popup { position: absolute; background: white; border-radius: 20px; padding: 24px; width: 300px; box-shadow: 0 20px 50px rgba(0,0,0,0.15), 0 10px 25px rgba(0,0,0,0.1); z-index: 100; font-size: 0.9rem; border: 1.5px solid #f3f4f6; color: #374151; animation: popIn 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
  @keyframes popIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  .popup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 14px; border-bottom: 1.5px solid #f3f4f6; }
  .popup-title { font-weight: 700; font-size: 0.75rem; text-transform: uppercase; color: #9ca3af; display: flex; align-items: center; gap: 8px; letter-spacing: 0.5px; }
  .popup-close { color: #9ca3af; cursor: pointer; transition: all 0.2s; padding: 4px; border-radius: 6px; }
  .popup-close:hover { color: #111; background: #f3f4f6; }
  .popup-btn { width: 100%; margin-top: 16px; padding: 12px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; border-radius: 12px; font-size: 0.9rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); }
  .popup-btn:hover { opacity: 0.95; transform: translateY(-2px); box-shadow: 0 6px 16px rgba(5, 150, 105, 0.3); }

  /* Input Area */
  .input-area { padding: 20px 24px; background: linear-gradient(to bottom, #f9fafb, #ffffff); display: flex; flex-direction: column; gap: 16px; border-top: 1.5px solid #e5e7eb; flex-shrink: 0; box-shadow: 0 -2px 10px rgba(0,0,0,0.02); }
  .input-toggles { display: flex; justify-content: center; gap: 12px; margin-bottom: 8px; }
  .toggle-btn { padding: 10px 20px; border-radius: 99px; font-size: 0.85rem; font-weight: 600; border: 1.5px solid #e5e7eb; color: #6b7280; background: #fff; transition: all 0.2s; }
  .toggle-btn:hover { border-color: #d1d5db; background: #f9fafb; }
  .toggle-btn.active { background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; border-color: #059669; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25); transform: translateY(-2px); }
  
  .input-wrapper { display: flex; gap: 12px; background: white; padding: 10px; border-radius: 28px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); align-items: flex-end; position: relative; border: 1.5px solid #e5e7eb; transition: all 0.2s; }
  .input-wrapper:focus-within { border-color: #059669; box-shadow: 0 6px 16px rgba(5, 150, 105, 0.15); }
  .chat-input { flex: 1; padding: 12px 16px; border: none; outline: none; font-size: 1rem; max-height: 120px; resize: none; background: transparent; color: #000; width: 100%; line-height: 1.5; }
  .send-btn { width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3); }
  .send-btn:hover:not(:disabled) { transform: scale(1.08); box-shadow: 0 6px 16px rgba(5, 150, 105, 0.4); }
  .send-btn:disabled { background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); cursor: default; box-shadow: none; }
  
  .mic-btn { padding: 10px; color: #9ca3af; cursor: pointer; transition: all 0.2s; border-radius: 10px; }
  .mic-btn:hover { color: #059669; background: #f0fdf4; }
  
  .status-indicator { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); font-size: 0.75rem; color: #059669; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 6px 14px; border-radius: 99px; display: flex; align-items: center; gap: 6px; font-weight: 600; box-shadow: 0 2px 6px rgba(5, 150, 105, 0.15); }
  
  .checking-bubble { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #92400e; padding: 8px 16px; border-radius: 16px; font-size: 0.8rem; margin: 0 auto; width: fit-content; box-shadow: 0 4px 8px rgba(217, 119, 6, 0.15); border: 1.5px solid #fde68a; display: flex; align-items: center; gap: 8px; font-weight: 600; }

  /* Notebook */
  .notebook-view { padding: 40px; overflow-y: auto; flex: 1; background: linear-gradient(to bottom, #fffbeb, #fefce8); }
  .notebook-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 24px; }
  .vocab-card { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 1.5px solid #fde68a; border-radius: 20px; padding: 24px; position: relative; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 6px rgba(217, 119, 6, 0.08); }
  .vocab-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(217, 119, 6, 0.15); border-color: #fcd34d; }
  .vocab-word { font-size: 1.3rem; font-weight: 700; margin-bottom: 8px; color: #111; }
  .vocab-def { font-size: 0.95rem; color: #4b5563; line-height: 1.6; }
  .vocab-meta { margin-top: 20px; padding-top: 16px; border-top: 1.5px dashed #fde68a; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: #9ca3af; font-weight: 500; }
  .vocab-delete { cursor: pointer; color: #ef4444; padding: 6px; border-radius: 8px; transition: all 0.2s; }
  .vocab-delete:hover { background: #fee2e2; transform: scale(1.1); }

  @media (max-width: 768px) {
    .sidebar { position: fixed; box-shadow: 10px 0 30px rgba(0,0,0,0.15); }
    .input-area { padding: 16px; }
    .msg-bubble { max-width: 85%; }
    .header-title { font-size: 1rem; }
    .lobby-view { padding: 24px; }
    .notebook-view { padding: 24px; }
    .hidden-md { display: flex; }
    .desktop-header { display: none; }
    .mobile-menu-btn { display: block; }
  }
  @media (min-width: 769px) {
    .sidebar { position: relative; margin-left: 0 !important; }
    .sidebar.closed { margin-left: 0; }
    .mobile-header { display: none; }
    .desktop-header { display: flex; }
    .mobile-menu-btn { display: none; }
  }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  
  /* Custom Scrollbar */
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
`;

/* ==========================================
  NEW HOOKS
  ==========================================
*/
const usePartnerStatus = (partnerId) => {
  const [isOnline, setIsOnline] = useState(false);
  const [partnerData, setPartnerData] = useState(null);

  useEffect(() => {
    if (!partnerId || partnerId === 'ai' || partnerId === 'notebook' || partnerId === 'user-search') {
      setIsOnline(true);
      return;
    }

    const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', partnerId);
    
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPartnerData(data);
        const lastActiveTime = data.lastActive?.toDate().getTime();
        if (lastActiveTime) {
          setIsOnline(Date.now() - lastActiveTime < 300000);
        } else {
          setIsOnline(false);
        }
      } else {
        setIsOnline(false);
      }
    });

    return () => unsubscribe();
  }, [partnerId]);

  return { isOnline, partnerData };
};


/* ==========================================
  APP COMPONENT
  ==========================================
*/
export default function App() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [userData, setUserData] = useState(null);
  const [route, setRoute] = useState(window.location.hash.replace('#', '') || 'login');

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash.replace('#', '') || 'login');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const initAuth = async () => { await signInAnonymously(auth); setLoadingAuth(false); };
    initAuth();
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
         const docSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.uid));
         if (docSnap.exists()) setUserData(docSnap.data());
      }
    });
  }, []);

  useEffect(() => {
    if (loadingAuth) return;
    if (user?.displayName && userData) { if (route === 'login') window.location.hash = 'user-search'; } 
    else { if (route !== 'login') window.location.hash = 'login'; }
  }, [user, loadingAuth, route, userData]);

  if (loadingAuth) return <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#fff'}}><Loader2 className="spin" color="#059669" size={32} /></div>;

  return (
    <>
      <style>{STYLES}</style>
      {user?.displayName && userData 
        ? <MainLayout user={user} userData={userData} /> 
        : <LoginScreen user={user} />}
    </>
  );
}

function LoginScreen({ user }) {
  const [name, setName] = useState('');
  const [targetLang, setTargetLang] = useState('Spanish');
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    setSubmitting(true);
    try {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), where('displayName', '==', name.trim()));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) { setError('Username taken.'); setSubmitting(false); return; }
      await updateProfile(user, { displayName: name.trim(), photoURL: photoUrl });
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), { 
        displayName: name.trim(), nativeLang: 'English', targetLang, photoUrl, lastActive: serverTimestamp(), userId: user.uid 
      });
      window.location.hash = 'user-search'; window.location.reload(); 
    } catch (error) { setError('Error joining.'); }
    setSubmitting(false);
  };

  return (
    <div style={{ position: 'fixed',inset:0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: '#f0f2f5' }}>
      <div style={{ width: '100%', maxWidth: '440px', padding: 40, background: 'white', borderRadius: 24, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, color: '#059669' }}><PolyLogo style={{width:64, height:64}} /></div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8, textAlign: 'center', color: '#111' }}>Poly Chat</h1>
        <p style={{ color: '#6b7280', marginBottom: 32, textAlign: 'center' }}>Chat without barriers</p>
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
             <label style={{display:'block', fontSize:'0.75rem', fontWeight:700, color:'#9ca3af', marginBottom: 6, textTransform:'uppercase'}}>Display Name</label>
             <input className="chat-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Alex" style={{width: '100%', border: '1px solid #e5e7eb', borderRadius: 12}}/>
          </div>
          <div>
             <label style={{display:'block', fontSize:'0.75rem', fontWeight:700, color:'#9ca3af', marginBottom: 6, textTransform:'uppercase'}}>I'm Learning</label>
             <select className="chat-input" value={targetLang} onChange={(e) => setTargetLang(e.target.value)} style={{width:'100%', border: '1px solid #e5e7eb', borderRadius: 12}}>{LANGUAGES.map(l => <option key={l.name} value={l.name}>{l.flag} {l.name}</option>)}</select>
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: '0.8rem', display:'flex', alignItems:'center', gap:6 }}><AlertCircle size={14}/> {error}</p>}
          <button className="send-btn" style={{ width: '100%', borderRadius: 12, fontWeight: 700, fontSize: '1rem', height: 50 }} disabled={submitting || !name.trim()}>{submitting ? <Loader2 className="spin"/> : "Join"}</button>
        </form>
      </div>
    </div>
  );
}

function MainLayout({ user, userData }) {
  const [targetLang, setTargetLang] = useState(userData?.targetLang || 'Spanish');
  const [targetLangCode, setTargetLangCode] = useState(
      LANGUAGES.find(l => l.name === (userData?.targetLang || 'Spanish'))?.code || 'es-ES'
  );

  const [joinedChannels, setJoinedChannels] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('poly_channels') || '[]');
      if (!Array.isArray(saved)) return [{id: 'user-search', name: 'Find User', isDm: false }];
      return saved.filter(c => typeof c === 'object' && c !== null).map(c => ({...c, unread: c.unread || false}));
    } catch (e) {
      return [];
    }
  });
  
  const [activeChannelId, setActiveChannelId] = useState('user-search');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Persist channels, but don't blindly rely on them for logic (state is truth)
  useEffect(() => localStorage.setItem('poly_channels', JSON.stringify(joinedChannels)), [joinedChannels]);
  
  // Heartbeat
  useEffect(() => {
    if (!user || !user.uid) return;
    const beat = async () => { try { await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid), { lastActive: serverTimestamp() }, { merge: true }); } catch (e) {} };
    beat(); const i = setInterval(beat, 60000); return () => clearInterval(i);
  }, [user]);

  useEffect(() => {
    if (!user || !user.uid) return;

    const notificationCollectionRef = collection(db, 'artifacts', appId, 'users', user.uid, 'dm_notifications');
    
    const unsubscribe = onSnapshot(notificationCollectionRef, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        const notificationDoc = change.doc;
        const partnerUid = notificationDoc.id;
        
        if (change.type === 'added' || change.type === 'modified') {
          const dmId = `dm_${[user.uid, partnerUid].sort().join('_')}`;

          // 1. Fetch data FIRST (Async with fallback)
          let partnerName = 'Unknown User';
          try {
             const partnerDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', partnerUid));
             if (partnerDoc.exists()) partnerName = partnerDoc.data().displayName;
          } catch(e) {
             console.error("Failed to fetch partner name", e);
          }

          // 2. Update state SYNCHRONOUSLY using Filter & Prepend to prevent duplicates
          setJoinedChannels(prevChannels => {
            const others = prevChannels.filter(c => c.id !== dmId);
            
            // If we are currently LOOKING at this chat, don't mark it unread
            const isCurrentlyOpen = activeChannelId === dmId;

            // Use existing name if we already have it to avoid flickering, otherwise use fetched
            const existingChannel = prevChannels.find(c => c.id === dmId);
            const nameToUse = existingChannel ? existingChannel.name : partnerName;

            return [{ 
                id: dmId, 
                name: nameToUse, 
                isDm: true, 
                unread: !isCurrentlyOpen 
            }, ...others];
          });

          // 3. Delete the notification document so it can be re-triggered later
          try {
              await deleteDoc(notificationDoc.ref);
          } catch(e) {
              console.error("Error deleting notification", e);
          }
        }
      });
    });

    return () => unsubscribe();
  }, [user.uid, activeChannelId]); 
  
  
  const startDM = (id, name) => {
    if (id === 'ai') { setActiveChannelId('ai'); setSidebarOpen(false); return; }
    if (id === 'notebook') { setActiveChannelId('notebook'); setSidebarOpen(false); return; }
    
    // Generate consistent ID
    const dmId = `dm_${[user.uid, id].sort().join('_')}`;

    // Filter & Prepend to avoid duplicates and move to top
    setJoinedChannels(prev => {
        const others = prev.filter(c => c.id !== dmId);
        return [{ id: dmId, name, isDm: true, unread: false }, ...others];
    });

    setActiveChannelId(dmId); setSidebarOpen(false);
  };
  
  const deleteDM = (id) => { 
    if (window.confirm('Delete chat?')) { 
      setJoinedChannels(prev => prev.filter(c => c.id !== id)); 
      if (activeChannelId === id) setActiveChannelId('user-search'); 
    } 
  };
  const resetAIChat = async () => { 
    if (window.confirm('Reset AI history?')) { 
      const r = collection(db, 'artifacts', appId, 'users', user.uid, 'ai_messages'); 
      const s = await getDocs(r); 
      s.forEach(d => deleteDoc(d.ref)); 
      if (activeChannelId === 'ai') alert('Chat reset.'); 
    } 
  };

  const getName = (id) => {
    if (id === 'user-search') return 'Find User'; 
    if (id === 'ai') return 'Poly';
    if (id === 'notebook') return 'My Notebook';
    const c = joinedChannels.find(c => c.id === id);
    return c ? c.name : '';
  };

  return (
    <div className="app-container">
      <div className={`sidebar ${sidebarOpen ? 'open' : 'closed'} mobile-sidebar`}>
        <div className="sidebar-content">
          <div className="sidebar-section">Explore</div>
          
          <button className={`nav-btn ${activeChannelId === 'user-search' ? 'active' : ''}`} onClick={() => {setActiveChannelId('user-search'); setSidebarOpen(false);}}>
            <div className="nav-content"><div className="nav-icon"><Users size={16}/></div> Find User</div>
          </button>

          <button className={`nav-btn ${activeChannelId === 'ai' ? 'active' : ''}`} onClick={() => {setActiveChannelId('ai'); setSidebarOpen(false);}}>
            <div className="nav-content"><div className="nav-icon"><PolyLogo size={16}/></div> Poly</div>
            <div className="nav-right">
               <div className="delete-icon" onClick={(e) => { e.stopPropagation(); resetAIChat(); }} title="Reset AI Chat"><Trash2 size={14}/></div>
            </div>
          </button>
          <button className={`nav-btn ${activeChannelId === 'notebook' ? 'active' : ''}`} onClick={() => {setActiveChannelId('notebook'); setSidebarOpen(false);}}>
             <div className="nav-content"><div className="nav-icon"><Book size={16}/></div> Notebook</div>
          </button>
          <div className="sidebar-section">Chats</div>
          {joinedChannels.filter(c => c.isDm).map(c => (
            <button key={c.id} className={`nav-btn ${activeChannelId === c.id ? 'active' : ''}`} onClick={() => {startDM(c.id.replace('dm_', '').split('_').find(u => u !== user.uid), c.name); setSidebarOpen(false);}}>
              <div className="nav-content"><Avatar name={c.name} size={32}/> <span style={{marginLeft:8}}>{c.name}</span></div>
              <div className="nav-right">
                  {c.unread && <span className="unread-badge">1</span>}
                  <div className="delete-icon" onClick={(e) => { e.stopPropagation(); deleteDM(c.id); }}><Trash2 size={14}/></div>
              </div>
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
           <Avatar url={user.photoURL} name={user.displayName} size={36} />
           <div style={{flex:1, overflow:'hidden'}}><p style={{fontSize:'0.85rem', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', margin:0}}>{user.displayName}</p><p style={{fontSize:'0.7rem', color:'#9ca3af', margin:0}}>{userData.targetLang}</p></div>
        </div>
      </div>
      
      {sidebarOpen && <div className="sidebar-mobile-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className="main-area">
        <div className="header mobile-header">
          <div className="header-title">
             <button onClick={() => setSidebarOpen(true)} className="menu-btn mobile-menu-btn"><Menu size={24}/></button>
             {getName(activeChannelId)}
             {(activeChannelId.startsWith('dm_') || activeChannelId==='ai') && <OnlineStatus channelId={activeChannelId} userUid={user.uid} />}
          </div>
          {activeChannelId !== 'notebook' && activeChannelId !== 'user-search' && (
             <LanguageSelector current={targetLang} onChange={(n, c) => { setTargetLang(n); setTargetLangCode(c); }} />
          )}
        </div>
      
        {activeChannelId !== 'user-search' && activeChannelId !== 'notebook' && (
          <div className="header desktop-header">
            <div className="header-title">
                {getName(activeChannelId)}
                {(activeChannelId.startsWith('dm_') || activeChannelId==='ai') && <OnlineStatus channelId={activeChannelId} userUid={user.uid} />}
            </div>
            {activeChannelId !== 'notebook' && (
              <LanguageSelector current={targetLang} onChange={(n, c) => { setTargetLang(n); setTargetLangCode(c); }} />
            )}
          </div>
        )}

        {activeChannelId === 'user-search' 
          ? <UserSearchScreen user={user} onStartDM={startDM} /> 
          : activeChannelId === 'notebook'
             ? <NotebookScreen user={user} />
             : <ChatRoom key={activeChannelId} user={user} channelId={activeChannelId} targetLang={targetLang} targetLangCode={targetLangCode} />
        }
      </div>
    </div>
  );
}

function OnlineStatus({ channelId, userUid }) {
    const partnerUid = channelId.replace('dm_', '').split('_').find(id => id !== userUid);
    const { isOnline } = usePartnerStatus(partnerUid);
    
    if (isOnline) {
        return <span style={{fontSize:'0.8rem', color:'#059669', marginLeft: 10, display:'flex', alignItems:'center', gap: 4}}>
            <span style={{width: 8, height: 8, borderRadius: '50%', background: '#059669'}}></span> Online
        </span>;
    }
    return null;
}

function LanguageSelector({ current, onChange }) {
  const [open, setOpen] = useState(false);
  const currentObj = LANGUAGES.find(l => l.name === current) || LANGUAGES[0];
  return (
    <div className="lang-container">
      <button className="lang-btn" onClick={() => setOpen(!open)}>
        <span style={{fontSize:'1.2rem'}}>{currentObj.flag}</span> {currentObj.name}
      </button>
      {open && (
        <div className="lang-menu">
          {LANGUAGES.map(l => (
            <button key={l.code} className={`lang-option ${current === l.name ? 'active' : ''}`} onClick={() => { onChange(l.name, l.code); setOpen(false); }}>
              <span>{l.flag}</span> {l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==========================================
  UserSearchScreen Component
  ==========================================
*/
function UserSearchScreen({ user, onStartDM }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false); 

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setResults([]);
      setSearched(true);
      return;
    }

    setLoading(true);
    setSearched(true);
    setResults([]);

    try {
      const prefix = searchTerm.trim();
      const q = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'users'),
        where('displayName', '>=', prefix),
        where('displayName', '<=', prefix + '\uf8ff'),
        limit(20)
      );

      const snapshot = await getDocs(q);
      const userList = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.id !== user.uid); 

      setResults(userList);
    } catch (error) {
      console.error('Error searching users:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lobby-view" style={{maxWidth:'700px', margin:'0 auto'}}>
      <div style={{textAlign:'center', marginBottom: 40, marginTop: 20}}>
        <h2 style={{fontSize:'1.75rem', marginBottom: 8, letterSpacing:'-0.5px'}}>Find a Language Partner</h2>
        <p style={{color:'#6b7280'}}>Search by username to start a private chat.</p>
      </div>

      <form onSubmit={handleSearch} style={{marginBottom: 40}}>
        <div className="input-wrapper" style={{padding: '0 16px', borderRadius: 16, display:'flex', alignItems:'center'}}>
           <input
              className="chat-input" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="Enter username..." 
              style={{width: '100%', border: 'none', padding: '15px 0', fontSize:'1.1rem'}}
              autoFocus
           />
           <button type="submit" className="send-btn"  disabled={loading}>
             {loading ? <Loader2 className="spin" size={20} color="white"/> : <ArrowRight size={20} color="white"/>}
           </button>
        </div>
      </form>
      
      {results.length > 0 && (
        <>
          <h3 style={{fontSize:'1.1rem', fontWeight:600, color:'#374151', margin:'30px 0 15px'}}>Search Results</h3>
          <div className="lobby-grid" style={{ marginBottom: 40 }}> 
            {results.map(u => (
              <div key={u.id} className="lobby-card" onClick={(e) => { e.stopPropagation(); onStartDM(u.id, u.displayName); }}>
                <div className="card-header">
                  <Avatar url={u.photoUrl} name={u.displayName} size={56} />
                </div>
                <h3 className="card-title">{u.displayName}</h3>
                <div className="card-meta">
                    <div className="meta-row"><span className="meta-label">Learning</span><span className="meta-value">{u.targetLang}</span></div>
                    <button className="popup-btn" style={{marginTop: 10, padding: 10, borderRadius: 10}}>
                        <Send size={14}/> Start Chat
                    </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {searched && results.length === 0 && !loading && (
        <p style={{color:'#9ca3af', textAlign:'center', marginTop:30, marginBottom: 40}}>No users found matching "{searchTerm.trim()}".</p>
      )}

      <h3 style={{fontSize:'1.1rem', fontWeight:600, color:'#374151', margin:'30px 0 15px'}}>Meet Poly</h3>
      <div className="lobby-grid">
           <div className="lobby-card" onClick={() => onStartDM('ai', 'Poly')} style={{background:'#fff'}}>
             <div className="card-header">
               <div style={{width:56, height:56, borderRadius:'50%', background:'#ecfdf5', color:'#059669', display:'flex', alignItems:'center', justifyContent:'center'}}><PolyLogo style={{width:32, height:32}}/></div>
             </div>
             <h3 className="card-title">Poly</h3>
             <p className="card-subtitle">Your AI language partner <ArrowRight size={14}/></p>
           </div>
      </div>
    </div>
  );
}

function NotebookScreen({ user }) {
  const [vocab, setVocab] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'vocab'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snap) => setVocab(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  const deleteWord = async (id) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'vocab', id));
  };

  return (
    <div className="notebook-view">
      <h2 style={{marginBottom:24, fontSize:'1.5rem', fontWeight:700}}>My Vocabulary</h2>
      <div className="notebook-grid">
        {vocab.map(v => (
          <div key={v.id} className="vocab-card">
            <div className="vocab-word">{v.word}</div>
            <div className="vocab-def">{v.definition}</div>
            <div className="vocab-meta">
               <span>Saved {v.timestamp?.toDate().toLocaleDateString()}</span>
               <Trash2 size={27} className="vocab-delete" onClick={() => deleteWord(v.id)} />
            </div>
          </div>
        ))}
      </div>
      {vocab.length === 0 && <p style={{color:'#9ca3af', textAlign:'center', marginTop:60}}>No words saved yet. Look up words in chat to save them!</p>}
    </div>
  );
}

/* ==========================================
  PolyContextSelector Component
  ==========================================
*/
const TOPICS = [
    'General conversation', 'Ordering food at a restaurant', 'Discussing a movie', 
    'Talking about family', 'Planning a trip', 'Hobbies and interests'
];
const GRAMMAR_FOCUS = [
    'None', 'Past Tense', 'Future Tense', 'Conditional Sentences', 'Subjunctive Mood', 'Formal vs. Informal'
];

function PolyContextSelector({ topic, setTopic, grammarFocus, setGrammarFocus, targetLang }) {
    return (
        <div style={{ 
            padding: '12px 24px', 
            borderBottom: '1px solid #e5e7eb', 
            background: '#f9fafb',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 20,
            alignItems: 'center',
            fontSize: '0.9rem',
            color: '#4b5563'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, color: '#1f2937' }}>Topic</span>
                <select 
                    value={topic} 
                    onChange={(e) => setTopic(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white' , color: '#111827'}}
                >
                    {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, color: '#1f2937' }}>Focus ({targetLang})</span>
                <select 
                    value={grammarFocus} 
                    onChange={(e) => setGrammarFocus(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white' ,color: '#111827'}}
                >
                    {GRAMMAR_FOCUS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
            </div>
        </div>
    );
}

/* ==========================================
  CHAT ROOM
  ==========================================
*/
function ChatRoom({ user, channelId, targetLang, targetLangCode }) {
  const [messages, setMessages] = useState([]);
  const [limitCount, setLimitCount] = useState(20);
  const [lookup, setLookup] = useState(null);
  const [activeCorrection, setActiveCorrection] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [apiError, setApiError] = useState(null); 
  const [aiTopic, setAiTopic] = useState(TOPICS[0]); 
  const [grammarFocus, setGrammarFocus] = useState(GRAMMAR_FOCUS[0]); 
  const scrollRef = useRef(null);
  const isDm = channelId.startsWith('dm_');
  const partnerUid = isDm ? channelId.replace('dm_', '').split('_').find(id => id !== user.uid) : null;
  const isFirstMessage = useRef(true);

  const saveToNotebook = async (word, def) => {
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'vocab'), {
      word, definition: def, timestamp: serverTimestamp(), lang: targetLang
    });
    alert(`Saved "${word}" to Notebook!`); 
  };

  useEffect(() => {
    let ref;
    if (channelId === 'ai') ref = collection(db, 'artifacts', appId, 'users', user.uid, 'ai_messages');
    else ref = collection(db, 'artifacts', appId, 'public', 'data', `chat_${channelId.replace(/[^a-z0-9-_]/g, '')}`);
    const q = query(ref, orderBy('timestamp', 'desc'), limit(limitCount));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const newMessages = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
      setMessages(newMessages);
      setLoadingMore(false);
      
      if (isFirstMessage.current && newMessages.length > 0) {
          isFirstMessage.current = false;
      }
    });

    return () => unsubscribe();
  }, [user, channelId, limitCount]);

  useEffect(() => { if(limitCount === 20 && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages, limitCount]);

  const loadMore = () => { setLoadingMore(true); setLimitCount(prev => prev + 20); };

  const handleLookup = async (e, text) => {
    e.preventDefault(); e.stopPropagation();
    setApiError(null); 
    const selection= window.getSelection().toString().trim();
    const lookupText= selection.length >0 ? selection: text;
    const rect= e.currentTarget.getBoundingClientRect();
    setLookup({ x: rect.left, y: rect.bottom, text:lookupText, loading: true });
    
    const { result, error } = await explainText(lookupText);
    if (error) setApiError(error);

    setLookup(prev => ({ ...prev, loading: false, result: result }));
  };

  const handleSend = async (text, raw, isPractice) => {
    setApiError(null); 
    let correctionData = null;
    let finalError = null;

    if (isPractice || (channelId === 'ai' && targetLang !== 'English')) {
       const check = await checkGrammar(text, targetLang);
       if (check.error) { finalError = check.error; }
       if (check.hasError) {
            correctionData = { 
                correction: check.correction || text, 
                reason: check.reason || "Grammar check found a potential issue." 
            };
        }
    }
    
    if (finalError) { setApiError(finalError); return; }

    const msgData = { 
      text, 
      originalText: raw || "", 
      userId: user.uid, 
      displayName: user.displayName, 
      timestamp: serverTimestamp(), 
      lang: targetLang, 
      langCode: targetLangCode, 
      isPractice, 
      correction: correctionData 
    };
    
    let ref;
    if (channelId === 'ai') ref = collection(db, 'artifacts', appId, 'users', user.uid, 'ai_messages');
    else ref = collection(db, 'artifacts', appId, 'public', 'data', `chat_${channelId.replace(/[^a-z0-9-_]/g, '')}`);
    
    try {
        await addDoc(ref, msgData);
        // ⭐ FIXED: Always send notification to ensure receiver gets the chat
        if (isDm && partnerUid) {
            await createDmNotification(user.uid, partnerUid);
        }
    } catch (e) {
        setApiError("Failed to send message to database.");
        return;
    }

    if (channelId === 'ai') {
       const promptContext = `Topic: ${aiTopic}. Grammar Focus: ${grammarFocus}.`;
       const { response, error } = await generateAIResponse(text, user.displayName, targetLang, promptContext);

       if (error) { 
           setApiError(error); 
           await addDoc(ref, { 
                text: "Poly is temporarily unavailable.", 
                originalText: "Poly is temporarily unavailable.", 
                userId: 'ai-companion-bot', 
                displayName: 'Poly', 
                timestamp: serverTimestamp(), 
                lang: targetLang, 
                isBot: true 
            });
           return;
       }
       
       if (response) { 
            await addDoc(ref, { 
                text: response.target || "Poly had trouble translating the response.", 
                originalText: response.english || "Poly had trouble generating the response.", 
                userId: 'ai-companion-bot', 
                displayName: 'Poly', 
                timestamp: serverTimestamp(), 
                lang: targetLang, 
                isBot: true 
            });
       }
    }
  };

  const handlePlayAudio = async (text, langCode, msgId) => {
    await playGeminiTTS(text, langCode);
  };

  return (
    <div className="chat-view" onClick={() => { setLookup(null); setActiveCorrection(null); }}>
      
      {channelId === 'ai' && (
          <PolyContextSelector 
              topic={aiTopic} setTopic={setAiTopic} 
              grammarFocus={grammarFocus} setGrammarFocus={setGrammarFocus} 
              targetLang={targetLang}
          />
      )}
      
      {apiError && (
          <div style={{ padding: '10px 24px', background: '#fee2e2', color: '#dc2626', fontWeight: 600, borderBottom: '1px solid #fca5a5', display:'flex', alignItems:'center', gap: 8 }}>
              <AlertCircle size={16}/> {apiError}
          </div>
      )}

      {lookup && (
        <div className="popup" style={{position: 'fixed', top: Math.min(lookup.y, window.innerHeight-200), left: Math.min(lookup.x, window.innerWidth-300) }} onClick={e=>e.stopPropagation()}>
          <div className="popup-header"><span className="popup-title"><Book size={14}/> Definition</span><X className="popup-close" size={16} onClick={()=>setLookup(null)}/></div>
          {lookup.loading ? <Loader2 className="spin" style={{color:'#059669'}}/> : (
             <>
                <p style={{marginBottom:12, lineHeight:1.5}}>{lookup.result}</p>
                <button className="popup-btn" onClick={() => { saveToNotebook(lookup.text, lookup.result); setLookup(null); }}>
                   <Star size={12} /> Save to Notebook
                </button>
             </>
          )}
        </div>
      )}

      <div className="chat-messages" ref={scrollRef}>
        {messages.length >= limitCount && <button onClick={loadMore} className="load-more-btn">{loadingMore ? <Loader2 className="spin" size={14}/> : <RefreshCw size={14}/>} Load previous messages</button>}
        {messages.map(msg => {
           const isMe = msg.userId === user.uid;
           if (msg.isTutor) return null;
           const langFlag = LANGUAGES.find(l => l.name === msg.lang)?.flag;
           
           return (
             <div key={msg.id} className={`msg-row ${isMe ? 'me' : 'them'}`}>
               {!isMe && <div className="msg-avatar" style={msg.isBot ? {background:'#f4f4f5'} : {background: 'transparent', border:'none', padding:0}}>{msg.isBot ? <PolyLogo style={{width:16, height:16}}/> : <Avatar name={msg.displayName} size={32} />}</div>}
               <div className={`msg-bubble ${isMe ? 'me' : 'them'}`}>
                 {msg.correction && (
                   <div className="correction-btn" onClick={(e)=>{e.stopPropagation(); setActiveCorrection(activeCorrection===msg.id ? null : msg.id)}}><GraduationCap size={14}/></div>
                 )}
                 {activeCorrection === msg.id && (
                    <div className="popup" style={{bottom: '100%', right: 0, marginBottom: 8, width: 240, color: 'black'}} onClick={e=>e.stopPropagation()}>
                       <div className="popup-header"><span className="popup-title" style={{color:'#d97706'}}><Sparkles size={12}/> Correction</span><X className="popup-close" size={14} onClick={()=>setActiveCorrection(null)}/></div>
                       <p style={{fontStyle:'italic', marginBottom:8, fontSize:'0.8rem'}}>"{msg.correction.reason}"</p>
                       <div style={{background:'#ecfdf5', padding:8, borderRadius:8, border:'1px solid #d1fae5', color:'#047857', fontWeight:'bold'}} onContextMenu={e=>handleLookup(e, msg.correction.correction)}>{msg.correction.correction}</div>
                    </div>
                 )}
                 
                 <p style={{margin:0, lineHeight:1.5, whiteSpace:'pre-wrap', cursor:'text'}} onContextMenu={e => handleLookup(e, msg.text)}>{msg.text}</p>
                 
                 <div className="msg-meta">
                    <div style={{display:'flex', flexDirection:'column', gap:2, alignItems: isMe ? 'flex-end' : 'flex-start'}}>
                       {msg.originalText && msg.originalText !== msg.text && <span style={{fontStyle:'italic'}}>"{msg.originalText}"</span>}
                       {msg.lang && <span style={{fontWeight:'bold', fontSize:'0.65rem', textTransform:'uppercase'}}>{langFlag} {msg.lang}</span>}
                    </div>
                    <div className="msg-btn" onClick={() => handlePlayAudio(msg.text, msg.langCode, msg.id)}><Volume2 size={14}/></div>
                 </div>
               </div>
             </div>
           );
        })}
      </div>
      
      <ChatInput key={channelId} onSend={handleSend} targetLang={targetLang} />
    </div>
  );
}

function ChatInput({ onSend, targetLang }) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('english');
  const [loading, setLoading] = useState(false);
  const [liveTrans, setLiveTrans] = useState(false);
  const timer = useRef(null);
  const textareaRef = useRef(null);
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setInput(val);
    
    if (textareaRef.current) {
       textareaRef.current.style.height = 'auto'; 
       textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }

    if (timer.current) clearTimeout(timer.current);
    setLiveTrans(false);
    if (val.trim() && mode === 'english' && targetLang !== 'English') {
       setLiveTrans(true);
       timer.current = setTimeout(() => setLiveTrans(false), 800);
    }
  };

  const send = async (e) => {
    if (e && e.preventDefault) {
        e.preventDefault(); 
    }
    
    if (!input.trim() || loading) return;
    setLoading(true);
    let txt = input;
    const practice = mode === 'target';
    
    if (mode === 'english' && targetLang !== 'English') {
        const { translated, error } = await translateText(input, targetLang);
        if (error) { 
            setLoading(false); 
            await onSend('', '', false); 
            return; 
        } 
        txt = translated;
    }
    
    await onSend(txt, input, practice); 
    setInput(''); 
    setLoading(false);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(e);
    }
  };

  return (
    <div className="input-area">
      {targetLang !== 'English' && (
        <div className="input-toggles">
           <button className={`toggle-btn ${mode==='english'?'active':''}`} onClick={()=>{setMode('english'); setInput('')}}>Type in English</button>
           <button className={`toggle-btn ${mode==='target'?'active':''}`} onClick={()=>{setMode('target'); setInput('')}}><CheckCircle2 size={12} style={{marginRight:4}}/> Practice {targetLang}</button>
        </div>
      )}
      
      {mode === 'target' && input.length > 3 && <div className="checking-bubble"><Loader2 className="spin" size={12}/> Poly is checking your sentence...</div>}

      <form className="input-wrapper" onSubmit={send}>
        <div style={{flex:1, position:'relative'}}>
           <textarea 
              ref={textareaRef}
              rows={1}
              className="chat-input" 
              value={input} 
              onChange={handleChange} 
              onKeyDown={handleKeyDown}
              placeholder={mode === 'english' ? "Type in English..." : `Practice in ${targetLang}...`} 
              autoFocus
           />
           {(liveTrans || loading) && mode==='english' && targetLang!=='English' && (
              <div className="status-indicator"><Loader2 className="spin" size={12} style={{marginRight:6}}/> Translating...</div>
           )}
        </div>
        <button type="submit" className="send-btn" disabled={loading || !input.trim()}>{loading ? <Loader2 className="spin"/> : <Send size={20}/>}</button>
      </form>
    </div>
  );
}