/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAG_UJ8y1wWjqJT4LnFKT3O6bWGjd7CORI",
  authDomain: "sayban-web.firebaseapp.com",
  projectId: "sayban-web",
  storageBucket: "sayban-web.firebasestorage.app",
  messagingSenderId: "856382957880",
  appId: "1:856382957880:web:13290f4f3da5805ac179cd"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("Background message received:", payload);

  const notificationTitle = payload?.notification?.title || "پیام جدید";
  const notificationOptions = {
    body: payload?.notification?.body,
    icon: "/icon-192x192.png"
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
