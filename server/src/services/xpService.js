import User from '../models/User.js'
import Notification from '../models/Notification.js'

// Badge definitions
const BADGE_DEFINITIONS = [
  { id: 'first_workout', name: 'Primer Entrenamiento', icon: '🎯', xpRequired: 0, type: 'workout', threshold: 1 },
  { id: 'workout_10', name: '10 Entrenamientos', icon: '💪', xpRequired: 0, type: 'workout', threshold: 10 },
  { id: 'workout_50', name: '50 Entrenamientos', icon: '🔥', xpRequired: 0, type: 'workout', threshold: 50 },
  { id: 'workout_100', name: '100 Entrenamientos', icon: '🏆', xpRequired: 0, type: 'workout', threshold: 100 },
  { id: 'streak_7', name: 'Racha de 7 Días', icon: '⚡', xpRequired: 0, type: 'streak', threshold: 7 },
  { id: 'streak_30', name: 'Racha de 30 Días', icon: '🌟', xpRequired: 0, type: 'streak', threshold: 30 },
  { id: 'xp_100', name: '100 XP', icon: '⭐', xpRequired: 100, type: 'xp', threshold: 100 },
  { id: 'xp_500', name: '500 XP', icon: '💎', xpRequired: 500, type: 'xp', threshold: 500 },
  { id: 'xp_1000', name: '1000 XP', icon: '👑', xpRequired: 1000, type: 'xp', threshold: 1000 },
  { id: 'xp_5000', name: '5000 XP', icon: '🚀', xpRequired: 5000, type: 'xp', threshold: 5000 },
  { id: 'level_5', name: 'Nivel 5', icon: '🎖️', xpRequired: 0, type: 'level', threshold: 5 },
  { id: 'level_10', name: 'Nivel 10', icon: '🏅', xpRequired: 0, type: 'level', threshold: 10 },
  { id: 'social_10', name: 'Social Star', icon: '⭐', xpRequired: 0, type: 'social', threshold: 10 },
  { id: 'challenge_1', name: 'Primer Reto', icon: '🎯', xpRequired: 0, type: 'challenge', threshold: 1 },
  { id: 'challenge_10', name: 'Maestro de Retos', icon: '🏆', xpRequired: 0, type: 'challenge', threshold: 10 }
]

/**
 * Award XP to a user and check for level ups
 * @param {String} userId - User ID
 * @param {Number} amount - XP amount to award
 * @param {String} reason - Reason for awarding XP
 * @param {Boolean} skipBadgeCheck - Skip badge checking to prevent infinite loops
 * @returns {Promise<Object>} Updated user stats
 */
export async function awardXP(userId, amount, reason = 'Actividad', skipBadgeCheck = false) {
  try {
    const user = await User.findById(userId)
    if (!user) throw new Error('Usuario no encontrado')

    const oldLevel = user.stats?.level || 1
    user.stats = user.stats || {}
    user.stats.xp = (user.stats.xp || 0) + amount

    // Calculate level (100 XP per level)
    const newLevel = Math.floor((user.stats.xp || 0) / 100) + 1
    user.stats.level = newLevel

    const leveledUp = newLevel > oldLevel

    await user.save()

    // Send notification if leveled up
    if (leveledUp) {
      await Notification.create({
        user: userId,
        type: 'level_up',
        title: `¡Subiste a Nivel ${newLevel}!`,
        body: `Has alcanzado el nivel ${newLevel}. ¡Sigue así!`,
        icon: '🎉',
        priority: 'high'
      })
    }

    // Check for badge unlocks (unless we're skipping to prevent loops)
    if (!skipBadgeCheck) {
      await checkBadgeUnlocks(userId, false)
    }

    return {
      xp: user.stats.xp,
      level: user.stats.level,
      leveledUp,
      oldLevel
    }
  } catch (error) {
    console.error('Error awarding XP:', error)
    throw error
  }
}

/**
 * Check and unlock badges for a user
 * @param {String} userId - User ID
 * @param {Boolean} skipXPBadges - Skip XP-based badges to prevent loops
 * @returns {Promise<Array>} Newly unlocked badges
 */
export async function checkBadgeUnlocks(userId, skipXPBadges = false) {
  try {
    const user = await User.findById(userId)
    if (!user) throw new Error('Usuario no encontrado')

    const unlockedBadges = []
    const userBadgeIds = (user.badges || []).map(b => b.id || b._id)

    for (const badgeDef of BADGE_DEFINITIONS) {
      // Skip if already unlocked
      if (userBadgeIds.includes(badgeDef.id)) continue

      // Skip XP badges if requested
      if (skipXPBadges && badgeDef.type === 'xp') continue

      let shouldUnlock = false

      switch (badgeDef.type) {
        case 'workout':
          shouldUnlock = (user.stats?.totalWorkouts || 0) >= badgeDef.threshold
          break
        case 'streak':
          shouldUnlock = (user.stats?.longestStreak || 0) >= badgeDef.threshold
          break
        case 'level':
          shouldUnlock = (user.stats?.level || 1) >= badgeDef.threshold
          break
        case 'xp':
          shouldUnlock = (user.stats?.xp || 0) >= badgeDef.threshold
          break
        case 'social':
          // This would need to be calculated based on social activity
          // For now, we'll skip it or implement a basic check
          shouldUnlock = false
          break
        case 'challenge':
          // This would need to be calculated based on challenge completions
          // For now, we'll skip it or implement a basic check
          shouldUnlock = false
          break
        default:
          shouldUnlock = false
      }

      if (shouldUnlock) {
        user.badges = user.badges || []
        user.badges.push({
          id: badgeDef.id,
          name: badgeDef.name,
          icon: badgeDef.icon,
          earnedAt: new Date()
        })

        unlockedBadges.push(badgeDef)

        // Send notification
        await Notification.create({
          user: userId,
          type: 'badge_unlocked',
          title: `¡Nueva Insignia Desbloqueada!`,
          body: `Has desbloqueado: ${badgeDef.name} ${badgeDef.icon}`,
          icon: badgeDef.icon,
          priority: 'high'
        })
      }
    }

    if (unlockedBadges.length > 0) {
      await user.save()
    }

    return unlockedBadges
  } catch (error) {
    console.error('Error checking badge unlocks:', error)
    throw error
  }
}

/**
 * Get all badge definitions
 * @returns {Array} All badge definitions
 */
export function getBadgeDefinitions() {
  return BADGE_DEFINITIONS
}

