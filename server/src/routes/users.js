import express from 'express'
import mongoose from 'mongoose'
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

// Get profile (with settings)
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password')
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }
    res.json({ 
      ...user.toObject(),
      settings: user.settings || {}
    })
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener perfil', error: error.message })
  }
})

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, avatar, phone, emergencyContact, goals, settings } = req.body
    
    const updateData = {}
    if (name) updateData.name = name
    if (avatar !== undefined) updateData.avatar = avatar
    if (phone !== undefined) updateData.phone = phone
    if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact
    if (goals !== undefined) updateData.goals = goals
    if (settings !== undefined) {
      // Merge settings to preserve existing nested values
      const user = await User.findById(req.user._id)
      const currentSettings = user.settings || {}
      // Deep merge for nested objects
      const mergedSettings = {
        ...currentSettings,
        ...settings,
        notifications: { ...currentSettings.notifications, ...settings.notifications },
        privacy: { ...currentSettings.privacy, ...settings.privacy },
        workout: { ...currentSettings.workout, ...settings.workout },
        accessibility: { ...currentSettings.accessibility, ...settings.accessibility },
        units: { ...currentSettings.units, ...settings.units }
      }
      updateData.settings = mergedSettings
    }
    updateData.updatedAt = new Date()
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
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

// Get available memberships
router.get('/memberships', authenticate, async (req, res) => {
  try {
    const Membership = (await import('../models/Membership.js')).default
    const memberships = await Membership.find({ active: true }).sort({ price: 1 })
    res.json(memberships)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener membresías', error: error.message })
  }
})

// Get all badge definitions
router.get('/badges/definitions', authenticate, async (req, res) => {
  try {
    const { getBadgeDefinitions } = await import('../services/xpService.js')
    const definitions = getBadgeDefinitions()
    res.json(definitions)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener definiciones de insignias', error: error.message })
  }
})

// Search users (for chat) - MUST be before /:id route
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q, filter } = req.query
    
    // Refresh user to get latest social data
    const currentUser = await User.findById(req.user._id)
    if (!currentUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }
    
    // Build base query - always exclude current user
    let query = {
      _id: { $ne: req.user._id }
    }
    
    // Apply search term FIRST (by name or email)
    if (q && q.trim() !== '') {
      const searchTerm = q.trim()
      // Only search by name and email, NOT by ID
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ]
    }
    
    // Apply filters AFTER search term
    if (filter === 'with_conversation') {
      const Message = (await import('../models/Message.js')).default
      const conversations = await Message.distinct('from', { to: req.user._id })
      const sentTo = await Message.distinct('to', { from: req.user._id })
      const allConversationIds = [...new Set([
        ...conversations.map(id => id.toString()), 
        ...sentTo.map(id => id.toString())
      ])].filter(id => id !== req.user._id.toString())
      
      if (allConversationIds.length > 0) {
        const validIds = allConversationIds
          .filter(id => mongoose.Types.ObjectId.isValid(id))
          .map(id => new mongoose.Types.ObjectId(id))
        
        // Combine with existing _id condition
        query._id = {
          $ne: req.user._id,
          $in: validIds
        }
      } else {
        return res.json([])
      }
    } else if (filter === 'following') {
      const following = currentUser.social?.following || []
      if (following.length > 0) {
        const followingIds = following
          .map(id => {
            const idStr = typeof id === 'object' ? (id._id?.toString() || id.toString()) : id.toString()
            return idStr
          })
          .filter(id => id !== req.user._id.toString() && mongoose.Types.ObjectId.isValid(id))
          .map(id => new mongoose.Types.ObjectId(id))
        
        if (followingIds.length > 0) {
          query._id = {
            $ne: req.user._id,
            $in: followingIds
          }
        } else {
          return res.json([])
        }
      } else {
        return res.json([])
      }
    } else if (filter === 'not_following') {
      const following = currentUser.social?.following || []
      const followingIds = following
        .map(id => {
          const idStr = typeof id === 'object' ? (id._id?.toString() || id.toString()) : id.toString()
          return idStr
        })
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id))
      
      if (followingIds.length > 0) {
        query._id = {
          $ne: req.user._id,
          $nin: followingIds
        }
      }
      // If not following anyone, query._id stays as { $ne: req.user._id }
    }
    
    // Execute query
    const users = await User.find(query)
      .select('name email avatar')
      .limit(50)
      .lean()
    
    res.json(users || [])
  } catch (error) {
    console.error('Error searching users:', error)
    console.error('Query params:', req.query)
    res.status(500).json({ message: 'Error al buscar usuarios', error: error.message })
  }
})

// Get user by ID - MUST be after /search route
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    
    // Validate ID format - check if it's a valid ObjectId
    if (!id || id === '[object Object]' || id === 'undefined' || id === 'null' || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID de usuario inválido' })
    }
    
    const user = await User.findById(id)
      .select('-password')
      .populate('badges')
      .populate('social.followers', 'name avatar')
      .populate('social.following', 'name avatar')
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }
    
    // Ensure badges array exists
    if (!user.badges) {
      user.badges = []
    }
    
    // Ensure social object exists
    if (!user.social) {
      user.social = { followers: [], following: [], followRequests: [], pendingRequests: [] }
    }
    
    // Check if visited user follows current user (for "Follow Back" button)
    const currentUser = await User.findById(req.user._id)
    const isFollowingCurrentUser = currentUser.social?.followers?.some(
      followerId => {
        const followerIdStr = typeof followerId === 'object' ? followerId._id?.toString() || followerId.toString() : followerId.toString()
        return followerIdStr === id
      }
    ) || false
    
    const userObj = user.toObject()
    userObj.isFollowingCurrentUser = isFollowingCurrentUser
    
    res.json(userObj)
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'ID de usuario inválido' })
    }
    res.status(500).json({ message: 'Error al obtener usuario', error: error.message })
  }
})

export default router
