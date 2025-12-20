import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSend, FiSearch, FiMoreVertical, FiArrowLeft, FiPlus, FiX, FiUsers, FiUserPlus } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../utils/api'
import { getSocket, showNotification, requestNotificationPermission } from '../../utils/socket'
import toast from 'react-hot-toast'

export default function Chat() {
  const { user } = useAuthStore()
  const [conversations, setConversations] = useState([])
  const [selectedChat, setSelectedChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [search, setSearch] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [userFilter, setUserFilter] = useState('all') // all, with_conversation, following, not_following
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [selectedMembers, setSelectedMembers] = useState([])
  const [groupMessages, setGroupMessages] = useState([])
  const [chatMode, setChatMode] = useState('individual') // 'individual' or 'group'
  const messagesEndRef = useRef(null)
  const selectedChatRef = useRef(null)
  const selectedGroupRef = useRef(null)
  const isAdmin = user?.role === 'admin'
  
  // Keep refs updated
  useEffect(() => {
    selectedChatRef.current = selectedChat
  }, [selectedChat])
  
  useEffect(() => {
    selectedGroupRef.current = selectedGroup
  }, [selectedGroup])
  
  // Setup socket listeners
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !user?._id) return
    
    const handleNewMessage = (data) => {
      console.log('New message received:', data)
      
      // Show push notification
      showNotification(`💬 ${data.fromName}`, data.message, {
        tag: `msg-${data.from}`,
        onClick: () => {
          // Could navigate to chat
        }
      })
      
      // Show toast
      toast.success(`${data.fromName}: ${data.message}`, { duration: 4000, icon: '💬' })
      
      // Update messages if this chat is open
      if (selectedChatRef.current?.oderId === data.from) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          sender: 'other',
          text: data.message,
          time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
        }])
      }
      
      // Update conversation list
      setConversations(prev => {
        const existing = prev.find(c => c.oderId === data.from)
        if (existing) {
          return prev.map(c => c.oderId === data.from 
            ? { ...c, lastMessage: data.message, time: 'Ahora', unread: selectedChatRef.current?.oderId === data.from ? 0 : (c.unread || 0) + 1 } 
            : c
          )
        } else {
          return [{
            id: Date.now(),
            oderId: data.from,
            name: data.fromName,
            avatar: data.fromName?.charAt(0) || '👤',
            lastMessage: data.message,
            time: 'Ahora',
            unread: 1
          }, ...prev]
        }
      })
    }
    
    const handleUserOnline = (userId) => {
      setOnlineUsers(prev => new Set([...prev, userId]))
    }
    
    const handleUserOffline = (userId) => {
      setOnlineUsers(prev => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
    
    const handleUserTyping = (data) => {
      if (selectedChatRef.current?.oderId === data.from) {
        setTypingUsers(prev => ({ ...prev, [data.from]: true }))
        setTimeout(() => {
          setTypingUsers(prev => {
            const next = { ...prev }
            delete next[data.from]
            return next
          })
        }, 3000)
      }
    }
    
    const handleUserStoppedTyping = (data) => {
      setTypingUsers(prev => {
        const next = { ...prev }
        delete next[data.from]
        return next
      })
    }
    
    const handleNewGroupMessage = (data) => {
      if (selectedGroupRef.current?._id === data.groupId) {
        setGroupMessages(prev => [...prev, {
          id: data.messageId,
          sender: data.from === user._id ? 'me' : 'other',
          senderName: data.fromName,
          text: data.message,
          time: new Date(data.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
          delivered: true
        }])
      }
    }
    
    socket.on('newMessage', handleNewMessage)
    socket.on('newGroupMessage', handleNewGroupMessage)
    socket.on('userOnline', handleUserOnline)
    socket.on('userOffline', handleUserOffline)
    socket.on('userTyping', handleUserTyping)
    socket.on('userStoppedTyping', handleUserStoppedTyping)
    
    // Request notification permission
    requestNotificationPermission()
    
    // Fetch conversations
    fetchConversations()
    
    return () => {
      socket.off('newMessage', handleNewMessage)
      socket.off('newGroupMessage', handleNewGroupMessage)
      socket.off('userOnline', handleUserOnline)
      socket.off('userOffline', handleUserOffline)
      socket.off('userTyping', handleUserTyping)
      socket.off('userStoppedTyping', handleUserStoppedTyping)
    }
  }, [user])
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, groupMessages])
  
  useEffect(() => {
    if (selectedChat?.oderId && chatMode === 'individual') {
      fetchMessages(selectedChat.oderId)
    }
  }, [selectedChat, chatMode])
  
  useEffect(() => {
    if (isAdmin) {
      fetchGroups()
    }
  }, [isAdmin])
  
  useEffect(() => {
    if (selectedGroup && chatMode === 'group') {
      fetchGroupMessages(selectedGroup._id)
    }
  }, [selectedGroup, chatMode])
  
  const fetchConversations = async () => {
    try {
      const { data } = await api.get('/chat/conversations')
      if (data.length > 0) {
        setConversations(data.map(c => ({
          ...c,
          time: c.time ? new Date(c.time).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : ''
        })))
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    }
  }
  
  const fetchMessages = async (oderId) => {
    try {
      const { data } = await api.get(`/chat/messages/${oderId}`)
      setMessages(data)
      setConversations(convs => convs.map(c => c.oderId === oderId ? { ...c, unread: 0 } : c))
      
      // Mark messages as read via socket
      const socket = getSocket()
      if (socket?.connected) {
        data.forEach(msg => {
          if (msg.sender === 'other' && !msg.read) {
            socket.emit('markMessageRead', { messageId: msg.id })
          }
        })
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      if (error.response?.status === 403) {
        toast.error(error.response.data.message)
      }
      setMessages([])
    }
  }
  
  const handleSelectChat = (conv) => {
    setSelectedChat(conv)
  }
  
  const handleBack = () => {
    setSelectedChat(null)
  }
  
  const [typingUsers, setTypingUsers] = useState({})
  const typingTimeoutRef = useRef({})
  
  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedChat) return
    
    const msgText = newMessage
    setNewMessage('')
    
    // Stop typing indicator
    const socket = getSocket()
    if (socket?.connected) {
      socket.emit('stopTyping', {
        to: selectedChat.oderId,
        from: user._id
      })
    }
    
    const tempMsg = {
      id: Date.now(),
      sender: 'me',
      text: msgText,
      time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      delivered: false,
      read: false
    }
    setMessages(prev => [...prev, tempMsg])
    
    if (socket?.connected) {
      socket.emit('sendMessage', {
        to: selectedChat.oderId,
        from: user._id,
        fromName: user.name,
        message: msgText
      })
      
      socket.once('messageSent', (data) => {
        if (data.success) {
          setMessages(prev => prev.map(m => 
            m.id === tempMsg.id ? { ...m, id: data.messageId, delivered: data.delivered } : m
          ))
        } else {
          toast.error(data.error || 'Error al enviar mensaje')
          setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
        }
      })
    } else {
      // Fallback to REST API
      try {
        const { data } = await api.post('/chat/send', { to: selectedChat.oderId, content: msgText })
        setMessages(prev => prev.map(m => 
          m.id === tempMsg.id ? { ...m, id: data.id, delivered: data.delivered } : m
        ))
      } catch (error) {
        toast.error(error.response?.data?.message || 'Error al enviar mensaje')
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
      }
    }
    
    setConversations(convs => convs.map(c => 
      c.oderId === selectedChat.oderId ? { ...c, lastMessage: msgText, time: 'Ahora' } : c
    ))
  }
  
  const handleTyping = () => {
    if (!selectedChat || !socket?.connected) return
    
    const socket = getSocket()
    socket.emit('typing', {
      to: selectedChat.oderId,
      from: user._id
    })
    
    // Clear existing timeout
    if (typingTimeoutRef.current[selectedChat.oderId]) {
      clearTimeout(typingTimeoutRef.current[selectedChat.oderId])
    }
    
    // Set timeout to stop typing
    typingTimeoutRef.current[selectedChat.oderId] = setTimeout(() => {
      socket.emit('stopTyping', {
        to: selectedChat.oderId,
        from: user._id
      })
    }, 3000)
  }
  
  const searchUsers = async () => {
    setSearching(true)
    try {
      const params = new URLSearchParams()
      if (userSearch.trim()) {
        params.append('q', userSearch.trim())
      }
      if (userFilter && userFilter !== 'all') {
        params.append('filter', userFilter)
      }
      
      const url = `/users/search${params.toString() ? `?${params.toString()}` : ''}`
      const { data } = await api.get(url)
      setSearchResults(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error searching users:', error)
      console.error('Error details:', error.response?.data)
      setSearchResults([])
      if (error.response?.status !== 404) {
        toast.error('Error al buscar usuarios')
      }
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    if (showNewChat) {
      const timeoutId = setTimeout(() => {
        searchUsers()
      }, userSearch.trim() ? 300 : 500)
      return () => clearTimeout(timeoutId)
    } else {
      setSearchResults([])
    }
  }, [userFilter, showNewChat, userSearch])
  
  const startConversation = async (selectedUser) => {
    // Check if both users follow each other before starting conversation
    try {
      const { data: followStatus } = await api.get(`/social/${selectedUser._id}/follow-status`)
      const currentUserFollows = followStatus.isFollowing
      const selectedUserFollows = followStatus.targetFollowsCurrent
      
      if (!currentUserFollows || !selectedUserFollows) {
        toast.error('No puedes comunicarte con un usuario que aún no sigues ni te sigue. Completen su follow para poder intercambiar mensajes en Altus Gym')
        return
      }
      
      const existingConv = conversations.find(c => c.oderId === selectedUser._id)
      if (existingConv) {
        setSelectedChat(existingConv)
      } else {
        const newConv = {
          id: Date.now(),
          oderId: selectedUser._id,
          name: selectedUser.name,
          avatar: selectedUser.name?.charAt(0) || '👤',
          lastMessage: '',
          time: 'Ahora',
          unread: 0
        }
        setConversations([newConv, ...conversations])
        setSelectedChat(newConv)
      }
      setShowNewChat(false)
      setUserSearch('')
      setSearchResults([])
    } catch (error) {
      toast.error('Error al iniciar conversación')
    }
  }
  
  const fetchGroups = async () => {
    try {
      const { data } = await api.get('/chat/groups')
      setGroups(data || [])
    } catch (error) {
      console.error('Error fetching groups:', error)
    }
  }
  
  const fetchGroupMessages = async (groupId) => {
    try {
      const { data } = await api.get(`/chat/groups/${groupId}/messages`)
      setGroupMessages(data || [])
    } catch (error) {
      console.error('Error fetching group messages:', error)
    }
  }
  
  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) {
      toast.error('Nombre y al menos un miembro son requeridos')
      return
    }
    
    try {
      const { data } = await api.post('/chat/groups', {
        name: groupName,
        description: groupDescription,
        memberIds: selectedMembers.map(m => m._id)
      })
      setGroups([data, ...groups])
      setShowCreateGroup(false)
      setGroupName('')
      setGroupDescription('')
      setSelectedMembers([])
      toast.success('Grupo creado exitosamente')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al crear grupo')
    }
  }
  
  const handleSendGroupMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedGroup) return
    
    const msgText = newMessage
    setNewMessage('')
    
    const tempMsg = {
      id: Date.now(),
      sender: 'me',
      text: msgText,
      time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      delivered: false
    }
    setGroupMessages(prev => [...prev, tempMsg])
    
    const socket = getSocket()
    if (socket?.connected) {
      socket.emit('sendGroupMessage', {
        groupId: selectedGroup._id,
        from: user._id,
        content: msgText
      })
      
      socket.once('groupMessageSent', (data) => {
        if (data.success) {
          setGroupMessages(prev => prev.map(m => 
            m.id === tempMsg.id ? { ...m, id: data.messageId, delivered: data.delivered } : m
          ))
        } else {
          toast.error(data.error || 'Error al enviar mensaje')
          setGroupMessages(prev => prev.filter(m => m.id !== tempMsg.id))
        }
      })
    } else {
      // Fallback to REST API
      try {
        const { data } = await api.post(`/chat/groups/${selectedGroup._id}/messages`, {
          content: msgText
        })
        setGroupMessages(prev => prev.map(m => m.id === tempMsg.id ? data : m))
      } catch (error) {
        toast.error('Error al enviar mensaje')
        setGroupMessages(prev => prev.filter(m => m.id !== tempMsg.id))
      }
    }
  }
  
  const toggleMemberSelection = (user) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m._id === user._id)
      if (exists) {
        return prev.filter(m => m._id !== user._id)
      } else {
        return [...prev, user]
      }
    })
  }
  
  const filteredConversations = conversations.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  )
  
  const isOnline = (userId) => onlineUsers.has(userId)
  
  return (
    <div className="h-[calc(100vh-180px)] flex gap-4">
      {/* Conversations List */}
      <div className={`w-full md:w-80 flex-shrink-0 card p-0 overflow-hidden flex flex-col ${selectedChat || selectedGroup ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-white/5">
          {isAdmin && (
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => { setChatMode('individual'); setSelectedGroup(null); setSelectedChat(null) }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm transition-colors ${
                  chatMode === 'individual' ? 'bg-primary-500 text-white' : 'bg-dark-200 text-gray-400'
                }`}
              >
                Individual
              </button>
              <button
                onClick={() => { setChatMode('group'); setSelectedChat(null); setSelectedGroup(null) }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm transition-colors ${
                  chatMode === 'group' ? 'bg-primary-500 text-white' : 'bg-dark-200 text-gray-400'
                }`}
              >
                Grupos
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={chatMode === 'group' ? "Buscar grupo..." : "Buscar conversación..."} className="input-field pl-10 py-2" />
            </div>
            {chatMode === 'individual' ? (
              <button onClick={() => setShowNewChat(true)} className="p-2 bg-primary-500 rounded-xl text-white hover:bg-primary-600">
                <FiPlus size={20} />
              </button>
            ) : isAdmin && (
              <button onClick={() => setShowCreateGroup(true)} className="p-2 bg-primary-500 rounded-xl text-white hover:bg-primary-600">
                <FiUsers size={20} />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {chatMode === 'group' ? (
            groups.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No hay grupos</p>
                {isAdmin && (
                  <button onClick={() => setShowCreateGroup(true)} className="text-primary-500 mt-2">Crear un grupo</button>
                )}
              </div>
            ) : (
              groups.filter(g => g.name?.toLowerCase().includes(search.toLowerCase())).map((group) => (
                <button key={group._id} onClick={() => { setSelectedGroup(group); setChatMode('group') }}
                  className={`w-full flex items-center gap-3 p-4 hover:bg-dark-200 transition-colors ${selectedGroup?._id === group._id ? 'bg-dark-200' : ''}`}>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center text-2xl">
                    <FiUsers />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium truncate">{group.name}</div>
                    <div className="text-gray-400 text-sm truncate">{group.members?.length || 0} miembros</div>
                  </div>
                </button>
              ))
            )
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No hay conversaciones</p>
              <button onClick={() => setShowNewChat(true)} className="text-primary-500 mt-2">Iniciar una nueva</button>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button key={conv.id} onClick={() => handleSelectChat(conv)}
                className={`w-full flex items-center gap-3 p-4 hover:bg-dark-200 transition-colors ${selectedChat?.id === conv.id ? 'bg-dark-200' : ''}`}>
                <Link to={`/user/${conv.oderId}`} className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-2xl overflow-hidden">
                    {conv.avatar?.startsWith('data:') || conv.avatar?.startsWith('http') ? (
                      <img src={conv.avatar} alt={conv.name} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      conv.avatar
                    )}
                  </div>
                  {isOnline(conv.oderId) && <div className="absolute bottom-0 right-0 w-3 h-3 bg-accent-green rounded-full border-2 border-dark-200" />}
                </Link>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between">
                    <Link to={`/user/${conv.oderId}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:text-primary-500 transition-colors">
                      {conv.name}
                    </Link>
                    <span className="text-xs text-gray-500">{conv.time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-gray-400 text-sm truncate">{conv.lastMessage || 'Nuevo chat'}</p>
                    {conv.unread > 0 && <span className="w-5 h-5 bg-primary-500 rounded-full text-xs flex items-center justify-center">{conv.unread}</span>}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
      
      {/* Chat Area */}
      {selectedGroup && chatMode === 'group' ? (
        <div className="flex-1 card p-0 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center gap-3">
            <button onClick={() => { setSelectedGroup(null); setChatMode('individual') }} className="md:hidden text-gray-400 hover:text-white"><FiArrowLeft size={20} /></button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center text-xl">
              <FiUsers />
            </div>
            <div className="flex-1">
              <div className="font-medium">{selectedGroup.name}</div>
              <div className="text-xs text-gray-500">{selectedGroup.members?.length || 0} miembros</div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {groupMessages.length === 0 ? (
              <div className="text-center text-gray-400 py-8"><p>Envía un mensaje para iniciar</p></div>
            ) : (
              groupMessages.map((msg) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3 rounded-2xl ${msg.sender === 'me' ? 'bg-primary-500 text-white rounded-br-md' : 'bg-dark-200 text-white rounded-bl-md'}`}>
                    {msg.sender !== 'me' && (
                      <div className="text-xs font-semibold mb-1 opacity-80">{msg.senderName}</div>
                    )}
                    <p>{msg.text}</p>
                    <p className={`text-xs mt-1 ${msg.sender === 'me' ? 'text-white/70' : 'text-gray-500'}`}>{msg.time}</p>
                  </div>
                </motion.div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={handleSendGroupMessage} className="p-4 border-t border-white/5 flex gap-3">
            <input 
              type="text" 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..." 
              className="input-field flex-1" 
            />
            <button type="submit" disabled={!newMessage.trim()} className="btn-primary px-4"><FiSend /></button>
          </form>
        </div>
      ) : selectedChat ? (
        <div className="flex-1 card p-0 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center gap-3">
            <button onClick={handleBack} className="md:hidden text-gray-400 hover:text-white"><FiArrowLeft size={20} /></button>
            <Link to={`/user/${selectedChat.oderId}`} className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-xl overflow-hidden">
                {selectedChat.avatar?.startsWith('data:') || selectedChat.avatar?.startsWith('http') ? (
                  <img src={selectedChat.avatar} alt={selectedChat.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  selectedChat.avatar
                )}
              </div>
              {isOnline(selectedChat.oderId) && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-accent-green rounded-full border-2 border-dark-200" />}
            </Link>
            <Link to={`/user/${selectedChat.oderId}`} className="flex-1">
              <div className="font-medium hover:text-primary-500 transition-colors">{selectedChat.name}</div>
              <div className={`text-xs ${isOnline(selectedChat.oderId) ? 'text-accent-green' : 'text-gray-500'}`}>
                {isOnline(selectedChat.oderId) ? 'En línea' : 'Desconectado'}
              </div>
            </Link>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8"><p>Envía un mensaje para iniciar</p></div>
            ) : (
              messages.map((msg) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-3 rounded-2xl ${msg.sender === 'me' ? 'bg-primary-500 text-white rounded-br-md' : 'bg-dark-200 text-white rounded-bl-md'}`}>
                    <p>{msg.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className={`text-xs ${msg.sender === 'me' ? 'text-white/70' : 'text-gray-500'}`}>{msg.time}</p>
                      {msg.sender === 'me' && (
                        <div className="flex items-center gap-1">
                          {msg.read ? (
                            <span className="text-blue-400 text-xs" title="Visto">✓✓</span>
                          ) : msg.delivered ? (
                            <span className="text-gray-400 text-xs" title="Entregado">✓</span>
                          ) : (
                            <span className="text-gray-500 text-xs" title="Enviando">○</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {typingUsers[selectedChat.oderId] && (
            <div className="px-4 py-2 text-sm text-gray-400 italic">
              {selectedChat.name} está escribiendo...
            </div>
          )}
          <form onSubmit={handleSend} className="p-4 border-t border-white/5 flex gap-3">
            <input 
              type="text" 
              value={newMessage} 
              onChange={(e) => {
                setNewMessage(e.target.value)
                handleTyping()
              }}
              placeholder="Escribe un mensaje..." 
              className="input-field flex-1" 
            />
            <button type="submit" disabled={!newMessage.trim()} className="btn-primary px-4"><FiSend /></button>
          </form>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 card items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-6xl mb-4">💬</div>
            <p>Selecciona una conversación</p>
            <button onClick={() => setShowNewChat(true)} className="btn-primary mt-4">Nueva conversación</button>
          </div>
        </div>
      )}
      
      {/* Create Group Modal (Admin Only) */}
      {showCreateGroup && isAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl">Crear Grupo</h2>
              <button onClick={() => { setShowCreateGroup(false); setGroupName(''); setGroupDescription(''); setSelectedMembers([]) }}><FiX size={24} /></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Nombre del Grupo</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ej: Equipo de Entrenamiento"
                  className="input-field w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Descripción (opcional)</label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="Descripción del grupo..."
                  className="input-field w-full min-h-[80px]"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Seleccionar Miembros</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                    placeholder="Buscar usuario..."
                    className="input-field flex-1"
                  />
                  <button onClick={searchUsers} disabled={searching} className="btn-primary px-4">
                    {searching ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSearch />}
                  </button>
                </div>
                
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedMembers.map(member => (
                      <div key={member._id} className="flex items-center gap-2 bg-primary-500/20 px-3 py-1 rounded-full">
                        <span className="text-sm">{member.name}</span>
                        <button onClick={() => toggleMemberSelection(member)} className="text-primary-500 hover:text-primary-400">
                          <FiX size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {searchResults.filter(u => !selectedMembers.find(m => m._id === u._id)).map((u) => (
                    <button
                      key={u._id}
                      onClick={() => toggleMemberSelection(u)}
                      className="w-full flex items-center gap-3 p-2 hover:bg-dark-200 rounded-lg"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-sm overflow-hidden">
                        {u.avatar?.startsWith('data:') || u.avatar?.startsWith('http') ? (
                          <img src={u.avatar} alt={u.name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          u.name?.charAt(0) || '👤'
                        )}
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{u.name}</div>
                      </div>
                      <FiUserPlus className="text-primary-500" size={18} />
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedMembers.length === 0}
                className="btn-primary w-full"
              >
                Crear Grupo
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl">Nueva Conversación</h2>
              <button onClick={() => { setShowNewChat(false); setSearchResults([]); setUserSearch(''); setUserFilter('all') }}><FiX size={24} /></button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'with_conversation', label: 'Con conversación' },
                { id: 'following', label: 'Siguiendo' },
                { id: 'not_following', label: 'No siguiendo' }
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setUserFilter(filter.id)}
                  className={`px-3 py-1 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    userFilter === filter.id
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-200 text-gray-400 hover:text-white'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                placeholder="Buscar usuario..."
                className="input-field flex-1"
              />
              <button onClick={searchUsers} disabled={searching} className="btn-primary px-4">
                {searching ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSearch />}
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {searching ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-dark-100 border-t-primary-500 rounded-full animate-spin mx-auto" />
                </div>
              ) : searchResults.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                  {userSearch ? 'No se encontraron usuarios' : 'Selecciona un filtro o busca un usuario'}
                </p>
              ) : (
                searchResults.map((u) => {
                  const getAvatarDisplay = () => {
                    if (u.avatar) {
                      if (u.avatar.startsWith('data:') || u.avatar.startsWith('http')) {
                        return <img src={u.avatar} alt={u.name} className="w-full h-full object-cover rounded-full" />
                      }
                      return u.avatar
                    }
                    return u.name?.charAt(0) || '👤'
                  }

                  return (
                    <button
                      key={u._id}
                      onClick={() => startConversation(u)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-dark-200 rounded-xl"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-primary-500 font-medium overflow-hidden">
                        {getAvatarDisplay()}
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <div className="font-medium truncate">{u.name}</div>
                        <div className="text-gray-400 text-sm truncate">{u.email}</div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
