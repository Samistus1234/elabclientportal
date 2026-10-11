import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PortalLayout from '@/components/portal/PortalLayout'
import ElabUpdates from '@/components/portal/ElabUpdates'
import { getPortalUserInfo } from '@/lib/supabase'

export default function Updates() {
 const [type,setType]=useState<string|null>(null)
 useEffect(()=>{let active=true;getPortalUserInfo().then(({data})=>active&&setType(data?.user_type||'applicant')).catch(()=>active&&setType('applicant'));return()=>{active=false}},[])
 if(!type)return <p className="p-8" role="status">Loading…</p>
 if(type==='applicant')return <PortalLayout><ElabUpdates/></PortalLayout>
 const home=type==='recruiter'?'/recruiter/dashboard':type==='institutional_contact'?'/contact/dashboard':'/referral'
 return <div className="min-h-screen bg-slate-50 p-4 sm:p-8"><main className="mx-auto max-w-6xl"><Link to={home} className="mb-6 inline-block text-blue-600">← Back to dashboard</Link><ElabUpdates/></main></div>
}
