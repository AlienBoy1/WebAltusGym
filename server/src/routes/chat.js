import express from 'express'
import Message from '../models/Message.js'
import User from '../models/User.js'
import GroupChat from '../models/GroupChat.js'
import GroupMessage from '../models/GroupMessage.js'
import { authenticate, isAdmin } from '../middleware/auth.js'

const router = express.Router()

// Get conversations
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const userId = req.user._id
    
    // Get all messages where user is sender or receiver
    const messages = await Message.find({
      $or: [{ from: userId }, { to: userId }]
    }).sort({ createdAt: -1 })
    
    // Group by conversation partner
    const conversationMap = new Map()
    
    for (const msg of messages) {
      const partnerId = msg.from.toString() === userId.toString() ? msg.to : msg.from
      const partnerIdStr = partnerId.toString()
      
      if (!conversationMap.has(partnerIdStr)) {
        conversationMap.set(partnerIdStr, {
          oderId: partnerIdStr,
          lastMessage: msg.content,
          lastMessageTime: msg.createdAt,
          unread: msg.to.toString() === userId.toString() && !msg.read ? 1 : 0
        })
      } else if (msg.to.toString() === userId.toString() && !msg.read) {
        conversationMap.get(partnerIdStr).unread++
      }
    }
    
    // Get user details for each conversation
    const conversations = []
    for (const [oderId, conv] of conversationMap) {
      const user = await User.findById(oderId).select('name avatar')
      if (user) {
        conversations.push({
          id: oderId,
          oderId,
          name: user.name,
          avatar: user.avatar || user.name?.charAt(0) || '👤',
          lastMessage: conv.lastMessage,
          time: conv.lastMessageTime,
          unread: conv.unread
        })
      }
    }
    
    res.json(conversations)
  } catch (error) {
    res.status(500).json({ message: 'Error', error: error.message })
  }
})

// Get messages with a specific user
router.get('/messages/:userId', authenticate, async (req, res) => {
  try {
    const myId = req.user._id
    const oderId = req.params.userId
    
    const messages = await Message.find({
      $or: [
        { from: myId, to: oderId },
        { from: oderId, to: myId }
      ]
    }).sort({ createdAt: 1 })
    
    // Mark messages as read
    await Message.updateMany(
      { from: oderId, to: myId, read: false },
      { read: true }
    )
    
    // Mark messages as delivered if recipient is viewing
    await Message.updateMany(
      { from: oderId, to: myId, delivered: false },
      { delivered: true, deliveredAt: new Date() }
    )
    
    const formatted = messages.map(m => ({
      id: m._id,
      sender: m.from.toString() === myId.toString() ? 'me' : 'other',
      text: m.content,
      time: new Date(m.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      read: m.read || false,
      readAt: m.readAt || null,
      delivered: m.delivered || false,
      deliveredAt: m.deliveredAt || null
    }))
    
    res.json(formatted)
  } catch (error) {
    res.status(500).json({ message: 'Error', error: error.message })
  }
})

// Send message (REST fallback)
router.post('/send', authenticate, async (req, res) => {
  try {
    const { to, content } = req.body
    
    // Check if both users follow each other
    const currentUser = await User.findById(req.user._id)
    const targetUser = await User.findById(to)
    
    if (!targetUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' })
    }
    
    // Check if current user follows target user
    const currentFollowsTarget = currentUser.social?.following?.some(
      id => id.toString() === to
    )
    
    // Check if target user follows current user
    const targetFollowsCurrent = targetUser.social?.followers?.some(
      id => id.toString() === req.user._id.toString()
    )
    
    // Both must follow each other to send messages
    if (!currentFollowsTarget || !targetFollowsCurrent) {
      return res.status(403).json({ 
        message: 'No puedes comunicarte con un usuario que aún no sigues ni te sigue. Completen su follow para poder intercambiar mensajes en Altus Gym' 
      })
    }
    
    const message = new Message({
      from: req.user._id,
      to,
      content,
      delivered: true,
      deliveredAt: new Date()
    })
    
    await message.save()
    
    // Create notification for recipient
    const Notification = (await import('../models/Notification.js')).default
    await Notification.create({
      user: to,
      type: 'message',
      title: 'Nuevo mensaje',
      body: `${currentUser.name}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
      icon: '💬',
      relatedUser: req.user._id,
      priority: 'normal',
      metadata: {
        messageId: message._id,
        fromUserId: req.user._id,
        fromUserName: currentUser.name
      }
    })
    
    res.status(201).json({
      id: message._id,
      sender: 'me',
      text: content,
      time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      delivered: true
    })
  } catch (error) {
    res.status(500).json({ message: 'Error', error: error.message })
  }
})

// ========== GROUP CHAT ROUTES (Admin Only) ==========

// Create group chat (admin only)
router.post('/groups', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, description, memberIds } = req.body
    
    if (!name || !memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: 'Nombre y al menos un miembro son requeridos' })
    }
    
    const group = new GroupChat({
      name,
      description: description || '',
      createdBy: req.user._id,
      isAdminOnly: true,
      members: [
        { user: req.user._id, role: 'admin' },
        ...memberIds.map(id => ({ user: id, role: 'member' }))
      ]
    })
    
    await group.save()
    await group.populate('members.user', 'name avatar')
    await group.populate('createdBy', 'name avatar')
    
    res.status(201).json(group)
  } catch (error) {
    res.status(500).json({ message: 'Error al crear grupo', error: error.message })
  }
})

// Get all group chats (admin only)
router.get('/groups', authenticate, async (req, res) => {
  try {
    // Only admins can see groups, but check membership too
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Solo administradores pueden ver grupos' })
    }
    
    const groups = await GroupChat.find({
      'members.user': req.user._id
    })
      .populate('members.user', 'name avatar')
      .populate('createdBy', 'name avatar')
      .sort({ updatedAt: -1 })
      .lean()
    
    res.json(groups || [])
  } catch (error) {
    console.error('Error fetching groups:', error)
    res.status(500).json({ message: 'Error al obtener grupos', error: error.message })
  }
})

// Get group messages
router.get('/groups/:groupId/messages', authenticate, async (req, res) => {
  try {
    const group = await GroupChat.findById(req.params.groupId)
    if (!group) {
      return res.status(404).json({ message: 'Grupo no encontrado' })
    }
    
    // Check if user is member
    const isMember = group.members.some(m => {
      const userId = typeof m.user === 'object' ? m.user._id?.toString() || m.user.toString() : m.user.toString()
      return userId === req.user._id.toString()
    })
    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No eres miembro de este grupo' })
    }
    
    const messages = await GroupMessage.find({ group: req.params.groupId })
      .populate('from', 'name avatar')
      .sort({ createdAt: 1 })
    
    // Mark messages as delivered for current user
    await GroupMessage.updateMany(
      { 
        group: req.params.groupId,
        'deliveredTo.user': { $ne: req.user._id }
      },
      { 
        $push: { deliveredTo: { user: req.user._id, deliveredAt: new Date() } }
      }
    )
    
    // Mark messages as read for current user
    await GroupMessage.updateMany(
      { 
        group: req.params.groupId,
        'readBy.user': { $ne: req.user._id }
      },
      { 
        $push: { readBy: { user: req.user._id, readAt: new Date() } }
      }
    )
    
    const formatted = messages.map(m => {
      const fromId = typeof m.from === 'object' && m.from?._id 
        ? m.from._id.toString() 
        : (typeof m.from === 'object' ? m.from.toString() : m.from?.toString() || '')
      const isMe = fromId === req.user._id.toString()
      
      return {
        id: m._id,
        sender: isMe ? 'me' : 'other',
        senderName: typeof m.from === 'object' && m.from?.name ? m.from.name : 'Usuario',
        senderAvatar: typeof m.from === 'object' && m.from?.avatar ? m.from.avatar : null,
        text: m.content,
        time: new Date(m.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
        read: m.readBy?.some(r => {
          const rUserId = typeof r.user === 'object' ? (r.user._id?.toString() || r.user.toString()) : r.user.toString()
          return rUserId === req.user._id.toString()
        }) || false,
        delivered: m.deliveredTo?.some(d => {
          const dUserId = typeof d.user === 'object' ? (d.user._id?.toString() || d.user.toString()) : d.user.toString()
          return dUserId === req.user._id.toString()
        }) || false
      }
    })
    
    res.json(formatted)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener mensajes', error: error.message })
  }
})

// Send message to group
router.post('/groups/:groupId/messages', authenticate, async (req, res) => {
  try {
    const { content } = req.body
    const group = await GroupChat.findById(req.params.groupId)
    
    if (!group) {
      return res.status(404).json({ message: 'Grupo no encontrado' })
    }
    
    // Check if user is member
    const isMember = group.members.some(m => {
      const userId = typeof m.user === 'object' ? m.user._id?.toString() || m.user.toString() : m.user.toString()
      return userId === req.user._id.toString()
    })
    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No eres miembro de este grupo' })
    }
    
    const message = new GroupMessage({
      group: req.params.groupId,
      from: req.user._id,
      content,
      deliveredTo: [{ user: req.user._id, deliveredAt: new Date() }],
      readBy: [{ user: req.user._id, readAt: new Date() }]
    })
    
    await message.save()
    await message.populate('from', 'name avatar')
    
    res.status(201).json({
      id: message._id,
      sender: 'me',
      senderName: message.from.name,
      senderAvatar: message.from.avatar,
      text: content,
      time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      delivered: true
    })
  } catch (error) {
    res.status(500).json({ message: 'Error al enviar mensaje', error: error.message })
  }
})

// Add members to group (admin only)
router.post('/groups/:groupId/members', authenticate, isAdmin, async (req, res) => {
  try {
    const { memberIds } = req.body
    const group = await GroupChat.findById(req.params.groupId)
    
    if (!group) {
      return res.status(404).json({ message: 'Grupo no encontrado' })
    }
    
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: 'IDs de miembros requeridos' })
    }
    
    for (const memberId of memberIds) {
      const alreadyMember = group.members.some(m => m.user.toString() === memberId)
      if (!alreadyMember) {
        group.members.push({ user: memberId, role: 'member' })
      }
    }
    
    await group.save()
    await group.populate('members.user', 'name avatar')
    
    res.json(group)
  } catch (error) {
    res.status(500).json({ message: 'Error al agregar miembros', error: error.message })
  }
})

// Remove member from group (admin only)
router.delete('/groups/:groupId/members/:memberId', authenticate, isAdmin, async (req, res) => {
  try {
    const group = await GroupChat.findById(req.params.groupId)
    
    if (!group) {
      return res.status(404).json({ message: 'Grupo no encontrado' })
    }
    
    group.members = group.members.filter(m => m.user.toString() !== req.params.memberId)
    await group.save()
    
    res.json({ message: 'Miembro eliminado' })
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar miembro', error: error.message })
  }
})

export default router
