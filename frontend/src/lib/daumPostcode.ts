import type { DaumPostcodeData } from '../types/daum-postcode'

export type ResolvedPostcode = {
  zonecode: string
  baseAddress: string
  latitude: number | null
  longitude: number | null
}

export function resolveDaumPostcode(data: DaumPostcodeData): ResolvedPostcode {
  const zonecode = (data.zonecode ?? data.postcode ?? '').trim()

  let baseAddress = (data.address ?? '').trim()
  if (!baseAddress) {
    if (data.userSelectedType === 'R' && data.roadAddress) {
      baseAddress = data.roadAddress.trim()
    } else if (data.jibunAddress) {
      baseAddress = data.jibunAddress.trim()
    } else {
      baseAddress = (data.roadAddress ?? data.jibunAddress ?? '').trim()
    }
  }

  if (data.bname && !baseAddress.includes(data.bname)) {
    baseAddress = [baseAddress, data.bname.trim()].filter(Boolean).join(' ')
  }
  if (data.buildingName && !baseAddress.includes(data.buildingName)) {
    baseAddress = [baseAddress, data.buildingName.trim()].filter(Boolean).join(' ')
  }

  const latitude = parseCoord(data.y)
  const longitude = parseCoord(data.x)

  return { zonecode, baseAddress, latitude, longitude }
}

function parseCoord(value: string | number | undefined): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number.parseFloat(value)
  return Number.isFinite(n) ? n : null
}

export function buildOsmMapEmbedUrl(latitude: number, longitude: number): string {
  const padLon = 0.008
  const padLat = 0.006
  const minLon = longitude - padLon
  const minLat = latitude - padLat
  const maxLon = longitude + padLon
  const maxLat = latitude + padLat
  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLon}%2C${minLat}%2C${maxLon}%2C${maxLat}&layer=mapnik&marker=${latitude}%2C${longitude}`
}
