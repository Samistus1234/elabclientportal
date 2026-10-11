import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { nextStoryPosition, storySlides, type PortalStory, type StorySlide } from '@/lib/portalStories'

function StoryFrame({slide,expiresAt,paused,muted,onProgress,onNext}: {slide:StorySlide;expiresAt:string;paused:boolean;muted:boolean;onProgress:(v:number)=>void;onNext:()=>void}) {
 const [url,setUrl]=useState<string|null>(null)
 const [error,setError]=useState(false)
 const [attempt,setAttempt]=useState(0)
 const [ready,setReady]=useState(!slide.media_path)
 const video=useRef<HTMLVideoElement>(null)
 const elapsed=useRef(0)
 useEffect(()=>{
  let active=true;setError(false);setUrl(null);setReady(!slide.media_path)
  if(slide.media_path)supabase.storage.from('portal-updates').createSignedUrl(slide.media_path,Math.max(1,Math.min(900,Math.floor((Date.parse(expiresAt)-Date.now())/1000)))).then(({data,error:e})=>{
   if(!active)return;if(e||!data){setError(true);return}setUrl(data.signedUrl)
  }).catch(()=>active&&setError(true))
  return()=>{active=false}
 },[slide.media_path,expiresAt,attempt])
 useEffect(()=>{
  const player=video.current;if(!player)return
  if(paused)player.pause();else player.play().catch(()=>setError(true))
 },[paused,url])
 useEffect(()=>{
  if(slide.media_type==='video'||!ready||paused||error)return
  let frame=0;let previous=performance.now();let done=false
  const animate=(time:number)=>{
   elapsed.current+=time-previous;previous=time;onProgress(Math.min(elapsed.current/8000,1))
   if(elapsed.current>=8000){if(!done){done=true;onNext()}}else frame=requestAnimationFrame(animate)
  };frame=requestAnimationFrame(animate);return()=>cancelAnimationFrame(frame)
 },[ready,paused,error,slide.media_type,onProgress,onNext])
 if(error)return <div className="es-state" role="alert">Unable to play this update.<button onClick={()=>{setAttempt(v=>v+1);setError(false)}}>Try again</button></div>
 if(!slide.media_path)return <div className="es-text-slide"><span>FROM ELAB</span><p>{slide.caption}</p></div>
 if(!url)return <div className="es-state" role="status">Loading update…</div>
 return <>{slide.media_type==='video'?<video ref={video} className="es-media" src={url} autoPlay muted={muted} playsInline preload="metadata" onTimeUpdate={e=>{const v=e.currentTarget;if(v.duration)onProgress(v.currentTime/v.duration)}} onEnded={onNext} onError={()=>setError(true)}/>:<img className="es-media" src={url} alt="" onLoad={()=>setReady(true)} onError={()=>setError(true)}/>}<div className="es-caption">{slide.caption}</div></>
}
export default function StoryViewer({stories,initial,onClose,onViewed}: {stories:PortalStory[];initial:string;onClose:()=>void;onViewed:(id:string)=>void}) {
 const [position,setPosition]=useState({post:Math.max(0,stories.findIndex(p=>p.id===initial)),slide:0})
 const [paused,setPaused]=useState(false)
 const [muted,setMuted]=useState(true)
 const [progress,setProgress]=useState(0)
 const [restart,setRestart]=useState(0)
 const [hidden,setHidden]=useState(document.hidden)
 const dialog=useRef<HTMLDialogElement>(null)
 const story=stories[position.post];const slides=storySlides(story);const slide=slides[position.slide]
 const move=useCallback((direction:1|-1)=>{
  if(direction===1&&position.slide===storySlides(stories[position.post]).length-1)onViewed(stories[position.post].id)
  const next=nextStoryPosition(stories,position.post,position.slide,direction)
  if(next){setPosition(next);setProgress(0)}else if(direction===1)onClose()
 },[position,stories,onViewed,onClose])
 const advance=useCallback(()=>move(1),[move])
 useEffect(()=>{
  dialog.current?.showModal();const overflow=document.body.style.overflow;document.body.style.overflow='hidden'
  const hide=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',hide)
  return()=>{document.body.style.overflow=overflow;document.removeEventListener('visibilitychange',hide)}
 },[])
 return <dialog ref={dialog} className="es-dialog" aria-label="eLab status updates" onCancel={e=>{e.preventDefault();onClose()}} onKeyDown={e=>{
  if(e.key==='ArrowRight'){e.preventDefault();move(1)}if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}
 }}>
  <div className="es-stage">
   <div className="es-top"><div className="es-progress" aria-label={`Update ${position.slide+1} of ${slides.length}`}>{slides.map((_,i)=><button key={i} aria-label={`Go to update ${i+1}`} onClick={()=>{setPosition({...position,slide:i});setProgress(0);setRestart(v=>v+1)}}><span style={{width:`${i<position.slide?100:i===position.slide?progress*100:0}%`}}/></button>)}</div>
   <div className="es-toolbar"><div className="es-avatar">e</div><div className="es-heading"><strong>eLab Updates</strong><small>{story.title} · {position.slide+1}/{slides.length}</small></div><button aria-label={paused?'Play updates':'Pause updates'} onClick={()=>setPaused(v=>!v)}>{paused?<Play size={20}/>:<Pause size={20}/>}</button>{slide.media_type==='video'&&<button aria-label={muted?'Turn sound on':'Mute video'} onClick={()=>setMuted(v=>!v)}>{muted?<VolumeX size={20}/>:<Volume2 size={20}/>}</button>}<button aria-label="Close updates" onClick={onClose}><X size={24}/></button></div></div>
   <StoryFrame key={`${story.id}-${position.slide}-${restart}`} slide={slide} expiresAt={story.expires_at} paused={paused||hidden} muted={muted} onProgress={setProgress} onNext={advance}/>
   <button className="es-tap es-tap-left" aria-label="Previous update" disabled={position.post===0&&position.slide===0} onClick={()=>move(-1)}><ChevronLeft/></button>
   <button className="es-tap es-tap-right" aria-label="Next update" onClick={()=>move(1)}><ChevronRight/></button>
   <div className="es-footer">Tap left or right to browse · Available until {new Date(story.expires_at).toLocaleString()}</div>
  </div>
 </dialog>
}
