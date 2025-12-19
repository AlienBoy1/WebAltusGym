import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiEdit2, FiCamera, FiBell, FiShield, FiHelpCircle, FiLogOut, FiChevronRight, FiSettings, FiMessageCircle, FiCalendar, FiTarget } from 'react-icons/fi'
import { useAuthStore } from '../../store/authStore'
import { Link } from 'react-router-dom'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const menuItems = [
  { icon: FiSettings, label: 'Configuración', to: '/settings' },
  { icon: FiBell, label: 'Notificaciones', to: '/notifications', badge: true },
  { icon: FiMessageCircle, label: 'Mensajes', to: '/chat' },
  { icon: FiCalendar, label: 'Clases', to: '/classes' },
  { icon: FiTarget, label: 'Retos', to: '/challenges' },
  { icon: FiShield, label: 'Seguridad', to: '/settings' },
  { icon: FiHelpCircle, label: 'Ayuda y Soporte', to: '#' },
]

export default function Profile() {
  const { user, logout, updateUser } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)
  
  const handleSave = async () => {
    setSaving(true)
    try {
      const { data } = await api.put('/users/profile', { name })
      updateUser(data.user)
      toast.success('Perfil actualizado')
      setEditing(false)
    } catch (error) {
      toast.error('Error al actualizar')
    } finally {
      setSaving(false)
    }
  }
  
  const getPlanColor = (plan) => {
    switch (plan) {
      case 'elite': return 'text-accent-purple'
      case 'premium': return 'text-primary-500'
      case 'annual': return 'text-accent-cyan'
      default: return 'text-gray-400'
    }
  }
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-accent-green/20 text-accent-green'
      case 'expiring': return 'bg-yellow-500/20 text-yellow-500'
      default: return 'bg-red-500/20 text-red-500'
    }
  }
  
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card text-center"
      >
        <div className="relative inline-block mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-4xl">
            {user?.avatar || user?.name?.charAt(0) || '💪'}
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-dark-100 rounded-full flex items-center justify-center border border-white/10 hover:border-primary-500 transition-colors">
            <FiCamera size={16} />
          </button>
        </div>
        
        {editing ? (
          <div className="mb-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field text-center mb-2"
            />
            <div className="flex gap-2 justify-center">
              <button onClick={() => setEditing(false)} className="btn-secondary py-2 px-4 text-sm">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary py-2 px-4 text-sm">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="font-display text-2xl mb-1">{user?.name || 'Usuario'}</h1>
            <p className="text-gray-400 mb-4">{user?.email}</p>
          </>
        )}
        
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(user?.membership?.status)}`}>
            {user?.membership?.status === 'active' ? 'Activo' : 
             user?.membership?.status === 'expiring' ? 'Por vencer' : 'Vencido'}
          </span>
          <span className={`px-3 py-1 bg-dark-100 rounded-full text-sm ${getPlanColor(user?.membership?.plan)}`}>
            {user?.membership?.plan?.toUpperCase() || 'BÁSICO'}
          </span>
          {user?.role === 'admin' && (
            <span className="px-3 py-1 bg-accent-purple/20 text-accent-purple rounded-full text-sm">
              Admin
            </span>
          )}
        </div>
        
        {!editing && (
          <button 
            onClick={() => setEditing(true)}
            className="btn-secondary flex items-center gap-2 mx-auto"
          >
            <FiEdit2 size={16} /> Editar Perfil
          </button>
        )}
      </motion.div>
      
      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4"
      >
        {[
          { label: 'Entrenamientos', value: user?.stats?.totalWorkouts || 0 },
          { label: 'Días Activo', value: user?.stats?.longestStreak || 0 },
          { label: 'Nivel', value: user?.stats?.level || 1 },
        ].map((stat) => (
          <div key={stat.label} className="card text-center">
            <div className="font-display text-2xl text-primary-500">{stat.value}</div>
            <div className="text-gray-400 text-sm">{stat.label}</div>
          </div>
        ))}
      </motion.div>
      
      {/* Membership */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-5 border border-accent-cyan/20"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-accent-cyan mb-1">Membresía</div>
            <div className="font-semibold">Plan {user?.membership?.plan?.toUpperCase() || 'Básico'}</div>
            <div className="text-gray-400 text-sm">
              Vence: {user?.membership?.endDate 
                ? new Date(user.membership.endDate).toLocaleDateString()
                : 'N/A'
              }
            </div>
          </div>
          <button className="btn-primary py-2 px-4 text-sm">
            Renovar
          </button>
        </div>
      </motion.div>
      
      {/* Admin Link */}
      {user?.role === 'admin' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Link 
            to="/admin"
            className="card flex items-center gap-4 hover:border-accent-purple/50 border-accent-purple/20"
          >
            <div className="w-10 h-10 bg-accent-purple/20 rounded-xl flex items-center justify-center">
              <FiShield className="text-accent-purple" size={20} />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Panel de Administración</div>
              <div className="text-gray-400 text-sm">Gestiona usuarios, membresías y más</div>
            </div>
            <FiChevronRight className="text-gray-400" />
          </Link>
        </motion.div>
      )}
      
      {/* Menu */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card p-0 overflow-hidden"
      >
        {menuItems.map((item, i) => (
          <Link
            key={item.label}
            to={item.to}
            className={`w-full flex items-center gap-4 p-4 hover:bg-dark-100 transition-colors ${
              i !== menuItems.length - 1 ? 'border-b border-white/5' : ''
            }`}
          >
            <div className="w-10 h-10 bg-dark-300 rounded-xl flex items-center justify-center">
              <item.icon size={20} className="text-gray-400" />
            </div>
            <span className="flex-1 text-left">{item.label}</span>
            <FiChevronRight className="text-gray-500" />
          </Link>
        ))}
      </motion.div>
      
      {/* Logout */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        onClick={logout}
        className="w-full card flex items-center justify-center gap-3 text-red-500 hover:bg-red-500/10 transition-colors"
      >
        <FiLogOut size={20} />
        <span className="font-semibold">Cerrar Sesión</span>
      </motion.button>
      
      {/* App Info */}
      <div className="text-center text-gray-500 text-sm py-4">
        <p>ALTUS GYM v1.0.0</p>
        <p className="mt-1">Hecho con 💪 para atletas</p>
      </div>
    </div>
  )
}
