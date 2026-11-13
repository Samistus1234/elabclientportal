import { useWalkthrough } from '@/contexts/WalkthroughContext';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, X, Menu, FileCheck2, BadgeCheck, CalendarDays, GraduationCap, Activity, MessageCircle, CheckCircle2, Plus } from 'lucide-react';
import '@/home-refinement.css';

const WHATSAPP_URL = 'https://wa.me/2348165634195';

const services = [
 { icon: FileCheck2, title: 'Credential verification', copy: 'DataFlow, primary source verification and document authentication.', href: '/support', more: 'Ask about this' },
 { icon: BadgeCheck, title: 'Professional licensing', copy: 'Applications to DHA, SCFHS, NHRA, DOH and other regulators.', href: '/support', more: 'Ask about this' },
 { icon: CalendarDays, title: 'Exam booking', copy: 'Scheduling and preparation support for your next professional exam.', href: '/support', more: 'Ask about this' },
 { icon: GraduationCap, title: 'Academic evaluation', copy: 'Transcript assessment and international credential recognition.', href: '/support', more: 'Ask about this' },
 { icon: Activity, title: 'Application tracking', copy: 'Your current step, documents received and what comes next, in one place.', href: '/dashboard', more: 'Sign in' },
 { icon: MessageCircle, title: 'Personal support', copy: 'Reach the team by WhatsApp, email or a scheduled call.', href: WHATSAPP_URL, more: 'Message us' },
] as const;

const steps = [
 ['Tell us your plan', 'Where you want to practise and what you need. We’ll explain the requirements.'],
 ['Activate your portal', 'Use the case reference in your welcome email to create your account.'],
 ['Share your documents', 'See what we already hold and add anything we ask for.'],
 ['Follow every step', 'Watch your application move, and message your case manager any time.'],
] as const;

const faq = [
 ['How do I get access to the portal?', 'Existing clients can activate their account using the case reference and email address in their ELAB welcome email. If you do not have a case reference, contact the team to get started.'],
 ['How long does verification take?', 'The current ELAB service guidance gives a typical range of two to four weeks. Timing varies by service and the responsiveness of source institutions. Ask your case manager about your application.'],
 ['Which documents will I need?', 'Requirements depend on the service and authority. They may include a passport, professional license, degree certificate and academic transcript. Check your case requirements before uploading anything.'],
 ['How can I track my application?', 'Sign in to view your application’s current stage, timeline and document information. The portal also provides access to support when you need clarification.'],
 ['What if I already sent my documents?', 'Check the documents on file for your application first. You do not need to upload a second copy unless the team asks you to provide one.'],
 ['What if my application is rejected?', 'Contact your case manager to discuss the reason and the next available steps. Options depend on the service and the relevant authority.'],
] as const;

export default function Homepage() {
 const { startTour } = useWalkthrough();
 function tour() {
  startTour({ id: 'homepage-overview', name: 'Using the ELAB portal', steps: [
   { id: 'account', target: '.client-access', title: 'Access your account', content: 'Sign in to an existing account or activate it using your welcome email reference.', placement: 'top' },
   { id: 'services', target: '#services', title: 'Find a service', content: 'Explore licensing, verification and exam services. Contact the team for help choosing.', placement: 'top' },
   { id: 'process', target: '#how-it-works', title: 'Follow your application', content: 'Your portal keeps the current stage, documents and case updates available after sign-in.', placement: 'top' },
   { id: 'help', target: '#questions', title: 'Get help', content: 'Read common questions or contact the team about your application.', placement: 'top' },
  ] });
 }

 const [menu, setMenu] = useState(false), [start, setStart] = useState(false);
 const dialog = useRef<HTMLDialogElement>(null);
 useEffect(() => { document.title = 'ELAB · Healthcare licensing & verification'; }, []);
 useEffect(() => { if (start) dialog.current?.showModal(); }, [start]);

 return <div className="public-home">
  <a className="home-skip" href="#home-main">Skip to content</a>

  <header className="home-header">
   <div className="home-wrap">
    <a className="home-brand" href="/" aria-label="eLab home"><img src="/elab-logo-blue.png" alt="eLab Solutions International" width="148" height="28" /></a>
    <nav aria-label="Homepage navigation" className={menu ? 'is-open' : ''}>
     <a href="#services" onClick={() => setMenu(false)}>Services</a>
     <a href="#how-it-works" onClick={() => setMenu(false)}>How it works</a>
     <a href="#questions" onClick={() => setMenu(false)}>Questions</a>
     <a href="/tools">Free tools</a>
    </nav>
    <div className="home-header-actions">
     <a href="/login" className="home-signin">Sign in</a>
     <button className="home-cta home-cta-sm" onClick={() => setStart(true)}>Get started</button>
     <button className="home-menu" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X size={22} /> : <Menu size={22} />}</button>
    </div>
   </div>
  </header>

  <main id="home-main">
   <section className="home-hero">
    <div className="home-wrap">
     <p className="home-eyebrow">For doctors, nurses and allied health professionals</p>
     <h1>Licensing and verification.<br /> <span>Handled with care.</span></h1>
     <p className="home-lede">We help healthcare professionals prepare their documents, apply for licensing and follow their application through every step.</p>
     <div className="home-hero-actions">
      <button className="home-cta" onClick={() => setStart(true)}>Get started</button>
      <a href="/login" className="home-more">Sign in to your portal ›</a>
     </div>
    </div>
   </section>

   <section className="home-portal" aria-labelledby="portal-h">
    <div className="home-wrap">
     <div className="client-access">
      <div className="home-portal-copy">
       <h2 id="portal-h">Always know where your application is.</h2>
       <p>Your portal shows each step, what we’ve received, and whether anything is needed from you. No chasing for updates.</p>
       <a href="/login" className="home-more">Sign in ›</a>
       <p className="home-first">First time? <a href="/register">Activate your account</a> with the case reference in your welcome email.</p>
      </div>
      {/* An illustration of the signed-in Home card, with sample text (no client data). */}
      <div className="home-preview" aria-hidden="true">
       <div className="home-preview-top">
        <div><span className="home-preview-label">Your latest application</span><span className="home-preview-title">DataFlow verification</span></div>
        <span className="home-preview-tag">Step 3 of 5</span>
       </div>
       <div className="home-preview-bars"><span className="on" /><span className="on" /><span className="on" /><span /><span /></div>
       <div className="home-preview-note"><CheckCircle2 size={22} color="#1D6B3A" />Nothing needed from you right now</div>
      </div>
     </div>
    </div>
   </section>

   <section className="home-section grey" id="services" aria-labelledby="svc-h">
    <div className="home-wrap">
     <h2 id="svc-h" className="home-h2">What we can help with.</h2>
     <p className="home-h2-sub">DataFlow · DHA · SCFHS · NHRA · DOH and more</p>
     <div className="home-service-grid">
      {services.map(({ icon: Icon, title, copy, href, more }) => (
       <a href={href} className="home-service" key={title} {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>
        <Icon size={32} strokeWidth={1.8} aria-hidden />
        <h3>{title}</h3>
        <p>{copy}</p>
        <span className="home-service-more">{more} ›</span>
       </a>
      ))}
     </div>
    </div>
   </section>

   <section className="home-section" id="how-it-works" aria-labelledby="how-h">
    <div className="home-wrap">
     <h2 id="how-h" className="home-h2">From first message to licence.</h2>
     <ol className="home-steps">
      {steps.map(([title, copy], i) => <li key={title}><span className="n" aria-hidden>{i + 1}</span><h3>{title}</h3><p>{copy}</p></li>)}
     </ol>
    </div>
   </section>

   <section className="home-section grey" id="questions" aria-labelledby="faq-h">
    <div className="home-wrap">
     <h2 id="faq-h" className="home-h2">Questions.</h2>
     <div className="home-faq">
      {faq.map(([q, a]) => <details key={q}><summary>{q}<Plus size={20} aria-hidden /></summary><p>{a}</p></details>)}
     </div>
     <p className="home-faq-more"><a href="/faq" className="home-more">See all questions ›</a></p>
    </div>
   </section>

   <section className="home-final">
    <div className="home-wrap">
     <h2>Not sure what you need?</h2>
     <p>Talk to the team before you start an application.</p>
     <a href={WHATSAPP_URL} className="home-cta" target="_blank" rel="noreferrer">Message us on WhatsApp</a>
    </div>
   </section>
  </main>

  <footer className="home-footer">
   <div className="home-wrap">
    <div className="home-footer-top">
     <div><h3>Explore</h3><a href="#services">Our services</a><a href="/dashboard">Client portal</a><a href="https://elabsolution.org/">ELAB & success stories</a><a href="/tools">Free tools</a></div>
     <div><h3>Support</h3><a href="/support">Help and support</a><a href="/faq">All questions</a><a href="/support/verification-fees">Verification fees</a><button className="home-tour-link" onClick={tour}>Portal tour</button></div>
     <div><h3>Partners</h3><a href="/recruiter/register">Recruiter registration</a><a href="/contact/register">Institution registration</a><a href="/referral/join">Referral programme</a></div>
     <div><h3>Contact</h3><a href="mailto:support@elabsolution.org">support@elabsolution.org</a><a href={WHATSAPP_URL}>WhatsApp</a><a href="tel:+2348165634195">+234 816 563 4195</a><a href="tel:+19294192327">+1 (929) 419-2327</a><a href="https://linkedin.com/company/elab-solutions-intl-llc/">LinkedIn</a><a href="https://x.com/elabsolution1">X / Twitter</a></div>
    </div>
    <div className="home-footer-bottom">
     <div>
      <div>© 2026 ELAB Solutions International.</div>
      <div>4, Addo Road, Suite 10, Stephen Taiwo Shopping Complex, Ajah, Lagos, Nigeria · 828 Lane Allen Road 219, Lexington, Kentucky, USA</div>
     </div>
     <nav aria-label="Legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/support/refund-policy">Refund policy</a><a href="/privacy#cookies">Cookie settings</a></nav>
    </div>
   </div>
  </footer>

  {start && <dialog ref={dialog} onCancel={() => setStart(false)} onClose={() => setStart(false)} onClick={(e) => { if (e.target === dialog.current) setStart(false); }} aria-labelledby="start-heading">
   <div className="dialog-heading"><h2 id="start-heading">How can we help?</h2><button className="icon-button" aria-label="Close" onClick={() => setStart(false)}><X size={20} /></button></div>
   <p className="home-start-intro">Are you starting an enquiry or activating an existing case?</p>
   <a className="home-start-option" href="/support"><div><strong>I’m new to ELAB</strong><span>Speak with the team about your service and requirements.</span></div><ArrowUpRight size={20} /></a>
   <a className="home-start-option" href="/register"><div><strong>I have a case reference</strong><span>Activate your account using your welcome email.</span></div><ArrowUpRight size={20} /></a>
   <p className="home-start-login">Already registered? <a href="/login">Sign in</a></p>
  </dialog>}
 </div>;
}
