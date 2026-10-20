// Haversine formula for calculating spherical distance between two coordinate pairs in kilometers
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's mean radius in km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function formatDistance(distanceKm: number | null | undefined): string {
  if (distanceKm === null || distanceKm === undefined) return 'Distance hidden'
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000)
    return `${meters} m away`
  }
  return `${distanceKm.toFixed(1)} km away`
}

export function formatLastUpdated(timestamp: string | null | undefined): string {
  if (!timestamp) return 'Time unknown'
  const diffMs = Date.now() - new Date(timestamp).getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return 'Live now'
  if (diffMinutes === 1) return '1 min ago'
  if (diffMinutes < 60) return `${diffMinutes} mins ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours === 1) return '1 hour ago'
  return `${diffHours} hours ago`
}
