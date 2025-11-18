import React from 'react';
import { CheckCircleIcon, CalendarIcon, ClockIcon } from 'lucide-react';
interface HistoryItemProps {
  date: string;
  time: string;
  status: string;
}
export const HistoryItem: React.FC<HistoryItemProps> = ({
  date,
  time,
  status
}) => {
  return <div className="flex items-start p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
      <div className="flex-shrink-0 mr-3">
        <CheckCircleIcon className="w-5 h-5 text-green-500" />
      </div>
      <div className="flex-grow">
        <div className="flex items-center text-sm text-gray-600 mb-1">
          <CalendarIcon className="w-4 h-4 mr-1" />
          <span className="mr-3">{date}</span>
          <ClockIcon className="w-4 h-4 mr-1" />
          <span>{time}</span>
        </div>
        <p className="text-sm font-medium text-gray-900">{status}</p>
      </div>
    </div>;
};