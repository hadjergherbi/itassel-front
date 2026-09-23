import { Inbox } from 'lucide-react'

export default function EmptyState({ title, action, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <Icon className="mb-3 h-10 w-10 text-gray-300" />
      <p className="text-sm font-semibold text-gray-800">{title}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
