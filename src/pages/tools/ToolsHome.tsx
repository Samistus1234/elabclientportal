import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import ToolCard from '@/components/tools/ToolCard'
import { ToolsHeader } from '@/components/tools/ToolsLayout'
import { toolCategories, getToolsByCategory } from '@/lib/tools/toolsConfig'

const categoryCopy: Record<string, { title: string; sub: string }> = {
    pdf: { title: 'PDF', sub: 'Merge, split, compress and rotate PDF files.' },
    image: { title: 'Images', sub: 'Compress, convert and resize photos and scans.' },
    utility: { title: 'Everyday', sub: 'Small helpers for passwords and QR codes.' },
}

export default function ToolsHome() {
    return (
        <div className="tools-v2">
            <ToolsHeader />

            <main>
                <section className="tools-hero">
                    <div className="tools-wrap">
                        <p className="tools-eyebrow">Free tools</p>
                        <h1>Get your documents ready. <span>Free.</span></h1>
                        <p className="tools-lede">
                            Compress a scan, merge PDFs or convert a phone photo before you send it to eLab.
                            Everything runs in your browser, so your files never leave your device.
                        </p>
                        <ul className="tools-facts">
                            <li><Check size={18} aria-hidden />No sign-up</li>
                            <li><Check size={18} aria-hidden />Files stay on your device</li>
                            <li><Check size={18} aria-hidden />Works on your phone</li>
                        </ul>
                    </div>
                </section>

                {toolCategories.map((category) => {
                    const copy = categoryCopy[category.id] ?? { title: category.name, sub: category.description }
                    return (
                        <section key={category.id} className="tools-cat" aria-labelledby={`cat-${category.id}`}>
                            <div className="tools-wrap">
                                <h2 id={`cat-${category.id}`} className="tools-cat-h">{copy.title}</h2>
                                <p className="tools-cat-sub">{copy.sub}</p>
                                <div className="tools-grid">
                                    {getToolsByCategory(category.id).map((tool) => <ToolCard key={tool.id} tool={tool} />)}
                                </div>
                            </div>
                        </section>
                    )
                })}
            </main>

            <footer className="tools-footer">
                <div className="tools-wrap">
                    <span>© {new Date().getFullYear()} ELAB Solutions International</span>
                    <span><Link to="/">eLab home</Link> · <Link to="/login">Sign in to your portal</Link></span>
                </div>
            </footer>
        </div>
    )
}
