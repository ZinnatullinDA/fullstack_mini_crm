import { useCallback, useEffect, useRef, useState } from 'react'

interface QueryState<T> {
  key: string
  data: T | null
  error: string | null
  loading: boolean
}

export function useQuery<T>(load: () => Promise<T>, key: string) {
  const loadRef = useRef(load)
  const [state, setState] = useState<QueryState<T>>({
key,
data: null,
error: null,
loading: true
})

  useEffect(() => { loadRef.current = load })

  const reload = useCallback(async () => {
    setState(previous => ({
...previous,
key,
loading: true,
error: null
}))

    try {
      const data = await loadRef.current()
      setState({
key,
data,
error: null,
loading: false
})
    }
    catch (cause) {
      setState({
key,
data: null,
error: cause instanceof Error
? cause.message
: 'Ошибка загрузки',
loading: false
})
    }
  }, [key])

  useEffect(() => {
    let active = true

    void loadRef.current().then(
      data => { if (active) { 
setState({
key,
data,
error: null,
loading: false
})
} },
      cause => { if (active) { 
setState({
key,
data: null,
error: cause instanceof Error
? cause.message
: 'Ошибка загрузки',
loading: false
})
} },
    )

    return () => { active = false }
  }, [key])

  return {
    data: state.key === key
? state.data
: null,
    error: state.key === key
? state.error
: null,
    loading: state.key !== key || state.loading,
    reload,
  }
}
