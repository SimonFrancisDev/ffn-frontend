
export const createOrbitStore = () => ({
  referrerCache: new Map(),
  viewedLevelsCache: new Map(),
  cycleHistoryCache: new Map(),
  receiptCache: new Map(),
  activationReceiptCache: new Map(),
  loadedLevels: new Set(),
  loadingLevels: new Set(),
  positionDetailsCache: new Map(),
  positionHydrationPromises: new Map()
})

export const clearOrbitStoreForAddress = (store, lowerAddress) => {
  if (!lowerAddress) return
  store.viewedLevelsCache.delete(lowerAddress)
  store.receiptCache.delete(`${lowerAddress}-backend-receipts`)
  store.activationReceiptCache.clear()
  store.positionDetailsCache.clear()
  store.positionHydrationPromises.clear()
  store.cycleHistoryCache.clear()

  Array.from(store.loadedLevels).forEach((key) => {
    if (key.startsWith(`${lowerAddress}-`)) {
      store.loadedLevels.delete(key)
    }
  })
  Array.from(store.loadingLevels).forEach((key) => {
    if (key.startsWith(`${lowerAddress}-`)) {
      store.loadingLevels.delete(key)
    }
  })
}

export const clearAllOrbitStore = (store) => {
  store.referrerCache.clear()
  store.viewedLevelsCache.clear()
  store.cycleHistoryCache.clear()
  store.receiptCache.clear()
  store.activationReceiptCache.clear()
  store.loadedLevels.clear()
  store.loadingLevels.clear()
  store.positionDetailsCache.clear()
  store.positionHydrationPromises.clear()
}
