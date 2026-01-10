import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import {
    ChevronDown,
    ArrowLeft,
    HelpCircle,
    FileCheck,
    Building2,
    GraduationCap,
    CreditCard,
    MessageCircle,
    FileText,
    CheckCircle,
    Mail,
    Globe
} from 'lucide-react'

interface FAQItem {
    question: string
    answer: string | string[]
}

interface FAQCategory {
    id: string
    title: string
    icon: React.ElementType
    color: string
    bgColor: string
    items: FAQItem[]
}

const faqCategories: FAQCategory[] = [
    {
        id: 'general',
        title: 'General Questions',
        icon: HelpCircle,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        items: [
            {
                question: 'What is ELAB Solutions International?',
                answer: 'ELAB Solutions International is a global healthcare consultancy and support organization that assists healthcare professionals with credential verification, professional licensing, exam preparation, exam booking, and international career pathways. We specialize in processes such as DataFlow verification, Mumaris Plus, CGFNS/CES, exam booking, and professional exam tutorials.'
            },
            {
                question: 'Who can use ELAB Solutions\' services?',
                answer: 'Our services are available to nurses, doctors, midwives, pharmacists, and allied health professionals seeking licensure, verification, or exam preparation for international practice, particularly in Saudi Arabia, UAE, Qatar, and other global destinations.'
            },
            {
                question: 'Is ELAB Solutions an examination body or licensing authority?',
                answer: 'No. ELAB Solutions is an independent professional consultancy. We are not a licensing authority and do not issue licenses or certificates. We guide clients through official regulatory processes and liaise professionally with relevant bodies.'
            }
        ]
    },
    {
        id: 'dataflow',
        title: 'DataFlow Verification',
        icon: FileCheck,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        items: [
            {
                question: 'What is DataFlow verification?',
                answer: 'DataFlow verification is a primary source verification process required by many healthcare regulatory authorities. It verifies educational qualifications, professional licenses, and work experience directly from issuing institutions.'
            },
            {
                question: 'Does ELAB Solutions guarantee DataFlow approval?',
                answer: 'No consultancy can guarantee approval. However, we significantly reduce errors, delays, and insufficiencies by ensuring that documents meet regulatory standards before submission and by providing structured follow-up support.'
            },
            {
                question: 'How long does DataFlow verification take?',
                answer: 'Processing times vary depending on document sources and regulatory bodies. On average, verification may take 4–8 weeks, but timelines can be shorter or longer depending on institutional responses.'
            },
            {
                question: 'What happens if my DataFlow application has an insufficiency?',
                answer: 'If an insufficiency is raised, ELAB Solutions will notify you promptly, explain the issue clearly, and guide you on how to resolve it. Where necessary, we raise support tickets and assist with follow-ups.'
            }
        ]
    },
    {
        id: 'mumaris',
        title: 'Mumaris Plus & Saudi Licensing',
        icon: Building2,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        items: [
            {
                question: 'What is Mumaris Plus?',
                answer: 'Mumaris Plus is the professional platform of the Saudi Commission for Health Specialties (SCFHS) used for licensing, classification, and professional practice in Saudi Arabia.'
            },
            {
                question: 'Can ELAB Solutions handle my Mumaris Plus application from start to finish?',
                answer: 'Yes. We assist with account creation, document preparation, DataFlow linkage, eligibility issuance, exam guidance, and post-eligibility steps where applicable.'
            },
            {
                question: 'Does ELAB Solutions book the Saudi Prometric exam?',
                answer: 'Yes. We offer exam booking support once eligibility is issued, subject to availability and regulatory requirements.'
            }
        ]
    },
    {
        id: 'exams',
        title: 'Exam Preparation & Booking',
        icon: GraduationCap,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
        items: [
            {
                question: 'Which exams does ELAB Academy prepare candidates for?',
                answer: [
                    'ELAB Academy offers structured preparation for:',
                    '• Saudi Prometric Exams',
                    '• NCLEX (US)',
                    '• English exams (OET, IELTS – guidance and preparation support)'
                ]
            },
            {
                question: 'Are classes online or physical?',
                answer: 'Our programs are primarily online, allowing global access, with live sessions, recorded content, and structured assessments.'
            },
            {
                question: 'Does ELAB Solutions guarantee exam success?',
                answer: 'We do not guarantee exam results. Success depends on individual preparation and performance. However, our curriculum is designed to align with exam standards and maximize readiness.'
            }
        ]
    },
    {
        id: 'payments',
        title: 'Payments & Fees',
        icon: CreditCard,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
        items: [
            {
                question: 'Are consultation fees refundable?',
                answer: 'Consultation and service fees are generally non-refundable once work has commenced. In some cases, consultation fees may be credited toward full-service engagement, as communicated beforehand.'
            },
            {
                question: 'Does ELAB Solutions charge regulatory fees?',
                answer: 'Regulatory fees (e.g., DataFlow, SCFHS, CGFNS fees) are charged by the respective authorities and are separate from ELAB Solutions\' service fees.'
            },
            {
                question: 'What payment methods are accepted?',
                answer: 'Payment methods vary by region and service. Clients are informed of available payment options before engagement.'
            }
        ]
    },
    {
        id: 'communication',
        title: 'Communication & Support',
        icon: MessageCircle,
        color: 'text-pink-600',
        bgColor: 'bg-pink-100',
        items: [
            {
                question: 'How will ELAB Solutions communicate with me during my process?',
                answer: 'We communicate via official channels including email and WhatsApp. Updates are provided at key stages of your application.'
            },
            {
                question: 'Will I receive regular updates?',
                answer: 'Yes. Clients receive structured updates based on process milestones and are notified promptly of any issues requiring action.'
            },
            {
                question: 'Can I contact ELAB Solutions directly for inquiries?',
                answer: [
                    'Yes. You can reach us through:',
                    '📧 Email: headoffice@elabsolution.org',
                    '🌐 Website: www.elabsolution.org'
                ]
            }
        ]
    },
    {
        id: 'documents',
        title: 'Documents & Confidentiality',
        icon: FileText,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-100',
        items: [
            {
                question: 'Are my documents safe with ELAB Solutions?',
                answer: 'Yes. We treat all client documents with strict confidentiality and use them solely for the purpose of your application or service.'
            },
            {
                question: 'What documents are typically required?',
                answer: [
                    'Requirements vary by service but may include:',
                    '• Passport',
                    '• Educational certificates',
                    '• Professional license',
                    '• Experience letters',
                    '• Transcripts (where applicable)',
                    '',
                    'Clients receive a clear checklist before submission.'
                ]
            }
        ]
    },
    {
        id: 'final',
        title: 'Final Clarifications',
        icon: CheckCircle,
        color: 'text-teal-600',
        bgColor: 'bg-teal-100',
        items: [
            {
                question: 'Can I handle my process myself without ELAB Solutions?',
                answer: 'Yes. All processes are ultimately handled through official platforms. ELAB Solutions exists to simplify, guide, and reduce errors for clients who prefer professional support.'
            },
            {
                question: 'Why should I choose ELAB Solutions?',
                answer: [
                    'Clients choose ELAB Solutions for:',
                    '• Professional guidance',
                    '• Clear communication',
                    '• Structured workflows',
                    '• Reduced errors and delays',
                    '• Dedicated support throughout the process'
                ]
            }
        ]
    }
]

function FAQAccordion({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
    return (
        <div className="border-b border-slate-100 last:border-b-0">
            <button
                onClick={onToggle}
                className="w-full py-4 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors px-4 -mx-4"
            >
                <span className="font-medium text-slate-700 pr-4">{item.question}</span>
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0"
                >
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                </motion.div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="pb-4 text-slate-600 text-sm leading-relaxed">
                            {Array.isArray(item.answer) ? (
                                item.answer.map((line, idx) => (
                                    <p key={idx} className={line === '' ? 'h-2' : ''}>
                                        {line}
                                    </p>
                                ))
                            ) : (
                                <p>{item.answer}</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default function FAQ() {
    const [openItems, setOpenItems] = useState<Record<string, boolean>>({})
    const [activeCategory, setActiveCategory] = useState<string | null>(null)
    const location = useLocation()

    // Handle hash navigation
    useEffect(() => {
        const hash = location.hash.replace('#', '')
        if (hash && faqCategories.some(c => c.id === hash)) {
            setActiveCategory(hash)
            // Scroll to the section after a short delay to allow render
            setTimeout(() => {
                const element = document.getElementById(hash)
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
            }, 100)
        }
    }, [location.hash])

    const toggleItem = (categoryId: string, questionIndex: number) => {
        const key = `${categoryId}-${questionIndex}`
        setOpenItems(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const filteredCategories = activeCategory
        ? faqCategories.filter(c => c.id === activeCategory)
        : faqCategories

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-100/50 sticky top-0 z-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <Link
                            to="/dashboard"
                            className="flex items-center gap-2 text-slate-600 hover:text-primary-600 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="font-medium">Back to Dashboard</span>
                        </Link>
                        <img
                            src="/elab-logo.png"
                            alt="ELAB Solutions International"
                            className="h-10"
                        />
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <div className="bg-gradient-to-r from-primary-500 to-accent-500 text-white py-12 sm:py-16">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-6"
                    >
                        <HelpCircle className="w-8 h-8" />
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl sm:text-4xl font-bold mb-4"
                    >
                        Frequently Asked Questions
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-white/80 max-w-2xl mx-auto"
                    >
                        Find answers to common questions about our services, processes, and how we can help you achieve your healthcare career goals.
                    </motion.p>
                </div>
            </div>

            {/* Category Filter */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-2xl shadow-lg p-4 overflow-x-auto"
                >
                    <div className="flex gap-2 min-w-max">
                        <button
                            onClick={() => setActiveCategory(null)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                activeCategory === null
                                    ? 'bg-primary-500 text-white shadow'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            All Topics
                        </button>
                        {faqCategories.map(category => (
                            <button
                                key={category.id}
                                onClick={() => setActiveCategory(category.id)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                                    activeCategory === category.id
                                        ? 'bg-primary-500 text-white shadow'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                <category.icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{category.title}</span>
                            </button>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* FAQ Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
                <div className="space-y-6">
                    {filteredCategories.map((category, categoryIndex) => (
                        <motion.div
                            key={category.id}
                            id={category.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * categoryIndex }}
                            className="bg-white rounded-2xl shadow-sm overflow-hidden scroll-mt-24"
                        >
                            {/* Category Header */}
                            <div className={`${category.bgColor} px-6 py-4 flex items-center gap-3`}>
                                <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center">
                                    <category.icon className={`w-5 h-5 ${category.color}`} />
                                </div>
                                <h2 className="font-semibold text-slate-800">{category.title}</h2>
                            </div>

                            {/* Questions */}
                            <div className="px-6 py-2">
                                {category.items.map((item, itemIndex) => (
                                    <FAQAccordion
                                        key={itemIndex}
                                        item={item}
                                        isOpen={openItems[`${category.id}-${itemIndex}`] || false}
                                        onToggle={() => toggleItem(category.id, itemIndex)}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Contact CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-12 bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl p-8 text-center text-white"
                >
                    <h3 className="text-xl font-bold mb-2">Still have questions?</h3>
                    <p className="text-white/80 mb-6">
                        Our team is here to help. Reach out to us for personalized assistance.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a
                            href="mailto:headoffice@elabsolution.org"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-600 rounded-xl font-medium hover:bg-white/90 transition-colors"
                        >
                            <Mail className="w-5 h-5" />
                            headoffice@elabsolution.org
                        </a>
                        <a
                            href="https://www.elabsolution.org"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition-colors"
                        >
                            <Globe className="w-5 h-5" />
                            www.elabsolution.org
                        </a>
                    </div>
                </motion.div>

                {/* Footer tagline */}
                <p className="text-center text-slate-400 text-sm mt-8 italic">
                    ELAB Solutions International – Professional Guidance. Global Healthcare Pathways.
                </p>
            </div>
        </div>
    )
}
