import { CVOptimizer } from '@/components/cv-optimizer'

export default function OptimizerPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">CV Optimizer</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Tailor your CV to a job</h1>
        <p className="mt-1.5 max-w-xl text-sm text-zinc-500">
          Upload your CV, paste a job description, and get an ATS score with tailored fixes.
        </p>
      </div>
      <CVOptimizer />
    </div>
  )
}
