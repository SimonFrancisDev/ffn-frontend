
import React from 'react'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import { ethers } from 'ethers'
import {
  buildPositionInfoFromRuleView,
  getStructuralParentPosition,
  getOrbitStructure,
  getPlanetSize,
  getCoreSize,
  getPositionOnRing,
  getPositionOnAngle
} from './orbitHelpers'

export const OrbitGalaxy = ({
  t,
  level,
  data,
  orbitType,
  config,
  positionsByLine,
  lineCounts,
  isLevelActive,
  isViewingSelf,
  viewAddress,
  hoveredPosition,
  setHoveredPosition,
  showStructuralPreview,
  handleStructuralPreview,
  handlePositionClick,
  galaxyRef,
  activeTab,
  containerSize,
  getPlanetBadgeValue,
  starConfig,
  shortAddress,
  formatUsdtDisplay,
  getNetAmount,
  receiptsSupported
}) => {
  const renderPositionTooltip = (position) => {
    if (!position.occupant) {
      return (
        <Tooltip id={`tooltip-empty-${position.number}`}>
          <strong>Empty Position</strong>
          <div>Available to be filled</div>
          {position.parentPosition && (
            <div className="text-warning mt-1">Structural parent: Position {position.parentPosition}</div>
          )}
        </Tooltip>
      )
    }

    const fmtAddr = (addr) => (addr && addr !== ethers.ZeroAddress ? shortAddress(addr) : '—')

    const viewerBreakdown = position.viewerReceiptBreakdown || {
      totalGross: 0, totalLiquid: 0, totalEscrow: 0,
      directOwnerGross: 0, routedSpilloverGross: 0, founderPathGross: 0, recycleGross: 0
    }

    const viewerActuallyReceived =
      viewerBreakdown.totalGross > 0 ||
      viewerBreakdown.totalLiquid > 0 ||
      viewerBreakdown.totalEscrow > 0

    const viewerRole =
      viewerBreakdown.founderPathGross > 0 ? 'FOUNDER PATH' :
        viewerBreakdown.directOwnerGross > 0 ? 'DIRECT OWNER' :
          viewerBreakdown.routedSpilloverGross > 0 ? 'ROUTED SPILLOVER' :
            viewerBreakdown.recycleGross > 0 ? 'RECYCLE' : 'NONE'

    const ownerEscrow = receiptsSupported && position.payoutReceipts?.length > 0
      ? position.payoutReceipts.reduce((sum, r) => sum + (Number(r.escrowLocked || 0) * (r.receiver === position.orbitOwner ? 1 : 0)), 0)
      : (position.positionInfo?.exactToEscrow || 0)

    const spillover1Recipient = position.positionInfo?.spillover1Recipient
    const spillover2Recipient = position.positionInfo?.spillover2Recipient

    return (
      <Tooltip id={`tooltip-${position.number}`} style={{ maxWidth: '440px' }}>
        <div><strong>Position #{position.number}</strong> (Line {position.line})</div>
        <div><strong>Occupant:</strong> {shortAddress(position.occupant)}</div>

        <div className="mt-2">
          <strong>Amount entered (net):</strong> {formatUsdtDisplay(getNetAmount(Number(position.amount)))} USDT
          <small className="text-muted d-block">
            Gross: {formatUsdtDisplay(position.amount)} USDT — 10% system charge
          </small>
        </div>

        {position.positionInfo?.linePaymentNumber > 0 && (
          <div className="text-info mt-1">Line arrival #{position.positionInfo.linePaymentNumber}</div>
        )}

        {position.parentPosition && (
          <div className="text-warning mt-1">Structural parent: Position {position.parentPosition}</div>
        )}

        <hr className="my-2" />
        <div className="fw-bold mb-1">Who earned from this activation:</div>

        {receiptsSupported && position.payoutReceipts?.length > 0 ? (
          position.payoutReceipts.map((receipt, idx) => {
            const typeName =
              receipt.receiptType === 1 ? 'Founder Path' :
                receipt.receiptType === 2 ? 'Direct Owner' :
                  receipt.receiptType === 3 ? 'Routed Spillover' :
                    receipt.receiptType === 4 ? 'Recycle' : 'Unknown'

            const isSpillover1 = spillover1Recipient && receipt.receiver.toLowerCase() === spillover1Recipient.toLowerCase()
            const isSpillover2 = spillover2Recipient && receipt.receiver.toLowerCase() === spillover2Recipient.toLowerCase()
            const spilloverLabel = isSpillover1 ? ' [SPILLOVER 1]' : (isSpillover2 ? ' [SPILLOVER 2]' : '')

            return (
              <div className="small" key={idx}>
                {typeName}{spilloverLabel}: {formatUsdtDisplay(receipt.grossAmount)} USDT → {fmtAddr(receipt.receiver)}
                {receipt.escrowLocked > 0 && <span className="text-info ms-2">(locked {formatUsdtDisplay(receipt.escrowLocked)})</span>}
              </div>
            )
          })
        ) : (
          <>
            {position.positionInfo?.exactToOwner > 0 && (
              <div className="small">Owner: {formatUsdtDisplay(position.positionInfo.exactToOwner)} USDT</div>
            )}
            {position.positionInfo?.exactToSpillover1 > 0 && (
              <div className="small text-warning">Spillover 1: {formatUsdtDisplay(position.positionInfo.exactToSpillover1)} USDT → {fmtAddr(spillover1Recipient)}</div>
            )}
            {position.positionInfo?.exactToSpillover2 > 0 && (
              <div className="small text-warning">Spillover 2: {formatUsdtDisplay(position.positionInfo.exactToSpillover2)} USDT → {fmtAddr(spillover2Recipient)}</div>
            )}
          </>
        )}

        <div className="mt-2">
          <strong>Escrow locked for orbit owner:</strong> {formatUsdtDisplay(ownerEscrow)} USDT
        </div>

        <hr className="my-2" />
        <div className="fw-bold">What YOU received:</div>
        {receiptsSupported ? (
          viewerActuallyReceived ? (
            <>
              <div><strong>Your role:</strong> {viewerRole}</div>
              <div>Gross: <strong>{formatUsdtDisplay(viewerBreakdown.totalGross)}</strong> USDT</div>
              <div>Liquid: <strong>{formatUsdtDisplay(viewerBreakdown.totalLiquid)}</strong> USDT</div>
              <div>Escrow for you: <strong>{formatUsdtDisplay(viewerBreakdown.totalEscrow)}</strong> USDT</div>
            </>
          ) : <div className="text-muted small">You received nothing from this activation.</div>
        ) : <div className="text-muted small">Receipt verification unavailable.</div>}
      </Tooltip>
    )
  }

  const structure = getOrbitStructure(orbitType)

  return (
    <div className={`galaxy-container ${orbitType.toLowerCase()}`} ref={activeTab === `level${level}` ? galaxyRef : null}>
      <div className="galaxy-grid"></div>

      <div className="star-field">
        {starConfig.map((star) => (
          <span
            key={star.id}
            className="star"
            style={{
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              animationDelay: `${star.delay}, ${star.delay}`,
              animationDuration: `${star.duration}, ${star.drift}`
            }}
          />
        ))}
      </div>

      <div className="galaxy-inner">
        {(() => {
          const outerWidth = containerSize.width > 0 ? containerSize.width : 560
          const outerHeight = containerSize.height > 0 ? containerSize.height : 560
          const usableSize = Math.max(Math.min(outerWidth, outerHeight) * 0.86, 240)
          const stageSize = usableSize
          const centerX = stageSize / 2
          const centerY = stageSize / 2

          const planetSize = getPlanetSize(orbitType, stageSize)
          const coreSize = getCoreSize(orbitType, stageSize)
          const nodePadding = planetSize / 2 + 8
          const coreClearance = coreSize / 2 + planetSize / 2 + 18

          let ringRadiiPx = { 1: Math.max(coreClearance, stageSize * 0.22), 2: stageSize * 0.34, 3: stageSize * 0.45 }

          if (orbitType === 'P4') {
            ringRadiiPx = { 1: Math.max(coreClearance + 6, stageSize * 0.31) }
          }
          if (orbitType === 'P12') {
            ringRadiiPx = {
              1: Math.max(coreClearance + 4, stageSize * 0.19),
              2: Math.min(stageSize * 0.43, (stageSize / 2) - nodePadding)
            }
          }
          if (orbitType === 'P39') {
            ringRadiiPx = {
              1: Math.max(coreClearance, stageSize * 0.17),
              2: Math.min(stageSize * 0.32, (stageSize / 2) - nodePadding - 34),
              3: Math.min(stageSize * 0.47, (stageSize / 2) - nodePadding)
            }
          }

          Object.keys(ringRadiiPx).forEach(key => {
            ringRadiiPx[key] = Math.min(ringRadiiPx[key], (stageSize / 2) - nodePadding)
          })

          const createEmptyPosition = (posNumber, lineNum) => ({
            number: posNumber,
            occupantType: 'empty',
            occupant: null,
            amount: '0',
            timestamp: 0,
            positionInfo: buildPositionInfoFromRuleView(orbitType, posNumber, level, null, viewAddress),
            line: lineNum,
            spillsTo: null,
            parentPosition: getStructuralParentPosition(orbitType, posNumber),
            payoutReceipts: [],
            payoutReceiptSummary: { count: 0, gross: 0, escrow: 0, liquid: 0, founderPathGross: 0, directOwnerGross: 0, routedSpilloverGross: 0, recycleGross: 0 },
            viewerReceipts: [],
            viewerReceiptBreakdown: { count: 0, totalGross: 0, totalLiquid: 0, totalEscrow: 0, directOwnerGross: 0, directOwnerLiquid: 0, directOwnerEscrow: 0, routedSpilloverGross: 0, routedSpilloverLiquid: 0, routedSpilloverEscrow: 0, founderPathGross: 0, founderPathLiquid: 0, founderPathEscrow: 0, recycleGross: 0, recycleLiquid: 0, recycleEscrow: 0 },
            truthLabel: 'NO_RECEIPT'
          })

          const allPositionMap = {}
          structure.lines.forEach(lineNum => {
            const linePositions = positionsByLine[lineNum] || []
            structure.positions[lineNum].forEach(posNumber => {
              allPositionMap[posNumber] = linePositions.find(p => p.number === posNumber) || createEmptyPosition(posNumber, lineNum)
            })
          })

          const getCoordsForPosition = (posNumber, lineNum, index) => {
            const customAngle = structure.customAngles?.[lineNum]?.[posNumber]
            if (typeof customAngle === 'number') {
              return getPositionOnAngle(customAngle, ringRadiiPx[lineNum], centerX, centerY)
            }
            return getPositionOnRing(index, structure.counts[lineNum], ringRadiiPx[lineNum], centerX, centerY, structure.startAngles[lineNum])
          }

          return (
            <div className="galaxy-stage" style={{ width: stageSize, height: stageSize, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
              <div className={`orbit-core ${!isLevelActive ? 'orbit-core-inactive' : ''}`} style={{ width: coreSize, height: coreSize }}>
                <span className="core-label">{isLevelActive ? t('orbits.owner') : t('orbits.inactiveCore')}</span>
                <span className="core-value">{isLevelActive ? (isViewingSelf ? t('orbits.you') : t('orbits.view')) : t('orbits.levelOff')}</span>
              </div>

              {structure.lines.map(lineNum => {
                const linePositions = positionsByLine[lineNum] || []
                const filledCount = linePositions.filter(p => p.occupant).length
                const diameter = ringRadiiPx[lineNum] * 2
                const arrivals = lineNum === 1 ? lineCounts.line1 : lineNum === 2 ? lineCounts.line2 : lineCounts.line3

                return (
                  <div key={lineNum} className={`orbit-ring line${lineNum}`} style={{ width: diameter, height: diameter }}>
                    <span className="ring-label">LINE {lineNum}</span>
                    <span className="ring-stats">
                      {filledCount}/{structure.positions[lineNum].length} • arrivals: {arrivals}
                    </span>
                  </div>
                )
              })}

              <>
                {structure.lines.map(lineNum => {
                  const positionNumbers = structure.positions[lineNum]
                  return positionNumbers.map((posNumber) => {
                    const parentPos = getStructuralParentPosition(orbitType, posNumber)
                    if (!parentPos) return null

                    const fromPos = allPositionMap[posNumber]
                    const toPos = allPositionMap[parentPos]
                    if (!fromPos || !toPos) return null

                    const fromLine = fromPos.line
                    const toLine = toPos.line
                    const fromIndex = structure.positions[fromLine].indexOf(fromPos.number)
                    const toIndex = structure.positions[toLine].indexOf(toPos.number)
                    if (fromIndex < 0 || toIndex < 0) return null

                    const fromCoords = getCoordsForPosition(fromPos.number, fromLine, fromIndex)
                    const toCoords = getCoordsForPosition(toPos.number, toLine, toIndex)
                    const dx = toCoords.x - fromCoords.x
                    const dy = toCoords.y - fromCoords.y
                    const distance = Math.sqrt(dx * dx + dy * dy)
                    const angle = Math.atan2(dy, dx) * 180 / Math.PI

                    return (
                      <div key={`grey-conn-${posNumber}-${parentPos}`}>
                        <div className="structural-connection-grey" style={{ width: distance, left: fromCoords.x, top: fromCoords.y, transform: `rotate(${angle}deg)` }} />
                      </div>
                    )
                  })
                })}

                {structure.lines.map(lineNum => {
                  const positionNumbers = structure.positions[lineNum]

                  return positionNumbers.map((posNumber, index) => {
                    const pos = allPositionMap[posNumber]
                    const coords = getCoordsForPosition(posNumber, lineNum, index)

                    let planetClass = 'planet-node '
                    if (pos.occupantType === 'mine') planetClass += 'planet-my-position'
                    else if (pos.occupantType === 'downline') planetClass += 'planet-downline'
                    else if (pos.occupantType === 'other') planetClass += 'planet-other'
                    else planetClass += 'planet-empty'

                    if (showStructuralPreview && hoveredPosition?.parentPosition === pos.number) {
                      planetClass += ' planet-structural-preview'
                    }

                    const badgeValue = getPlanetBadgeValue(pos)

                    return (
                      <OverlayTrigger key={pos.number} placement="top" overlay={renderPositionTooltip(pos)} delay={{ show: 250, hide: 100 }}>
                        <div
                          className={planetClass}
                          style={{ left: coords.x, top: coords.y, width: planetSize, height: planetSize, transform: 'translate(-50%, -50%)', '--index': index }}
                          onClick={() => handlePositionClick(pos)}
                          onMouseEnter={() => {
                            setHoveredPosition(pos)
                            if (pos.parentPosition) handleStructuralPreview(pos)
                          }}
                          onMouseLeave={() => setHoveredPosition(null)}
                        >
                          <div className="planet-content">
                            <span className="node-number">{pos.number}</span>

                            {pos.occupant && (
                              <span className="planet-icon">
                                {pos.occupantType === 'mine' ? '👤' : pos.occupantType === 'downline' ? '⬇️' : '👥'}
                              </span>
                            )}

                            {Number(badgeValue || 0) > 0 && pos.occupantType !== 'mine' && (
                              <span className="planet-earn-badge">{formatUsdtDisplay(badgeValue)}</span>
                            )}
                          </div>
                        </div>
                      </OverlayTrigger>
                    )
                  })
                })}

                {data.spilloverFromPositions.map((conn, idx) => {
                  const fromPos = allPositionMap[conn.from]
                  const toPos = allPositionMap[conn.to]
                  if (!fromPos || !toPos || !fromPos.occupant) return null

                  const fromLine = fromPos.line
                  const toLine = toPos.line
                  const fromIndex = structure.positions[fromLine].indexOf(fromPos.number)
                  const toIndex = structure.positions[toLine].indexOf(toPos.number)
                  if (fromIndex < 0 || toIndex < 0) return null

                  const fromCoords = getCoordsForPosition(fromPos.number, fromLine, fromIndex)
                  const toCoords = getCoordsForPosition(toPos.number, toLine, toIndex)
                  const dx = toCoords.x - fromCoords.x
                  const dy = toCoords.y - fromCoords.y
                  const distance = Math.sqrt(dx * dx + dy * dy)
                  const angle = Math.atan2(dy, dx) * 180 / Math.PI

                  return (
                    <div key={`conn-${idx}`}>
                      <div className="structural-connection" style={{ width: distance, left: fromCoords.x, top: fromCoords.y, transform: `rotate(${angle}deg)` }} />
                    </div>
                  )
                })}
              </>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
