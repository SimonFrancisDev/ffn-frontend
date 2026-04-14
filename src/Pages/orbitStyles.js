
export const orbitStyles = `
  @keyframes pulse-line {
    0% { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @keyframes orbit-glow {
    0%, 100% { box-shadow: 0 0 0 rgba(0, 68, 204, 0.08), 0 0 12px rgba(0, 68, 204, 0.08) inset; }
    50% { box-shadow: 0 0 0 rgba(0, 68, 204, 0.15), 0 0 20px rgba(0, 68, 204, 0.12) inset; }
  }
  @keyframes structural-pulse {
    0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.75); }
    70% { box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
    100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
  }
  @keyframes rotate-slow {
    from { transform: translate(-50%, -50%) rotate(0deg); }
    to { transform: translate(-50%, -50%) rotate(360deg); }
  }
  @keyframes rotate-reverse {
    from { transform: translate(-50%, -50%) rotate(360deg); }
    to { transform: translate(-50%, -50%) rotate(0deg); }
  }
  @keyframes float {
    0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
    50% { transform: translate(-50%, -50%) translateY(-4px); }
  }
  @keyframes core-pulse {
    0%, 100% { box-shadow: 0 0 28px rgba(0,35,102,0.35), 0 0 60px rgba(0,68,204,0.12); }
    50% { box-shadow: 0 0 36px rgba(0,35,102,0.45), 0 0 75px rgba(0,68,204,0.18); }
  }
  @keyframes core-pulse-inactive {
    0%, 100% { box-shadow: 0 0 18px rgba(108,117,125,0.18), 0 0 36px rgba(108,117,125,0.08); }
    50% { box-shadow: 0 0 24px rgba(108,117,125,0.22), 0 0 48px rgba(108,117,125,0.12); }
  }
  @keyframes twinkle {
    0%, 100% { opacity: 0.18; transform: scale(1); }
    50% { opacity: 0.95; transform: scale(1.55); }
  }
  @keyframes drift {
    0% { transform: translateY(0px) translateX(0px); }
    50% { transform: translateY(-3px) translateX(2px); }
    100% { transform: translateY(0px) translateX(0px); }
  }
  @keyframes glow-border {
    0%, 100% { box-shadow: 0 0 0 rgba(0,68,204,0.0), 0 18px 50px rgba(0,35,102,0.05); }
    50% { box-shadow: 0 0 0 rgba(0,68,204,0.0), 0 22px 60px rgba(0,35,102,0.08); }
  }
  .lab-card {
    background: rgba(255, 255, 255, 0.82);
    border: 1px solid rgba(255, 255, 255, 0.45);
    border-radius: 24px;
    box-shadow: 0 14px 40px rgba(0, 35, 102, 0.06);
    overflow: hidden;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }
  .orbit-header {
    background: linear-gradient(90deg, #001b52 0%, #002366 35%, #003085 100%);
    color: white;
    font-family: 'monospace';
    font-size: 0.85rem;
    padding: 10px 20px;
    text-transform: uppercase;
    letter-spacing: 2px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    box-shadow: inset 0 -1px 0 rgba(255,255,255,0.08);
  }
  .cycle-badge { background: linear-gradient(135deg, #ffd54f 0%, #ffc107 100%); color: #002366; font-weight: bold; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; box-shadow: 0 4px 10px rgba(255,193,7,0.25); }
  .cycle-switcher-wrap { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 14px; }
  .cycle-switcher-label { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #6c757d; margin-right: 4px; }
  .cycle-switcher-btn { border-radius: 999px !important; padding: 4px 12px !important; font-size: 0.76rem !important; font-weight: 700 !important; border-width: 1px !important; box-shadow: 0 8px 18px rgba(0,0,0,0.04); }
  .cycle-switcher-btn.active { background: linear-gradient(135deg, #002366 0%, #0044cc 100%) !important; border-color: #002366 !important; color: #fff !important; box-shadow: 0 10px 22px rgba(0,68,204,0.18); }
  .cycle-history-note { margin-bottom: 14px; padding: 10px 12px; border-radius: 14px; font-size: 0.78rem; line-height: 1.45; color: #52627a; background: rgba(248, 249, 250, 0.92); border: 1px solid rgba(0,35,102,0.06); }
  .history-indicator { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.14); color: #fff; font-size: 0.72rem; font-weight: 800; letter-spacing: 1px; margin-left: 10px; border: 1px solid rgba(255,255,255,0.16); }
  .history-summary-card { margin-top: 12px; padding: 14px; border-radius: 18px; background: linear-gradient(180deg, rgba(248,249,250,0.95) 0%, rgba(244,247,252,0.95) 100%); border: 1px solid rgba(0,35,102,0.05); }
  .history-summary-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 6px 0; font-size: 0.86rem; }
  .history-summary-label { color: #6c757d; font-weight: 700; }
  .history-summary-value { color: #002366; font-weight: 800; font-family: monospace; text-align: right; }
  .galaxy-container { position: relative; width: 100%; aspect-ratio: 1 / 1; max-width: 660px; margin: 20px auto; min-height: 320px; border-radius: 34px; overflow: hidden; background: radial-gradient(circle at 50% 50%, rgba(27, 75, 196, 0.08) 0%, rgba(5, 22, 62, 0.06) 28%, rgba(2, 10, 33, 0.94) 74%, rgba(0, 7, 24, 0.98) 100%); border: 1px solid rgba(255,255,255,0.08); box-shadow: inset 0 0 80px rgba(0, 119, 255, 0.06), inset 0 0 24px rgba(255,255,255,0.03), 0 24px 60px rgba(0,35,102,0.12); animation: glow-border 6s ease-in-out infinite; }
  .galaxy-container::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 20% 18%, rgba(0, 174, 255, 0.10), transparent 16%), radial-gradient(circle at 82% 24%, rgba(132, 94, 255, 0.08), transparent 18%), radial-gradient(circle at 52% 80%, rgba(255, 193, 7, 0.06), transparent 20%); pointer-events: none; z-index: 0; }
  .galaxy-grid { position: absolute; inset: 0; border-radius: 34px; pointer-events: none; background-image: linear-gradient(rgba(82, 145, 255, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(82, 145, 255, 0.045) 1px, transparent 1px); background-size: 28px 28px; mask-image: radial-gradient(circle at center, black 0%, rgba(0,0,0,0.82) 56%, transparent 90%); opacity: 0.35; z-index: 1; }
  .star-field { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
  .star { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.95); box-shadow: 0 0 6px rgba(255,255,255,0.4); animation: twinkle 3.2s ease-in-out infinite, drift 8s ease-in-out infinite; }
  .galaxy-inner { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 2; }
  .galaxy-stage { position: absolute; inset: 7%; border-radius: 50%; }
  .orbit-ring { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); border-radius: 50%; pointer-events: none; transition: all 0.3s ease; animation: orbit-glow 4.2s ease-in-out infinite; background: radial-gradient(circle at center, transparent 96%, rgba(255,255,255,0.22) 100%); overflow: visible; }
  .orbit-ring::before { content: ''; position: absolute; inset: -10px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.03); pointer-events: none; }
  .orbit-ring.line1 { border: 2px solid rgba(89, 150, 255, 0.36); animation: orbit-glow 4.2s ease-in-out infinite, rotate-slow 30s linear infinite; }
  .orbit-ring.line2 { border: 2px dashed rgba(89, 150, 255, 0.26); animation: orbit-glow 5.2s ease-in-out infinite, rotate-reverse 48s linear infinite; }
  .orbit-ring.line3 { border: 2px dotted rgba(89, 150, 255, 0.20); animation: orbit-glow 6.2s ease-in-out infinite, rotate-slow 75s linear infinite; }
  .ring-label { position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: rgba(255,255,255,0.12); color: #dce9ff; padding: 5px 13px; border-radius: 999px; font-size: 0.66rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.3px; white-space: nowrap; pointer-events: none; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.10); box-shadow: 0 10px 24px rgba(0,0,0,0.18); }
  .ring-stats { position: absolute; bottom: -14px; left: 50%; transform: translateX(-50%); background: rgba(255,255,255,0.10); color: #bfd4ff; padding: 5px 12px; border-radius: 999px; font-size: 0.62rem; font-weight: 700; white-space: nowrap; pointer-events: none; box-shadow: 0 10px 24px rgba(0,0,0,0.16); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(10px); }
  .planet-node { position: absolute; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.28s ease, filter 0.28s ease, border-color 0.28s ease; z-index: 10; box-shadow: 0 8px 20px rgba(0,0,0,0.28); border: 2px solid rgba(255,255,255,0.90); animation: float 4s ease-in-out infinite; animation-delay: calc(var(--index) * 0.12s); will-change: transform; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
  .planet-node:hover { transform: translate(-50%, -50%) scale(1.18); z-index: 100; box-shadow: 0 14px 32px rgba(0,0,0,0.30), 0 0 20px rgba(92, 154, 255, 0.14); filter: saturate(1.08) brightness(1.04); animation: none; border-color: rgba(255,255,255,1); }
  .galaxy-container.p39 .planet-node { width: 34px; height: 34px; }
  .galaxy-container.p39 .node-number { font-size: 13px; }
  .planet-my-position { background: linear-gradient(135deg, rgba(40, 167, 69, 0.95) 0%, rgba(32, 201, 151, 0.95) 100%); color: white; box-shadow: 0 0 20px rgba(40, 167, 69, 0.46), 0 10px 24px rgba(0,0,0,0.20); }
  .planet-downline { background: linear-gradient(135deg, rgba(255, 193, 7, 0.96) 0%, rgba(253, 126, 20, 0.96) 100%); color: white; box-shadow: 0 0 20px rgba(255, 193, 7, 0.26), 0 10px 24px rgba(0,0,0,0.20); }
  .planet-other { background: linear-gradient(135deg, rgba(0, 102, 204, 0.96) 0%, rgba(0, 153, 255, 0.96) 100%); color: white; box-shadow: 0 0 20px rgba(0, 102, 204, 0.22), 0 10px 24px rgba(0,0,0,0.20); }
  .planet-empty { background: rgba(255, 255, 255, 0.92); color: #dc3545; border: 2px solid rgba(255, 107, 107, 0.95) !important; box-shadow: 0 8px 20px rgba(220, 53, 69, 0.10), 0 10px 24px rgba(0,0,0,0.16); }
  .planet-structural-preview { background: linear-gradient(135deg, #ffca28 0%, #ffb300 100%); color: #002366; animation: structural-pulse 2s infinite !important; z-index: 50; }
  .planet-content { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; position: relative; }
  .node-number { font-size: 16px; font-weight: 800; text-shadow: 0 1px 2px rgba(0,0,0,0.22); line-height: 1; }
  .planet-icon { position: absolute; top: -4px; right: -4px; background: linear-gradient(135deg, #ffe082 0%, #ffc107 100%); color: #002366; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.22); border: 1px solid white; }
  .planet-earn-badge { position: absolute; top: -8px; left: -8px; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; border-radius: 12px; padding: 2px 6px; font-size: 9px; font-weight: bold; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.20); border: 1px solid white; }
  .structural-connection { position: absolute; background: linear-gradient(90deg, rgba(255, 215, 64, 0.98), rgba(255, 179, 0, 0.98)); height: 2px; transform-origin: 0 0; z-index: 5; pointer-events: none; box-shadow: 0 0 10px rgba(255, 193, 7, 0.55); border-radius: 999px; }
  .structural-connection-grey { position: absolute; background: rgb(22, 253, 5); height: 1px; transform-origin: 0 0; z-index: 4; pointer-events: none; border-radius: 999px; border-top: 1px dashed rgba(112, 112, 140, 0.5); }
  .orbit-core { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 96px; height: 96px; background: radial-gradient(circle at 30% 30%, rgba(40, 129, 255, 1), rgba(0, 35, 102, 1)); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; font-weight: bold; box-shadow: 0 0 40px rgba(0,35,102,0.35); border: 3px solid rgba(255,255,255,0.95); z-index: 20; animation: core-pulse 3.2s ease-in-out infinite; backdrop-filter: blur(12px); }
  .orbit-core-inactive { background: radial-gradient(circle at 30% 30%, rgba(173, 181, 189, 0.96), rgba(73, 80, 87, 0.96)); color: #f8f9fa; box-shadow: 0 0 24px rgba(108,117,125,0.24); border: 3px solid rgba(255,255,255,0.75); animation: core-pulse-inactive 3.2s ease-in-out infinite; }
  .core-label { font-size: 10px; text-transform: uppercase; opacity: 0.88; letter-spacing: 1.2px; }
  .core-value { font-size: 16px; font-weight: 800; text-shadow: 0 2px 4px rgba(0,0,0,0.30); text-align: center; line-height: 1.1; }
  .color-legend { display: flex; gap: 20px; margin-bottom: 20px; padding: 15px; background: rgba(248, 249, 250, 0.82); border-radius: 16px; flex-wrap: wrap; justify-content: center; border: 1px solid rgba(0,35,102,0.06); backdrop-filter: blur(8px); }
  .legend-item { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; min-width: 0; }
  .legend-color { width: 20px; height: 20px; border-radius: 50%; box-shadow: 0 6px 14px rgba(0,0,0,0.10); flex-shrink: 0; }
  .legend-color.green { background: #28a745; }
  .legend-color.orange { background: #fd7e14; }
  .legend-color.blue { background: #0066cc; }
  .legend-color.gold { background: linear-gradient(135deg, #ffd54f 0%, #ffb300 100%); }
  .legend-color.red { background: white; border: 2px solid #dc3545; }
  .legend-color.gray { background: linear-gradient(135deg, #adb5bd 0%, #495057 100%); }
  .energy-cell .progress { height: 12px; background: rgba(240, 244, 248, 0.8); border-radius: 10px; overflow: hidden; border: 1px solid rgba(0,0,0,0.04); backdrop-filter: blur(6px); }
  .pulse-overlay { background-image: linear-gradient(90deg, transparent 0%, rgba(0, 35, 102, 0.02) 45%, rgba(0, 68, 204, 0.08) 50%, rgba(0, 35, 102, 0.02) 55%, transparent 100%); background-size: 200% 100%; animation: pulse-line 5s linear infinite; }
  .nav-tabs { flex-wrap: nowrap !important; overflow-x: auto; overflow-y: hidden; white-space: nowrap; scrollbar-width: thin; padding-bottom: 4px; }
  .nav-tabs .nav-item { flex: 0 0 auto; }
  .nav-tabs .nav-link { border: none; color: #666; font-weight: 700; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px; padding: 15px 25px; white-space: nowrap; }
  .nav-tabs .nav-link.active { color: #002366; border-bottom: 3px solid #002366; background: transparent; }
  .refresh-button { background: linear-gradient(135deg, #002366 0%, #0044cc 100%); color: white; border: none; border-radius: 10px; padding: 6px 16px; font-size: 0.8rem; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 10px 20px rgba(0,68,204,0.16); white-space: nowrap; }
  .view-toggle { display: flex; gap: 10px; margin-left: 20px; flex-wrap: wrap; }
  .view-toggle .btn { border-radius: 999px; padding: 6px 16px; font-size: 0.8rem; box-shadow: 0 8px 18px rgba(0,0,0,0.04); white-space: nowrap; }
  .view-toggle .btn.active { background: linear-gradient(135deg, #002366 0%, #0044cc 100%); color: white; border-color: #002366; box-shadow: 0 10px 22px rgba(0,68,204,0.18); }
  .position-modal .modal-dialog { max-width: min(680px, calc(100vw - 24px)); }
  .position-modal .modal-content { border-radius: 24px; border: none; box-shadow: 0 24px 50px rgba(0,0,0,0.20); backdrop-filter: blur(12px); overflow: hidden; }
  .position-modal .modal-header { background: linear-gradient(90deg, #001b52 0%, #002366 35%, #003085 100%); color: white; border-bottom: none; padding: 20px; }
  .position-modal .modal-body { padding: 25px; background: rgba(255,255,255,0.96); }
  .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f0f0f0; gap: 16px; }
  .info-label { font-weight: 600; color: #666; flex: 0 0 auto; }
  .info-value { font-family: monospace; font-weight: 700; color: #002366; text-align: right; min-width: 0; overflow-wrap: anywhere; word-break: break-word; }
  .commission-breakdown { background: linear-gradient(180deg, rgba(248,249,250,0.95) 0%, rgba(244,247,252,0.95) 100%); border-radius: 16px; padding: 15px; margin: 15px 0; border: 1px solid rgba(0,35,102,0.05); }
  .commission-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05); font-size: 0.9rem; }
  .commission-item:last-child { border-bottom: none; }
  .commission-amount { font-weight: 700; color: #002366; text-align: right; }
  .commission-amount.payout { color: #28a745; }
  .commission-amount.escrow { color: #0dcaf0; }
  .earned-caption { font-size: 0.78rem; color: #6c757d; line-height: 1.4; margin-top: 6px; }
  @media (max-width: 991px) { .row > .col-lg-8, .row > .col-lg-4 { width: 100% !important; flex: 0 0 100% !important; max-width: 100% !important; } .row > .col-lg-8 { margin-bottom: 1.5rem; } .galaxy-container { max-width: 100% !important; width: 100% !important; margin: 10px auto; } .energy-cell { margin-top: 0; } }
  @media (max-width: 768px) { .planet-node { width: 28px !important; height: 28px !important; } .galaxy-container.p39 .planet-node { width: 22px !important; height: 22px !important; } .planet-earn-badge { display: none !important; } .node-number { font-size: 11px !important; } .galaxy-container { margin: 10px auto; padding: 0; min-height: 250px; border-radius: 24px; } .galaxy-stage { inset: 5%; } .orbit-core { width: 60px !important; height: 60px !important; } .galaxy-container.p39 .orbit-core { width: 50px !important; height: 50px !important; } }
  @media (max-width: 576px) { .planet-node { width: 24px !important; height: 24px !important; } .galaxy-container.p39 .planet-node { width: 18px !important; height: 18px !important; } .node-number { font-size: 10px !important; } .orbit-core { width: 50px !important; height: 50px !important; } .galaxy-container.p39 .orbit-core { width: 42px !important; height: 42px !important; } }
`
