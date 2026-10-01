import { useEffect, useState } from "react"

export const useWindowSize = () => {
    const [width, setWidth] = useState(0)
    const [height, setHeight] = useState(0)

    useEffect(() => {
        setWidth(window.innerWidth)
        setHeight(window.innerHeight)
    })

    window.addEventListener('resize', () => {
        setHeight(window.innerHeight)
        setWidth(window.innerWidth)
    })
    
    return [width, height]
}