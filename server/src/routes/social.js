import express from 'express'
import Post from '../models/Post.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// Get feed
router.get('/feed', authenticate, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('user', 'name avatar stats')
      .populate('sharedFrom', 'user content')
      .populate('sharedFrom.user', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(50)
    
    res.json(posts)
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener feed', error: error.message })
  }
})

// Create post
router.post('/', authenticate, async (req, res) => {
  try {
    const { content, image, workoutId } = req.body
    
    const post = new Post({
      user: req.user._id,
      content,
      image,
      workout: workoutId
    })
    
    await post.save()
    await post.populate('user', 'name avatar stats')
    
    res.status(201).json(post)
  } catch (error) {
    res.status(500).json({ message: 'Error al crear publicación', error: error.message })
  }
})

// Like/Unlike post
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    
    if (!post) {
      return res.status(404).json({ message: 'Publicación no encontrada' })
    }
    
    const userIndex = post.likes.indexOf(req.user._id)
    const liked = userIndex === -1
    
    if (liked) {
      post.likes.push(req.user._id)
    } else {
      post.likes.splice(userIndex, 1)
    }
    
    await post.save()
    
    res.json({ liked, likesCount: post.likes.length })
  } catch (error) {
    res.status(500).json({ message: 'Error al dar like', error: error.message })
  }
})

// Comment on post
router.post('/:id/comment', authenticate, async (req, res) => {
  try {
    const { content } = req.body
    
    const post = await Post.findById(req.params.id)
    
    if (!post) {
      return res.status(404).json({ message: 'Publicación no encontrada' })
    }
    
    post.comments.push({
      user: req.user._id,
      content,
      createdAt: new Date()
    })
    
    await post.save()
    await post.populate('comments.user', 'name avatar')
    
    res.json(post.comments)
  } catch (error) {
    res.status(500).json({ message: 'Error al comentar', error: error.message })
  }
})

// Share post
router.post('/:id/share', authenticate, async (req, res) => {
  try {
    const originalPost = await Post.findById(req.params.id)
      .populate('user', 'name avatar')
    
    if (!originalPost) {
      return res.status(404).json({ message: 'Publicación no encontrada' })
    }
    
    const sharedPost = new Post({
      user: req.user._id,
      content: req.body.content || `Compartido de ${originalPost.user?.name || 'usuario'}`,
      sharedFrom: originalPost._id
    })
    
    await sharedPost.save()
    await sharedPost.populate('user', 'name avatar stats')
    await sharedPost.populate('sharedFrom', 'user content')
    await sharedPost.populate('sharedFrom.user', 'name avatar')
    
    res.status(201).json(sharedPost)
  } catch (error) {
    res.status(500).json({ message: 'Error al compartir publicación', error: error.message })
  }
})

// Delete post
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, user: req.user._id })
    
    if (!post) {
      return res.status(404).json({ message: 'Publicación no encontrada o no tienes permiso' })
    }
    
    await post.deleteOne()
    res.json({ message: 'Publicación eliminada' })
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar', error: error.message })
  }
})

export default router
