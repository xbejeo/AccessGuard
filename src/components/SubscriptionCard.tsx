import React from 'react';
import { Card } from './Card';
import { Button } from './Button';
interface SubscriptionCardProps {
  title: string;
  description: string;
  price: string;
  benefits?: string[];
  borderColor?: string;
  onClick?: () => void;
}
export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  title,
  description,
  price,
  benefits = [],
  borderColor = 'border-blue-500',
  onClick
}) => {
  return <Card className={`border-t-4 ${borderColor} h-full flex flex-col`}>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      <div className="text-2xl font-bold mb-4">{price}</div>
      {benefits.length > 0 && <ul className="mb-6 space-y-2 flex-grow">
          {benefits.map((benefit, index) => <li key={index} className="flex items-start">
              <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-gray-700">{benefit}</span>
            </li>)}
        </ul>}
      <div className="mt-auto">
        <Button variant="primary" fullWidth onClick={onClick}>
          Купить
        </Button>
      </div>
    </Card>;
};