import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import http from 'http'
import { Server } from 'socket.io'
import os from 'os'

// Import routes
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import workoutRoutes from './routes/workouts.js'
import socialRoutes from './routes/social.js'
import adminRoutes from './routes/admin.js'
import notificationRoutes from './routes/notifications.js'
import chatRoutes from './routes/chat.js'
import classRoutes from './routes/classes.js'
import challengeRoutes from './routes/challenges.js'

dotenv.config()

const app = express()
const server = http.createServer(app)
// Get local IP address
const getLocalIP = () => {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return 'localhost'
}

const LOCAL_IP = getLocalIP()
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  `http://${LOCAL_IP}:5173`,
  `http://${LOCAL_IP}:5174`,
  process.env.CLIENT_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  'https://webaltusgym1.vercel.app',
  'https://*.vercel.app'
].filter(Boolean)

// Log allowed origins in production
if (process.env.NODE_ENV === 'production') {
  console.log('🌐 Allowed CORS origins:', allowedOrigins)
}

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? allowedOrigins 
      : allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
})

const PORT = process.env.PORT || 3001
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://alien:alien@cluster0.xr01zqx.mongodb.net/altusGym?retryWrites=true&w=majority&appName=Cluster0'

// Middleware
app.use(cors({ 
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    // Check if origin is in allowed list
    if (allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace('*', '.*')
        return new RegExp(pattern).test(origin)
      }
      return origin === allowed
    })) {
      callback(null, true)
    } else {
      console.log('❌ CORS blocked origin:', origin)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

// Log all requests in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`)
    next()
  })
}

app.use(express.json({ limit: '10mb' })) // Increase limit for image uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Make io accessible to routes
app.set('io', io)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/workouts', workoutRoutes)
app.use('/api/social', socialRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/classes', classRoutes)
app.use('/api/challenges', challengeRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Socket.io connection handling
const onlineUsers = new Map()

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)
  
  // User joins with their ID
  socket.on('join', (userId) => {
    onlineUsers.set(userId, socket.id)
    socket.userId = userId
    console.log('User joined:', userId)
    io.emit('userOnline', userId)
  })
  
  // Send message
  socket.on('sendMessage', async (data) => {
    const { to, message, from, fromName } = data
    const recipientSocket = onlineUsers.get(to)
    
    // Save message to DB
    try {
      const Message = (await import('./models/Message.js')).default
      const newMsg = new Message({
        from: from,
        to: to,
        content: message,
        read: false
      })
      await newMsg.save()
      
      // Send to recipient if online
      if (recipientSocket) {
        io.to(recipientSocket).emit('newMessage', {
          from,
          fromName,
          message,
          timestamp: new Date()
        })
      }
      
      // Confirm to sender
      socket.emit('messageSent', { success: true, messageId: newMsg._id })
    } catch (error) {
      console.error('Error saving message:', error)
      socket.emit('messageSent', { success: false })
    }
  })
  
  // Typing indicator
  socket.on('typing', (data) => {
    const recipientSocket = onlineUsers.get(data.to)
    if (recipientSocket) {
      io.to(recipientSocket).emit('userTyping', { from: data.from })
    }
  })
  
  // Disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId)
      io.emit('userOffline', socket.userId)
    }
    console.log('User disconnected:', socket.id)
  })
})

// Connect to MongoDB and start server
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Conectado a MongoDB Atlas - altusGym')
    console.log('🌍 Environment:', process.env.NODE_ENV || 'development')
    console.log('🔐 JWT Secret configured:', !!process.env.JWT_SECRET)
    console.log('🌐 Client URL:', process.env.CLIENT_URL || 'not set')
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`📱 Accede desde tu celular en: http://${LOCAL_IP}:5173`)
        console.log(`💻 Accede localmente en: http://localhost:5173`)
        console.log(`🔌 API disponible en: http://${LOCAL_IP}:${PORT}/api`)
      } else {
        console.log(`🌐 Servidor en producción`)
        console.log(`🔌 API disponible en: https://altus-gym-server.onrender.com/api`)
      }
      console.log('✅ Servidor listo para recibir peticiones')
    })
  })
  .catch((error) => {
    console.error('❌ Error de conexión a MongoDB:', error.message)
    console.error('Error details:', error)
    process.exit(1)
  })
