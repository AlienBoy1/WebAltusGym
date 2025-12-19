import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import Notification from '../models/Notification.js'

const router = express.Router()

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    
    // Check if user exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'El email ya está registrado' })
    }
    
    // Check if it's the first user (becomes admin)
    const userCount = await User.countDocuments()
    const isFirstUser = userCount === 0
    
    // Create user (password will be hashed by the model's pre-save middleware)
    const user = new User({
      name,
      email,
      password,
      role: isFirstUser ? 'admin' : 'user',
      membership: {
        plan: isFirstUser ? 'elite' : 'basic',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + (isFirstUser ? 365 : 30) * 24 * 60 * 60 * 1000)
      },
      stats: {
        totalWorkouts: 0,
        currentStreak: 0,
        longestStreak: 0,
        level: 1,
        xp: 0
      }
    })
    
    await user.save()
    
    // Create welcome notification
    const notification = new Notification({
      user: user._id,
      type: 'welcome',
      title: isFirstUser ? '¡Bienvenido Administrador!' : '¡Bienvenido a ALTUS GYM!',
      body: isFirstUser 
        ? 'Eres el primer usuario y administrador. Tienes acceso completo al panel de administración.'
        : '¡Comienza tu viaje fitness hoy! Explora las funciones de la app.',
      icon: '🏋️',
      priority: 'high'
    })
    await notification.save()
    
    // Generate token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'altus_secret_key_2024',
      { expiresIn: '30d' }
    )
    
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        membership: user.membership,
        stats: user.stats
      },
      isFirstUser
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ message: 'Error al registrar usuario', error: error.message })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    
    console.log('Login attempt:', email)
    
    // Find user
    const user = await User.findOne({ email })
    if (!user) {
      console.log('User not found:', email)
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }
    
    console.log('User found:', user.email, 'Has password:', !!user.password)
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password)
    console.log('Password match:', isMatch)
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' })
    }
    
    // Update last login
    user.lastLogin = new Date()
    await user.save()
    
    // Generate token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'altus_secret_key_2024',
      { expiresIn: '30d' }
    )
    
    res.json({
      message: 'Login exitoso',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        membership: user.membership,
        stats: user.stats
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Error al iniciar sesión', error: error.message })
  }
})

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ message: 'No autorizado' })
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'altus_secret_key_2024')
    const user = await User.findById(decoded.userId).select('-password')
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }
    
    res.json({ user })
  } catch (error) {
    res.status(401).json({ message: 'Token inválido' })
  }
})

export default router
