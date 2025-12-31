import { ref } from 'vue'

const cookie = ref('')

export function useApi() {
  const setCookie = (value: string) => {
    cookie.value = value
  }

  const getCookie = () => cookie.value

  const apiRequest = async (
    path: string,
    params: Record<string, string | number> = {}
  ): Promise<Record<string, unknown>> => {
    const query = new URLSearchParams()
    query.set('cookie', cookie.value)
    for (const [key, val] of Object.entries(params)) {
      query.set(key, String(val))
    }
    return (await fetch(`http://localhost:3000${path}?${query.toString()}`)).json()
  }

  return {
    cookie,
    setCookie,
    getCookie,
    apiRequest
  }
}
