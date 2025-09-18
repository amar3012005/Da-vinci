// public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/9.1.2/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/9.1.2/firebase-messaging.js');

const firebaseConfig = {
    apiKey: "AIzaSyDiBlshtYxqX1EgC7w-4f0KHxZgpq4AAoU",
    authDomain: "foodles-c5afe.firebaseapp.com",
    projectId: "foodles-c5afe",
    storageBucket: "foodles-c5afe.firebasestorage.app",
    messagingSenderId: "310452872150",
    appId: "1:310452872150:web:a65deac53c6ce222ddfa77",
    measurementId: "G-F0BQ1635W2"
  };

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage(function(payload) {
  console.log("Background Message received. ", payload);
  // Customize your background message here
  // Example: Customize notification title and body
  const notificationTitle = 'New Notification';
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
