import express from 'express'
import User from '../models/User.js'
import Workout from '../models/Workout.js'
import { authenticate, isAdmin } from '../middleware/auth.js'

const router = express.Router()

// Get user stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Usuario no autenticado' })
    }
    
    const user = await User.findById(req.user._id)
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }
    
    // Get workout count with error handling
    let workoutCount = 0
    try {
      workoutCount = await Workout.countDocuments({ user: req.user._id })
    } catch (workoutError) {
      console.error('Error counting workouts:', workoutError)
      workoutCount = user.stats?.totalWorkouts || 0
    }
    
    res.json({
      totalWorkouts: workoutCount || user.stats?.totalWorkouts || 0,
      currentStreak: user.stats?.currentStreak || 0,
      longestStreak: user.stats?.longestStreak || 0,
      level: user.stats?.level || 1,
      xp: user.stats?.xp || 0
    })
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message })
  }
})

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, avatar, phone, emergencyContact, goals } = req.body
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 
        ...(name && { name }),
        ...(avatar && { avatar }),
        ...(phone && { phone }),
        ...(emergencyContact && { emergencyContact }),
        ...(goals && { goals }),
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password')
    
    res.json({ message: 'Perfil actualizado', user })
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar perfil', error: error.message })
  }
})

// Update role (admin only)
router.put('/:id/role', authenticate, isAdmin, async (req, res) => {
  try {
    const { role } = req.body
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Rol inválido' })
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password')
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }
    
    res.json({ message: 'Rol actualizado', user })
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar rol', error: error.message })
  }
})

// Update membership (admin only)
router.put('/:id/membership', authenticate, isAdmin, async (req, res) => {
  try {
    const { plan, status, endDate } = req.body
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        'membership.plan': plan,
        'membership.status': status,
        'membership.endDate': endDate
      },
      { new: true }
    ).select('-password')
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }
    
    res.json({ message: 'Membresía actualizada', user })
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar membresía', error: error.message })
  }
})

// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    
    // Validate ID format
    if (!id || id === '[object Object]' || id === 'undefined' || id === 'null') {
      return res.status(400).json({ message: 'ID de usuario inválido' })
    }
    
    const user = await User.findById(id)
      .select('-password')
      .populate('badges')
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }
    
    // Ensure badges array exists
    if (!user.badges) {
      user.badges = []
    }
    
    res.json(user)
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'ID de usuario inválido' })
    }
    res.status(500).json({ message: 'Error al obtener usuario', error: error.message })
  }
})

// Search users (for chat)
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q, filter } = req.query
    
    if (!q) {
      // Return all users if no query, with optional filters
      let query = { _id: { $ne: req.user._id } }
      
      if (filter === 'with_conversation') {
        // This would require checking Message model - for now return all
        const Message = (await import('../models/Message.js')).default
        const conversations = await Message.distinct('from', { to: req.user._id })
        const sentTo = await Message.distinct('to', { from: req.user._id })
        const allConversationIds = [...new Set([...conversations, ...sentTo])]
        query._id = { $ne: req.user._id, $in: allConversationIds }
      } else if (filter === 'following') {
        query._id = { $ne: req.user._id, $in: req.user.social?.following || [] }
      } else if (filter === 'not_following') {
        const following = req.user.social?.following || []
        query._id = { $ne: req.user._id, $nin: following }
      }
      
      const users = await User.find(query).select('name email avatar').limit(50)
      return res.json(users)
    }
    
    let query = {
      _id: { $ne: req.user._id },
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    }
    
    if (filter === 'with_conversation') {
      const Message = (await import('../models/Message.js')).default
      const conversations = await Message.distinct('from', { to: req.user._id })
      const sentTo = await Message.distinct('to', { from: req.user._id })
      const allConversationIds = [...new Set([...conversations, ...sentTo])]
      query._id = { $ne: req.user._id, $in: allConversationIds }
    } else if (filter === 'following') {
      query._id = { $ne: req.user._id, $in: req.user.social?.following || [] }
    } else if (filter === 'not_following') {
      const following = req.user.social?.following || []
      query._id = { $ne: req.user._id, $nin: following }
    }
    
    const users = await User.find(query).select('name email avatar').limit(10)
    
    res.json(users)
  } catch (error) {
    res.status(500).json({ message: 'Error', error: error.message })
  }
})

export default router
