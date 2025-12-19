import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiCalendar, FiClock, FiUsers, FiCheck, FiX } from 'react-icons/fi'
import toast from 'react-hot-toast'

const mockClasses = [
  { id: 1, name: 'Spinning', instructor: 'María García', time: '07:00', duration: 45, spots: 20, enrolled: 15, day: 'Lunes' },
  { id: 2, name: 'Yoga', instructor: 'Carlos López', time: '08:00', duration: 60, spots: 15, enrolled: 12, day: 'Lunes' },
  { id: 3, name: 'CrossFit', instructor: 'Ana Martínez', time: '09:00', duration: 60, spots: 25, enrolled: 20, day: 'Lunes' },
  { id: 4, name: 'Pilates', instructor: 'Laura Sánchez', time: '10:00', duration: 50, spots: 18, enrolled: 10, day: 'Martes' },
  { id: 5, name: 'Zumba', instructor: 'Pedro Ruiz', time: '18:00', duration: 60, spots: 30, enrolled: 25, day: 'Martes' },
  { id: 6, name: 'Boxing', instructor: 'Miguel Torres', time: '19:00', duration: 60, spots: 20, enrolled: 18, day: 'Miércoles' },
]

const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export default function Classes() {
  const [selectedDay, setSelectedDay] = useState('Lunes')
  const [enrolledClasses, setEnrolledClasses] = useState([])
  
  const filteredClasses = mockClasses.filter(c => c.day === selectedDay)
  
  const handleEnroll = (classItem) => {
    if (enrolledClasses.includes(classItem.id)) {
      setEnrolledClasses(enrolledClasses.filter(id => id !== classItem.id))
      toast.success('Inscripción cancelada')
    } else {
      if (classItem.enrolled >= classItem.spots) {
        toast.error('Clase llena')
        return
      }
      setEnrolledClasses([...enrolledClasses, classItem.id])
      toast.success(`¡Inscrito en ${classItem.name}!`)
    }
  }
  
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Clases Grupales</h1>
      
      {/* Day Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              selectedDay === day
                ? 'bg-primary-500 text-white'
                : 'bg-dark-200 text-gray-400 hover:text-white'
            }`}
          >
            {day}
          </button>
        ))}
      </div>
      
      {/* Classes Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClasses.length === 0 ? (
          <div className="col-span-full card text-center py-12">
            <FiCalendar className="mx-auto text-gray-500 mb-4" size={48} />
            <p className="text-gray-400">No hay clases programadas para este día</p>
          </div>
        ) : (
          filteredClasses.map((classItem, i) => {
            const isEnrolled = enrolledClasses.includes(classItem.id)
            const isFull = classItem.enrolled >= classItem.spots
            
            return (
              <motion.div
                key={classItem.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`card ${isEnrolled ? 'ring-2 ring-primary-500' : ''}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-display text-xl">{classItem.name}</h3>
                    <p className="text-gray-400">{classItem.instructor}</p>
                  </div>
                  {isEnrolled && (
                    <span className="px-2 py-1 bg-primary-500/20 text-primary-500 rounded-full text-xs">
                      Inscrito
                    </span>
                  )}
                </div>
                
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-gray-300">
                    <FiClock className="text-gray-500" />
                    {classItem.time} - {classItem.duration} min
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <FiUsers className="text-gray-500" />
                    {classItem.enrolled}/{classItem.spots} personas
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="h-2 bg-dark-300 rounded-full mb-4 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${isFull ? 'bg-red-500' : 'bg-primary-500'}`}
                    style={{ width: `${(classItem.enrolled / classItem.spots) * 100}%` }}
                  />
                </div>
                
                <button
                  onClick={() => handleEnroll(classItem)}
                  disabled={isFull && !isEnrolled}
                  className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                    isEnrolled
                      ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                      : isFull
                        ? 'bg-dark-300 text-gray-500 cursor-not-allowed'
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                  }`}
                >
                  {isEnrolled ? (
                    <>
                      <FiX /> Cancelar
                    </>
                  ) : isFull ? (
                    'Clase Llena'
                  ) : (
                    <>
                      <FiCheck /> Inscribirse
                    </>
                  )}
                </button>
              </motion.div>
            )
          })
        )}
      </div>
      
      {/* My Classes */}
      {enrolledClasses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          <h2 className="font-display text-xl mb-4">Mis Clases</h2>
          <div className="space-y-3">
            {mockClasses.filter(c => enrolledClasses.includes(c.id)).map((classItem) => (
              <div key={classItem.id} className="flex items-center gap-4 p-3 bg-dark-300/50 rounded-xl">
                <div className="w-10 h-10 bg-primary-500/20 rounded-xl flex items-center justify-center">
                  <FiCalendar className="text-primary-500" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{classItem.name}</div>
                  <div className="text-gray-400 text-sm">{classItem.day} - {classItem.time}</div>
                </div>
                <button
                  onClick={() => handleEnroll(classItem)}
                  className="text-red-500 text-sm hover:text-red-400"
                >
                  Cancelar
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
