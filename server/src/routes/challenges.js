import express from 'express'
import Challenge from '../models/Challenge.js'
import Notification from '../models/Notification.js'
import User from '../models/User.js'
import { authenticate, isAdmin } from '../middleware/auth.js'

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
    const challenge = new Challenge({
      ...req.body,
      createdBy: req.user._id
    })
    
    // Auto-join creator
    challenge.participants.push({ user: req.user._id })
    
    await challenge.save()
    
    res.status(201).json(challenge)
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
    
    participant.progress = progress
    
    // Check if completed
    if (progress >= challenge.goal && !participant.completed) {
      participant.completed = true
      participant.completedAt = new Date()
      
      // Award XP and badge
      const user = await User.findById(req.user._id)
      user.stats.xp += challenge.reward.xp
      
      if (challenge.reward.badge) {
        user.badges.push({
          id: challenge.reward.badge.id,
          name: challenge.reward.badge.name,
          icon: challenge.reward.badge.icon
        })
      }
      
      await user.save()
      
      await Notification.create({
        user: req.user._id,
        type: 'challenge_complete',
        title: '🏆 ¡Reto completado!',
        body: `Completaste "${challenge.title}" y ganaste ${challenge.reward.xp} XP`,
        icon: '🏆',
        priority: 'high'
      })
    }
    
    await challenge.save()
    
    res.json({ message: 'Progreso actualizado', participant })
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar progreso', error: error.message })
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

