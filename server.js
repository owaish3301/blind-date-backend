require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/db');
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Connect Database
connectDB();

// Middleware
app.use(express.json());

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://blind-date-seven.vercel.app'
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  exposedHeaders: ['x-auth-token']
};

app.use(cors(corsOptions));

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cards', require('./routes/cards'));

// Socket.IO setup with production settings
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://blind-date-seven.vercel.app']
      : ['http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/socket.io/',
  transports: ['polling', 'websocket'], // Changed order to try polling first
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true,
  cookie: {
    name: 'io',
    path: '/',
    httpOnly: true,
    sameSite: 'none',
    secure: true
  }
});

// Error handling for WebSocket
io.engine.on("connection_error", (err) => {
  console.log(err.req);      // the request object
  console.log(err.code);     // the error code
  console.log(err.message);  // the error message
  console.log(err.context);  // some additional error context
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  socket.on('join', (userData) => {
    if (userData?.gender) {
      socket.join(userData.gender);
    }
  });
});

// Update the card scratch route to emit updates
const emitCardUpdate = (cardId, gender, data) => {
  const payload = {
    cardId: cardId.toString(),
    isLocked: true,
    scratchedBy: data.scratchedBy.toString()
  };
  
  io.to(gender).emit('cardUpdate', payload);
};

// Export for use in routes
app.set('io', io);
app.set('emitCardUpdate', emitCardUpdate);

// Make sure server.listen is called
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;