import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiTarget, FiAward, FiUsers, FiClock, FiTrendingUp } from 'react-icons/fi'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const mockChallenges = [
  {
    id: 1,
    name: 'Reto 30 Días Fitness',
    description: 'Completa un entrenamiento cada día durante 30 días',
    type: 'streak',
    target: 30,
    reward: 500,
    participants: 156,
    daysLeft: 15,
    joined: false,
    progress: 0
  },
  {
    id: 2,
    name: '1000 Flexiones',
    description: 'Alcanza 1000 flexiones en total este mes',
    type: 'cumulative',
    target: 1000,
    reward: 300,
    participants: 89,
    daysLeft: 20,
    joined: true,
    progress: 450
  },
  {
    id: 3,
    name: 'Maratón de Cardio',
    description: 'Acumula 10 horas de cardio este mes',
    type: 'time',
    target: 600,
    reward: 400,
    participants: 234,
    daysLeft: 25,
    joined: false,
    progress: 0
  },
  {
    id: 4,
    name: 'Rey del Peso',
    description: 'Levanta más peso que otros en la tabla',
    type: 'leaderboard',
    target: null,
    reward: 1000,
    participants: 45,
    daysLeft: 10,
    joined: true,
    progress: 2500
  }
]

const leaderboard = [
  { rank: 1, name: 'Carlos M.', score: 3500, avatar: '💪' },
  { rank: 2, name: 'María G.', score: 3200, avatar: '🔥' },
  { rank: 3, name: 'Juan P.', score: 2800, avatar: '⭐' },
  { rank: 4, name: 'Tú', score: 2500, avatar: '🏋️', isCurrentUser: true },
  { rank: 5, name: 'Ana L.', score: 2300, avatar: '💎' },
]

export default function Challenges() {
  const { user } = useAuthStore()
  const [challenges, setChallenges] = useState(mockChallenges)
  const [activeTab, setActiveTab] = useState('active')
  
  const handleJoinChallenge = (challengeId) => {
    setChallenges(challenges.map(c => 
      c.id === challengeId ? { ...c, joined: true, participants: c.participants + 1 } : c
    ))
    toast.success('¡Te has unido al reto!')
  }
  
  const activeChallenges = challenges.filter(c => c.joined)
  const availableChallenges = challenges.filter(c => !c.joined)
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Retos</h1>
        <div className="flex items-center gap-2 text-accent-yellow">
          <FiAward />
          <span className="font-semibold">{user?.stats?.xp || 0} XP</span>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'active' ? 'bg-primary-500 text-white' : 'bg-dark-200 text-gray-400'
          }`}
        >
          Mis Retos ({activeChallenges.length})
        </button>
        <button
          onClick={() => setActiveTab('available')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'available' ? 'bg-primary-500 text-white' : 'bg-dark-200 text-gray-400'
          }`}
        >
          Disponibles ({availableChallenges.length})
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'leaderboard' ? 'bg-primary-500 text-white' : 'bg-dark-200 text-gray-400'
          }`}
        >
          Tabla de Líderes
        </button>
      </div>
      
      {/* Active Challenges */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {activeChallenges.length === 0 ? (
            <div className="card text-center py-12">
              <FiTarget className="mx-auto text-gray-500 mb-4" size={48} />
              <p className="text-gray-400">No estás participando en ningún reto</p>
              <button 
                onClick={() => setActiveTab('available')}
                className="btn-primary mt-4"
              >
                Ver Retos Disponibles
              </button>
            </div>
          ) : (
            activeChallenges.map((challenge, i) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="card"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-display text-xl">{challenge.name}</h3>
                    <p className="text-gray-400">{challenge.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-accent-yellow font-semibold">+{challenge.reward} XP</div>
                    <div className="text-gray-400 text-sm flex items-center gap-1">
                      <FiClock size={14} /> {challenge.daysLeft} días
                    </div>
                  </div>
                </div>
                
                {/* Progress */}
                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Progreso</span>
                    <span className="text-primary-500">
                      {challenge.target 
                        ? `${challenge.progress}/${challenge.target}`
                        : `${challenge.progress} pts`
                      }
                    </span>
                  </div>
                  <div className="h-3 bg-dark-300 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: challenge.target ? `${(challenge.progress / challenge.target) * 100}%` : '50%' }}
                      transition={{ duration: 1 }}
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <FiUsers size={14} />
                  {challenge.participants} participantes
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
      
      {/* Available Challenges */}
      {activeTab === 'available' && (
        <div className="grid md:grid-cols-2 gap-4">
          {availableChallenges.map((challenge, i) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="card"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
                  <FiTarget className="text-primary-500" size={24} />
                </div>
                <span className="px-3 py-1 bg-accent-yellow/20 text-accent-yellow rounded-full text-sm">
                  +{challenge.reward} XP
                </span>
              </div>
              
              <h3 className="font-display text-lg mb-2">{challenge.name}</h3>
              <p className="text-gray-400 text-sm mb-4">{challenge.description}</p>
              
              <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                  <FiUsers size={14} /> {challenge.participants}
                </div>
                <div className="flex items-center gap-1">
                  <FiClock size={14} /> {challenge.daysLeft} días
                </div>
              </div>
              
              <button
                onClick={() => handleJoinChallenge(challenge.id)}
                className="btn-primary w-full"
              >
                Unirse al Reto
              </button>
            </motion.div>
          ))}
        </div>
      )}
      
      {/* Leaderboard */}
      {activeTab === 'leaderboard' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card"
        >
          <h2 className="font-display text-xl mb-6 flex items-center gap-2">
            <FiTrendingUp className="text-accent-yellow" /> Tabla de Líderes
          </h2>
          
          <div className="space-y-3">
            {leaderboard.map((entry, i) => (
              <div
                key={entry.rank}
                className={`flex items-center gap-4 p-4 rounded-xl ${
                  entry.isCurrentUser ? 'bg-primary-500/10 ring-1 ring-primary-500' : 'bg-dark-300/50'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  entry.rank === 1 ? 'bg-yellow-500 text-black' :
                  entry.rank === 2 ? 'bg-gray-400 text-black' :
                  entry.rank === 3 ? 'bg-amber-700 text-white' :
                  'bg-dark-200 text-gray-400'
                }`}>
                  {entry.rank}
                </div>
                
                <div className="w-10 h-10 rounded-full bg-dark-200 flex items-center justify-center text-xl">
                  {entry.avatar}
                </div>
                
                <div className="flex-1">
                  <div className={`font-medium ${entry.isCurrentUser ? 'text-primary-500' : ''}`}>
                    {entry.name}
                  </div>
                </div>
                
                <div className="font-semibold text-accent-yellow">
                  {entry.score.toLocaleString()} pts
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
