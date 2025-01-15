require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/db');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Connect Database
connectDB();

// Middleware
app.use(express.json());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://blind-date-seven.vercel.app'
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  exposedHeaders: ['x-auth-token']
}));

// Session configuration with MongoDB store
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cards', require('./routes/cards'));
app.use("/api/notifications", require("./routes/notification"));

// Supabase setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const notificationChannel = supabase.channel("notification-updates");
notificationChannel.subscribe(status => {
  console.log("Notification channel status:", status);
});

const cardChannel = supabase.channel("card-updates");
cardChannel.subscribe((status) => {
  console.log("Card channel status:", status);
});

// Update the card scratch route to emit updates using Supabase broadcast
const emitCardUpdate = async (cardId, scratcherGender, data) => {
  try {
    const payload = {
      cardId: cardId.toString(),
      isLocked: true,
      scratcherGender: scratcherGender,
      scratchedBy: data.scratchedBy.toString()
    };
    
    await cardChannel.send({
      type: "broadcast",
      event: "card-update",
      payload: payload,
    });
  } catch (error) {
    console.error("Error broadcasting update:", error);
  }
};

// Export for use in routes
app.set('emitCardUpdate', emitCardUpdate);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;