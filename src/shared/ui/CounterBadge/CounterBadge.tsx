import './CounterBadge.scss'

interface CounterBadgeProps {
    count: number
}

export const CounterBadge = ({
    count
}:CounterBadgeProps) => {
  return (
    <div className='counter-badge'>
        {/* {count} */}
    </div>
  );
};