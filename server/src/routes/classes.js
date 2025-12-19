import express from 'express'
import Class from '../models/Class.js'
import Notification from '../models/Notification.js'
import { authenticate, isAdmin, isTrainerOrAdmin } from '../middleware/auth.js'

const router = express.Router()

// Get all classes
router.get('/', authenticate, async (req, res) => {
  try {
    const { date, type, instructor } = req.query
    const filter = { cancelled: false }
    
    if (type) filter.type = type
    if (instructor) filter.instructor = instructor
    
    const classes = await Class.find(filter)
      .populate('instructor', 'name avatar')
      .populate('enrolled.user', 'name avatar')
      .sort({ 'schedule.dayOfWeek': 1, 'schedule.startTime': 1 })
    
    res.json(classes)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener clases', error: error.message })
  }
})

// Get single class
router.get('/:id', authenticate, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id)
      .populate('instructor', 'name avatar email')
      .populate('enrolled.user', 'name avatar')
      .populate('waitlist.user', 'name avatar')
    
    if (!classItem) {
      return res.status(404).json({ message: 'Clase no encontrada' })
    }
    
    res.json(classItem)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener clase', error: error.message })
  }
})

// Create class (admin/trainer only)
router.post('/', authenticate, isTrainerOrAdmin, async (req, res) => {
  try {
    const classItem = new Class({
      ...req.body,
      instructor: req.body.instructor || req.user._id
    })
    
    await classItem.save()
    await classItem.populate('instructor', 'name avatar')
    
    res.status(201).json(classItem)
  } catch (error) {
    res.status(500).json({ message: 'Error al crear clase', error: error.message })
  }
})

// Update class
router.put('/:id', authenticate, isTrainerOrAdmin, async (req, res) => {
  try {
    const classItem = await Class.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('instructor', 'name avatar')
    
    if (!classItem) {
      return res.status(404).json({ message: 'Clase no encontrada' })
    }
    
    res.json(classItem)
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar clase', error: error.message })
  }
})

// Enroll in class
router.post('/:id/enroll', authenticate, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id)
    
    if (!classItem) {
      return res.status(404).json({ message: 'Clase no encontrada' })
    }
    
    // Check if already enrolled
    const isEnrolled = classItem.enrolled.some(
      e => e.user.toString() === req.user._id.toString()
    )
    
    if (isEnrolled) {
      return res.status(400).json({ message: 'Ya estás inscrito en esta clase' })
    }
    
    // Check capacity
    if (classItem.enrolled.length >= classItem.maxCapacity) {
      // Add to waitlist
      classItem.waitlist.push({ user: req.user._id })
      await classItem.save()
      
      return res.json({ 
        message: 'Clase llena. Te agregamos a la lista de espera',
        waitlistPosition: classItem.waitlist.length
      })
    }
    
    classItem.enrolled.push({ user: req.user._id })
    await classItem.save()
    
    // Create notification
    await Notification.create({
      user: req.user._id,
      type: 'class_reminder',
      title: '¡Inscripción confirmada!',
      body: `Te has inscrito en ${classItem.name}`,
      icon: '📅'
    })
    
    res.json({ message: 'Inscripción exitosa', classItem })
  } catch (error) {
    res.status(500).json({ message: 'Error al inscribirse', error: error.message })
  }
})

// Cancel enrollment
router.delete('/:id/enroll', authenticate, async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id)
    
    if (!classItem) {
      return res.status(404).json({ message: 'Clase no encontrada' })
    }
    
    // Remove from enrolled
    classItem.enrolled = classItem.enrolled.filter(
      e => e.user.toString() !== req.user._id.toString()
    )
    
    // Remove from waitlist
    classItem.waitlist = classItem.waitlist.filter(
      e => e.user.toString() !== req.user._id.toString()
    )
    
    // Move first from waitlist to enrolled if there's space
    if (classItem.waitlist.length > 0 && classItem.enrolled.length < classItem.maxCapacity) {
      const nextUser = classItem.waitlist.shift()
      classItem.enrolled.push({ user: nextUser.user })
      
      // Notify user from waitlist
      await Notification.create({
        user: nextUser.user,
        type: 'class_reminder',
        title: '¡Tienes un lugar!',
        body: `Se liberó un espacio en ${classItem.name}. Ya estás inscrito.`,
        icon: '🎉',
        priority: 'high'
      })
    }
    
    await classItem.save()
    
    res.json({ message: 'Inscripción cancelada' })
  } catch (error) {
    res.status(500).json({ message: 'Error al cancelar inscripción', error: error.message })
  }
})

// Cancel class (admin/trainer)
router.post('/:id/cancel', authenticate, isTrainerOrAdmin, async (req, res) => {
  try {
    const { reason } = req.body
    
    const classItem = await Class.findById(req.params.id)
    
    if (!classItem) {
      return res.status(404).json({ message: 'Clase no encontrada' })
    }
    
    classItem.cancelled = true
    classItem.cancelReason = reason
    await classItem.save()
    
    // Notify all enrolled users
    for (const enrollment of classItem.enrolled) {
      await Notification.create({
        user: enrollment.user,
        type: 'class_cancelled',
        title: 'Clase cancelada',
        body: `La clase ${classItem.name} ha sido cancelada. ${reason || ''}`,
        icon: '❌',
        priority: 'high'
      })
    }
    
    res.json({ message: 'Clase cancelada y usuarios notificados' })
  } catch (error) {
    res.status(500).json({ message: 'Error al cancelar clase', error: error.message })
  }
})

// Delete class
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await Class.findByIdAndDelete(req.params.id)
    res.json({ message: 'Clase eliminada' })
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar clase', error: error.message })
  }
})

export default router

