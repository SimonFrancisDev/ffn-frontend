export async function copyText(value) {
  const text = String(value || '')
  if (!text) return false

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Mobile wallet browsers can expose the API but reject the write.
    }
  }

  const input = document.createElement('textarea')
  input.value = text
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.select()
  input.setSelectionRange(0, text.length)

  try {
    return document.execCommand('copy')
  } finally {
    input.remove()
  }
}
