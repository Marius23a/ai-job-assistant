// Minimal hand-written types for the rows used in this slice.
// In a real project, generate the full set with:
//   supabase gen types typescript --linked > types/database.ts

export type Plan = 'free' | 'pro'
export type ApplicationStatus = 'wishlist' | 'applied' | 'interview' | 'offer' | 'rejected'
export type GenerationType =
  | 'cv_optimization' | 'cover_letter' | 'interview_feedback'
  | 'resume_analysis' | 'advisor_chat'

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  plan: Plan
  created_at: string
  updated_at: string
}

export interface CV {
  id: string
  user_id: string
  title: string
  file_path: string | null
  extracted_text: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Application {
  id: string
  user_id: string
  company: string
  role: string
  status: ApplicationStatus
  salary: string | null
  location: string | null
  url: string | null
  notes: string | null
  deadline: string | null
  cv_id: string | null
  sort_order: number
  created_at: string
  updated_at: string
}
