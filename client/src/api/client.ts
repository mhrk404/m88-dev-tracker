import axios from "axios"
import { API_BASE_URL } from "@/lib/constants"

const apiClient = axios.create({
  baseURL: API_BASE_URL,
})

// Add auth token interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default apiClient