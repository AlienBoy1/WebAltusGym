import express from 'express'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import Attendance from '../models/Attendance.js'
import Workout from '../models/Workout.js'
import { authenticate, isAdmin } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticate, isAdmin)

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const activeMembers = await User.countDocuments({ 'membership.status': 'active' })
    const expiringMembers = await User.countDocuments({ 'membership.status': 'expiring' })
    const expiredMembers = await User.countDocuments({ 'membership.status': 'expired' })
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayAttendance = await Attendance.countDocuments({ checkIn: { $gte: today } })
    const monthlyRevenue = activeMembers * 45
    res.json({ totalUsers, activeMembers, expiringMembers, expiredMembers, todayAttendance, monthlyRevenue })
  } catch (error) {
    res.status(500).json({ message: 'Error', error: error.message })
  }
})

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { status, plan, search, page = 1, limit = 20 } = req.query
    const filter = {}
    if (status && status !== 'all') filter['membership.status'] = status
    if (plan) filter['membership.plan'] = plan
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }]
    const users = await User.find(filter).select('-password -twoFactorSecret').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit))
    const total = await User.countDocuments(filter)
    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / limit) })
  } catch (error) {
    res.status(500).json({ message: 'Error', error: error.message })
  }
})

// Create user (admin)
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, plan = 'basic' } = req.body
    const existing = await User.findOne({ email })
    if (existing) return res.status(400).json({ message: 'El email ya existe' })
    
    const user = new User({
      name, email, password, role: 'user',
      membership: { plan, status: 'active', startDate: new Date(), endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      stats: { totalWorkouts: 0, currentStreak: 0, longestStreak: 0, level: 1, xp: 0 }
    })
    await user.save()
    res.status(201).json({ message: 'Usuario creado', user: { ...user.toObject(), password: undefined } })
  } catch (error) {
    res.status(500).json({ message: 'Error', error: error.message })
  }
})

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const updates = req.body
    delete updates.password
    const user = await User.findByIdAndUpdate(req.params.id, { ...updates, updatedAt: new Date() }, { new: true }).select('-password')
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: 'Error', error: error.message })
  }
})

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id)
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' })
    await Workout.deleteMany({ user: user._id })
    await Attendance.deleteMany({ user: user._id })
    res.json({ message: 'Usuario eliminado' })
  } catch (error) {
    res.status(500).json({ message: 'Error', error: error.message })
  }
})

// Attendance report
router.get('/reports/attendance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()
    const attendance = await Attendance.aggregate([
      { $match: { checkIn: { $gte: start, $lte: end } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$checkIn' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
    res.json(attendance)
  } catch (error) {
    res.status(500).json({ message: 'Error', error: error.message })
  }
})

// Membership report
router.get('/reports/memberships', async (req, res) => {
  try {
    const byPlan = await User.aggregate([{ $group: { _id: '$membership.plan', count: { $sum: 1 } } }])
    const byStatus = await User.aggregate([{ $group: { _id: '$membership.status', count: { $sum: 1 } } }])
    res.json({ byPlan, byStatus })
  } catch (error) {
    res.status(500).json({ message: 'Error', error: error.message })
  }
})

export default router
