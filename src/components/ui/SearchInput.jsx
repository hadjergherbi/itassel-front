import { Search } from 'lucide-react'
import { TextInput } from '../FormFields'

export default function SearchInput({ id, value, onChange, placeholder, label }) {
  return (
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <TextInput
        id={id}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="ps-9"
        aria-label={label || placeholder}
      />
    </div>
  )
}
