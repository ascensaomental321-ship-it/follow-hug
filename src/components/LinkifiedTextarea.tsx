import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

interface LinkifiedTextareaProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function LinkifiedTextarea({ id, value, onChange, placeholder, className }: LinkifiedTextareaProps) {
  return (
    <Textarea
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={cn('h-28 min-h-28 max-h-28 resize-none overflow-y-auto', className)}
    />
  );
}