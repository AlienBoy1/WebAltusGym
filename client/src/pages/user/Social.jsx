import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiHeart, FiMessageCircle, FiShare2, FiImage, FiSend, FiMoreHorizontal, FiTrash2 } from 'react-icons/fi'
import api from '../../utils/api'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export default function Social() {
  const { user } = useAuthStore()
  const [posts, setPosts] = useState([])
  const [newPost, setNewPost] = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  
  useEffect(() => {
    fetchPosts()
  }, [])
  
  const fetchPosts = async () => {
    try {
      const { data } = await api.get('/social/feed')
      setPosts(data)
    } catch (error) {
      console.error('Error fetching posts:', error)
      // Mock data if API fails
      setPosts([])
    } finally {
      setLoading(false)
    }
  }
  
  const handleLike = async (postId) => {
    try {
      const { data } = await api.post(`/social/${postId}/like`)
      setPosts(posts.map(post => 
        post._id === postId 
          ? { ...post, likes: data.liked ? [...post.likes, user._id] : post.likes.filter(id => id !== user._id) }
          : post
      ))
    } catch (error) {
      toast.error('Error al dar like')
    }
  }
  
  const handlePost = async () => {
    if (!newPost.trim()) return
    
    setPosting(true)
    try {
      const { data } = await api.post('/social', { content: newPost })
      setPosts([data, ...posts])
      setNewPost('')
      setShowCompose(false)
      toast.success('¡Publicado!')
    } catch (error) {
      toast.error('Error al publicar')
    } finally {
      setPosting(false)
    }
  }
  
  const handleDelete = async (postId) => {
    if (!confirm('¿Eliminar esta publicación?')) return
    
    try {
      await api.delete(`/social/${postId}`)
      setPosts(posts.filter(p => p._id !== postId))
      toast.success('Publicación eliminada')
    } catch (error) {
      toast.error('Error al eliminar')
    }
  }
  
  const getLevelBadge = (level) => {
    if (level >= 10) return { class: 'bg-accent-purple/20 text-accent-purple', label: 'Elite' }
    if (level >= 5) return { class: 'bg-accent-cyan/20 text-accent-cyan', label: 'Pro' }
    return { class: 'bg-primary-500/20 text-primary-500', label: 'Member' }
  }
  
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Comunidad</h1>
        <button 
          onClick={() => setShowCompose(!showCompose)}
          className="btn-primary py-2 px-4 text-sm"
        >
          Publicar
        </button>
      </div>
      
      {/* Compose Post */}
      <AnimatePresence>
        {showCompose && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card overflow-hidden"
          >
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="¿Qué lograste hoy? Comparte tu progreso..."
              className="w-full bg-transparent border-none resize-none text-white placeholder:text-gray-500 focus:outline-none min-h-[100px]"
            />
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div className="flex gap-2">
                <button className="p-2 text-gray-400 hover:text-primary-500 transition-colors">
                  <FiImage size={20} />
                </button>
              </div>
              <button 
                onClick={handlePost}
                disabled={!newPost.trim() || posting}
                className="btn-primary py-2 px-4 text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {posting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <FiSend size={16} /> Publicar
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Posts Feed */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-dark-100 border-t-primary-500 rounded-full animate-spin mx-auto" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-6xl mb-4">📝</div>
          <p>No hay publicaciones aún</p>
          <p className="text-sm">¡Sé el primero en compartir!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post, i) => {
            const isOwner = post.user?._id === user?._id
            const isLiked = post.likes?.includes(user?._id)
            const badge = getLevelBadge(post.user?.stats?.level || 1)
            
            return (
              <motion.div
                key={post._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="card"
              >
                {/* Post Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-xl">
                    {post.user?.avatar || post.user?.name?.charAt(0) || '👤'}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{post.user?.name || 'Usuario'}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${badge.class}`}>
                        {badge.label}
                      </span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                  </div>
                  {isOwner && (
                    <button 
                      onClick={() => handleDelete(post._id)}
                      className="p-2 text-gray-400 hover:text-red-500"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  )}
                </div>
                
                {/* Post Content */}
                <p className="text-gray-100 mb-4 leading-relaxed">{post.content}</p>
                
                {/* Post Actions */}
                <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                  <button 
                    onClick={() => handleLike(post._id)}
                    className={`flex items-center gap-2 transition-colors ${
                      isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                    }`}
                  >
                    <FiHeart size={20} className={isLiked ? 'fill-current' : ''} />
                    <span>{post.likes?.length || 0}</span>
                  </button>
                  
                  <button className="flex items-center gap-2 text-gray-400 hover:text-primary-500 transition-colors">
                    <FiMessageCircle size={20} />
                    <span>{post.comments?.length || 0}</span>
                  </button>
                  
                  <button className="flex items-center gap-2 text-gray-400 hover:text-accent-cyan transition-colors">
                    <FiShare2 size={20} />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
