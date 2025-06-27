import { useState, useEffect, useCallback } from 'react'

interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  cacheHitRate: number
  apiResponseTime: number
}

export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    apiResponseTime: 0
  })

  const [apiTimes, setApiTimes] = useState<number[]>([])
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0 })

  // Measure render time
  const measureRenderTime = useCallback(() => {
    const start = performance.now()
    
    // Use requestAnimationFrame to measure actual render time
    requestAnimationFrame(() => {
      const end = performance.now()
      const renderTime = end - start
      
      setMetrics(prev => ({ ...prev, renderTime }))
    })
  }, [])

  // Measure memory usage
  const measureMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      setMetrics(prev => ({ 
        ...prev, 
        memoryUsage: memory.usedJSHeapSize 
      }))
    }
  }, [])

  // Track API response times
  const trackApiCall = useCallback((responseTime: number) => {
    setApiTimes(prev => {
      const newTimes = [...prev, responseTime].slice(-10) // Keep last 10 calls
      const avgResponseTime = newTimes.reduce((a, b) => a + b, 0) / newTimes.length
      
      setMetrics(prevMetrics => ({ 
        ...prevMetrics, 
        apiResponseTime: avgResponseTime 
      }))
      
      return newTimes
    })
  }, [])

  // Track cache hits/misses
  const trackCacheHit = useCallback(() => {
    setCacheStats(prev => {
      const newStats = { ...prev, hits: prev.hits + 1 }
      const total = newStats.hits + newStats.misses
      const hitRate = total > 0 ? (newStats.hits / total) * 100 : 0
      
      setMetrics(prevMetrics => ({ 
        ...prevMetrics, 
        cacheHitRate: hitRate 
      }))
      
      return newStats
    })
  }, [])

  const trackCacheMiss = useCallback(() => {
    setCacheStats(prev => {
      const newStats = { ...prev, misses: prev.misses + 1 }
      const total = newStats.hits + newStats.misses
      const hitRate = total > 0 ? (newStats.hits / total) * 100 : 0
      
      setMetrics(prevMetrics => ({ 
        ...prevMetrics, 
        cacheHitRate: hitRate 
      }))
      
      return newStats
    })
  }, [])

  // Performance optimization suggestions
  const optimize = useCallback(() => {
    // Clear old API times
    setApiTimes([])
    
    // Reset cache stats
    setCacheStats({ hits: 0, misses: 0 })
    
    // Force garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc()
    }
    
    // Measure after optimization
    setTimeout(() => {
      measureMemoryUsage()
      measureRenderTime()
    }, 100)
  }, [measureMemoryUsage, measureRenderTime])

  // Monitor performance periodically
  useEffect(() => {
    const interval = setInterval(() => {
      measureMemoryUsage()
      measureRenderTime()
    }, 5000) // Every 5 seconds

    return () => clearInterval(interval)
  }, [measureMemoryUsage, measureRenderTime])

  // Initial measurement
  useEffect(() => {
    measureMemoryUsage()
    measureRenderTime()
  }, [measureMemoryUsage, measureRenderTime])

  return {
    metrics,
    trackApiCall,
    trackCacheHit,
    trackCacheMiss,
    optimize
  }
}