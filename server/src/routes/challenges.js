import express from 'express'
import mongoose from 'mongoose'
import Challenge from '../models/Challenge.js'
import Notification from '../models/Notification.js'
import User from '../models/User.js'
import { authenticate, isAdmin } from '../middleware/auth.js'
import { awardXP } from '../services/xpService.js'

const router = express.Router()

// Get all active challenges
router.get('/', authenticate, async (req, res) => {
  try {
    const { active = true, featured } = req.query
    const filter = {}
    
    if (active === 'true') {
      filter.endDate = { $gte: new Date() }
    }
    if (featured === 'true') {
      filter.featured = true
    }
    
    const challenges = await Challenge.find(filter)
      .populate('createdBy', 'name avatar')
      .populate('participants.user', 'name avatar')
      .sort({ featured: -1, startDate: 1 })
    
    res.json(challenges)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener retos', error: error.message })
  }
})

// Get user's challenges
router.get('/my', authenticate, async (req, res) => {
  try {
    const challenges = await Challenge.find({
      'participants.user': req.user._id
    })
      .populate('createdBy', 'name avatar')
      .sort({ endDate: 1 })
    
    res.json(challenges)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener tus retos', error: error.message })
  }
})

// Get single challenge
router.get('/:id', authenticate, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id)
      .populate('createdBy', 'name avatar')
      .populate('participants.user', 'name avatar stats.level')
    
    if (!challenge) {
      return res.status(404).json({ message: 'Reto no encontrado' })
    }
    
    // Sort participants by progress
    challenge.participants.sort((a, b) => b.progress - a.progress)
    
    res.json(challenge)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener reto', error: error.message })
  }
})

// Create challenge
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, type, goal, startDate, endDate, reward, targetUsers } = req.body
    
    // Validation
    if (!title || !type || !goal || !startDate || !endDate) {
      return res.status(400).json({ message: 'Faltan campos requeridos' })
    }
    
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: 'La fecha de inicio debe ser anterior a la fecha de fin' })
    }
    
    // Validate targetUsers if provided
    if (targetUsers && Array.isArray(targetUsers) && targetUsers.length > 0) {
      const validUserIds = targetUsers.filter(id => {
        try {
          return mongoose.Types.ObjectId.isValid(id)
        } catch {
          return false
        }
      })
      
      if (validUserIds.length !== targetUsers.length) {
        return res.status(400).json({ message: 'Algunos IDs de usuarios no son válidos' })
      }
      
      // Remove duplicates
      const uniqueUserIds = [...new Set(validUserIds.map(id => id.toString()))]
      
      const challenge = new Challenge({
        title,
        type,
        goal,
        startDate,
        endDate,
        reward: reward || { xp: 100 },
        createdBy: req.user._id,
        isPublic: !targetUsers || targetUsers.length === 0
      })
      
      // Auto-join creator
      challenge.participants.push({ user: req.user._id })
      
      await challenge.save()
      
      // Send notifications to target users in background (non-blocking)
      if (uniqueUserIds.length > 0) {
        process.nextTick(async () => {
          try {
            const batchSize = 10
            for (let i = 0; i < uniqueUserIds.length; i += batchSize) {
              const batch = uniqueUserIds.slice(i, i + batchSize)
              await Promise.all(
                batch.map(async (userId) => {
                  try {
                    await Notification.create({
                      user: userId,
                      type: 'challenge_invite',
                      title: '¡Nuevo reto disponible!',
                      body: `${req.user.name} te ha invitado a "${title}"`,
                      icon: '🎯',
                      priority: 'medium'
                    })
                  } catch (err) {
                    console.error(`Error creating notification for user ${userId}:`, err)
                  }
                })
              )
            }
          } catch (err) {
            console.error('Error sending challenge notifications:', err)
          }
        })
      }
      
      await challenge.populate('createdBy', 'name avatar')
      res.status(201).json(challenge)
    } else {
      // Public challenge
      const challenge = new Challenge({
        title,
        type,
        goal,
        startDate,
        endDate,
        reward: reward || { xp: 100 },
        createdBy: req.user._id,
        isPublic: true
      })
      
      // Auto-join creator
      challenge.participants.push({ user: req.user._id })
      
      await challenge.save()
      await challenge.populate('createdBy', 'name avatar')
      res.status(201).json(challenge)
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al crear reto', error: error.message })
  }
})

// Join challenge
router.post('/:id/join', authenticate, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id)
    
    if (!challenge) {
      return res.status(404).json({ message: 'Reto no encontrado' })
    }
    
    // Check if already participating
    const isParticipating = challenge.participants.some(
      p => p.user.toString() === req.user._id.toString()
    )
    
    if (isParticipating) {
      return res.status(400).json({ message: 'Ya participas en este reto' })
    }
    
    // Check if challenge has started
    if (new Date() > challenge.endDate) {
      return res.status(400).json({ message: 'Este reto ya ha terminado' })
    }
    
    challenge.participants.push({ user: req.user._id })
    await challenge.save()
    
    await Notification.create({
      user: req.user._id,
      type: 'challenge_invite',
      title: '¡Te uniste al reto!',
      body: `Ahora participas en "${challenge.title}"`,
      icon: '🎯'
    })
    
    res.json({ message: 'Te has unido al reto', challenge })
  } catch (error) {
    res.status(500).json({ message: 'Error al unirse al reto', error: error.message })
  }
})

// Leave challenge
router.delete('/:id/leave', authenticate, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id)
    
    if (!challenge) {
      return res.status(404).json({ message: 'Reto no encontrado' })
    }
    
    challenge.participants = challenge.participants.filter(
      p => p.user.toString() !== req.user._id.toString()
    )
    
    await challenge.save()
    
    res.json({ message: 'Has abandonado el reto' })
  } catch (error) {
    res.status(500).json({ message: 'Error al abandonar reto', error: error.message })
  }
})

// Update progress
router.put('/:id/progress', authenticate, async (req, res) => {
  try {
    const { progress } = req.body
    
    if (progress === undefined || progress === null || progress < 0) {
      return res.status(400).json({ message: 'El progreso es requerido y debe ser un número no negativo' })
    }
    
    const challenge = await Challenge.findById(req.params.id)
    
    if (!challenge) {
      return res.status(404).json({ message: 'Reto no encontrado' })
    }
    
    const participant = challenge.participants.find(
      p => p.user.toString() === req.user._id.toString()
    )
    
    if (!participant) {
      return res.status(400).json({ message: 'No participas en este reto' })
    }
    
    const wasCompleted = participant.completed
    const oldProgress = participant.progress
    participant.progress = progress
    
    // Check if completed
    if (progress >= challenge.goal && !participant.completed) {
      participant.completed = true
      participant.completedAt = new Date()
      
      // Award XP using xpService (skip badge check to prevent infinite loop)
      try {
        await awardXP(req.user._id, challenge.reward?.xp || 100, `Completaste el reto: ${challenge.title}`, true)
      } catch (xpError) {
        console.error('Error awarding XP:', xpError)
      }
      
      // Award badge if specified
      if (challenge.reward?.badge) {
        const user = await User.findById(req.user._id)
        const hasBadge = user.badges?.some(b => (b.id || b._id) === challenge.reward.badge.id)
        if (!hasBadge) {
          user.badges = user.badges || []
          user.badges.push({
            id: challenge.reward.badge.id,
            name: challenge.reward.badge.name,
            icon: challenge.reward.badge.icon,
            earnedAt: new Date()
          })
          await user.save()
        }
      }
      
      // Send notification in background
      process.nextTick(async () => {
        try {
          await Notification.create({
            user: req.user._id,
            type: 'challenge_complete',
            title: '🏆 ¡Reto completado!',
            body: `Completaste "${challenge.title}" y ganaste ${challenge.reward?.xp || 100} XP`,
            icon: '🏆',
            priority: 'high'
          })
        } catch (err) {
          console.error('Error creating completion notification:', err)
        }
      })
    }
    
    await challenge.save()
    
    // Populate and send response immediately, then populate in background
    const responseData = {
      message: 'Progreso actualizado',
      participant: {
        ...participant.toObject(),
        user: req.user._id
      },
      challenge: {
        _id: challenge._id,
        title: challenge.title,
        goal: challenge.goal
      }
    }
    
    res.json(responseData)
    
    // Populate in background for future requests
    process.nextTick(async () => {
      try {
        await challenge.populate('participants.user', 'name avatar stats.level')
      } catch (err) {
        console.error('Error populating challenge:', err)
      }
    })
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar progreso', error: error.message })
  }
})

// Complete challenge and get XP
router.post('/:id/complete', authenticate, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id)
    
    if (!challenge) {
      return res.status(404).json({ message: 'Reto no encontrado' })
    }
    
    const participant = challenge.participants.find(
      p => p.user.toString() === req.user._id.toString()
    )
    
    if (!participant) {
      return res.status(400).json({ message: 'No participas en este reto' })
    }
    
    if (participant.completed) {
      return res.status(400).json({ message: 'Ya completaste este reto' })
    }
    
    if (participant.progress < challenge.goal) {
      return res.status(400).json({ message: 'No has alcanzado el objetivo del reto' })
    }
    
    participant.completed = true
    participant.completedAt = new Date()
    
    // Award XP using xpService
    try {
      await awardXP(req.user._id, challenge.reward?.xp || 100, `Completaste el reto: ${challenge.title}`, false)
    } catch (xpError) {
      console.error('Error awarding XP:', xpError)
    }
    
    // Award badge if specified
    if (challenge.reward?.badge) {
      const user = await User.findById(req.user._id)
      const hasBadge = user.badges?.some(b => (b.id || b._id) === challenge.reward.badge.id)
      if (!hasBadge) {
        user.badges = user.badges || []
        user.badges.push({
          id: challenge.reward.badge.id,
          name: challenge.reward.badge.name,
          icon: challenge.reward.badge.icon,
          earnedAt: new Date()
        })
        await user.save()
      }
    }
    
    await challenge.save()
    
    await Notification.create({
      user: req.user._id,
      type: 'challenge_complete',
      title: '🏆 ¡Reto completado!',
      body: `Completaste "${challenge.title}" y ganaste ${challenge.reward?.xp || 100} XP`,
      icon: '🏆',
      priority: 'high'
    })
    
    res.json({ 
      message: 'Reto completado exitosamente', 
      xpAwarded: challenge.reward?.xp || 100,
      participant 
    })
  } catch (error) {
    res.status(500).json({ message: 'Error al completar reto', error: error.message })
  }
})

// Get leaderboard
router.get('/:id/leaderboard', authenticate, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id)
      .populate('participants.user', 'name avatar stats.level')
    
    if (!challenge) {
      return res.status(404).json({ message: 'Reto no encontrado' })
    }
    
    const leaderboard = challenge.participants
      .sort((a, b) => b.progress - a.progress)
      .map((p, index) => ({
        rank: index + 1,
        user: p.user,
        progress: p.progress,
        completed: p.completed,
        completedAt: p.completedAt,
        percentage: Math.min(100, (p.progress / challenge.goal) * 100)
      }))
    
    res.json(leaderboard)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener ranking', error: error.message })
  }
})

// Admin: Delete challenge
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await Challenge.findByIdAndDelete(req.params.id)
    res.json({ message: 'Reto eliminado' })
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar reto', error: error.message })
  }
})

export default router

