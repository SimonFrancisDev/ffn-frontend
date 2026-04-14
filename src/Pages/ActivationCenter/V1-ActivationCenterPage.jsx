// import './ActivationCenterPage.css'
// import { useEffect, useState, useCallback, useMemo } from 'react'
// import { useWallet } from '../../hooks/useWallet'
// import { useContracts } from '../../hooks/useContracts'
// import { useSpace } from '../../context/SpaceContext'
// import { web3Service } from '../../Services/web3'
// import { ethers } from 'ethers'
// import { fetchOrbitLevelSnapshotApi, fetchAddressReceiptsApi } from '../../Services/orbitsApi'
// import {
//   FaArrowUp,
//   FaChartBar,
//   FaCoins,
//   FaExclamationTriangle,
//   FaLayerGroup,
//   FaLock,
//   FaNetworkWired,
//   FaSatelliteDish,
//   FaShieldAlt,
//   FaSyncAlt,
//   FaUsers,
//   FaWallet,
// } from 'react-icons/fa'

// const ActivationCenterPage = () => {
//   const { isConnected, account, connect } = useWallet()
//   const { subjectAddress, isOwnSpace, canTransact, switchToSelf } = useSpace()
//   const { contracts, isLoading: contractsLoading, error: contractsError, loadContracts } = useContracts()

//   const viewer = subjectAddress || account

//   // Registration & Level States
//   const [isRegistered, setIsRegistered] = useState(false)
//   const [referrer, setReferrer] = useState('')
//   const [activeLevels, setActiveLevels] = useState({})
//   const [usdtBalance, setUsdtBalance] = useState('0')
//   const [allowance, setAllowance] = useState('0')
//   const [totalEarnings, setTotalEarnings] = useState('0')
//   const [levelEarnings, setLevelEarnings] = useState({})
//   const [escrowLocked, setEscrowLocked] = useState({})
//   const [txStatus, setTxStatus] = useState({ loading: false, hash: null, error: null })
//   const [networkWarning, setNetworkWarning] = useState('')
//   const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString())
  
//   // Deployer & ID1 States
//   const [isDeployer, setIsDeployer] = useState(false)
//   const [deployerUsdtBalance, setDeployerUsdtBalance] = useState('0')
//   const [transferAmount, setTransferAmount] = useState('100')
//   const [transferAddress, setTransferAddress] = useState('')
//   const [showTransferToSelf, setShowTransferToSelf] = useState(true)
//   const [isId1Wallet, setIsId1Wallet] = useState(false)
//   const [id1Address, setId1Address] = useState('')

//   // Extended orbit data
//   const [orbitLevelData, setOrbitLevelData] = useState({})
//   const [downlineData, setDownlineData] = useState({})
//   const [spilloverData, setSpilloverData] = useState({})
//   const [linePaymentCounts, setLinePaymentCounts] = useState({})
//   const [userLocks, setUserLocks] = useState({})
//   const [viewerRoleByLevel, setViewerRoleByLevel] = useState({})
//   const [receiptsSupported, setReceiptsSupported] = useState(false)
//   const [cycleData, setCycleData] = useState({})
//   const [orbitDataLoading, setOrbitDataLoading] = useState(false)

//   // Token summary state
//   const [tokenSummary, setTokenSummary] = useState({
//     fgtByLevel: {},
//     fgtrByLevel: {},
//     lastEventByLevel: {},
//   })

//   // Level Prices
//   const levelPrices = {
//     1: '10', 2: '20', 3: '40', 4: '80', 5: '160',
//     6: '320', 7: '640', 8: '1280', 9: '2560', 10: '5120'
//   }

//   // Orbit Type per level
//   const levelToOrbitType = {
//     1: 'P4', 2: 'P12', 3: 'P39', 4: 'P4', 5: 'P12',
//     6: 'P39', 7: 'P4', 8: 'P12', 9: 'P39', 10: 'P4'
//   }

//   // Orbit config details
//   const orbitTypeConfig = {
//     P4: { positions: 4, lines: 1, levels: [1,4,7,10], image: 'p4-image.png' },
//     P12: { positions: 12, lines: 2, levels: [2,5,8], image: 'p12-image.png' },
//     P39: { positions: 39, lines: 3, levels: [3,6,9], image: 'p39-image.png' }
//   }

//   // Upgrade requirements
//   const upgradeRequirements = {
//     1: 20, 2: 40, 3: 80, 4: 160, 5: 320,
//     6: 640, 7: 1280, 8: 2560, 9: 5120, 10: 10240
//   }

//   const navigateToOrbits = useCallback(() => {
//     window.location.hash = '#orbits'
//     window.dispatchEvent(new CustomEvent('navigate', { detail: 'orbits' }))
//   }, [])

//   const AMOY_CHAIN_ID = '0x13882'

//   const isViewerConnectedWallet = useMemo(() => {
//     if (!viewer || !account) return false
//     return viewer.toLowerCase() === account.toLowerCase()
//   }, [viewer, account])

//   const canWriteHere = isOwnSpace && canTransact && isViewerConnectedWallet

//   const formatViewerAddress = useCallback((value) => {
//     if (!value) return '—'
//     return `${value.slice(0, 8)}...${value.slice(-6)}`
//   }, [])

//   const formatUsdt = useCallback((value) => {
//     try {
//       return Number(ethers.formatUnits(value ?? 0, 6))
//     } catch {
//       return 0
//     }
//   }, [])

//   const getWriteContracts = async () => {
//     const { writeContracts } = await web3Service.initWallet({ requestAccounts: false })
//     return writeContracts
//   }

//   const getLevelBackground = (level) => {
//     if (level === 1 || level === 4 || level === 7 || level === 10) {
//       return `url('/assets/p4-image.png')`;
//     } else if (level === 2 || level === 5 || level === 8) {
//       return `url('/assets/p12-image.png')`;
//     } else if (level === 3 || level === 6 || level === 9) {
//       return `url('/assets/p39-image.png')`; 
//     }
//     return 'none';
//   }

//  const ensureWritableSpace = () => {
//   if (!canWriteHere) {
//     setTxStatus({
//       loading: false,
//       hash: null,
//       error: "You are viewing another member's space. Switch back to your own space to perform this action.",
//     })
//     return false
//   }
//   return true
// }
//   // Fetch full orbit data for a level
//   const fetchFullOrbitData = useCallback(async (level) => {
//     if (!viewer || !isRegistered) return null
    
//     try {
//       const snapshot = await fetchOrbitLevelSnapshotApi(viewer, level)
//       if (!snapshot) return null

//       const positions = snapshot.positions || []
      
//       const downlinePositions = positions.filter(p => {
//         if (!p.occupant || p.occupant?.toLowerCase() === viewer?.toLowerCase()) return false
//         return p.originalReferrer?.toLowerCase() === viewer?.toLowerCase() || 
//                p.truthLabel === 'FOUNDER_PATH'
//       }).length
      
//       const otherOccupants = positions.filter(p => 
//         p.occupant && 
//         p.occupant?.toLowerCase() !== viewer?.toLowerCase() &&
//         p.originalReferrer?.toLowerCase() !== viewer?.toLowerCase()
//       ).length
      
//       const lineCounts = {
//         line1: Number(snapshot.linePaymentCounts?.line1 || 0),
//         line2: Number(snapshot.linePaymentCounts?.line2 || 0),
//         line3: Number(snapshot.linePaymentCounts?.line3 || 0)
//       }
      
//       const totalEarned = snapshot.orbitSummary?.totalEarned || '0'
//       const totalCycles = Number(snapshot.orbitSummary?.totalCycles || 0)
//       const currentCycle = totalCycles + 1
      
//       let viewerRole = 'NONE'
//       if (snapshot.viewerReceiptBreakdown) {
//         if (snapshot.viewerReceiptBreakdown.founderPathGross > 0) viewerRole = 'FOUNDER_PATH'
//         else if (snapshot.viewerReceiptBreakdown.directOwnerGross > 0) viewerRole = 'DIRECT_OWNER'
//         else if (snapshot.viewerReceiptBreakdown.routedSpilloverGross > 0) viewerRole = 'ROUTED_SPILLOVER'
//         else if (snapshot.viewerReceiptBreakdown.recycleGross > 0) viewerRole = 'RECYCLE'
//       }
      
//       return {
//         downlinePositions,
//         otherOccupants,
//         lineCounts,
//         totalEarned: parseFloat(totalEarned).toFixed(2),
//         totalCycles,
//         currentCycle,
//         lockedForNextLevel: snapshot.lockedForNextLevel || '0',
//         viewerRole,
//         positionsFilled: positions.filter(p => p.occupant).length,
//         totalPositions: orbitTypeConfig[levelToOrbitType[level]]?.positions || 4
//       }
//     } catch (err) {
//       console.error(`Failed to fetch orbit data for level ${level}:`, err)
//       return null
//     }
//   }, [viewer, isRegistered])

//   // Fetch earnings from orbit receipts
//   const fetchUserEarnings = useCallback(async () => {
//     if (!contracts || !viewer || !isRegistered) return

//     try {
//       const result = await fetchAddressReceiptsApi(viewer)
//       const receipts = Array.isArray(result?.receipts) ? result.receipts : []
//       setReceiptsSupported(true)
      
//       let total = 0
//       const earningsByLevel = {}
//       const escrowByLevel = {}
      
//       receipts.forEach(receipt => {
//         const level = Number(receipt.level || 0)
//         const liquid = Number(receipt.liquidPaid || 0)
//         const escrow = Number(receipt.escrowLocked || 0)
        
//         total += liquid
//         earningsByLevel[level] = (earningsByLevel[level] || 0) + liquid
//         escrowByLevel[level] = (escrowByLevel[level] || 0) + escrow
//       })
      
//       setTotalEarnings(total.toFixed(2))
//       setLevelEarnings(earningsByLevel)
//       setEscrowLocked(escrowByLevel)
//     } catch (err) {
//       console.error('Error fetching earnings:', err)
//       setReceiptsSupported(false)
//     }
//   }, [contracts, viewer, isRegistered])

//   // Fetch all user data from contracts
//   const fetchUserData = useCallback(async () => {
//     if (!contracts || !viewer) return

//     try {
//       // Check ID1 wallet
//       const id1WalletAddress = await contracts.registration.id1Wallet()
//       const isId1 = id1WalletAddress?.toLowerCase() === viewer.toLowerCase()
//       setIsId1Wallet(isId1)
//       setId1Address(id1WalletAddress)

//       if (isId1) {
//         setIsRegistered(true)
//         setReferrer('')
//         const levels = {}
//         for (let i = 1; i <= 10; i++) levels[i] = true
//         setActiveLevels(levels)
//       } else {
//         const registered = await contracts.registration.isRegistered(viewer)
//         setIsRegistered(registered)

//         if (registered) {
//           const ref = await contracts.registration.getReferrer(viewer)
//           setReferrer(ref === ethers.ZeroAddress ? '' : ref)
//         }

//         const levels = {}
//         for (let i = 1; i <= 10; i++) {
//           try {
//             const activated = await contracts.registration.isLevelActivated(viewer, i)
//             levels[i] = activated
//           } catch {
//             levels[i] = false
//           }
//         }
//         setActiveLevels(levels)
//       }

//       const balance = await contracts.usdt.balanceOf(viewer)
//       setUsdtBalance(formatUsdt(balance).toString())

//       const spender = contracts.levelManager.target
//       const currentAllowance = await contracts.usdt.allowance(viewer, spender)
//       setAllowance(formatUsdt(currentAllowance).toString())

//       if (isRegistered) {
//         await fetchUserEarnings()
//       }
//     } catch (err) {
//       console.error('Data Extraction Failed:', err)
//     }
//   }, [contracts, viewer, formatUsdt, fetchUserEarnings, isRegistered])

//   // Check deployer status
//   useEffect(() => {
//     const checkDeployerStatus = async () => {
//       if (!isOwnSpace) {
//         setIsDeployer(false)
//         return
//       }
//       if (!contracts || !account) return

//       try {
//         const owner = await contracts.registration.owner()
//         const ownerMatch = owner.toLowerCase() === account.toLowerCase()
//         setIsDeployer(ownerMatch)

//         if (ownerMatch && contracts.usdt) {
//           const balance = await contracts.usdt.balanceOf(account)
//           setDeployerUsdtBalance(formatUsdt(balance).toString())
//         }

//         setTransferAddress(account)
//       } catch (err) {
//         console.error('Error checking deployer status:', err)
//       }
//     }

//     checkDeployerStatus()
//   }, [contracts, account, formatUsdt, isOwnSpace])

//   // Fetch orbit data for all active levels
//   const fetchAllOrbitLevelData = useCallback(async () => {
//     if (!viewer || !isRegistered) return
    
//     setOrbitDataLoading(true)
//     try {
//       const levelDataPromises = {}
//       const downlinePromises = {}
//       const spilloverPromises = {}
//       const lineCountPromises = {}
//       const lockPromises = {}
//       const rolePromises = {}
//       const cyclePromises = {}
      
//       for (let level = 1; level <= 10; level++) {
//         if (activeLevels[level]) {
//           const data = await fetchFullOrbitData(level)
//           if (data) {
//             levelDataPromises[level] = data
//             downlinePromises[level] = data.downlinePositions
//             spilloverPromises[level] = data.otherOccupants
//             lineCountPromises[level] = data.lineCounts
//             lockPromises[level] = data.lockedForNextLevel
//             rolePromises[level] = data.viewerRole
//             cyclePromises[level] = { total: data.totalCycles, current: data.currentCycle }
//           }
//         }
//       }
      
//       setOrbitLevelData(levelDataPromises)
//       setDownlineData(downlinePromises)
//       setSpilloverData(spilloverPromises)
//       setLinePaymentCounts(lineCountPromises)
//       setUserLocks(lockPromises)
//       setViewerRoleByLevel(rolePromises)
//       setCycleData(cyclePromises)
//     } catch (err) {
//       console.error('Failed to fetch orbit level data:', err)
//     } finally {
//       setOrbitDataLoading(false)
//     }
//   }, [viewer, isRegistered, activeLevels, fetchFullOrbitData])

//   const fetchTokenSummary = useCallback(async () => {
//     if (!contracts?.tokenController || !viewer) return

//     try {
//       const totalRecordsRaw = await contracts.tokenController.getUserTokenRecordCount(viewer)
//       const totalRecords = Number(totalRecordsRaw || 0)

//       if (!totalRecords) {
//         setTokenSummary({
//           fgtByLevel: {},
//           fgtrByLevel: {},
//           lastEventByLevel: {},
//         })
//         return
//       }

//       const records = await contracts.tokenController.getUserTokenRecords(viewer, 0, totalRecords)

//       const fgtByLevel = {}
//       const fgtrByLevel = {}
//       const lastEventByLevel = {}

//       records.forEach((record, index) => {
//         const recordType = Number(record.recordType ?? record[0] ?? 0)
//         const level = Number(record.level ?? record[1] ?? 0)
//         const timestamp = Number(record.timestamp ?? record[2] ?? 0)
//         const amountRaw = record.amount ?? record[3] ?? 0
//         const amount = Number(ethers.formatUnits(amountRaw || 0, 6))
//         const reasonRaw = record.reason ?? record[4] ?? ethers.ZeroHash

//         let reason = ''
//         try {
//           reason = ethers.decodeBytes32String(reasonRaw)
//         } catch {
//           reason = ''
//         }

//         if (recordType === 1) {
//           fgtByLevel[level] = (fgtByLevel[level] || 0) + amount
//           lastEventByLevel[level] = {
//             id: `fgt-${level}-${index}`,
//             token: 'FGT',
//             amount,
//             timestamp,
//             reason: reason || 'activation reward',
//           }
//         }

//         if (recordType === 2) {
//           fgtrByLevel[level] = (fgtrByLevel[level] || 0) + amount
//           lastEventByLevel[level] = {
//             id: `fgtr-${level}-${index}`,
//             token: 'FGTr',
//             amount,
//             timestamp,
//             reason: reason || 'recycle reward',
//           }
//         }
//       })

//       setTokenSummary({
//         fgtByLevel,
//         fgtrByLevel,
//         lastEventByLevel,
//       })
//     } catch (err) {
//       console.error('Failed to fetch token summary:', err)
//     }
//   }, [contracts, viewer])

//   // Check network
//   useEffect(() => {
//     const checkNetwork = async () => {
//       if (!window.ethereum) return
//       const chainId = await window.ethereum.request({ method: 'eth_chainId' })
//       setNetworkWarning(chainId !== AMOY_CHAIN_ID)
//     }
//     checkNetwork()
//     const handleChainChanged = () => window.location.reload()
//     window.ethereum?.on('chainChanged', handleChainChanged)
//     return () => window.ethereum?.removeListener('chainChanged', handleChainChanged)
//   }, [])

//   // Load contracts when connected
//   useEffect(() => {
//     if (isConnected) {
//       loadContracts().catch(console.error)
//     }
//   }, [isConnected, loadContracts])

//   // Fetch data when contracts are ready
//   useEffect(() => {
//     if (!contracts || !viewer) return
//     fetchUserData()
//     const interval = setInterval(() => {
//       fetchUserData()
//       setLastUpdated(new Date().toLocaleTimeString())
//     }, 30000)
//     return () => clearInterval(interval)
//   }, [contracts, viewer, fetchUserData])

//   // Fetch orbit data when active levels change
//   useEffect(() => {
//     if (isRegistered && Object.keys(activeLevels).length > 0) {
//       fetchAllOrbitLevelData()
//     }
//   }, [isRegistered, activeLevels, fetchAllOrbitLevelData])

//   useEffect(() => {
//     if (contracts && viewer) {
//       fetchTokenSummary()
//     }
//   }, [contracts, viewer, fetchTokenSummary])

//   const getHighestActiveLevel = useCallback(() => {
//     const active = Object.entries(activeLevels)
//       .filter(([, active]) => active)
//       .map(([level]) => Number(level))
//     return active.length ? Math.max(...active) : 0
//   }, [activeLevels])

//   const getNextAvailableLevel = useCallback(() => {
//     for (let i = 1; i <= 10; i++) {
//       if (!activeLevels[i]) return i
//     }
//     return null
//   }, [activeLevels])

//   const canActivateLevel = useCallback((level) => {
//     if (level === 1) return !activeLevels[1]
//     return !activeLevels[level] && activeLevels[level - 1]
//   }, [activeLevels])

//   const getSigner = async () => {
//     if (!window.ethereum) throw new Error('MetaMask not installed')
//     const provider = new ethers.BrowserProvider(window.ethereum)
//     return await provider.getSigner()
//   }

//   // REGISTRATION HANDLER
//   const handleRegister = async () => {
//     if (!ensureWritableSpace()) return
//     if (networkWarning) {
//       setTxStatus({ loading: false, hash: null, error: 'Please switch to Polygon Amoy Testnet first.' })
//       return
//     }

//     setTxStatus({ loading: true, hash: null, error: null })

//     try {
//       const balance = await contracts.usdt.balanceOf(account)
//       const requiredAmount = ethers.parseUnits("10", 6)
      
//       if (balance < requiredAmount) {
//         throw new Error(`Insufficient USDT balance. You need 10 USDT for registration. Current balance: ${ethers.formatUnits(balance, 6)} USDT`)
//       }

//       const spender = contracts.levelManager.target
//       const currentAllowance = await contracts.usdt.allowance(account, spender)
//       if (currentAllowance < requiredAmount) {
//         throw new Error("Please approve 10 USDT first before registering.")
//       }

//       const writeContracts = await getWriteContracts()
//       const tx = await writeContracts.registration.register(referrer || ethers.ZeroAddress)
//       setTxStatus({ loading: true, hash: tx.hash, error: null })
//       await tx.wait()

//       setIsRegistered(true)
//       setTxStatus({ loading: false, hash: tx.hash, error: null })
//       await fetchUserData()
//     } catch (err) {
//       console.error('Registration error:', err)
      
//       let errorMessage = err.message
//       if (err.message?.includes('Already registered')) {
//         errorMessage = 'You are already registered.'
//       } else if (err.message?.includes('Self-referral')) {
//         errorMessage = 'You cannot refer yourself.'
//       } else if (err.message?.includes('Referrer not registered')) {
//         errorMessage = 'The referrer address is not registered.'
//       } else if (err.message?.includes('USDT transfer failed')) {
//         errorMessage = 'USDT transfer failed. Check your balance and allowance.'
//       } else if (err.message?.includes('insufficient funds')) {
//         errorMessage = 'You do not have enough POL for gas.'
//       }
      
//       setTxStatus({ loading: false, hash: null, error: errorMessage })
//     }
//   }

//   // APPROVE FOR REGISTRATION
//   const handleApproveForRegistration = async () => {
//     if (!ensureWritableSpace()) return
//     setTxStatus({ loading: true, hash: null, error: null })
//     try {
//       const writeContracts = await getWriteContracts()
//       const spender = contracts.levelManager.target
//       const amount = ethers.parseUnits("10", 6)
//       const tx = await writeContracts.usdt.approve(spender, amount)
//       setTxStatus({ loading: true, hash: tx.hash, error: null })
//       await tx.wait()
      
//       const newAllowance = await contracts.usdt.allowance(account, spender)
//       setAllowance(formatUsdt(newAllowance).toString())
//       setTxStatus({ loading: false, hash: tx.hash, error: null })
//     } catch (err) {
//       setTxStatus({ loading: false, hash: null, error: err.message })
//     }
//   }

//   // DEPLOYER TRANSFER HANDLERS
//   const handleTransferToSelf = async () => {
//     if (!ensureWritableSpace()) return
//     setTxStatus({ loading: true, hash: null, error: null })

//     try {
//       if (!isDeployer) throw new Error('Only deployer can transfer USDT')

//       const amount = ethers.parseUnits(transferAmount, 6)
//       const balance = await contracts.usdt.balanceOf(account)

//       if (balance < amount) {
//         throw new Error(`Insufficient USDT balance. You have ${ethers.formatUnits(balance, 6)} USDT`)
//       }

//       const writeContracts = await getWriteContracts()
//       const tx = await writeContracts.usdt.transfer(account, amount)
//       setTxStatus({ loading: true, hash: tx.hash, error: null })
//       await tx.wait()

//       const newBalance = await contracts.usdt.balanceOf(account)
//       const newBalanceFormatted = formatUsdt(newBalance).toString()
//       setUsdtBalance(newBalanceFormatted)
//       setDeployerUsdtBalance(newBalanceFormatted)

//       setTxStatus({ loading: false, hash: tx.hash, error: null })
//     } catch (err) {
//       console.error('Transfer error:', err)
//       setTxStatus({ loading: false, hash: null, error: err.message })
//     }
//   }

//   const handleTransferToAddress = async () => {
//     if (!ensureWritableSpace()) return
//     setTxStatus({ loading: true, hash: null, error: null })

//     try {
//       if (!isDeployer) throw new Error('Only deployer can transfer USDT')
//       if (!ethers.isAddress(transferAddress)) throw new Error('Invalid recipient address')

//       const amount = ethers.parseUnits(transferAmount, 6)
//       const balance = await contracts.usdt.balanceOf(account)

//       if (balance < amount) {
//         throw new Error(`Insufficient USDT balance. You have ${ethers.formatUnits(balance, 6)} USDT`)
//       }

//       const writeContracts = await getWriteContracts()
//       const tx = await writeContracts.usdt.transfer(transferAddress, amount)
//       setTxStatus({ loading: true, hash: tx.hash, error: null })
//       await tx.wait()

//       const newDeployerBalance = await contracts.usdt.balanceOf(account)
//       setDeployerUsdtBalance(formatUsdt(newDeployerBalance).toString())

//       if (transferAddress.toLowerCase() === account.toLowerCase()) {
//         const newBalance = await contracts.usdt.balanceOf(account)
//         setUsdtBalance(formatUsdt(newBalance).toString())
//       }

//       setTxStatus({ loading: false, hash: tx.hash, error: null })
//     } catch (err) {
//       console.error('Transfer error:', err)
//       setTxStatus({ loading: false, hash: null, error: err.message })
//     }
//   }

//   // LEVEL ACTIVATION HANDLER
//   const handleApproveAndActivate = async (level) => {
//     if (!ensureWritableSpace()) return
//     if (networkWarning) {
//       setTxStatus({ loading: false, hash: null, error: 'Please switch to Polygon Amoy Testnet first.' })
//       return
//     }

//     if (!canActivateLevel(level)) {
//       setTxStatus({ loading: false, hash: null, error: `Cannot activate Level ${level}. Please activate previous levels first.` })
//       return
//     }

//     setTxStatus({ loading: true, hash: null, error: null })

//     try {
//       const price = parseFloat(levelPrices[level])
//       const balanceNum = parseFloat(usdtBalance)

//       if (balanceNum < price) {
//         throw new Error(`Insufficient USDT balance. You have ${usdtBalance} USDT but need ${price} USDT.`)
//       }

//       const signer = await getSigner()
      
//       const spender = contracts.levelManager.target
//       const currentAllowance = await contracts.usdt.allowance(account, spender)
//       const allowanceNum = parseFloat(formatUsdt(currentAllowance).toString())
      
//       if (allowanceNum < price) {
//         const priceWei = ethers.parseUnits(price.toString(), 6)
//         const approveTx = await contracts.usdt.connect(signer).approve(spender, priceWei)
//         setTxStatus({ loading: true, hash: approveTx.hash, error: null })
//         await approveTx.wait()
//       }
      
//       const registrationWithSigner = contracts.registration.connect(signer)
//       const tx = await registrationWithSigner.activateLevel(level)
//       setTxStatus({ loading: true, hash: tx.hash, error: null })
//       await tx.wait()

//       await fetchUserData()
//       await fetchAllOrbitLevelData()
//       setTxStatus({ loading: false, hash: tx.hash, error: null })
//     } catch (err) {
//       console.error('Activation error:', err)
//       let errorMessage = err.message || 'Transaction failed'
//       if (err.message?.includes('Previous level not activated')) {
//         errorMessage = `You need to activate Level ${level - 1} first.`
//       } else if (err.message?.includes('Level already activated')) {
//         errorMessage = `Level ${level} is already activated.`
//       } else if (err.message?.includes('insufficient funds')) {
//         errorMessage = 'You do not have enough POL for gas.'
//       } else if (err.message?.includes('transfer amount exceeds balance')) {
//         errorMessage = 'You do not have enough USDT.'
//       }
//       setTxStatus({ loading: false, hash: null, error: errorMessage })
//     }
//   }

//   const highestLevel = getHighestActiveLevel()
//   const nextLevel = getNextAvailableLevel()
//   const activatedCount = Object.values(activeLevels).filter(Boolean).length

//   // Line chart data for progression
//   const lineChartData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => ({
//     level,
//     activated: activeLevels[level] ? 1 : 0,
//     cumulative: Object.values(activeLevels).slice(0, level).filter(Boolean).length
//   }))

//   const maxCumulative = Math.max(...lineChartData.map(d => d.cumulative), 1)
//   const chartPoints = lineChartData.map((d, i) => {
//     const x = (i / 9) * 100
//     const y = 100 - ((d.cumulative / maxCumulative) * 80) - 10
//     return `${x},${y}`
//   }).join(' ')

//   // Eligibility checks (block actions if network warning)
//   const checks = {
//     walletConnected: isConnected,
//     correctNetwork: !networkWarning,
//     registered: isRegistered,
//     nextLevelReady: nextLevel && canActivateLevel(nextLevel) && parseFloat(usdtBalance) >= parseFloat(levelPrices[nextLevel]) && !networkWarning
//   }

//   const getRoleBadge = (role) => {
//     switch(role) {
//       case 'FOUNDER_PATH': return <span className="role-badge founder">Founder Path</span>
//       case 'DIRECT_OWNER': return <span className="role-badge direct">Direct Owner</span>
//       case 'ROUTED_SPILLOVER': return <span className="role-badge routed">Routed Spillover</span>
//       case 'RECYCLE': return <span className="role-badge recycle">Recycle</span>
//       default: return null
//     }
//   }

//   const GoArrow = () => <span className="go-arrow">↑</span>

//   if (!isConnected) {
//     return (
//       <section className="activation-page">
//         <div className="activation-hero">
//           <div className="activation-hero__content">
//             <div className="activation-hero__eyebrow glass-panel">
//               <span className="activation-hero__eyebrow-dot" />
//               <span className="activation-hero__eyebrow-text">Welcome to FFN Protocol</span>
//             </div>
//             <div className="activation-hero__text-block">
//               <h1 className="activation-hero__title">Activation Center</h1>
//               <p className="activation-hero__description soft-text">
//                 Connect your wallet to access registration, level progression, and orbit rewards.
//               </p>
//             </div>
//             <button onClick={connect} className="activation-next__button" style={{ maxWidth: '280px' }}>
//               Connect Wallet
//             </button>
//           </div>
//           <div className="activation-hero__visual glass-panel">
//             <div className="activation-hero__visual-header">
//               <span className="activation-hero__visual-title">Status</span>
//               <span className="activation-hero__visual-status">Disconnected</span>
//             </div>
//             <div className="activation-hero__visual-box">
//               <div style={{ textAlign: 'center' }}>
//                 <div style={{ fontSize: '48px', marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
//                   <FaLock />
//                 </div>
//                 <div>Wallet not connected</div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </section>
//     )
//   }

//   if (contractsLoading) {
//     return (
//       <section className="activation-page">
//         <div className="activation-hero__text-block" style={{ textAlign: 'center', padding: '60px 20px' }}>
//           <div className="spinner"></div>
//           <p>Loading contracts...</p>
//         </div>
//       </section>
//     )
//   }

//   return (
//     <section className="activation-page">
//       {/* Visitor Mode Banner */}
//       {!isOwnSpace && (
//         <div className="activation-notices__item is-info" style={{ marginBottom: '16px', borderLeft: '3px solid var(--glow-blue)' }}>
//           <span className="activation-notices__dot" />
//           <div>
//             <h3 className="activation-notices__title">Viewing another member's space</h3>
//             <p className="activation-notices__text">
//               You are viewing {formatViewerAddress(viewer)} in read-only mode. Wallet actions are disabled until you return to your own space.
//             </p>
//             <button
//               type="button"
//               className="activation-next__button"
//               onClick={switchToSelf}
//               style={{ marginTop: '10px', maxWidth: '220px' }}
//             >
//               Return to My Space
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Network Warning - Blocks actions */}
//       {networkWarning && (
//         <div className="activation-notices__item is-error" style={{ marginBottom: '16px', borderLeft: '3px solid #ef4444' }}>
//           <span className="activation-notices__dot" style={{ background: '#ef4444' }} />
//           <div>
//             <h3 className="activation-notices__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//               <FaExclamationTriangle /> Network Error
//             </h3>
//             <p className="activation-notices__text">Please switch to Polygon Amoy Testnet to continue. Actions are blocked until network is correct.</p>
//           </div>
//         </div>
//       )}

//       {/* Contract Error */}
//       {contractsError && (
//         <div className="activation-notices__item is-error" style={{ marginBottom: '16px' }}>
//           <span className="activation-notices__dot" style={{ background: '#ef4444' }} />
//           <div>
//             <h3 className="activation-notices__title">Contract Error</h3>
//             <p className="activation-notices__text">{contractsError}</p>
//           </div>
//         </div>
//       )}

//       {/* Transaction Error */}
//       {txStatus.error && (
//         <div className="activation-notices__item is-error" style={{ marginBottom: '16px' }}>
//           <span className="activation-notices__dot" style={{ background: '#ef4444' }} />
//           <div>
//             <h3 className="activation-notices__title">Transaction Error</h3>
//             <p className="activation-notices__text">{txStatus.error}</p>
//           </div>
//         </div>
//       )}

//       {/* Transaction Hash Link */}
//       {txStatus.hash && (
//         <div className="activation-notices__item is-info" style={{ marginBottom: '16px' }}>
//           <span className="activation-notices__dot" />
//           <div>
//             <h3 className="activation-notices__title">Transaction Submitted</h3>
//             <p className="activation-notices__text">
//               <a href={`https://amoy.polygonscan.com/tx/${txStatus.hash}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--glow-teal)' }}>
//                 View on Polygonscan →
//               </a>
//             </p>
//           </div>
//         </div>
//       )}

//       <div className="activation-hero">
//         <div className="activation-hero__content">
//           <div className="activation-hero__eyebrow glass-panel">
//             <span className="activation-hero__eyebrow-dot" />
//             <span className="activation-hero__eyebrow-text">
//               Registration, eligibility, and level progression
//             </span>
//           </div>

//           <div className="activation-hero__text-block">
//             <h1 className="activation-hero__title">Activation Center</h1>
//             <p className="activation-hero__description soft-text">
//               Complete registration, confirm eligibility, and manage your level
//               progression from one guided, mobile-first experience.
//             </p>
//             <div className="small muted-text">Last updated: {lastUpdated}</div>
//           </div>

//           <div className="activation-hero__chips">
//             <span className="activation-hero__chip glass-panel">✓ Wallet Connected</span>
//             <span className="activation-hero__chip glass-panel">
//               {isOwnSpace ? 'Own Space' : 'Read-Only Visitor Mode'}
//             </span>
//             <span className={`activation-hero__chip glass-panel ${isRegistered ? '' : 'inactive'}`}>
//               {isRegistered ? '✓ Registered' : '⚠ Not Registered'}
//             </span>
//             <span className="activation-hero__chip glass-panel">Highest Level: {highestLevel || 0}</span>
//             {parseFloat(totalEarnings) > 0 && (
//               <span className="activation-hero__chip glass-panel earnings-chip">
//                 Earned: {totalEarnings} USDT
//               </span>
//             )}
//             {isDeployer && canWriteHere && <span className="activation-hero__chip glass-panel deployer-chip">Deployer Mode</span>}
//             {isId1Wallet && <span className="activation-hero__chip glass-panel id1-chip">⭐ ID1 Wallet</span>}
//           </div>
//         </div>

//         <div className="activation-hero__visual glass-panel">
//           <div className="activation-hero__visual-header">
//             <span className="activation-hero__visual-title">Level Progression</span>
//             <span className="activation-hero__visual-status">{activatedCount}/10 Activated</span>
//           </div>
//           <div className="line-chart-container">
//             <svg className="line-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
//               <polyline
//                 className="chart-line"
//                 points={chartPoints}
//                 fill="none"
//                 stroke="var(--glow-teal)"
//                 strokeWidth="2.5"
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//               />
//               {lineChartData.map((d, i) => {
//                 const x = (i / 9) * 100
//                 const y = 100 - ((d.cumulative / maxCumulative) * 80) - 10
//                 return (
//                   <circle
//                     key={i}
//                     cx={x}
//                     cy={y}
//                     r="3"
//                     fill={d.activated ? "var(--glow-teal)" : "rgba(255,255,255,0.2)"}
//                     stroke={d.activated ? "white" : "none"}
//                     strokeWidth="1"
//                   />
//                 )
//               })}
//             </svg>
//             <div className="chart-labels">
//               {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
//                 <span key={level} className={`chart-label ${activeLevels[level] ? 'active' : ''}`}>{level}</span>
//               ))}
//             </div>
//           </div>
//           <p className="activation-hero__visual-note muted-text">
//             Cumulative progression. {activatedCount} of 10 levels activated.
//           </p>
//         </div>
//       </div>

//       <section className="activation-main-grid">
//         <div className="activation-main-grid__left">
//           <section className="activation-registration glass-panel">
//             <div className="activation-section-heading">
//               <span className="activation-section-heading__eyebrow muted-text">Registration Status</span>
//               <h2 className="activation-section-heading__title">Account entry and sponsor relationship</h2>
//             </div>

//             <div className="activation-registration__status">
//               <div className="activation-registration__status-card glass-panel">
//                 <span className="activation-registration__status-label muted-text">Current Status</span>
//                 <strong className="activation-registration__status-value">
//                   {isRegistered ? '✓ Registered Successfully' : '⚠ Not Registered'}
//                 </strong>
//                 <p className="activation-registration__status-text soft-text">
//                   {isRegistered 
//                     ? `Wallet ${viewer?.slice(0, 6)}...${viewer?.slice(-4)} is registered in the protocol.`
//                     : 'Complete registration to start your journey. Requires 10 USDT.'}
//                 </p>
//               </div>

//               <div className="activation-registration__sponsor glass-panel">
//                 <span className="activation-registration__status-label muted-text">Sponsor / Referrer</span>
//                 <strong className="activation-registration__status-value">
//                   {isId1Wallet ? (id1Address ? `${id1Address.slice(0, 8)}...${id1Address.slice(-6)}` : 'ID1 Wallet') : (referrer ? `${referrer.slice(0, 8)}...${referrer.slice(-6)}` : 'No Referrer')}
//                 </strong>
//                 <p className="activation-registration__status-text soft-text">
//                   {isId1Wallet 
//                     ? 'You are the ID1 wallet. All levels are automatically activated.'
//                     : (referrer 
//                       ? 'Your sponsor relationship is confirmed on-chain.'
//                       : 'No referrer provided. You are connected directly.')}
//                 </p>
//               </div>
//             </div>
//           </section>

//           {/* REGISTRATION SECTION - Only show if not registered and not ID1 */}
//           {!isRegistered && !isId1Wallet && canWriteHere && (
//             <section className="activation-registration-form glass-panel">
//               <div className="activation-section-heading">
//                 <span className="activation-section-heading__eyebrow muted-text">Registration Required</span>
//                 <h2 className="activation-section-heading__title">Complete your protocol registration</h2>
//               </div>

//               <div className="registration-warning">
//                 <div className="warning-header">Registration requires 10 USDT + Level 1 activation</div>
//                 <div className="warning-details">
//                   <div>Your USDT Balance: <strong>{usdtBalance} USDT</strong></div>
//                   <div>Current Allowance: <strong>{allowance} USDT</strong></div>
//                 </div>
//               </div>

//               {parseFloat(allowance) < 10 && (
//                 <button 
//                   className="approve-reg-btn"
//                   onClick={handleApproveForRegistration}
//                   disabled={txStatus.loading || networkWarning}
//                 >
//                   {txStatus.loading ? 'Processing...' : 'Approve 10 USDT for Registration'}
//                 </button>
//               )}

//               <div className="referrer-input-group">
//                 <label className="referrer-label">Referrer Address (Optional)</label>
//                 <input
//                   type="text"
//                   className="referrer-input"
//                   placeholder="0x000... (leave empty for no referrer)"
//                   value={referrer}
//                   onChange={(e) => setReferrer(e.target.value)}
//                 />
//                 <p className="referrer-hint">
//                   Your referrer will be: {referrer || 'No referrer (connected to ID1)'}
//                 </p>
//               </div>

//               <button 
//                 className="register-btn"
//                 onClick={handleRegister}
//                 disabled={txStatus.loading || parseFloat(usdtBalance) < 10 || parseFloat(allowance) < 10 || networkWarning}
//               >
//                 {txStatus.loading ? 'Processing...' : 'Register & Activate Level 1 (10 USDT)'}
//               </button>

//               {parseFloat(usdtBalance) < 10 && (
//                 <div className="insufficient-funds-warning">
//                   ⚠ Insufficient USDT balance. Need 10 USDT.
//                 </div>
//               )}
//             </section>
//           )}

//           {!isRegistered && !isId1Wallet && !canWriteHere && (
//             <section className="activation-registration-form glass-panel">
//               <div className="activation-section-heading">
//                 <span className="activation-section-heading__eyebrow muted-text">Read-Only Viewing</span>
//                 <h2 className="activation-section-heading__title">Registration actions are disabled here</h2>
//               </div>

//               <div className="registration-warning">
//                 <div className="warning-header">This space is being viewed in read-only mode</div>
//                 <div className="warning-details">
//                   <div>Viewed wallet: <strong>{formatViewerAddress(viewer)}</strong></div>
//                   <div>Action state: <strong>Disabled</strong></div>
//                 </div>
//               </div>

//               <p className="soft-text">
//                 To approve USDT, enter a referrer, register, or activate levels, return to your own space.
//               </p>
//             </section>
//           )}

//           {/* DEPLOYER FAUCET SECTION */}
//           {isDeployer && canWriteHere && (
//             <section className="deployer-faucet glass-panel">
//               <div className="activation-section-heading">
//                 <span className="activation-section-heading__eyebrow muted-text">Deployer Tools</span>
//                 <h2 className="activation-section-heading__title">USDT Faucet for Testing</h2>
//               </div>

//               <div className="faucet-controls">
//                 <div className="faucet-switch">
//                   <label className="switch-label">
//                     <input
//                       type="checkbox"
//                       checked={!showTransferToSelf}
//                       onChange={() => setShowTransferToSelf(!showTransferToSelf)}
//                     />
//                     <span>Transfer to specific address</span>
//                   </label>
//                 </div>

//                 {showTransferToSelf ? (
//                   <>
//                     <div className="faucet-amount-group">
//                       <input
//                         type="number"
//                         className="faucet-amount"
//                         value={transferAmount}
//                         onChange={(e) => setTransferAmount(e.target.value)}
//                         placeholder="Amount"
//                       />
//                       <button 
//                         className="faucet-btn"
//                         onClick={handleTransferToSelf}
//                         disabled={txStatus.loading}
//                       >
//                         {txStatus.loading ? 'Sending...' : 'Send to Self'}
//                       </button>
//                     </div>
//                     <p className="faucet-hint">Transfer USDT to your own wallet (for testing)</p>
//                   </>
//                 ) : (
//                   <>
//                     <input
//                       type="text"
//                       className="faucet-address"
//                       value={transferAddress}
//                       onChange={(e) => setTransferAddress(e.target.value)}
//                       placeholder="Recipient Address (0x...)"
//                     />
//                     <div className="faucet-amount-group">
//                       <input
//                         type="number"
//                         className="faucet-amount"
//                         value={transferAmount}
//                         onChange={(e) => setTransferAmount(e.target.value)}
//                         placeholder="Amount"
//                       />
//                       <button 
//                         className="faucet-btn"
//                         onClick={handleTransferToAddress}
//                         disabled={txStatus.loading}
//                       >
//                         {txStatus.loading ? 'Sending...' : 'Transfer'}
//                       </button>
//                     </div>
//                     <p className="faucet-hint">Send USDT to any address for testing</p>
//                   </>
//                 )}

//                 <div className="deployer-balance">
//                   Deployer USDT Balance: <strong>{deployerUsdtBalance} USDT</strong>
//                 </div>
//               </div>
//             </section>
//           )}

//           <section className="activation-levels glass-panel">
//             <div className="activation-section-heading">
//               <span className="activation-section-heading__eyebrow muted-text">Levels 1-10</span>
//               <h2 className="activation-section-heading__title">Structured progression across all levels</h2>
//             </div>

//             <div className="level-progress-bars">
//               {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
//                 <div key={`progress-${level}`} className="level-progress-item">
//                   <div className="level-progress-label">L{level}</div>
//                   <div className="level-progress-track">
//                     <div 
//                       className={`level-progress-fill ${activeLevels[level] ? 'active' : ''}`}
//                       style={{ width: activeLevels[level] ? '100%' : '0%' }}
//                     />
//                   </div>
//                 </div>
//               ))}
//             </div>

//             <div className="activation-levels__grid">
//               {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
//                 const isActive = activeLevels[level]
//                 const isNext = level === nextLevel
//                 const canActivate = canActivateLevel(level)
//                 const price = levelPrices[level]
//                 const orbitTypeForLevel = levelToOrbitType[level]
//                 const earned = levelEarnings[level] || 0
//                 const orbitData = orbitLevelData[level]
//                 const downlineCount = downlineData[level] || 0
//                 const spilloverCount = spilloverData[level] || 0
//                 const cycleInfo = cycleData[level]
//                 const viewerRole = viewerRoleByLevel[level]
//                 const lockedForUpgrade = parseFloat(userLocks[level] || '0')
//                 const upgradeRequired = upgradeRequirements[level]
//                 const upgradeProgress = (lockedForUpgrade / upgradeRequired) * 100
//                 const fgtEarned = tokenSummary.fgtByLevel[level] || 0
//                 const fgtrEarned = tokenSummary.fgtrByLevel[level] || 0
//                 const latestTokenEvent = tokenSummary.lastEventByLevel[level] || null

//                 return (
//                   <div 
//                     key={level} 
//                     className={`activation-levels__card premium-card ${isActive ? 'activated' : ''} ${isNext ? 'next' : ''}`}
//                     style={{ backgroundImage: getLevelBackground(level) }}
//                   >
//                     <div className="card-header">
//                       <div className="level-badge-wrapper">
//                         <span className="level-badge">Level {level}</span>
//                         {isActive && <span className="status-dot green"></span>}
//                         {!isActive && isNext && <span className="status-dot orange"></span>}
//                         {!isActive && !isNext && <span className="status-dot gray"></span>}
//                       </div>
//                       <span className="level-orbit">{orbitTypeForLevel}</span>
//                     </div>

//                     <h3 className="level-title">
//                       {isActive ? 'Activated' : (isNext ? 'Ready to Activate' : 'Locked')}
//                     </h3>

//                     {isActive && (
//                       <>
//                         <div className="level-metrics">
//                           <div className="metric-item">
//                             <span className="metric-label">Total Earned</span>
//                             <span className="metric-value">{earned > 0 ? `${earned.toFixed(2)} USDT` : '—'}</span>
//                           </div>
//                           {cycleInfo && (
//                             <>
//                               <div className="metric-item">
//                                 <span className="metric-label">Total Cycles</span>
//                                 <span className="metric-value">{cycleInfo.total}</span>
//                               </div>
//                               <div className="metric-item">
//                                 <span className="metric-label">Current Cycle</span>
//                                 <span className="metric-value">{cycleInfo.current}</span>
//                               </div>
//                             </>
//                           )}
//                         </div>

//                         <div className="token-metrics">
//                           <div className="token-item">
//                             <span className="token-item__label">FGT</span>
//                             <strong className="token-item__value">{fgtEarned.toFixed(2)}</strong>
//                           </div>
//                           <div className="token-item">
//                             <span className="token-item__label">FGTr</span>
//                             <strong className="token-item__value">{fgtrEarned.toFixed(2)}</strong>
//                           </div>
//                         </div>

//                         {latestTokenEvent && (
//                           <div className="token-event-card">
//                             <div className="token-event-card__top">
//                               <span className="token-event-card__badge">{latestTokenEvent.token}</span>
//                               <span className="token-event-card__time">
//                                 {latestTokenEvent.timestamp
//                                   ? new Date(latestTokenEvent.timestamp * 1000).toLocaleString()
//                                   : 'Recent event'}
//                               </span>
//                             </div>
//                             <div className="token-event-card__body">
//                               <strong>{latestTokenEvent.amount.toFixed(2)}</strong>
//                               <span>{latestTokenEvent.reason}</span>
//                             </div>
//                           </div>
//                         )}

//                         {orbitData && (
//                           <div className="orbit-stats-compact">
//                             <div className="compact-stat">
//                               <span><FaLayerGroup /> Positions</span>
//                               <strong>{orbitData.positionsFilled}/{orbitData.totalPositions}</strong>
//                             </div>
//                             <div className="compact-stat">
//                               <span><FaUsers /> Downline</span>
//                               <strong>{downlineCount}</strong>
//                             </div>
//                             <div className="compact-stat">
//                               <span><FaSyncAlt /> Spillover</span>
//                               <strong>{spilloverCount}</strong>
//                             </div>
//                             {parseFloat(orbitData.totalEarned) > 0 && (
//                               <div className="compact-stat earned">
//                                 <span><FaCoins /> Total</span>
//                                 <strong>{orbitData.totalEarned} USDT</strong>
//                               </div>
//                             )}
//                           </div>
//                         )}

//                         {level === highestLevel && level < 10 && (
//                           <div className="escrow-progress">
//                             <div className="escrow-header">
//                               <span><FaLock /> Escrow Locked for Level {level + 1}</span>
//                               <span>{lockedForUpgrade.toFixed(2)} / {upgradeRequired} USDT</span>
//                             </div>
//                             <div className="escrow-track">
//                               <div className="escrow-fill" style={{ width: `${Math.min(upgradeProgress, 100)}%` }} />
//                             </div>
//                             {upgradeProgress >= 100 && (
//                               <div className="escrow-ready">✓ Auto-upgrade ready!</div>
//                             )}
//                           </div>
//                         )}

//                         {viewerRole && viewerRole !== 'NONE' && (
//                           <div className="role-container">
//                             {getRoleBadge(viewerRole)}
//                           </div>
//                         )}

//                         <button 
//                           className="view-orbit-btn"
//                           // onClick={() => {
//                           //   window.dispatchEvent(new CustomEvent('navigate', { detail: 'orbits' }))
//                           //   window.location.hash = '#orbits'
//                           // }}
//                           onClick={navigateToOrbits}
//                         >
//                           View Orbit <GoArrow />
//                         </button>
//                       </>
//                     )}

//                     {!isActive && (
//                       <>
//                         <div className="level-details">
//                           <div className="detail-row">
//                             <span>Price:</span>
//                             <strong>{price} USDT</strong>
//                           </div>
//                           <div className="detail-row">
//                             <span>Balance:</span>
//                             <strong className={parseFloat(usdtBalance) >= parseFloat(price) ? 'sufficient' : 'insufficient'}>
//                               {usdtBalance} USDT
//                             </strong>
//                           </div>
//                         </div>

//                         <p className="level-description">
//                           {isNext 
//                             ? `Activate for ${price} USDT to unlock ${orbitTypeForLevel} Orbit`
//                             : `Requires Level ${level - 1} activation first`}
//                         </p>

//                         <div className="card-actions">
//                           {isNext && canActivate && canWriteHere && (
//                             <button 
//                               className="activate-btn"
//                               onClick={() => handleApproveAndActivate(level)}
//                               disabled={!canWriteHere || txStatus.loading || parseFloat(usdtBalance) < parseFloat(price) || networkWarning}
//                             >
//                               {txStatus.loading ? 'Processing...' : `Activate (${price} USDT)`}
//                             </button>
//                           )}
//                           {isNext && canActivate && !canWriteHere && (
//                             <button className="locked-btn" disabled>
//                               Read-Only
//                             </button>
//                           )}
//                           {isNext && !canActivate && (
//                             <button className="locked-btn" disabled>Locked</button>
//                           )}
//                           {!isActive && !isNext && (
//                             <button className="locked-btn" disabled>Locked</button>
//                           )}
//                         </div>
//                       </>
//                     )}
//                   </div>
//                 )
//               })}
//             </div>
//           </section>
//         </div>

//         <div className="activation-main-grid__right">
//           <section className="activation-checklist glass-panel">
//             <div className="activation-section-heading">
//               <span className="activation-section-heading__eyebrow muted-text">Eligibility Check</span>
//               <h2 className="activation-section-heading__title">Required conditions before action</h2>
//             </div>

//             <div className="activation-checklist__list">
//               <div className={`activation-checklist__item ${checks.walletConnected ? 'is-success' : 'is-error'}`}>
//                 <span className={`check-dot ${checks.walletConnected ? 'green' : 'red'}`} />
//                 <span>Wallet connected</span>
//               </div>

//               <div className={`activation-checklist__item ${checks.correctNetwork ? 'is-success' : 'is-error'}`}>
//                 <span className={`check-dot ${checks.correctNetwork ? 'green' : 'red'}`} />
//                 <span>Correct network (Polygon Amoy)</span>
//               </div>

//               <div className={`activation-checklist__item ${checks.registered ? 'is-success' : 'is-error'}`}>
//                 <span className={`check-dot ${checks.registered ? 'green' : 'red'}`} />
//                 <span>Registration complete</span>
//               </div>

//               <div className={`activation-checklist__item ${checks.nextLevelReady ? 'is-success' : 'is-error'}`}>
//                 <span className={`check-dot ${checks.nextLevelReady ? 'green' : 'red'}`} />
//                 <span>
//                   {nextLevel 
//                     ? `Level ${nextLevel} ready${!checks.nextLevelReady && parseFloat(usdtBalance) < parseFloat(levelPrices[nextLevel]) ? ' (insufficient balance)' : ''}`
//                     : 'All levels activated'}
//                 </span>
//               </div>
//             </div>
//           </section>

//           <section className="activation-next glass-panel">
//             <div className="activation-section-heading">
//               <span className="activation-section-heading__eyebrow muted-text">Next Action</span>
//               <h2 className="activation-section-heading__title">Recommended progression step</h2>
//             </div>

//             <div className="activation-next__content">
//               <h3 className="activation-next__title">
//                 {!canWriteHere
//                   ? 'Viewing Space'
//                   : nextLevel
//                     ? `Activate Level ${nextLevel}`
//                     : 'Fully Activated!'}
//               </h3>
//               <p className="activation-next__text soft-text">
//                 {!canWriteHere
//                   ? "You are currently viewing another member's space. Progress and orbit state are visible, but wallet actions are disabled."
//                   : nextLevel 
//                     ? `Level ${nextLevel} requires ${levelPrices[nextLevel]} USDT and unlocks ${levelToOrbitType[nextLevel]} Orbit with new earning potential.`
//                     : 'You have activated all 10 levels. Explore the Orbits page to see your full network and earnings.'}
//               </p>

//               {nextLevel && canWriteHere && (
//                 <button 
//                   type="button" 
//                   className="activation-next__button activate"
//                   onClick={() => handleApproveAndActivate(nextLevel)}
//                   disabled={txStatus.loading || !canActivateLevel(nextLevel) || parseFloat(usdtBalance) < parseFloat(levelPrices[nextLevel]) || networkWarning}
//                 >
//                   {txStatus.loading ? 'Processing...' : `Activate Level ${nextLevel} (${levelPrices[nextLevel]} USDT)`}
//                 </button>
//               )}

//               {highestLevel > 0 && (
//                 <button 
//                   type="button" 
//                   className="activation-next__button space-btn"
//                   // onClick={() => {
//                   //   window.dispatchEvent(new CustomEvent('navigate', { detail: 'orbits' }))
//                   //   window.location.hash = '#orbits'
//                   // }}
//                    onClick={navigateToOrbits}
//                 >
//                   Go to FFN Space <GoArrow />
//                 </button>
//               )}
//             </div>
//           </section>

//           <section className="activation-notices glass-panel">
//             <div className="activation-section-heading">
//               <span className="activation-section-heading__eyebrow muted-text">Notices</span>
//               <h2 className="activation-section-heading__title">Important warnings and platform guidance</h2>
//             </div>

//             <div className="activation-notices__list">
//               <div className="activation-notices__item is-warning">
//                 <span className="activation-notices__dot" />
//                 <div>
//                   <h3 className="activation-notices__title">
//                     {nextLevel ? `Level ${nextLevel}: ${levelPrices[nextLevel]} USDT required` : 'Maximum level achieved'}
//                   </h3>
//                   <p className="activation-notices__text soft-text">
//                     {nextLevel
//                       ? `Balance: ${usdtBalance} USDT. ${parseFloat(usdtBalance) >= parseFloat(levelPrices[nextLevel]) ? 'Sufficient funds available.' : `Need ${(parseFloat(levelPrices[nextLevel]) - parseFloat(usdtBalance)).toFixed(2)} more USDT.`}`
//                       : 'All 10 levels activated. View Orbits page for earnings details.'}
//                   </p>
//                 </div>
//               </div>

//               <div className="activation-notices__item is-info">
//                 <span className="activation-notices__dot" />
//                 <div>
//                   <h3 className="activation-notices__title">
//                     {isId1Wallet ? 'ID1 Wallet Status' : (referrer ? 'Sponsor confirmed' : 'No Referrer')}
//                   </h3>
//                   <p className="activation-notices__text soft-text">
//                     {isId1Wallet
//                       ? 'You are the ID1 wallet. All levels are automatically activated.'
//                       : (referrer
//                         ? `Sponsored by ${referrer.slice(0, 8)}...${referrer.slice(-6)}`
//                         : 'No referrer provided. You are connected directly to the protocol.')}
//                   </p>
//                 </div>
//               </div>

//               {parseFloat(totalEarnings) > 0 && (
//                 <div className="activation-notices__item is-info">
//                   <span className="activation-notices__dot" />
//                   <div>
//                     <h3 className="activation-notices__title">Total earnings: {totalEarnings} USDT</h3>
//                     <p className="activation-notices__text soft-text">
//                       From orbit participations. View Orbits page for breakdown.
//                     </p>
//                   </div>
//                 </div>
//               )}
//             </div>
//           </section>

//           <section className="activation-visual glass-panel">
//             <div className="activation-section-heading">
//               <span className="activation-section-heading__eyebrow muted-text">FFN Space Portal</span>
//               <h2 className="activation-section-heading__title">Explore your orbit network</h2>
//             </div>

//             <div className="activation-visual__box orbit-preview"
//               onClick={navigateToOrbits}
//             >
//               {orbitDataLoading ? (
//                 <div className="orbit-loading">Loading orbit data...</div>
//               ) : highestLevel > 0 && orbitLevelData[highestLevel] ? (
//                 <div className="mini-orbit">
//                   <div className="mini-orbit-core">
//                     <span>L{highestLevel}</span>
//                     <span className="mini-orbit-type">{levelToOrbitType[highestLevel]}</span>
//                   </div>
//                   <div className="mini-orbit-stats">
//                     <div className="mini-stat"><FaLayerGroup /> {orbitLevelData[highestLevel].positionsFilled}/{orbitLevelData[highestLevel].totalPositions}</div>
//                     <div className="mini-stat"><FaUsers /> {downlineData[highestLevel] || 0}</div>
//                     <div className="mini-stat"><FaSyncAlt /> {spilloverData[highestLevel] || 0}</div>
//                   </div>
//                   <div className="mini-orbit-earn">{orbitLevelData[highestLevel].totalEarned} USDT earned</div>
//                 </div>
//               ) : (
//                 <div style={{ textAlign: 'center' }}>
//                   <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌌</div>
//                   <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>FFN Space</div>
//                   <div style={{ fontSize: '12px', opacity: 0.7 }}>Click to explore your orbit ecosystem</div>
//                 </div>
//               )}
//             </div>

//             <p className="activation-visual__note muted-text">
//               Click to enter FFN Space and explore your orbit network, downline structure, and earnings.
//             </p>
//           </section>
//         </div>
//       </section>

//       <style>{`
//         .spinner {
//           width: 40px;
//           height: 40px;
//           border: 3px solid rgba(77, 163, 255, 0.2);
//           border-top-color: var(--glow-blue);
//           border-radius: 50%;
//           animation: spin 0.8s linear infinite;
//           margin: 0 auto 16px;
//         }
//         @keyframes spin {
//           to { transform: rotate(360deg); }
//         }
        
//         .line-chart-container {
//           width: 100%;
//           padding: 12px 8px;
//           background: rgba(0,0,0,0.2);
//           border-radius: 16px;
//         }
//         .line-chart {
//           width: 100%;
//           height: 100px;
//           background: transparent;
//         }
//         .chart-line {
//           stroke-dasharray: 200;
//           stroke-dashoffset: 200;
//           animation: drawLine 1.5s ease-out forwards;
//         }
//         @keyframes drawLine {
//           to { stroke-dashoffset: 0; }
//         }
//         .chart-labels {
//           display: flex;
//           justify-content: space-between;
//           margin-top: 8px;
//           padding: 0 4px;
//         }
//         .chart-label {
//           font-size: 9px;
//           color: var(--text-secondary);
//           text-align: center;
//           flex: 1;
//         }
//         .chart-label.active {
//           color: var(--glow-teal);
//           font-weight: bold;
//         }
        
//         .level-progress-bars {
//           display: flex;
//           gap: 6px;
//           padding: 12px;
//           background: rgba(0,0,0,0.2);
//           border-radius: 20px;
//           margin-bottom: 20px;
//         }
//         .level-progress-item {
//           flex: 1;
//           display: flex;
//           flex-direction: column;
//           align-items: center;
//           gap: 6px;
//         }
//         .level-progress-label {
//           font-size: 10px;
//           font-weight: bold;
//           color: var(--text-secondary);
//         }
//         .level-progress-track {
//           width: 100%;
//           height: 6px;
//           background: rgba(255,255,255,0.1);
//           border-radius: 3px;
//           overflow: hidden;
//         }
//         .level-progress-fill {
//           height: 100%;
//           width: 0%;
//           background: linear-gradient(90deg, var(--glow-teal), #1de9b6);
//           border-radius: 3px;
//           transition: width 0.5s ease;
//         }
//         .level-progress-fill.active {
//           width: 100%;
//           animation: fillProgress 0.6s ease-out;
//         }
//         @keyframes fillProgress {
//           from { width: 0%; }
//           to { width: 100%; }
//         }
        
//         .premium-card {
//           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
//           position: relative;
//           overflow: hidden;
//           background-size: cover !important;
//           background-position: center !important;
//           background-repeat: no-repeat !important;
//         }
//         .premium-card::before {
//           content: '';
//           position: absolute;
//           top: 0;
//           left: 0;
//           right: 0;
//           bottom: 0;
//           background: rgba(0,0,0,0.6);
//           z-index: 0;
//         }
//         .premium-card > * {
//           position: relative;
//           z-index: 1;
//         }
//         .premium-card.activated {
//           border-left: 3px solid var(--glow-teal);
//         }
//         .premium-card.next {
//           border-left: 3px solid var(--warning);
//         }
        
//         .card-header, .level-title, .level-details, .level-description, .card-actions, .level-metrics, .orbit-stats-compact, .escrow-progress, .role-container {
//           background: rgba(0, 0, 0, 0.5);
//           backdrop-filter: blur(8px);
//           border-radius: 8px;
//           padding: 8px 12px;
//         }
        
//         .card-header {
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//           margin-bottom: 12px;
//         }
//         .level-badge-wrapper {
//           display: flex;
//           align-items: center;
//           gap: 8px;
//         }
//         .level-badge {
//           background: rgba(255,255,255,0.2);
//           padding: 4px 12px;
//           border-radius: 20px;
//           font-size: 12px;
//           font-weight: bold;
//         }
//         .status-dot {
//           width: 10px;
//           height: 10px;
//           border-radius: 50%;
//           display: inline-block;
//         }
//         .status-dot.green { background: var(--glow-teal); box-shadow: 0 0 6px var(--glow-teal); }
//         .status-dot.orange { background: var(--warning); box-shadow: 0 0 6px var(--warning); }
//         .status-dot.gray { background: #6c757d; }
//         .level-orbit {
//           font-size: 10px;
//           padding: 2px 8px;
//           background: rgba(255,255,255,0.2);
//           border-radius: 12px;
//         }
//         .level-title {
//           font-size: 14px;
//           font-weight: 700;
//           margin-bottom: 12px;
//         }
//         .level-details {
//           display: flex;
//           flex-wrap: wrap;
//           gap: 12px;
//           margin-bottom: 12px;
//         }
//         .detail-row {
//           display: flex;
//           justify-content: space-between;
//           gap: 8px;
//           font-size: 11px;
//           flex: 1;
//         }
//         .detail-row .sufficient { color: var(--glow-teal); }
//         .detail-row .insufficient { color: #ef4444; }
        
//         .level-metrics {
//           display: flex;
//           flex-wrap: wrap;
//           gap: 16px;
//           margin-bottom: 12px;
//           justify-content: space-around;
//         }
//         .metric-item {
//           display: flex;
//           flex-direction: column;
//           align-items: center;
//           gap: 4px;
//         }
//         .metric-label {
//           font-size: 9px;
//           color: var(--text-secondary);
//         }
//         .metric-value {
//           font-size: 13px;
//           font-weight: bold;
//           color: var(--glow-teal);
//         }
        
//         .token-metrics {
//           display: grid;
//           grid-template-columns: 1fr 1fr;
//           gap: 10px;
//           margin-bottom: 12px;
//         }

//         .token-item {
//           display: flex;
//           flex-direction: column;
//           gap: 4px;
//           padding: 8px 10px;
//           border-radius: 12px;
//           background: rgba(255,255,255,0.08);
//           border: 1px solid rgba(255,255,255,0.12);
//         }

//         .token-item__label {
//           font-size: 10px;
//           color: var(--text-secondary);
//           text-transform: uppercase;
//           letter-spacing: 0.05em;
//         }

//         .token-item__value {
//           font-size: 13px;
//           font-weight: 800;
//           color: #ffd54f;
//         }

//         .token-event-card {
//           margin-bottom: 12px;
//           padding: 10px 12px;
//           border-radius: 12px;
//           background: rgba(255,255,255,0.08);
//           border: 1px solid rgba(255,255,255,0.12);
//         }

//         .token-event-card__top {
//           display: flex;
//           justify-content: space-between;
//           gap: 8px;
//           margin-bottom: 6px;
//           align-items: center;
//         }

//         .token-event-card__badge {
//           font-size: 10px;
//           font-weight: 800;
//           padding: 4px 8px;
//           border-radius: 999px;
//           background: rgba(255,213,79,0.14);
//           color: #ffd54f;
//         }

//         .token-event-card__time {
//           font-size: 10px;
//           color: var(--text-secondary);
//         }

//         .token-event-card__body {
//           display: flex;
//           flex-direction: column;
//           gap: 4px;
//         }

//         .token-event-card__body strong {
//           color: var(--text-primary);
//           font-size: 13px;
//         }

//         .token-event-card__body span {
//           color: var(--text-secondary);
//           font-size: 11px;
//           line-height: 1.4;
//         }
        
//         .orbit-stats-compact {
//           display: flex;
//           flex-wrap: wrap;
//           gap: 12px;
//           margin-bottom: 12px;
//           justify-content: space-between;
//         }
//         .compact-stat {
//           display: flex;
//           align-items: center;
//           gap: 6px;
//           font-size: 11px;
//         }
//         .compact-stat span,
//         .mini-stat {
//           display: inline-flex;
//           align-items: center;
//           gap: 6px;
//         }
//         .compact-stat strong {
//           color: var(--glow-teal);
//         }
//         .compact-stat.earned strong {
//           color: #28a745;
//         }
        
//         .escrow-progress {
//           margin-bottom: 12px;
//         }
//         .escrow-header {
//           display: flex;
//           justify-content: space-between;
//           font-size: 10px;
//           margin-bottom: 6px;
//         }
//         .escrow-track {
//           height: 4px;
//           background: rgba(255,255,255,0.2);
//           border-radius: 2px;
//           overflow: hidden;
//         }
//         .escrow-fill {
//           height: 100%;
//           background: linear-gradient(90deg, #f59e0b, #ef4444);
//           border-radius: 2px;
//           transition: width 0.5s ease;
//         }
//         .escrow-ready {
//           font-size: 9px;
//           color: var(--glow-teal);
//           margin-top: 4px;
//         }
        
//         .role-container {
//           margin-bottom: 12px;
//           text-align: center;
//         }
//         .role-badge {
//           padding: 4px 12px;
//           border-radius: 20px;
//           font-size: 10px;
//           font-weight: bold;
//           display: inline-block;
//         }
//         .role-badge.founder { background: #8b5cf6; color: white; }
//         .role-badge.direct { background: var(--glow-teal); color: #07111f; }
//         .role-badge.routed { background: #f59e0b; color: white; }
//         .role-badge.recycle { background: #ef4444; color: white; }
        
//         .level-description {
//           font-size: 11px;
//           color: var(--text-secondary);
//           margin-bottom: 16px;
//           line-height: 1.4;
//         }
//         .card-actions {
//           margin-top: auto;
//         }
//         .view-orbit-btn, .activate-btn, .locked-btn {
//           width: 100%;
//           padding: 10px;
//           border-radius: 12px;
//           font-size: 12px;
//           font-weight: bold;
//           border: none;
//           cursor: pointer;
//           transition: all 0.2s ease;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           gap: 6px;
//         }
//         .view-orbit-btn {
//           background: linear-gradient(135deg, #6366f1, #8b5cf6);
//           color: white;
//         }
//         .view-orbit-btn:hover {
//           transform: translateY(-2px);
//           box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
//         }
//         .activate-btn {
//           background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
//           color: #07111f;
//         }
//         .locked-btn {
//           background: rgba(108, 117, 125, 0.5);
//           color: #6c757d;
//           cursor: not-allowed;
//         }
        
//         .go-arrow {
//           display: inline-block;
//           font-size: 14px;
//           font-weight: bold;
//           transform: rotate(45deg);
//         }
        
//         .check-dot {
//           width: 12px;
//           height: 12px;
//           border-radius: 50%;
//           flex-shrink: 0;
//           margin-top: 2px;
//         }
//         .check-dot.green { background: var(--glow-teal); box-shadow: 0 0 8px var(--glow-teal); }
//         .check-dot.red { background: #ef4444; box-shadow: 0 0 8px #ef4444; }
        
//         .activation-checklist__item.is-error {
//           border-left: 2px solid #ef4444;
//         }
        
//         .insufficient-warning {
//           margin-top: 12px;
//           padding: 8px;
//           background: rgba(239, 68, 68, 0.15);
//           border-radius: 8px;
//           font-size: 11px;
//           color: #ef4444;
//         }
        
//         .orbit-preview {
//           cursor: pointer;
//           transition: all 0.3s ease;
//           min-height: 180px;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//         }
//         .orbit-preview:hover {
//           transform: scale(1.02);
//           background: radial-gradient(circle at center, rgba(77, 163, 255, 0.15), transparent);
//         }
//         .mini-orbit {
//           text-align: center;
//         }
//         .mini-orbit-core {
//           display: flex;
//           flex-direction: column;
//           align-items: center;
//           justify-content: center;
//           width: 70px;
//           height: 70px;
//           margin: 0 auto 12px;
//           background: radial-gradient(circle at 30% 30%, #4da3ff, #002366);
//           border-radius: 50%;
//           border: 2px solid white;
//           box-shadow: 0 0 20px rgba(77, 163, 255, 0.4);
//         }
//         .mini-orbit-core span:first-child { font-size: 16px; font-weight: bold; }
//         .mini-orbit-type { font-size: 10px; opacity: 0.8; }
//         .mini-orbit-stats { display: flex; justify-content: center; gap: 16px; margin-bottom: 8px; }
//         .mini-stat { font-size: 11px; background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 20px; }
//         .mini-orbit-earn { font-size: 12px; font-weight: bold; color: var(--glow-teal); }
//         .orbit-loading { font-size: 12px; color: var(--text-secondary); }
        
//         .earnings-chip {
//           background: linear-gradient(135deg, rgba(40, 167, 69, 0.2), rgba(32, 201, 151, 0.2));
//           border: 1px solid rgba(40, 167, 69, 0.3);
//         }
//         .deployer-chip {
//           background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.1));
//           border: 1px solid rgba(245, 158, 11, 0.3);
//         }
//         .id1-chip {
//           background: linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(168, 85, 247, 0.1));
//           border: 1px solid rgba(168, 85, 247, 0.3);
//         }
        
//         /* Registration Form Styles */
//         .activation-registration-form {
//           padding: 20px;
//           background: var(--glass-bg-strong);
//           border-radius: 20px;
//           margin-bottom: 16px;
//         }
//         .registration-warning {
//           background: rgba(245, 158, 11, 0.15);
//           border-left: 3px solid var(--warning);
//           padding: 12px;
//           border-radius: 12px;
//           margin-bottom: 16px;
//         }
//         .warning-header {
//           font-weight: bold;
//           margin-bottom: 8px;
//         }
//         .warning-details {
//           display: flex;
//           gap: 16px;
//           font-size: 12px;
//         }
//         .approve-reg-btn, .register-btn {
//           width: 100%;
//           padding: 12px;
//           border-radius: 12px;
//           font-weight: bold;
//           border: none;
//           cursor: pointer;
//           margin-bottom: 12px;
//         }
//         .approve-reg-btn {
//           background: linear-gradient(135deg, #f59e0b, #d97706);
//           color: white;
//         }
//         .register-btn {
//           background: linear-gradient(135deg, var(--glow-teal), #1a9b7a);
//           color: #07111f;
//         }
//         .approve-reg-btn:disabled, .register-btn:disabled {
//           opacity: 0.5;
//           cursor: not-allowed;
//         }
//         .referrer-input-group {
//           margin-bottom: 16px;
//         }
//         .referrer-label {
//           display: block;
//           font-size: 11px;
//           text-transform: uppercase;
//           letter-spacing: 1px;
//           margin-bottom: 8px;
//           color: var(--text-secondary);
//         }
//         .referrer-input {
//           width: 100%;
//           padding: 10px;
//           border-radius: 10px;
//           background: rgba(255,255,255,0.1);
//           border: 1px solid rgba(255,255,255,0.2);
//           color: white;
//           font-family: monospace;
//         }
//         .referrer-hint {
//           font-size: 10px;
//           color: var(--text-secondary);
//           margin-top: 6px;
//         }
//         .insufficient-funds-warning {
//           background: rgba(239, 68, 68, 0.15);
//           padding: 8px;
//           border-radius: 8px;
//           font-size: 11px;
//           color: #ef4444;
//           text-align: center;
//         }
        
//         /* Deployer Faucet Styles */
//         .deployer-faucet {
//           padding: 20px;
//           background: var(--glass-bg-strong);
//           border-radius: 20px;
//           margin-bottom: 16px;
//         }
//         .faucet-controls {
//           display: flex;
//           flex-direction: column;
//           gap: 12px;
//         }
//         .faucet-switch {
//           margin-bottom: 8px;
//         }
//         .switch-label {
//           display: flex;
//           align-items: center;
//           gap: 10px;
//           font-size: 12px;
//           cursor: pointer;
//         }
//         .faucet-amount-group {
//           display: flex;
//           gap: 10px;
//         }
//         .faucet-amount, .faucet-address {
//           flex: 1;
//           padding: 10px;
//           border-radius: 10px;
//           background: rgba(255,255,255,0.1);
//           border: 1px solid rgba(255,255,255,0.2);
//           color: white;
//         }
//         .faucet-btn {
//           padding: 10px 20px;
//           border-radius: 10px;
//           background: linear-gradient(135deg, #28a745, #20c997);
//           color: white;
//           font-weight: bold;
//           border: none;
//           cursor: pointer;
//         }
//         .faucet-btn:disabled {
//           opacity: 0.5;
//           cursor: not-allowed;
//         }
//         .faucet-hint {
//           font-size: 10px;
//           color: var(--text-secondary);
//         }
//         .deployer-balance {
//           font-size: 12px;
//           padding: 8px;
//           background: rgba(0,0,0,0.3);
//           border-radius: 8px;
//           text-align: center;
//         }
        
//         .inactive { opacity: 0.6; }
//         .small { font-size: 12px; }
//         .muted-text { color: var(--text-secondary); }
//       `}</style>
//     </section>
//   )
// }

// export default ActivationCenterPage
