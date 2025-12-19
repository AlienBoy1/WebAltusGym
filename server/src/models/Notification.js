import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['welcome', 'general', 'workout', 'social', 'membership', 'admin', 'achievement'],
    default: 'general'
  },
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '🔔'
  },
  link: String,
  read: {
    type: Boolean,
    default: false
  },
  pushed: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  }
}, { timestamps: true })

export default mongoose.model('Notification', notificationSchema)
