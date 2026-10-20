import { describe, it, expect } from 'vitest'
import { calculateDistanceKm, formatDistance, formatLastUpdated } from '../utils/geoUtils'

describe('Haversine distance calculation and formatting', () => {
  it('calculates distance between two points accurately', () => {
    // San Francisco to Oakland (~13 km)
    const sfLat = 37.7749
    const sfLon = -122.4194
    const oakLat = 37.8044
    const oakLon = -122.2712

    const distance = calculateDistanceKm(sfLat, sfLon, oakLat, oakLon)
    expect(distance).toBeGreaterThan(12)
    expect(distance).toBeLessThan(15)
  })

  it('calculates 0 distance for identical coordinates', () => {
    const lat = 13.3409
    const lon = 74.7421
    const distance = calculateDistanceKm(lat, lon, lat, lon)
    expect(distance).toBe(0)
  })

  it('formats distance correctly for close and far users', () => {
    expect(formatDistance(0.45)).toBe('450 m away')
    expect(formatDistance(2.54)).toBe('2.5 km away')
    expect(formatDistance(null)).toBe('Distance hidden')
    expect(formatDistance(undefined)).toBe('Distance hidden')
  })

  it('formats relative timestamp accurately', () => {
    const now = new Date().toISOString()
    expect(formatLastUpdated(now)).toBe('Live now')

    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    expect(formatLastUpdated(fiveMinsAgo)).toBe('5 mins ago')

    expect(formatLastUpdated(null)).toBe('Time unknown')
  })
})
