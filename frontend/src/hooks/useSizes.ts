import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Size } from '../types/models'

export function useSizes() {
  const [sizes, setSizes] = useState<Size[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await api.get<Size[]>('/api/sizes')
      const list = Array.isArray(data) ? data : []
      list.sort((a, b) => {
        const ao = a.sortOrder ?? Number.MAX_SAFE_INTEGER
        const bo = b.sortOrder ?? Number.MAX_SAFE_INTEGER
        if (ao !== bo) return ao - bo
        return a.name.localeCompare(b.name, 'ko-KR')
      })
      setSizes(list)
    } catch {
      setError('사이즈 목록을 불러오지 못했습니다.')
      setSizes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { sizes, loading, error, reload: load }
}

export function defaultSizeId(sizes: Size[]): string {
  return sizes[0] ? String(sizes[0].id) : ''
}
