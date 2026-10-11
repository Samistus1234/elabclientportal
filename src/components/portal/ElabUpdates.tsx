import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Radio, Play } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useCallback } from 'react'
import { storySlides, type PortalStory } from '@/lib/portalStories'
import StoryViewer from './StoryViewer'
import './elab-updates.css'

export default function ElabUpdates({ compact=false }: { compact?: boolean }) {
 const [active,setActive]=useState<{initial:string;stories:PortalStory[]}|null>(null)
 const [seen,setSeen]=useState<string[]>([])
 const close=useCallback(()=>setActive(null),[])
 const viewed=useCallback((id:string)=>setSeen(current=>current.includes(id)?current:[...current,id]),[])
 const [posts,setPosts]=useState<PortalStory[]>([])
 const [loading,setLoading]=useState(true)
 const [error,setError]=useState(false)
 const [attempt,setAttempt]=useState(0)
 const [now,setNow]=useState(Date.now())
 useEffect(()=>{
  let alive=true; let running=false
  const load=async()=>{
   if(running)return;running=true
   try{
    const {data,error:e}=await supabase.from('portal_status_updates').select('id,title,body,starts_at,expires_at,media_path,media_type,slides').eq('status','published').order('starts_at',{ascending:false})
    if(alive){if(e){setError(true);setPosts([])}else{setPosts(data||[]);setError(false)}setLoading(false)}
   }catch{if(alive){setError(true);setPosts([]);setLoading(false)}}finally{running=false}
  }
  void load()
  const poll=setInterval(load,30000)
  const tick=setInterval(()=>setNow(Date.now()),1000)
  const focus=()=>{setNow(Date.now());void load()}
  window.addEventListener('focus',focus)
  const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{setPosts([]);setActive(null);setSeen([]);void load()})
  return()=>{alive=false;clearInterval(poll);clearInterval(tick);window.removeEventListener('focus',focus);subscription.unsubscribe()}
 },[attempt])
 useEffect(()=>{if(active&&!active.stories.every(p=>posts.some(v=>v.id===p.id)&&Date.parse(p.expires_at)>now))setActive(null)},[active,posts,now])
 const visible=posts.filter(p=>Date.parse(p.starts_at)<=now&&Date.parse(p.expires_at)>now)
 return <section className={`eu ${compact?'eu-compact':''}`} aria-label="Updates from eLab">
  <header className="eu-header"><div><h2><Radio size={20} aria-hidden />eLab Status</h2><p>Tap a circle to watch the latest from our team.</p></div>{compact&&<Link to="/updates">View all</Link>}</header>
  {loading?<p className="eu-empty" role="status">Loading updates…</p>:error?<p className="eu-empty" role="alert">We couldn’t load updates. <button onClick={()=>setAttempt(v=>v+1)}>Try again</button></p>:!visible.length?<p className="eu-empty">No updates right now. Check back for news from eLab.</p>:<div className="es-strip">{visible.map((p,index)=><button key={p.id} className={`es-story ${seen.includes(p.id)?'es-seen':''}`} onClick={()=>setActive({initial:p.id,stories:visible})} aria-label={`Watch ${p.title}, ${storySlides(p).length} ${storySlides(p).length===1?'update':'updates'}`}><span className="es-ring"><span className={`es-cover es-cover-${index%3}`} aria-hidden>{storySlides(p).some(s=>s.media_type==='video')?<Play size={26} fill="currentColor"/>:<Radio size={28}/>}</span></span><strong>{p.title}</strong><small>{storySlides(p).length} {storySlides(p).length===1?'update':'updates'}</small></button>)}</div>}
  {active&&<StoryViewer stories={active.stories} initial={active.initial} onClose={close} onViewed={viewed}/>}
 </section>
}
