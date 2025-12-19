import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiSearch, FiEdit2, FiTrash2, FiPlus, FiX } from 'react-icons/fi'
import api from '../../utils/api'
import toast from 'react-hot-toast'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', plan: 'basic' })
  
  useEffect(() => { fetchUsers() }, [filter])
  
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('status', filter)
      if (search) params.append('search', search)
      const { data } = await api.get(`/admin/users?${params.toString()}`)
      setUsers(data.users || [])
    } catch (error) {
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }
  
  const handleSearch = (e) => { e.preventDefault(); fetchUsers() }
  
  const handleUpdateRole = async (userId, newRole) => {
    try {
      await api.put(`/users/${userId}/role`, { role: newRole })
      setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u))
      toast.success(`Rol actualizado a ${newRole}`)
    } catch (error) {
      toast.error('Error al actualizar rol')
    }
  }
  
  const handleUpdateMembership = async (userId, updates) => {
    try {
      await api.put(`/users/${userId}/membership`, updates)
      fetchUsers()
      setShowModal(false)
      toast.success('Membresía actualizada')
    } catch (error) {
      toast.error('Error al actualizar membresía')
    }
  }
  
  const handleDeleteUser = async (userId) => {
    if (!confirm('¿Eliminar este usuario?')) return
    try {
      await api.delete(`/admin/users/${userId}`)
      setUsers(users.filter(u => u._id !== userId))
      toast.success('Usuario eliminado')
    } catch (error) {
      toast.error('Error al eliminar')
    }
  }
  
  const handleAddUser = async (e) => {
    e.preventDefault()
    try {
      await api.post('/admin/users', newUser)
      toast.success('Usuario creado')
      setShowAddModal(false)
      setNewUser({ name: '', email: '', password: '', plan: 'basic' })
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al crear usuario')
    }
  }
  
  const getStatusBadge = (status) => {
    const styles = { active: 'bg-accent-green/20 text-accent-green', expiring: 'bg-yellow-500/20 text-yellow-500', expired: 'bg-red-500/20 text-red-500' }
    const labels = { active: 'Activo', expiring: 'Por vencer', expired: 'Vencido' }
    return <span className={`px-2 py-1 rounded-full text-xs ${styles[status] || styles.expired}`}>{labels[status] || 'Sin membresía'}</span>
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="font-display text-3xl">Gestión de Usuarios</h1>
        <div className="flex gap-3">
          <form onSubmit={handleSearch} className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="input-field pl-10 py-2" />
          </form>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="input-field py-2">
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="expiring">Por vencer</option>
            <option value="expired">Vencidos</option>
          </select>
          <button onClick={() => setShowAddModal(true)} className="btn-primary py-2 px-4 flex items-center gap-2">
            <FiPlus /> Añadir
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-dark-100 border-t-primary-500 rounded-full animate-spin" /></div>
      ) : users.length === 0 ? (
        <div className="card text-center py-12"><p className="text-gray-400">No se encontraron usuarios</p></div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="bg-dark-300 text-left">
                <th className="p-4 font-medium">Usuario</th>
                <th className="p-4 font-medium">Plan</th>
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium">Vence</th>
                <th className="p-4 font-medium">Rol</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr></thead>
              <tbody>
                {users.map((user, i) => (
                  <motion.tr key={user._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="border-b border-white/5 hover:bg-dark-200/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500 font-medium">{user.name?.charAt(0) || '?'}</div>
                        <div><div className="font-medium">{user.name}</div><div className="text-gray-400 text-sm">{user.email}</div></div>
                      </div>
                    </td>
                    <td className="p-4"><span className={`px-2 py-1 rounded text-xs uppercase ${user.membership?.plan === 'elite' ? 'bg-accent-purple/20 text-accent-purple' : user.membership?.plan === 'premium' ? 'bg-primary-500/20 text-primary-500' : 'bg-gray-500/20 text-gray-400'}`}>{user.membership?.plan || 'básico'}</span></td>
                    <td className="p-4">{getStatusBadge(user.membership?.status)}</td>
                    <td className="p-4 text-gray-400">{user.membership?.endDate ? new Date(user.membership.endDate).toLocaleDateString() : '-'}</td>
                    <td className="p-4">
                      <select value={user.role} onChange={(e) => handleUpdateRole(user._id, e.target.value)} className={`bg-transparent border rounded px-2 py-1 text-sm ${user.role === 'admin' ? 'border-accent-purple text-accent-purple' : 'border-gray-600 text-gray-300'}`}>
                        <option value="user">Usuario</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setSelectedUser(user); setShowModal(true); }} className="p-2 text-gray-400 hover:text-primary-500"><FiEdit2 size={18} /></button>
                        <button onClick={() => handleDeleteUser(user._id)} className="p-2 text-gray-400 hover:text-red-500"><FiTrash2 size={18} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Edit Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card max-w-md w-full">
            <div className="flex justify-between mb-4"><h2 className="font-display text-xl">Editar Membresía</h2><button onClick={() => setShowModal(false)}><FiX /></button></div>
            <p className="text-gray-400 mb-6">{selectedUser.name}</p>
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); handleUpdateMembership(selectedUser._id, { plan: fd.get('plan'), status: fd.get('status'), endDate: fd.get('endDate') }) }}>
              <div className="space-y-4">
                <div><label className="block text-sm text-gray-400 mb-2">Plan</label><select name="plan" defaultValue={selectedUser.membership?.plan} className="input-field"><option value="basic">Básico</option><option value="premium">Premium</option><option value="elite">Elite</option></select></div>
                <div><label className="block text-sm text-gray-400 mb-2">Estado</label><select name="status" defaultValue={selectedUser.membership?.status} className="input-field"><option value="active">Activo</option><option value="expiring">Por vencer</option><option value="expired">Vencido</option></select></div>
                <div><label className="block text-sm text-gray-400 mb-2">Vencimiento</label><input type="date" name="endDate" defaultValue={selectedUser.membership?.endDate?.split('T')[0]} className="input-field" /></div>
              </div>
              <div className="flex gap-3 mt-6"><button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancelar</button><button type="submit" className="btn-primary flex-1">Guardar</button></div>
            </form>
          </motion.div>
        </div>
      )}
      
      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card max-w-md w-full">
            <div className="flex justify-between mb-4"><h2 className="font-display text-xl">Añadir Usuario</h2><button onClick={() => setShowAddModal(false)}><FiX /></button></div>
            <form onSubmit={handleAddUser}>
              <div className="space-y-4">
                <div><label className="block text-sm text-gray-400 mb-2">Nombre</label><input type="text" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} className="input-field" required /></div>
                <div><label className="block text-sm text-gray-400 mb-2">Email</label><input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="input-field" required /></div>
                <div><label className="block text-sm text-gray-400 mb-2">Contraseña</label><input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="input-field" required /></div>
                <div><label className="block text-sm text-gray-400 mb-2">Plan</label><select value={newUser.plan} onChange={(e) => setNewUser({ ...newUser, plan: e.target.value })} className="input-field"><option value="basic">Básico</option><option value="premium">Premium</option><option value="elite">Elite</option></select></div>
              </div>
              <div className="flex gap-3 mt-6"><button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancelar</button><button type="submit" className="btn-primary flex-1">Crear Usuario</button></div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
