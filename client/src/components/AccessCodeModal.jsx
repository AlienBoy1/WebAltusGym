import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiX, FiCopy, FiCheck } from 'react-icons/fi'
import toast from 'react-hot-toast'

export default function AccessCodeModal({ isOpen, onClose, accessCode, userName }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(accessCode)
    setCopied(true)
    toast.success('Código copiado al portapapeles')
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card max-w-md w-full"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl">Código de Acceso Generado</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-200 rounded-lg"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🔑</span>
          </div>
          <p className="text-gray-400 mb-2">
            Usuario registrado con éxito
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Proporciónale el siguiente código de acceso al usuario para que complete su registro:
          </p>
        </div>

        <div className="bg-dark-200 rounded-xl p-6 mb-6">
          <div className="text-center">
            <label className="block text-sm text-gray-400 mb-2">Código de Acceso</label>
            <div className="flex items-center justify-center gap-3">
              <div className="font-mono text-3xl font-bold text-primary-500 tracking-wider">
                {accessCode}
              </div>
              <button
                onClick={handleCopy}
                className={`p-3 rounded-lg transition-colors ${
                  copied 
                    ? 'bg-accent-green/20 text-accent-green' 
                    : 'bg-dark-300 hover:bg-dark-100 text-gray-400 hover:text-white'
                }`}
                title="Copiar código"
              >
                {copied ? <FiCheck size={20} /> : <FiCopy size={20} />}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-300 text-center">
            <strong>Instrucciones:</strong> El usuario debe ir a la pantalla de login, hacer clic en 
            "Tengo una clave de acceso" e ingresar su correo y este código para completar su registro.
          </p>
        </div>

        <button
          onClick={onClose}
          className="btn-primary w-full"
        >
          Entendido
        </button>
      </motion.div>
    </div>
  )
}

