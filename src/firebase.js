// firebase.js
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: "AIzaSyDiBlshtYxqX1EgC7w-4f0KHxZgpq4AAoU",
    authDomain: "foodles-c5afe.firebaseapp.com",
    projectId: "foodles-c5afe",
    storageBucket: "foodles-c5afe.firebasestorage.app",
    messagingSenderId: "310452872150",
    appId: "1:310452872150:web:a65deac53c6ce222ddfa77",
    measurementId: "G-F0BQ1635W2"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = getMessaging(app);

// Request permission and get the token
export const requestNotificationPermission = async () => {
  try {
    const currentToken = await getToken(messaging, { vapidKey: 'YOUR_VAPID_KEY' });
    if (currentToken) {
      console.log('FCM Token:', currentToken);
      // You can send this token to your backend to target notifications to this user
    } else {
      console.log('No registration token available. Request permission to generate one.');
    }
  } catch (error) {
    console.error('Error getting token:', error);
  }
};

// Handle foreground messages
export const listenForForegroundMessages = () => {
  onMessage(messaging, (payload) => {
    console.log('Message received: ', payload);
    // Handle the message here (e.g., show a notification, navigate, etc.)
  });
};

// Only export once
export { messaging, requestNotificationPermission, listenForForegroundMessages };
