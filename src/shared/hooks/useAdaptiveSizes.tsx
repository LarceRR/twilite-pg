import { useEffect, useState } from "react"
import { useWindowSize } from "./useWindowSIze"

export const useAdaptiveSizes = () => {
    const [currentWindowWidth] = useWindowSize()
    const [currentAdaptiveSize, setCurrentAdaptiveSize] = useState('')

    useEffect(() => {
        currentWindowWidth <= 1920 && setCurrentAdaptiveSize('desktop')
        currentWindowWidth <= 1280 && setCurrentAdaptiveSize('laptop')
        currentWindowWidth <= 768 && setCurrentAdaptiveSize('tablet')
        currentWindowWidth <= 420 && setCurrentAdaptiveSize('mobile')
    }, [currentWindowWidth])
    
    return currentAdaptiveSize
}