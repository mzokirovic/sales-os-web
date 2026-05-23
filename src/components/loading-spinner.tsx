type LoadingSpinnerProps = {
  size?: 'sm' | 'md';
};

export function LoadingSpinner({ size = 'sm' }: LoadingSpinnerProps) {
  const sizeClass = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <span
      className={`${sizeClass} inline-block animate-spin rounded-full border-2 border-current border-t-transparent`}
      aria-hidden="true"
    />
  );
}
