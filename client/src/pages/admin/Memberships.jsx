import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiCreditCard, FiPlus, FiCheck, FiAlertCircle, FiClock, FiDollarSign } from 'react-icons/fi'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const PLANS = [
  { id: 'basic', name: 'Básico', price: 29, color: '#6B7280', features: ['Acceso al gimnasio', 'Horario limitado'] },
  { id: 'premium', name: 'Premium', price: 49, color: '#FF6B35', features: ['Acceso completo', 'Clases grupales', 'Área de pesas'] },
  { id: 'elite', name: 'Elite', price: 79, color: '#A855F7', features: ['Todo Premium', 'Entrenador personal', 'Nutrición', 'Spa'] }
]

export default function AdminMemberships() {
  const [stats, setStats] = useState({ byPlan: [], byStatus: [] })
  const [expiringUsers, setExpiringUsers] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchData()
  }, [])
  
  const fetchData = async () => {
    try {
      const [reportRes, usersRes] = await Promise.all([
        api.get('/admin/reports/memberships'),
        api.get('/admin/users?status=expiring&limit=10')
      ])
      setStats(reportRes.data)
      setExpiringUsers(usersRes.data.users || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleRenewMembership = async (userId, plan) => {
    try {
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 1)
      
      await api.put(`/users/${userId}/membership`, {
        plan,
        status: 'active',
        endDate: endDate.toISOString()
      })
      
      toast.success('Membresía renovada')
      fetchData()
    } catch (error) {
      toast.error('Error al renovar')
    }
  }
  
  const pieData = stats.byPlan?.map(p => ({
    name: p._id || 'Sin plan',
    value: p.count,
    color: PLANS.find(plan => plan.id === p._id)?.color || '#6B7280'
  })) || []
  
  const statusData = stats.byStatus?.map(s => ({
    name: s._id === 'active' ? 'Activos' : s._id === 'expiring' ? 'Por vencer' : 'Vencidos',
    value: s.count,
    color: s._id === 'active' ? '#22C55E' : s._id === 'expiring' ? '#EAB308' : '#EF4444'
  })) || []
  
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-dark-100 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Membresías</h1>
      </div>
      
      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`card relative overflow-hidden ${plan.id === 'premium' ? 'ring-2 ring-primary-500' : ''}`}
          >
            {plan.id === 'premium' && (
              <div className="absolute top-0 right-0 bg-primary-500 text-white text-xs px-3 py-1 rounded-bl-lg">
                Popular
              </div>
            )}
            
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${plan.color}20` }}>
                <FiCreditCard size={24} style={{ color: plan.color }} />
              </div>
              <h3 className="font-display text-xl">{plan.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold">${plan.price}</span>
                <span className="text-gray-400">/mes</span>
              </div>
            </div>
            
            <ul className="space-y-2 mb-4">
              {plan.features.map((feature, j) => (
                <li key={j} className="flex items-center gap-2 text-gray-300">
                  <FiCheck className="text-accent-green" size={16} />
                  {feature}
                </li>
              ))}
            </ul>
            
            <div className="text-center text-gray-400 text-sm">
              {stats.byPlan?.find(p => p._id === plan.id)?.count || 0} miembros activos
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h2 className="font-display text-xl mb-4">Distribución por Plan</h2>
          <div className="h-64">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No hay datos
              </div>
            )}
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <h2 className="font-display text-xl mb-4">Estado de Membresías</h2>
          <div className="h-64">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No hay datos
              </div>
            )}
          </div>
        </motion.div>
      </div>
      
      {/* Expiring Memberships */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card"
      >
        <div className="flex items-center gap-2 mb-4">
          <FiAlertCircle className="text-yellow-500" />
          <h2 className="font-display text-xl">Membresías por Vencer</h2>
        </div>
        
        {expiringUsers.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No hay membresías por vencer</p>
        ) : (
          <div className="space-y-3">
            {expiringUsers.map((user) => (
              <div key={user._id} className="flex items-center gap-4 p-3 bg-dark-300/50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-500 font-medium">
                  {user.name?.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-gray-400 text-sm">
                    Vence: {new Date(user.membership?.endDate).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => handleRenewMembership(user._id, user.membership?.plan)}
                  className="btn-primary py-2 px-4 text-sm"
                >
                  Renovar
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
