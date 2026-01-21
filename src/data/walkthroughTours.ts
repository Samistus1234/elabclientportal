import { WalkthroughTour } from '@/contexts/WalkthroughContext'

// ============================================================================
// PORTAL OVERVIEW TOUR - Introduction to the client portal
// ============================================================================
export const portalOverviewTour: WalkthroughTour = {
    id: 'portal-overview',
    name: 'Portal Overview',
    steps: [
        {
            id: 'welcome',
            target: 'center',
            title: 'Welcome to ELAB Client Portal!',
            content: 'This interactive tour will guide you through the key features of your personalized credential verification portal. Let\'s explore together!',
            placement: 'center'
        },
        {
            id: 'header-logo',
            target: '[data-tour="header-logo"]',
            title: 'Your Portal Home',
            content: 'Click the ELAB logo anytime to return to your main dashboard. This is your central hub for all activities.',
            placement: 'bottom'
        },
        {
            id: 'search-bar',
            target: '[data-tour="search-bar"]',
            title: 'Quick Search',
            content: 'Quickly find any application by searching for case reference numbers, pipeline names, or current stage.',
            placement: 'bottom'
        },
        {
            id: 'notifications',
            target: '[data-tour="notifications"]',
            title: 'Stay Updated',
            content: 'Never miss an update! The notification bell shows you important alerts about your applications, document requests, and more.',
            placement: 'bottom'
        },
        {
            id: 'profile-menu',
            target: '[data-tour="profile-menu"]',
            title: 'Your Profile',
            content: 'Access your account settings, support options, and sign out from here. Keep your contact information up to date!',
            placement: 'bottom'
        },
        {
            id: 'welcome-section',
            target: '[data-tour="welcome-section"]',
            title: 'Personalized Welcome',
            content: 'Your dashboard greets you with a personalized message and shows your overall application progress at a glance.',
            placement: 'bottom'
        },
        {
            id: 'stats-overview',
            target: '[data-tour="stats-cards"]',
            title: 'Application Statistics',
            content: 'Get a quick overview of all your applications - active, pending, completed, and on hold. These cards update in real-time.',
            placement: 'bottom'
        },
        {
            id: 'onboarding-steps',
            target: '[data-tour="onboarding"]',
            title: 'Getting Started Guide',
            content: 'New here? This checklist helps you complete essential setup steps. Follow along to get the most out of your portal.',
            placement: 'bottom'
        },
        {
            id: 'quick-actions',
            target: '[data-tour="quick-actions"]',
            title: 'Quick Actions',
            content: 'Need to do something fast? These shortcuts let you upload documents, contact support, or refresh your data instantly.',
            placement: 'top'
        },
        {
            id: 'applications-section',
            target: '[data-tour="applications"]',
            title: 'Your Applications',
            content: 'All your credential verification applications appear here. Click any card to view detailed progress and timeline.',
            placement: 'top'
        },
        {
            id: 'view-toggle',
            target: '[data-tour="view-toggle"]',
            title: 'Change Your View',
            content: 'Prefer a different layout? Switch between grid and list views to see your applications the way you like.',
            placement: 'bottom'
        },
        {
            id: 'status-filter',
            target: '[data-tour="status-filter"]',
            title: 'Filter Applications',
            content: 'Focus on what matters. Filter your applications by status - active, pending, completed, or on hold.',
            placement: 'bottom'
        },
        {
            id: 'recent-activity',
            target: '[data-tour="recent-activity"]',
            title: 'Recent Activity',
            content: 'Track all updates in one place. See recent status changes, document uploads, and milestone completions.',
            placement: 'left'
        },
        {
            id: 'support-section',
            target: '[data-tour="support-section"]',
            title: 'Need Help?',
            content: 'Our support team is here for you! Contact us via email, phone, or live chat for any questions about your applications.',
            placement: 'top'
        },
        {
            id: 'mobile-nav',
            target: '[data-tour="mobile-nav"]',
            title: 'Mobile Navigation',
            content: 'On mobile devices, use the bottom navigation bar to quickly access Documents, FAQ, and Settings.',
            placement: 'top'
        },
        {
            id: 'tour-complete',
            target: 'center',
            title: 'You\'re All Set! 🎉',
            content: 'You now know the basics of your ELAB Client Portal. Explore your applications, upload documents, and track your progress. We\'re here to help every step of the way!',
            placement: 'center'
        }
    ]
}

// ============================================================================
// CASE VIEW TOUR - Understanding individual case details
// ============================================================================
export const caseViewTour: WalkthroughTour = {
    id: 'case-view',
    name: 'Case Details Guide',
    steps: [
        {
            id: 'case-intro',
            target: 'center',
            title: 'Understanding Your Case',
            content: 'This page shows everything about your credential verification case. Let\'s explore the key features!',
            placement: 'center'
        },
        {
            id: 'breadcrumbs',
            target: '[data-tour="breadcrumbs"]',
            title: 'Navigation Breadcrumbs',
            content: 'See exactly where you are in the portal. Click any breadcrumb to navigate back quickly.',
            placement: 'bottom'
        },
        {
            id: 'case-header',
            target: '[data-tour="case-header"]',
            title: 'Case Information',
            content: 'Your case reference number, status, and pipeline type are shown here. Use the copy button to save your reference number.',
            placement: 'bottom'
        },
        {
            id: 'quick-stats',
            target: '[data-tour="quick-stats"]',
            title: 'Quick Statistics',
            content: 'At a glance, see your progress percentage, time in current stage, total duration, and number of stage transitions.',
            placement: 'bottom'
        },
        {
            id: 'tabs-nav',
            target: '[data-tour="tabs-nav"]',
            title: 'Content Tabs',
            content: 'Switch between Overview, Timeline, Documents, and Support tabs to access different information about your case.',
            placement: 'bottom'
        },
        {
            id: 'stage-progress',
            target: '[data-tour="stage-progress"]',
            title: 'Application Progress',
            content: 'See your journey through the verification process. The circular progress shows overall completion. Click "View all stages" to see every step.',
            placement: 'top'
        },
        {
            id: 'ai-summary',
            target: '[data-tour="ai-summary"]',
            title: 'AI-Powered Summary',
            content: 'Our AI assistant summarizes your case status and provides helpful insights about what\'s happening and what to expect next.',
            placement: 'top'
        },
        {
            id: 'timeline-tab',
            target: '[data-tour="timeline-tab"]',
            title: 'Activity Timeline',
            content: 'The Timeline tab shows every action and update on your case, from creation to completion. It\'s your detailed history log.',
            placement: 'bottom'
        },
        {
            id: 'documents-tab',
            target: '[data-tour="documents-tab"]',
            title: 'Documents Section',
            content: 'Upload, view, and manage all documents related to your case. You\'ll be notified when new documents are requested.',
            placement: 'bottom'
        },
        {
            id: 'support-tab',
            target: '[data-tour="support-tab"]',
            title: 'Get Support',
            content: 'Have questions about this case? The Support tab provides direct contact options and frequently asked questions.',
            placement: 'bottom'
        },
        {
            id: 'case-complete',
            target: 'center',
            title: 'Ready to Track!',
            content: 'You now understand how to monitor your case. Check back regularly for updates, or enable notifications to stay informed automatically!',
            placement: 'center'
        }
    ]
}

// ============================================================================
// DOCUMENTS TOUR - Managing your documents
// ============================================================================
export const documentsTour: WalkthroughTour = {
    id: 'documents',
    name: 'Documents Guide',
    steps: [
        {
            id: 'docs-intro',
            target: 'center',
            title: 'Document Management',
            content: 'This is your document center. Upload, organize, and track all files related to your credential verification.',
            placement: 'center'
        },
        {
            id: 'upload-area',
            target: '[data-tour="upload-area"]',
            title: 'Upload Documents',
            content: 'Drag and drop files here, or click to browse. We accept PDF, images, and common document formats.',
            placement: 'bottom'
        },
        {
            id: 'doc-categories',
            target: '[data-tour="doc-categories"]',
            title: 'Document Categories',
            content: 'Documents are organized by type - education credentials, identity documents, professional certifications, and more.',
            placement: 'bottom'
        },
        {
            id: 'doc-status',
            target: '[data-tour="doc-status"]',
            title: 'Document Status',
            content: 'Each document shows its verification status - pending review, approved, or requires attention.',
            placement: 'left'
        },
        {
            id: 'docs-complete',
            target: 'center',
            title: 'Documents Ready!',
            content: 'You\'re ready to manage your documents. Keep your files organized and respond promptly to any document requests.',
            placement: 'center'
        }
    ]
}

// ============================================================================
// QUICK START TOUR - Minimal introduction for returning users
// ============================================================================
export const quickStartTour: WalkthroughTour = {
    id: 'quick-start',
    name: 'Quick Start',
    steps: [
        {
            id: 'quick-welcome',
            target: 'center',
            title: 'Quick Refresher',
            content: 'Welcome back! Here\'s a quick reminder of the key features in your portal.',
            placement: 'center'
        },
        {
            id: 'quick-apps',
            target: '[data-tour="applications"]',
            title: 'Your Applications',
            content: 'Click any application card to view details, upload documents, or track progress.',
            placement: 'top'
        },
        {
            id: 'quick-actions-bar',
            target: '[data-tour="quick-actions"]',
            title: 'Quick Actions',
            content: 'Use these shortcuts for common tasks like uploading documents or contacting support.',
            placement: 'top'
        },
        {
            id: 'quick-done',
            target: 'center',
            title: 'You\'re Ready!',
            content: 'That\'s it! Navigate freely and reach out if you need help.',
            placement: 'center'
        }
    ]
}

// Export all tours
export const allTours = {
    'portal-overview': portalOverviewTour,
    'case-view': caseViewTour,
    'documents': documentsTour,
    'quick-start': quickStartTour
}

export type TourId = keyof typeof allTours
