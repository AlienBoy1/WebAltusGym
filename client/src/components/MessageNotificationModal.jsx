import { motion, AnimatePresence } from 'framer-motion'
import { FiMessageCircle, FiCheck, FiX } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useNotificationStore } from '../store/notificationStore'
import { t } from '../utils/i18n'

export default function MessageNotificationModal({ notification, onClose, onMarkAsRead }) {
  const navigate = useNavigate()
  const { markAsRead } = useNotificationStore()

  const handleOpenChat = async () => {
    if (!notification.read) {
      await markAsRead(notification._id)
    }
    onClose()
    navigate('/chat', { state: { userId: notification.metadata?.fromId } })
  }

  const handleMarkAsRead = async () => {
    await markAsRead(notification._id)
    onClose()
  }

  return (
    <AnimatePresence>
      {notification && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="card max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xl flex items-center gap-2">
                <FiMessageCircle className="text-primary-500" size={24} />
                {t('message.new')}
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-dark-200 rounded-lg transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-2 font-medium">
                {notification.metadata?.fromName || 'Usuario'}
              </p>
              <p className="text-gray-400 text-sm">
                {notification.body || notification.message || 'Tienes un nuevo mensaje'}
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleOpenChat}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <FiMessageCircle size={18} />
                {t('message.openChat')}
              </button>
              <button
                onClick={handleMarkAsRead}
                className="btn-secondary flex-1 flex items-center justify-center gap-2"
              >
                <FiCheck size={18} />
                {t('message.markAsRead')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

