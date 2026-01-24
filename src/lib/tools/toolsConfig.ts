import {
    Key,
    QrCode,
    Merge,
    Split,
    RotateCw,
    Minimize2,
    ImagePlus,
    Shrink,
    RefreshCw,
    Maximize2,
    FileImage,
    LucideIcon
} from 'lucide-react'

export interface ToolConfig {
    id: string
    name: string
    description: string
    icon: LucideIcon
    path: string
    category: 'pdf' | 'image' | 'utility'
    features: string[]
}

export const toolCategories = [
    { id: 'pdf', name: 'PDF Tools', description: 'Merge, split, compress, and manipulate PDF files' },
    { id: 'image', name: 'Image Tools', description: 'Compress, convert, and resize images' },
    { id: 'utility', name: 'Utility Tools', description: 'Helpful utilities for everyday tasks' }
]

export const tools: ToolConfig[] = [
    // PDF Tools
    {
        id: 'merge-pdf',
        name: 'Merge PDF',
        description: 'Combine multiple PDF files into one document',
        icon: Merge,
        path: '/tools/pdf/merge',
        category: 'pdf',
        features: ['Drag to reorder', 'Preview pages', 'Unlimited files']
    },
    {
        id: 'split-pdf',
        name: 'Split PDF',
        description: 'Extract pages or split PDF into multiple files',
        icon: Split,
        path: '/tools/pdf/split',
        category: 'pdf',
        features: ['Select pages', 'Range extraction', 'Batch split']
    },
    {
        id: 'compress-pdf',
        name: 'Compress PDF',
        description: 'Reduce PDF file size while maintaining quality',
        icon: Minimize2,
        path: '/tools/pdf/compress',
        category: 'pdf',
        features: ['Multiple quality levels', 'Batch compression', 'Preview size']
    },
    {
        id: 'rotate-pdf',
        name: 'Rotate PDF',
        description: 'Rotate PDF pages to any angle',
        icon: RotateCw,
        path: '/tools/pdf/rotate',
        category: 'pdf',
        features: ['Rotate all pages', 'Select specific pages', '90/180/270 degrees']
    },
    {
        id: 'image-to-pdf',
        name: 'Image to PDF',
        description: 'Convert images to PDF document',
        icon: ImagePlus,
        path: '/tools/pdf/from-image',
        category: 'pdf',
        features: ['Multiple images', 'Reorder pages', 'Adjust sizing']
    },
    // Image Tools
    {
        id: 'compress-image',
        name: 'Compress Image',
        description: 'Reduce image file size without losing quality',
        icon: Shrink,
        path: '/tools/image/compress',
        category: 'image',
        features: ['Adjustable quality', 'Batch processing', 'Preview comparison']
    },
    {
        id: 'convert-image',
        name: 'Convert Image',
        description: 'Convert images between formats (JPG, PNG, WebP)',
        icon: RefreshCw,
        path: '/tools/image/convert',
        category: 'image',
        features: ['JPG, PNG, WebP', 'Batch convert', 'Quality settings']
    },
    {
        id: 'resize-image',
        name: 'Resize Image',
        description: 'Resize images to specific dimensions',
        icon: Maximize2,
        path: '/tools/image/resize',
        category: 'image',
        features: ['Custom dimensions', 'Maintain aspect ratio', 'Preset sizes']
    },
    {
        id: 'heic-to-jpg',
        name: 'HEIC to JPG',
        description: 'Convert iPhone HEIC photos to JPG format',
        icon: FileImage,
        path: '/tools/image/heic-to-jpg',
        category: 'image',
        features: ['iPhone photos', 'Batch convert', 'High quality']
    },
    // Utility Tools
    {
        id: 'password-generator',
        name: 'Password Generator',
        description: 'Generate secure random passwords',
        icon: Key,
        path: '/tools/utility/password',
        category: 'utility',
        features: ['Customizable length', 'Special characters', 'Copy to clipboard']
    },
    {
        id: 'qr-code-generator',
        name: 'QR Code Generator',
        description: 'Create QR codes for URLs, text, or data',
        icon: QrCode,
        path: '/tools/utility/qr-code',
        category: 'utility',
        features: ['Custom colors', 'Download PNG/SVG', 'Multiple sizes']
    }
]

export const getToolsByCategory = (category: string) =>
    tools.filter(tool => tool.category === category)

export const getToolById = (id: string) =>
    tools.find(tool => tool.id === id)
