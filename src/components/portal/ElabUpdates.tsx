import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Radio } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import './elab-updates.css'

type Update = { id: string; title: string; body: string; starts_at: string; expires_at: string; media_path: string | null; media_type: 'image' | 'video' | null }
function Media({ post }: { post: Update }) {
 const [url, setUrl] = useState<string | null>(null)
 const [failed, setFailed] = useState(false)
 const [attempt, setAttempt] = useState(0)
 useEffect(() => {
  let alive = true; let objectUrl: string | undefined
  setFailed(false); setUrl(null)
  if (post.media_path) supabase.storage.from('portal-updates').download(post.media_path).then(({data,error}) => {
   if (!alive) return
   if (error || !data) { setFailed(true); return }
   objectUrl = URL.createObjectURL(data); setUrl(objectUrl)
  }).catch(() => alive && setFailed(true))
  return () => { alive = false; if(objectUrl) URL.revokeObjectURL(objectUrl) }
 }, [post.media_path, attempt])
 if(failed) return <p className="eu-media-error">Attachment unavailable. <button onClick={() => setAttempt(v=>v+1)}>Try again</button></p>
 if(!url) return <p className="eu-media-error">Loading attachment…</p>
 return post.media_type==='video' ? <video className="eu-media" src={url} controls preload="metadata" /> : <img className="eu-media" src={url} alt={post.title} loading="lazy" />
}
export default function ElabUpdates({ compact=false }: { compact?: boolean }) {
 const [posts,setPosts]=useState<Update[]>([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState(false)
 const [attempt,setAttempt]=useState(0)
 const [now,setNow]=useState(Date.now())
 useEffect(()=>{
  let alive=true; let running=false
  const load=async()=>{
   if(running)return;running=true
   try{
    const {data,error:e}=await supabase.from('portal_status_updates').select('id,title,body,starts_at,expires_at,media_path,media_type').eq('status','published').order('starts_at',{ascending:false})
    if(alive){if(e){setError(true);setPosts([])}else{setPosts(data||[]);setError(false)}setLoading(false)}
   }catch{if(alive){setError(true);setPosts([]);setLoading(false)}}finally{running=false}
  }
  void load()
  const poll=setInterval(load,30000)
  const tick=setInterval(()=>setNow(Date.now()),1000)
  const focus=()=>{setNow(Date.now());void load()}
  window.addEventListener('focus',focus)
  const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{setPosts([]);void load()})
  return()=>{alive=false;clearInterval(poll);clearInterval(tick);window.removeEventListener('focus',focus);subscription.unsubscribe()}
 },[attempt])
 const visible=posts.filter(p=>Date.parse(p.starts_at)<=now&&Date.parse(p.expires_at)>now)
 return <section className={`eu ${compact?'eu-compact':''}`} aria-label="Updates from eLab">
  <header className="eu-header"><div><h2><Radio size={20} aria-hidden />From eLab</h2><p>News, offers and announcements from our team.</p></div>{compact&&<Link to="/updates">View all</Link>}</header>
  {loading?<p className="eu-empty" role="status">Loading updates…</p>:error?<p className="eu-empty" role="alert">We couldn’t load updates. <button onClick={()=>setAttempt(v=>v+1)}>Try again</button></p>:!visible.length?<p className="eu-empty">No updates right now. Check back for news from eLab.</p>:<div className="eu-grid">{(compact?visible.slice(0,3):visible).map(p=><article key={p.id} className="eu-post">{p.media_path&&<Media post={p}/>}<div className="eu-content"><span className="eu-brand">ELAB UPDATES</span><h3>{p.title}</h3><p className="eu-body">{p.body}</p><small>Available until <time dateTime={p.expires_at}>{new Date(p.expires_at).toLocaleString()}</time></small></div></article>)}</div>}
 </section>
}
