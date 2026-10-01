import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock, ExternalLink, MessageCircle, Play, RefreshCw, Send, ThumbsUp, Trophy, Upload, Users, XCircle } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useWallet } from '../../hooks/useWallet'
import { useToast } from '../../components/feedback'
import { fetchTasks, joinTask, submitTask, fetchTaskComments, addTaskComment, reactToTaskItem, fetchTaskRewards, uploadTaskProof, subscribeTaskEvents } from '../../Services/tasksApi'
import './TasksPage.css'

const EMPTY_PROOF = { proofText: '', proofUrl: '' }
const statusLabel = (task) => task.submission?.status || task.participation?.status || task.state
const dateLabel = (value) => value ? new Date(value).toLocaleString() : 'Open schedule'
const shortWallet = (value) => value ? `${value.slice(0, 6)}...${value.slice(-4)}` : ''

export default function TasksPage() {
  const { account, isConnected, connect } = useWallet()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState([])
  const [rewards, setRewards] = useState([])
  const [selectedId, setSelectedId] = useState(searchParams.get('task') || '')
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState('tasks')
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [proof, setProof] = useState(EMPTY_PROOF)
  const [proofFile, setProofFile] = useState(null)
  const [busy, setBusy] = useState('')

  const load = useCallback(async (interactive = false) => {
    if (!account) return
    setLoading(true)
    try {
      const [taskRows, rewardRows] = await Promise.all([fetchTasks(account, { interactive }), fetchTaskRewards(account, { interactive })])
      setTasks(taskRows || []); setRewards(rewardRows || []); setAuthorized(true)
      if (!selectedId && taskRows?.[0]) setSelectedId(String(taskRows[0]._id))
    } catch (error) { if (interactive) toast.danger(error.message); setAuthorized(false) }
    finally { setLoading(false) }
  }, [account, selectedId, toast])

  useEffect(() => { setAuthorized(false); setTasks([]); setRewards([]) }, [account])
  useEffect(() => { if (!authorized || !account) return undefined; const controller = new AbortController(); subscribeTaskEvents(account, () => load(false), controller.signal).catch(() => {}); return () => controller.abort() }, [account, authorized, load])
  useEffect(() => { if (!authorized || !account || !selectedId) return; fetchTaskComments(account, selectedId, { interactive: false }).then(setComments).catch(() => setComments([])) }, [account, authorized, selectedId, tasks])

  const selected = useMemo(() => tasks.find((task) => String(task._id) === String(selectedId)) || null, [tasks, selectedId])
  const visible = useMemo(() => tasks.filter((task) => filter === 'all' || statusLabel(task) === filter), [tasks, filter])

  const choose = (id) => { setSelectedId(String(id)); setSearchParams({ task: String(id) }); setReplyTo(null) }
  const action = async (key, fn, success) => { setBusy(key); try { await fn(); toast.success(success); await load(false) } catch (error) { toast.danger(error.message) } finally { setBusy('') } }
  const handleJoin = () => action('join', () => joinTask(account, selected._id), 'Task joined.')
  const handleReact = (targetType, targetId = '') => action(`react:${targetType}:${targetId}`, () => reactToTaskItem(account, selected._id, { targetType, targetId, reaction: 'applaud' }), 'Reaction updated.')
  const handleComment = async () => {
    if (!commentText.trim()) return
    await action('comment', () => addTaskComment(account, selected._id, { body: commentText, parentCommentId: replyTo?._id || '' }), 'Comment posted.')
    setCommentText(''); setReplyTo(null); setComments(await fetchTaskComments(account, selected._id, { interactive: false }))
  }
  const handleSubmit = async () => {
    await action('proof', async () => {
      let proofImageId = selected.submission?.proofImageId || ''
      if (proofFile) proofImageId = (await uploadTaskProof(account, proofFile)).id
      await submitTask(account, selected._id, { ...proof, proofImageId })
    }, 'Proof submitted for review.')
    setProof(EMPTY_PROOF); setProofFile(null)
  }

  if (!isConnected) return <main className="tasks-page tasks-page--gate"><div><Trophy size={28}/><h1>Community Tasks</h1><p>Connect your registered wallet to participate.</p><button onClick={connect}>Connect wallet</button></div></main>
  if (!authorized) return <main className="tasks-page tasks-page--gate"><div><Trophy size={28}/><h1>Community Tasks</h1><p>{loading ? 'Checking registration...' : 'Authorize your wallet to open the live task workspace.'}</p><button disabled={loading} onClick={() => load(true)}>{loading ? <RefreshCw className="spin" size={17}/> : <Play size={17}/>}Authorize Tasks</button></div></main>

  return (
    <main className="tasks-page">
      <header className="tasks-page__header"><div><span>Community engagement</span><h1>Live Tasks</h1><p>Complete verified actions, share proof, and take part in the discussion.</p></div><div className="tasks-page__summary"><strong>{tasks.filter(t=>t.state==='active').length}</strong><span>Active</span><strong>{rewards.filter(r=>r.status==='earned'||r.status==='issued').length}</strong><span>Earned</span></div></header>
      <nav className="tasks-page__tabs"><button className={view==='tasks'?'active':''} onClick={()=>setView('tasks')}>Tasks</button><button className={view==='rewards'?'active':''} onClick={()=>setView('rewards')}>Rewards</button></nav>
      {view === 'rewards' ? <section className="tasks-rewards">{rewards.length ? rewards.map(reward=><article key={reward._id}><Trophy size={20}/><div><h2>{reward.taskId?.title || 'Task reward'}</h2><p>{reward.rewardLabel || 'Recognition reward'}</p></div><span className={`state state--${reward.status}`}>{reward.status}</span></article>) : <p className="tasks-empty">No task rewards recorded yet.</p>}</section> : (
        <div className="tasks-workspace">
          <aside className="tasks-feed"><div className="tasks-filter"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>All</button><button className={filter==='active'?'active':''} onClick={()=>setFilter('active')}>Active</button><button className={filter==='submitted'?'active':''} onClick={()=>setFilter('submitted')}>Submitted</button><button className={filter==='approved'?'active':''} onClick={()=>setFilter('approved')}>Approved</button></div>{visible.map(task=><button key={task._id} className={`task-feed-card ${selectedId===String(task._id)?'active':''}`} onClick={()=>choose(task._id)}>{task.imageUrl?<img src={task.imageUrl} alt=""/>:null}<span className={`state state--${statusLabel(task)}`}>{statusLabel(task)}</span><h2>{task.title}</h2><p>{task.summary}</p><footer><span><Users size={14}/>{task.participantCount||0}</span><span><MessageCircle size={14}/>{task.commentCount||0}</span><span><ThumbsUp size={14}/>{task.reactionCount||0}</span></footer></button>)}{!visible.length?<p className="tasks-empty">No tasks match this view.</p>:null}</aside>
          <section className="task-detail">{selected ? <>
            {selected.imageUrl?<img className="task-detail__image" src={selected.imageUrl} alt=""/>:null}
            <div className="task-detail__heading"><div><span className={`state state--${statusLabel(selected)}`}>{statusLabel(selected)}</span><h2>{selected.title}</h2><p>{selected.summary}</p></div><button className={selected.myReaction?'is-active':''} onClick={()=>handleReact('task')}><ThumbsUp size={17}/>Applaud</button></div>
            <div className="task-detail__meta"><span><Clock size={15}/>{dateLabel(selected.endsAt)}</span>{selected.rewardLabel?<span><Trophy size={15}/>{selected.rewardLabel}</span>:null}</div>
            <div className="task-detail__instructions"><h3>Task instructions</h3><p>{selected.instructions}</p>{selected.actionUrl?<a href={selected.actionUrl} target="_blank" rel="noreferrer">Open task link <ExternalLink size={14}/></a>:null}{selected.proofRequirements?<><h3>Proof requirements</h3><p>{selected.proofRequirements}</p></>:null}</div>
            {!selected.participation && selected.state==='active'?<button className="task-primary" disabled={busy==='join'} onClick={handleJoin}>Join task</button>:null}
            {selected.participation && selected.state==='active' && selected.submission?.status!=='approved'?<section className="task-proof"><h3>{selected.submission?.status==='rejected'?'Submit revised proof':'Submit proof'}</h3>{selected.submission?.reviewNote?<p className="task-review-note"><XCircle size={15}/>{selected.submission.reviewNote}</p>:null}<textarea placeholder="Describe what you completed" value={proof.proofText} onChange={e=>setProof({...proof,proofText:e.target.value})}/><input type="url" placeholder="https://proof-link.example" value={proof.proofUrl} onChange={e=>setProof({...proof,proofUrl:e.target.value})}/><label><Upload size={16}/>{proofFile?.name||'Add proof image'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setProofFile(e.target.files?.[0]||null)}/></label><button className="task-primary" disabled={busy==='proof'} onClick={handleSubmit}>Send for review</button></section>:null}
            {selected.submission?.status==='approved'?<p className="task-approved"><CheckCircle2 size={18}/>Proof approved. Reward eligibility recorded.</p>:null}
            <section className="task-discussion"><header><h3>Discussion</h3><span>{comments.reduce((n,c)=>n+1+(c.replies?.length||0),0)} messages</span></header>{replyTo?<p className="replying">Replying to {shortWallet(replyTo.walletAddress)} <button onClick={()=>setReplyTo(null)}>Cancel</button></p>:null}<div className="task-comment-box"><textarea placeholder={replyTo?'Write a reply':'Join the discussion'} value={commentText} onChange={e=>setCommentText(e.target.value)}/><button disabled={!commentText.trim()||busy==='comment'} onClick={handleComment}><Send size={16}/></button></div><div className="task-comments">{comments.map(comment=><article key={comment._id}><div><strong>{shortWallet(comment.walletAddress)}</strong><time>{new Date(comment.createdAt).toLocaleString()}</time></div><p>{comment.body}</p><footer><button onClick={()=>handleReact('comment',comment._id)}><ThumbsUp size={14}/>{comment.reactionCount||0}</button>{!comment.isRemoved?<button onClick={()=>setReplyTo(comment)}>Reply</button>:null}</footer>{comment.replies?.map(reply=><article className="task-reply" key={reply._id}><div><strong>{shortWallet(reply.walletAddress)}</strong><time>{new Date(reply.createdAt).toLocaleString()}</time></div><p>{reply.body}</p><button onClick={()=>handleReact('comment',reply._id)}><ThumbsUp size={13}/>{reply.reactionCount||0}</button></article>)}</article>)}{!comments.length?<p className="tasks-empty">No comments yet.</p>:null}</div></section>
          </> : <p className="tasks-empty">Select a task.</p>}</section>
        </div>
      )}
    </main>
  )
}
