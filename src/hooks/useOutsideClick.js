import { useEffect } from 'react'

const useOutsideClick = (ref, handler, isActive = true) => {
  useEffect(() => {
    if (!isActive) return

    const handleClickOutside = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return
      handler?.(event)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [ref, handler, isActive])
}

export default useOutsideClick