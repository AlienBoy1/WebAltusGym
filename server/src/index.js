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

// Body parsing middleware (must be before routes)
app.use(express.json({ limit: '10mb' })) // Increase limit for image uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Log all requests in production (after body parser so we can see the body)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`)
    if (req.path.includes('login')) {
      console.log(`📥 Login request body keys:`, Object.keys(req.body || {}))
      console.log(`📥 Login request body:`, JSON.stringify(req.body))
      console.log(`📥 Email from body:`, req.body?.email)
      console.log(`📥 Password present:`, !!req.body?.password)
    }
  }
  next()
})

// Make io accessible to routes
app.set('io', io)

// Routes with /api prefix (primary)
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/workouts', workoutRoutes)
app.use('/api/social', socialRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/classes', classRoutes)
app.use('/api/challenges', challengeRoutes)

// Routes without /api prefix (for compatibility)
app.use('/auth', authRoutes)
app.use('/users', userRoutes)
app.use('/workouts', workoutRoutes)
app.use('/social', socialRoutes)
app.use('/admin', adminRoutes)
app.use('/notifications', notificationRoutes)
app.use('/chat', chatRoutes)
app.use('/classes', classRoutes)
app.use('/challenges', challengeRoutes)

// Health check endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/health', (req, res) => {
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
      const User = (await import('./models/User.js')).default
      const Notification = (await import('./models/Notification.js')).default
      
      // Check if both users follow each other
      const currentUser = await User.findById(from)
      const targetUser = await User.findById(to)
      
      if (!targetUser) {
        socket.emit('messageSent', { success: false, error: 'Usuario no encontrado' })
        return
      }
      
      // Check if current user follows target user
      const currentFollowsTarget = currentUser.social?.following?.some(
        id => id.toString() === to
      )
      
      // Check if target user follows current user
      const targetFollowsCurrent = targetUser.social?.followers?.some(
        id => id.toString() === from
      )
      
      // Both must follow each other to send messages
      if (!currentFollowsTarget || !targetFollowsCurrent) {
        socket.emit('messageSent', { 
          success: false, 
          error: 'No puedes comunicarte con un usuario que aún no sigues ni te sigue. Completen su follow para poder intercambiar mensajes en Altus Gym' 
        })
        return
      }
      
      const newMsg = new Message({
        from: from,
        to: to,
        content: message,
        read: false,
        delivered: !!recipientSocket,
        deliveredAt: recipientSocket ? new Date() : null
      })
      await newMsg.save()
      
      // Send to recipient if online
      if (recipientSocket) {
        io.to(recipientSocket).emit('newMessage', {
          from,
          fromName,
          message,
          messageId: newMsg._id,
          timestamp: new Date()
        })
      }
      
      // Create notification for recipient
      await Notification.create({
        user: to,
        type: 'message',
        title: 'Nuevo mensaje',
        body: `${fromName}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
        icon: '💬',
        relatedUser: from,
        priority: 'normal',
        metadata: {
          messageId: newMsg._id,
          fromUserId: from,
          fromUserName: fromName
        }
      })
      
      // Confirm to sender with delivery status
      socket.emit('messageSent', { 
        success: true, 
        messageId: newMsg._id,
        delivered: !!recipientSocket
      })
    } catch (error) {
      console.error('Error saving message:', error)
      socket.emit('messageSent', { success: false, error: error.message })
    }
  })
  
  // Mark message as read
  socket.on('markMessageRead', async (data) => {
    try {
      const { messageId } = data
      const Message = (await import('./models/Message.js')).default
      await Message.findByIdAndUpdate(messageId, { 
        read: true, 
        readAt: new Date() 
      })
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  })
  
  // Stop typing
  socket.on('stopTyping', (data) => {
    const recipientSocket = onlineUsers.get(data.to)
    if (recipientSocket) {
      io.to(recipientSocket).emit('userStoppedTyping', { from: data.from })
    }
  })
  
  // Typing indicator
  socket.on('typing', (data) => {
    const recipientSocket = onlineUsers.get(data.to)
    if (recipientSocket) {
      io.to(recipientSocket).emit('userTyping', { from: data.from })
    }
  })
  
  // Group message (admin only)
  socket.on('sendGroupMessage', async (data) => {
    try {
      const GroupMessage = (await import('./models/GroupMessage.js')).default
      const GroupChat = (await import('./models/GroupChat.js')).default
      const User = (await import('./models/User.js')).default
      
      const { groupId, content, from } = data
      
      // Verify user is member of group
      const group = await GroupChat.findById(groupId)
      if (!group) {
        socket.emit('groupMessageSent', { success: false, error: 'Grupo no encontrado' })
        return
      }
      
      const isMember = group.members.some(m => m.user.toString() === from)
      if (!isMember) {
        socket.emit('groupMessageSent', { success: false, error: 'No eres miembro de este grupo' })
        return
      }
      
      const message = new GroupMessage({
        group: groupId,
        from: from,
        content: content,
        deliveredTo: [{ user: from, deliveredAt: new Date() }]
      })
      
      await message.save()
      await message.populate('from', 'name avatar')
      
      // Send to all group members
      group.members.forEach(member => {
        const memberSocket = onlineUsers.get(member.user.toString())
        if (memberSocket) {
          io.to(memberSocket).emit('newGroupMessage', {
            groupId,
            from: from,
            fromName: message.from.name,
            message: content,
            messageId: message._id,
            timestamp: new Date()
          })
        }
      })
      
      socket.emit('groupMessageSent', { 
        success: true, 
        messageId: message._id,
        delivered: true
      })
    } catch (error) {
      console.error('Error sending group message:', error)
      socket.emit('groupMessageSent', { success: false, error: error.message })
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
