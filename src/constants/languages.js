export const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: 'GB', dir: 'ltr' },
  { code: 'it', label: 'Italian', nativeLabel: 'Italiano', flag: 'IT', dir: 'ltr' },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文', flag: 'CN', dir: 'ltr' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', flag: 'IN', dir: 'ltr' },
  { code: 'fa', label: 'Persian', nativeLabel: 'فارسی', flag: 'IR', dir: 'rtl' },
  { code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia', flag: 'ID', dir: 'ltr' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어', flag: 'KR', dir: 'ltr' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', flag: 'FR', dir: 'ltr' },
  { code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt', flag: 'VN', dir: 'ltr' },
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский', flag: 'RU', dir: 'ltr' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', flag: 'ES', dir: 'ltr' },
]

export const RTL_LANGUAGES = LANGUAGES
  .filter((language) => language.dir === 'rtl')
  .map((language) => language.code)
