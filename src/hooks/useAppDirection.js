import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { RTL_LANGUAGES } from '../constants/languages'

const useAppDirection = () => {
  const { i18n } = useTranslation()

  useEffect(() => {
    const activeLanguage = i18n.resolvedLanguage || i18n.language || 'en'
    const baseLanguage = activeLanguage.split('-')[0]
    const isRTL = RTL_LANGUAGES.includes(baseLanguage)

    document.documentElement.lang = baseLanguage
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.dataset.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.dataset.language = baseLanguage
    document.body.setAttribute('dir', isRTL ? 'rtl' : 'ltr')
  }, [i18n.language, i18n.resolvedLanguage])
}

export default useAppDirection
