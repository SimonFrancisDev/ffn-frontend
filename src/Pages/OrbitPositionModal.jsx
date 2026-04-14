import React from 'react'
import { Button, Modal, Badge } from 'react-bootstrap'

export const OrbitPositionModal = ({
  t,
  show,
  onHide,
  selectedPosition,
  isViewingSelf,
  receiptsSupported,
  shortAddress,
  getNetAmount,
  formatUsdtDisplay,
  getDisplayPositionType,
  didViewerEarnPayment
}) => {
  return (
    <Modal show={show} onHide={onHide} className="position-modal" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {t('orbits.positionDetails', { number: selectedPosition?.number })}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {selectedPosition && (
          <>
            <div className="info-row">
              <span className="info-label">{t('orbits.positionType')}</span>
              <span className="info-value">{getDisplayPositionType(selectedPosition)}</span>
            </div>

            <div className="info-row">
              <span className="info-label">{t('orbits.line')}</span>
              <span className="info-value">
                {t('orbits.line')} {selectedPosition.positionInfo?.line}
              </span>
            </div>

            {selectedPosition.positionInfo?.linePaymentNumber > 0 && (
              <div className="info-row">
                <span className="info-label">Line arrival #</span>
                <span className="info-value">{selectedPosition.positionInfo.linePaymentNumber}</span>
              </div>
            )}

            {selectedPosition.detailsLoading && (
              <div className="info-row">
                <span className="info-label">Details</span>
                <span className="info-value">Loading full position details...</span>
              </div>
            )}

            {selectedPosition.parentPosition && (
              <div className="info-row">
                <span className="info-label">Structural Parent</span>
                <span className="info-value">Position {selectedPosition.parentPosition}</span>
              </div>
            )}

            {selectedPosition.occupant ? (
              <>
                <div className="info-row">
                  <span className="info-label">{t('orbits.occupiedBy')}</span>
                  <span className="info-value">
                    {selectedPosition.occupantType === 'mine'
                      ? (isViewingSelf ? t('orbits.you') : t('orbits.viewedOwner'))
                      : shortAddress(selectedPosition.occupant)}
                  </span>
                </div>

                <div className="info-row">
                  <span className="info-label">{t('orbits.fullAddress')}</span>
                  <span className="info-value" style={{ fontSize: '0.8rem' }}>
                    {selectedPosition.occupant}
                  </span>
                </div>

                <div className="info-row">
                  <span className="info-label">{t('orbits.amountEntered')} (net)</span>
                  <span className="info-value">
                    {formatUsdtDisplay(getNetAmount(Number(selectedPosition.amount)))} USDT
                    <small className="text-muted d-block">
                      Gross: {formatUsdtDisplay(selectedPosition.amount)} USDT
                    </small>
                  </span>
                </div>

                {selectedPosition.timestamp > 0 && (
                  <div className="info-row">
                    <span className="info-label">{t('orbits.filledOn')}</span>
                    <span className="info-value">
                      {new Date(Number(selectedPosition.timestamp) * 1000).toLocaleString()}
                    </span>
                  </div>
                )}

                {receiptsSupported && (
                  <>
                    <div className="info-row">
                      <span className="info-label">Truth source</span>
                      <span className="info-value">LevelManager receipts</span>
                    </div>

                    <div className="info-row">
                      <span className="info-label">Matched receipts</span>
                      <span className="info-value">
                        {selectedPosition.payoutReceiptSummary?.count || 0}
                      </span>
                    </div>
                  </>
                )}

                <div className="commission-breakdown">
                  <h6 className="fw-bold mb-3">Routing Breakdown (Who Earned What)</h6>

                  {receiptsSupported && selectedPosition.payoutReceipts?.length > 0 ? (
                    selectedPosition.payoutReceipts.map((receipt, idx) => {
                      const typeName =
                        receipt.receiptType === 1 ? 'Founder Path'
                          : receipt.receiptType === 2 ? 'Direct Owner'
                            : receipt.receiptType === 3 ? 'Routed Spillover'
                              : receipt.receiptType === 4 ? 'Recycle'
                                : 'Unknown'

                      const spillover1Recipient = selectedPosition.positionInfo?.spillover1Recipient
                      const spillover2Recipient = selectedPosition.positionInfo?.spillover2Recipient
                      const isSpillover1 = spillover1Recipient && receipt.receiver.toLowerCase() === spillover1Recipient.toLowerCase()
                      const isSpillover2 = spillover2Recipient && receipt.receiver.toLowerCase() === spillover2Recipient.toLowerCase()
                      const spilloverLabel = isSpillover1 ? ' [SPILLOVER 1]' : (isSpillover2 ? ' [SPILLOVER 2]' : '')

                      return (
                        <div className="commission-item" key={idx}>
                          <span>
                            {typeName}{spilloverLabel} → {shortAddress(receipt.receiver)}
                            {didViewerEarnPayment(receipt.receiver, receipt.grossAmount) && (
                              <Badge bg="success" className="ms-2" style={{ fontSize: '0.7rem' }}>✓ You earned</Badge>
                            )}
                          </span>
                          <span className="commission-amount">
                            {formatUsdtDisplay(receipt.grossAmount)} USDT
                          </span>
                        </div>
                      )
                    })
                  ) : (
                    <>
                      {selectedPosition.positionInfo?.exactToOwner > 0 && (
                        <div className="commission-item">
                          <span>Owner Payment</span>
                          <span className="commission-amount payout">
                            {formatUsdtDisplay(selectedPosition.positionInfo.exactToOwner)} USDT
                          </span>
                        </div>
                      )}
                      {selectedPosition.positionInfo?.exactToSpillover1 > 0 && (
                        <div className="commission-item">
                          <span>Spillover 1 → {shortAddress(selectedPosition.positionInfo.spillover1Recipient)}</span>
                          <span className="commission-amount" style={{ color: '#ffc107' }}>
                            {formatUsdtDisplay(selectedPosition.positionInfo.exactToSpillover1)} USDT
                          </span>
                        </div>
                      )}
                      {selectedPosition.positionInfo?.exactToSpillover2 > 0 && (
                        <div className="commission-item">
                          <span>Spillover 2 → {shortAddress(selectedPosition.positionInfo.spillover2Recipient)}</span>
                          <span className="commission-amount" style={{ color: '#ffc107' }}>
                            {formatUsdtDisplay(selectedPosition.positionInfo.exactToSpillover2)} USDT
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="commission-item">
                    <span>Escrow Locked</span>
                    <span className="commission-amount escrow">
                      {formatUsdtDisplay(
                        receiptsSupported && selectedPosition.payoutReceipts?.length > 0
                          ? selectedPosition.payoutReceipts.reduce((sum, r) => sum + Number(r.escrowLocked || 0), 0)
                          : (selectedPosition.positionInfo?.exactToEscrow || 0)
                      )} USDT
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-4">
                <h5 className="text-muted">{t('orbits.emptyPosition')}</h5>
                <p className="small">{t('orbits.availableToBeFilled')}</p>

                <div className="commission-breakdown mt-3">
                  <h6 className="fw-bold mb-2">{t('orbits.whenFilled')}</h6>
                  <p className="small mb-0">This position is empty. No receipt exists yet for this slot.</p>
                  {selectedPosition.parentPosition && (
                    <p className="small text-warning mt-2">
                      Structural parent: Position {selectedPosition.parentPosition}
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          {t('orbits.close')}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
