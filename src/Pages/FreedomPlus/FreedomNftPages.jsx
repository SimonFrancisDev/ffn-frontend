import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, Check, CircleCheckBig, Download, LockKeyhole, ReceiptText, ShieldCheck, Trophy, X } from 'lucide-react'
import { NFT_TIERS } from '../../Services/freedomPlus'
import { qualificationPreview, formatQualificationAmount } from '../../utils/nftQualification.js'
import { nftCycleStatusCopy } from './FreedomNftCycleStatus.js'

const officialNftMedia=(src)=>({dark:src,light:src,mobileDark:src,mobileLight:src})

export const NFT_HERO_MEDIA=officialNftMedia('/images/freedom-nft/official-cards/general-nft.png')
export const NFT_CARD_MEDIA=NFT_HERO_MEDIA
export const TIER_META={1:{tone:'foundation'},2:{tone:'intermediate'},3:{tone:'advance'}}
export const TIER_MEDIA={
  1:officialNftMedia('/images/freedom-nft/official-cards/foundation-tier.png'),
  2:officialNftMedia('/images/freedom-nft/official-cards/intermediate-tier.png'),
  3:officialNftMedia('/images/freedom-nft/official-cards/advance-tier.png'),
}

const cycleDate=(value)=>value?new Date(value).toLocaleString(undefined,{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC',timeZoneName:'short'}):'Awaiting schedule'

export function FreedomNftThemeImage({media,alt,className=''}){return <div className={'fn-theme-media '+className}><picture className="fn-theme-media--dark"><source media="(max-width: 640px)" srcSet={media.mobileDark}/><img src={media.dark} alt={alt}/></picture><picture className="fn-theme-media--light"><source media="(max-width: 640px)" srcSet={media.mobileLight}/><img src={media.light} alt={alt}/></picture></div>}

export function FreedomNftTierArt({tier,alt}){return <FreedomNftThemeImage media={TIER_MEDIA[tier]||TIER_MEDIA[1]} alt={alt} className="fn-tier-art"/>}

export function FreedomNftMembership({membership,membershipVerified,rewardCycleStatus,actionsReady,balances={},readIssues=[],formatToken,nftForm,setNftForm,unlockForm,setUnlockForm,busy,submitMembership,unlockQualification,restoreEligibility}){
 const current=NFT_TIERS.find(x=>x.tier===membership.tier)
 const cycleStatus=nftCycleStatusCopy(membership,membershipVerified,rewardCycleStatus)
 const [unlockAccepted,setUnlockAccepted]=useState(false)
 const unlockPreview=useMemo(()=>qualificationPreview({
  lockedFGT:membership.lockedFGT,lockedFPT:membership.lockedFPT,
  fgt:unlockForm.fgt,fpt:unlockForm.fpt,threshold:current?.threshold||0,
 }),[current?.threshold,membership.lockedFGT,membership.lockedFPT,unlockForm.fgt,unlockForm.fpt])
 const balance=(key,label)=>balances[key]==null?'Temporarily unavailable':balances[key]+(readIssues.includes(label)?' (last loaded)':'')
 const updateUnlock=(token,value)=>{setUnlockAccepted(false);setUnlockForm(x=>({...x,[token]:value}))}
 return <div className="fn-page">
  <section className="fn-page-hero"><FreedomNftThemeImage media={NFT_CARD_MEDIA} alt="Freedom NFT membership tiers"/><div className="fn-page-hero__shade"/><div className="fn-page-hero__copy"><span>Token-backed membership</span><h1>Build your Freedom NFT status</h1><p>Lock the exact qualifying balance for one active tier. Your tokens remain yours while they support membership.</p><div className="fn-page-hero__facts"><b>{membershipVerified?(current?.name||'No active NFT'):'Status unavailable'}</b><em className={cycleStatus.tone==='eligible'?'eligible':''}>{cycleStatus.title}</em></div></div></section>
  <section className="fn-surface fn-membership-status"><div className="fn-membership-status__mark"><ShieldCheck/><Check/></div><div><span>Current Freedom NFT</span><h2>{membershipVerified?(current?.name||'Choose your membership'):'Status unavailable'}</h2><p>{!membershipVerified?'Refresh to verify the locked token split.':membership.tier?formatToken(membership.lockedFGT)+' FGT + '+formatToken(membership.lockedFPT)+' FPT = '+formatToken(BigInt(membership.lockedFGT||0)+BigInt(membership.lockedFPT||0))+' qualifying tokens':'Select a tier and commit its exact qualifying token total.'}</p></div><strong className={membershipVerified&&membership.rewardEligible?'eligible':''}>{!membershipVerified?'Verification pending':!membership.tier?'No NFT minted':membership.rewardEligible?'Active and reward eligible':'NFT owned, rewards inactive'}</strong></section>
  <section className={'fn-cycle-status '+cycleStatus.tone}><CalendarClock/><div><span>30-day reward cycle</span><h2>{cycleStatus.title}</h2><p>{cycleStatus.detail}</p></div></section>
  <section className="fn-section"><header><span>Membership stages</span><h2>Select one qualifying tier</h2><p>FGT and FPT may be combined. Only available, uncommitted balances can be locked.</p></header><div className="fn-tier-selector">{NFT_TIERS.map(item=><button type="button" className={(Number(nftForm.tier)===item.tier?'selected ':'')+'fn-tier-card--'+TIER_META[item.tier].tone} key={item.tier} onClick={()=>setNftForm({tier:item.tier,fgt:'0',fpt:String(item.threshold)})}><FreedomNftTierArt tier={item.tier} alt={item.name+' Freedom NFT tier'}/><span>Tier {item.tier}</span><h3>{item.name}</h3><strong>{item.threshold.toLocaleString()} tokens</strong><small>{item.poolShare}% cycle allocation</small>{membershipVerified&&membership.tier===item.tier&&<em><ShieldCheck/> Your NFT</em>}</button>)}</div></section>
  <section className="fn-surface fn-tool"><div><span>Qualifying commitment</span><h2>{membership.tier?'Update membership':'Mint membership'}</h2><p>{membershipVerified?'Your accumulated FGT and FPT determine the membership tiers you can qualify for.':'Membership actions are paused until the live membership state is verified.'}</p></div><div className="fn-form"><label>FGT commitment<small>Accumulated FGT: {balance('fgtTotal','FGT total')}</small><input type="number" min="0" value={nftForm.fgt} onChange={e=>setNftForm(x=>({...x,fgt:e.target.value}))}/></label><label>FPT commitment<small>Accumulated FPT: {balance('fptTotal','FPT total')}</small><input type="number" min="0" value={nftForm.fpt} onChange={e=>setNftForm(x=>({...x,fpt:e.target.value}))}/></label><button type="button" onClick={submitMembership} disabled={Boolean(busy)||!actionsReady}><LockKeyhole/>{busy==='membership'?'Processing...':membership.tier?'Update membership':'Mint membership'}</button></div></section>
  {membership.tier>0&&<section className="fn-surface fn-tool fn-qualification-tool"><div><span>Qualification controls</span><h2>{membership.rewardEligible?'Unlock qualifying tokens':'Restore reward eligibility'}</h2><p>{membership.rewardEligible?'Review the remaining qualification and reward status before signing.':'Restore the exact missing qualifying amount.'}</p></div><div className="fn-form"><label>FGT amount<input type="number" min="0" value={unlockForm.fgt} onChange={e=>updateUnlock('fgt',e.target.value)}/></label><label>FPT amount<input type="number" min="0" value={unlockForm.fpt} onChange={e=>updateUnlock('fpt',e.target.value)}/></label>{membership.rewardEligible&&unlockPreview.requestedTotal>0&&<div className={'fn-unlock-review '+(unlockPreview.valid&&unlockPreview.eligible?'safe':'warning')}><AlertTriangle/><div><strong>After this unlock</strong><dl><div><dt>FGT remaining</dt><dd>{formatQualificationAmount(unlockPreview.remainingFgt)}</dd></div><div><dt>FPT remaining</dt><dd>{formatQualificationAmount(unlockPreview.remainingFpt)}</dd></div><div><dt>Qualifying total</dt><dd>{formatQualificationAmount(unlockPreview.remainingTotal)} / {formatQualificationAmount(unlockPreview.threshold)}</dd></div><div><dt>Reward status</dt><dd>{unlockPreview.valid?(unlockPreview.eligible?'Remains eligible':'Becomes inactive'):'Invalid amount'}</dd></div></dl>{unlockPreview.valid&&!unlockPreview.eligible&&<p>Your NFT will remain in this wallet, but it will stop qualifying for rewards until the missing tokens are restored.</p>}<label><input type="checkbox" checked={unlockAccepted} onChange={e=>setUnlockAccepted(e.target.checked)}/><span>I understand the remaining balance and reward status.</span></label></div></div>}<button type="button" disabled={Boolean(busy)||!actionsReady||(membership.rewardEligible&&(!unlockPreview.valid||unlockPreview.requestedTotal<=0||!unlockAccepted))} onClick={()=>{setUnlockAccepted(false);(membership.rewardEligible?unlockQualification:restoreEligibility)()}}>{busy==='unlock'||busy==='restore'?'Processing...':membership.rewardEligible?'Continue to wallet':'Restore eligibility'}</button></div></section>}
 </div>
}

function downloadNftReceipt({period,wallet,ffnId,formatToken}){
 const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=800
 const ctx=canvas.getContext('2d');if(!ctx)return
 const tier=NFT_TIERS.find(item=>item.tier===Number(period.proof?.tier))
 ctx.fillStyle='#07131b';ctx.fillRect(0,0,1400,800)
 ctx.fillStyle='#0d2530';ctx.fillRect(48,48,1304,704)
 ctx.fillStyle='#20c997';ctx.fillRect(48,48,14,704)
 ctx.fillStyle='#ffffff';ctx.font='700 34px Arial';ctx.fillText('FIN FREEDOM NETWORK',100,125)
 ctx.fillStyle='#76e6c3';ctx.font='700 22px Arial';ctx.fillText('FREEDOM NFT REWARD RECEIPT',100,170)
 ctx.fillStyle='#ffffff';ctx.font='700 76px Arial';ctx.fillText(`${formatToken(period.reward)} USDT`,100,300)
 ctx.fillStyle='#9fb5bf';ctx.font='28px Arial';ctx.fillText(`${tier?.name||'Freedom NFT'} / Cycle ${period.cycleId||period.periodId}`,100,355)
 const rows=[['FFN ID',ffnId||'Not available'],['Wallet',wallet||'Not available'],['Distribution',cycleDate(period.distributionAt)],['Status','Paid directly to wallet']]
 rows.forEach(([label,value],index)=>{const y=455+index*66;ctx.fillStyle='#76e6c3';ctx.font='700 20px Arial';ctx.fillText(label.toUpperCase(),100,y);ctx.fillStyle='#ffffff';ctx.font=value.length>44?'22px monospace':'26px Arial';ctx.fillText(value,330,y)})
 ctx.fillStyle='#9fb5bf';ctx.font='20px Arial';ctx.fillText('On-chain reward record / Fin Freedom NFT Program',100,715)
 const link=document.createElement('a');link.download=`freedom-nft-cycle-${period.cycleId||period.periodId}-${ffnId||'receipt'}.png`;link.href=canvas.toDataURL('image/png');link.click()
}

function FreedomNftReceiptModal({period,wallet,ffnId,formatToken,onClose}){
 if(!period)return null
 const tier=NFT_TIERS.find(item=>item.tier===Number(period.proof?.tier))
 return <div className="fn-success-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><section className="fn-receipt-modal" role="dialog" aria-modal="true" aria-labelledby="fn-receipt-title"><button type="button" className="fn-success-modal__close" onClick={onClose} aria-label="Close"><X/></button><div className="fn-receipt-card"><div className="fn-receipt-card__brand"><ShieldCheck/><span>Fin Freedom Network</span></div><small>Freedom NFT reward receipt</small><h2 id="fn-receipt-title">{formatToken(period.reward)} USDT</h2><p>{tier?.name||'Freedom NFT'} / Cycle {period.cycleId||period.periodId}</p><dl><div><dt>FFN ID</dt><dd>{ffnId||'Not available'}</dd></div><div><dt>Wallet</dt><dd>{wallet}</dd></div><div><dt>Distribution</dt><dd>{cycleDate(period.distributionAt)}</dd></div><div><dt>Status</dt><dd><Check/> Paid directly to wallet</dd></div></dl></div><button type="button" className="fn-receipt-download" onClick={()=>downloadNftReceipt({period,wallet,ffnId,formatToken})}><Download/>Download receipt</button></section></div>
}

export function FreedomNftRewards({membership,membershipVerified,rewardCycleStatus,rewardPeriodsVerified,rewardPeriods,formatToken,wallet,ffnId}){
 const current=NFT_TIERS.find(x=>x.tier===membership.tier)
 const cycleStatus=nftCycleStatusCopy(membership,membershipVerified,rewardCycleStatus)
 const [receipt,setReceipt]=useState(null)
 return <div className="fn-page">
  <section className="fn-page-hero"><FreedomNftThemeImage media={NFT_CARD_MEDIA} alt="Freedom NFT tier rewards"/><div className="fn-page-hero__shade"/><div className="fn-page-hero__copy"><span>30-day distribution</span><h1>Freedom NFT rewards</h1><p>Each cycle uses one immutable cutoff snapshot. Eligible members participate through their active tier.</p><div className="fn-page-hero__facts"><b>{membershipVerified?(current?.name||'No active tier'):'Status unavailable'}</b><em className={cycleStatus.tone==='eligible'?'eligible':''}>{cycleStatus.title}</em></div></div></section>
  <section className={'fn-cycle-status '+cycleStatus.tone}><CalendarClock/><div><span>Upcoming distribution</span><h2>{cycleStatus.title}</h2><p>{cycleStatus.detail}</p></div></section>
  <section className="fn-section"><header><span>Pool structure</span><h2>Transparent allocation by membership tier</h2></header><div className="fn-allocation">{NFT_TIERS.map(t=><article className={'fn-tier-card--'+TIER_META[t.tier].tone} key={t.tier}><FreedomNftTierArt tier={t.tier} alt={t.name+' Freedom NFT tier'}/><div><span>{t.name}</span><strong>{t.poolShare}%</strong><small>Tier {t.tier} cycle allocation</small></div></article>)}</div></section>
  <section className="fn-section"><header><span>Reward history</span><h2>30-day cycle payments</h2><p>Eligibility is fixed 24 hours before each distribution. Empty-tier allocations remain in the NFT pool.</p></header><div className="fn-reward-periods">{!rewardPeriodsVerified?<div className="fn-empty-rewards" role="status"><Trophy/><h3>Reward history awaiting verification</h3><p>Refresh to verify cycle payments.</p></div>:rewardPeriods.length?rewardPeriods.map(p=><article key={p.periodId}><div className="fn-reward-periods__icon"><Trophy/></div><div><span>Cycle {p.cycleId||p.periodId} / {cycleDate(p.distributionAt)}</span><strong>{p.readError?'Reward details temporarily unavailable':p.proof?.eligible?formatToken(p.reward)+' USDT':p.proof?.snapshotAvailable===false?'Proof archive unavailable':'Not eligible at cutoff'}</strong><small>{p.readError?'Retry to verify this cycle':p.status==='published'?'Published on-chain':'Eligibility snapshot fixed'}</small></div>{!p.readError&&p.proof?.eligible&&p.status==='published'&&<div className="fn-reward-periods__actions"><span role="status">{p.claimed?<><Check/> Paid</>:<>Payment queued</>}</span>{p.claimed&&<button type="button" onClick={()=>setReceipt(p)}><ReceiptText/>Generate receipt</button>}</div>}</article>):<div className="fn-empty-rewards"><Trophy/><h3>No reward cycle is available yet</h3><p>Published 30-day cycles will appear here.</p></div>}</div></section>
  <FreedomNftReceiptModal period={receipt} wallet={wallet} ffnId={ffnId} formatToken={formatToken} onClose={()=>setReceipt(null)}/>
 </div>
}

export function FreedomNftSuccessModal({success,onClose}){
 if(!success)return null
 return <div className="fn-success-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="fn-success-modal" role="dialog" aria-modal="true" aria-labelledby="fn-success-title"><button type="button" className="fn-success-modal__close" onClick={onClose} aria-label="Close"><X/></button><div className="fn-success-modal__visual"><CircleCheckBig/></div><span>Confirmed on-chain</span><h2 id="fn-success-title">{success.title}</h2><p>{success.message}</p>{success.hash&&<small>{success.hash.slice(0,10)}...{success.hash.slice(-8)}</small>}<button type="button" className="fn-success-modal__done" onClick={onClose}>Done</button></section></div>
}
