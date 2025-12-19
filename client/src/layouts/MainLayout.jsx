import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiHome, FiUsers, FiActivity, FiTrendingUp, FiUser, FiBell, FiSettings, FiCalendar, FiTarget, FiMessageCircle, FiLogOut } from 'react-icons/fi'
import { useAuthStore } from '../store/authStore'
import { useNotificationStore } from '../store/notificationStore'
import { useEffect } from 'react'
import NotificationPrompt from '../components/NotificationPrompt'
import { initSocket, disconnectSocket } from '../utils/socket'

const navItems = [
  { path: '/dashboard', icon: FiHome, label: 'Inicio' },
  { path: '/social', icon: FiUsers, label: 'Social' },
  { path: '/workouts', icon: FiActivity, label: 'Entrenos' },
  { path: '/progress', icon: FiTrendingUp, label: 'Progreso' },
  { path: '/profile', icon: FiUser, label: 'Perfil' },
]

const headerIcons = [
  { path: '/classes', icon: FiCalendar },
  { path: '/challenges', icon: FiTarget },
  { path: '/chat', icon: FiMessageCircle },
  { path: '/settings', icon: FiSettings },
  { path: '/notifications', icon: FiBell },
]

export default function MainLayout() {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { unreadCount, fetchNotifications } = useNotificationStore()
  
  useEffect(() => { 
    fetchNotifications()
    if (user?._id) {
      initSocket(user._id)
    }
    return () => disconnectSocket()
  }, [user])
  
  return (
    <div className="min-h-screen bg-dark-500">
      {/* Header */}
      <header className="glass fixed top-0 left-0 right-0 z-50 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <span className="font-display text-lg">A</span>
            </div>
            <span className="font-display text-xl tracking-wider hidden sm:block">ALTUS</span>
          </NavLink>
          
          <div className="flex items-center gap-2">
            {headerIcons.map((item) => (
              <NavLink key={item.path} to={item.path} className={({ isActive }) => `p-2 rounded-lg transition-colors relative ${isActive ? 'text-primary-500' : 'text-gray-400 hover:text-white'}`}>
                <item.icon size={20} />
                {item.path === '/notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 rounded-full text-xs flex items-center justify-center">{unreadCount}</span>
                )}
              </NavLink>
            ))}
            
            <div className="flex items-center gap-3 ml-2 pl-2 border-l border-white/10">
              <NavLink to="/profile" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500 font-medium">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <span className="hidden md:block text-sm">{user?.name}</span>
              </NavLink>
              {user?.role === 'admin' && (
                <NavLink to="/admin" className="px-2 py-1 bg-accent-purple/20 text-accent-purple text-xs rounded-full">Admin</NavLink>
              )}
              <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500"><FiLogOut size={18} /></button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="pt-16 pb-20 md:pb-6">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Outlet />
          </motion.div>
        </div>
      </main>
      
      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden glass fixed bottom-0 left-0 right-0 z-50 px-2 py-2">
        <div className="flex justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <NavLink key={item.path} to={item.path} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${isActive ? 'text-primary-500' : 'text-gray-500'}`}>
                <item.icon size={20} />
                <span className="text-xs mt-1">{item.label}</span>
                {isActive && <motion.div layoutId="nav-indicator" className="absolute bottom-0 w-1 h-1 bg-primary-500 rounded-full" />}
              </NavLink>
            )
          })}
        </div>
      </nav>
      
      {/* Notification Prompt */}
      <NotificationPrompt />
    </div>
  )
}
