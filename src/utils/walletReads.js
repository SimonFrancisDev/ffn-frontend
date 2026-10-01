export const skippedRead = Object.freeze({ skipped: true })

export function optionalRead(promise) {
  return promise
    .then((value) => ({ ok: true, value }))
    .catch((error) => ({ ok: false, error }))
}

export function retainedRead(result, previous, format = (value) => value) {
  return result.ok && !result.skipped ? format(result.value) : previous ?? null
}

// Display strings are locale-dependent; transaction checks require raw units.
export function hasTokenBalance(balance, required) {
  return typeof balance === 'bigint' && typeof required === 'bigint'
    && required > 0n && balance >= required
}

// A newer request or effect cleanup invalidates every older completion.
export function createRequestGate() {
  let version = 0
  return {
    begin() {
      const request = ++version
      return () => request === version
    },
    cancel() { version += 1 },
  }
}
