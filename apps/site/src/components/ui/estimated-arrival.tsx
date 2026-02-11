import type React from 'react';

import { useState } from 'react';
import z from 'zod';

export const EstimatedDateBadgeSchema = z.object({
  estimatedDate: z.string().optional(),
  dayOfWeek: z.string().optional(),
  deliveryType: z.string().optional(),
});

export type EstimatedDateBadgeProps = z.infer<typeof EstimatedDateBadgeSchema>;

const EstimatedDateBadge: React.FC<EstimatedDateBadgeProps> = ({
  estimatedDate = 'September 28',
  dayOfWeek = 'Friday delivery',
  deliveryType = 'Free',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const toggleDetails = (): void => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        {/* Main Card */}
        <button
          onClick={toggleDetails}
          className="w-full bg-white border-2 border-orange-500 rounded-3xl p-4 text-left transition-all duration-300 hover:shadow-2xl hover:border-orange-600 active:scale-98 group"
        >
          <div className="flex items-start gap-3">
            {/* Clock Icon - Animated */}
            <div className="flex-shrink-0 pt-0.5">
              <svg
                className="w-6 h-6 text-orange-500 stroke-[2.5] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-500 tracking-widest uppercase transition-colors duration-300 group-hover:text-slate-700">
                Estimated Arrival
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5 transition-colors duration-300 group-hover:text-orange-600">
                {estimatedDate}
              </h3>
              <p className="text-sm text-slate-600">{dayOfWeek}</p>
            </div>

            {/* Free Badge and Arrow */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <div className="bg-orange-500 text-white rounded-full px-4 py-1 font-semibold text-xs transition-all duration-300 group-hover:bg-orange-600 group-hover:shadow-lg group-hover:shadow-orange-500/30">
                {deliveryType}
              </div>
              <svg
                className={`w-4 h-4 text-slate-400 transition-all duration-500 ${
                  isOpen ? 'rotate-180' : 'rotate-0'
                } group-hover:text-slate-600`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </button>

        {/* Details Section - Staggered Animation */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-out ${
            isOpen
              ? 'max-h-96 opacity-100'
              : 'max-h-0 opacity-0 pointer-events-none'
          }`}
        >
          <div className="bg-white border-2 border-slate-200 rounded-3xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
            {/* Delivery Time */}
            <DetailItem
              number={1}
              title="Delivery Time"
              description="Orders are usually delivered within 7 working days."
              delay="0"
            />

            {/* Assembly */}
            <DetailItem
              number={2}
              title="Assembly"
              description="Products are sent unassembled. All necessary parts and assembly instructions are included in the package."
              delay="1"
              hasBorder
            />

            {/* Technical Support */}
            <DetailItem
              number={3}
              title="Technical Support"
              description="If needed, you can contact our technical team at +1 555 55 5 phone number."
              delay="2"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailItem: React.FC<{
  number: number;
  title: string;
  description: string;
  delay: string;
  hasBorder?: boolean;
}> = ({ number, title, description, delay, hasBorder }) => {
  return (
    <div
      className={`transition-all duration-500 ease-out hover:pl-2 ${hasBorder ? 'border-b border-slate-200 pb-4' : ''}`}
      style={{
        animation: `slideInDetail 0.5s ease-out ${Number(delay) * 100}ms both`,
      }}
    >
      <style>{`
        @keyframes slideInDetail {
          from {
            opacity: 0;
            transform: translateX(-12px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-500/40 transition-all duration-300 hover:scale-110 hover:shadow-orange-500/60">
          {number}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-bold text-slate-900 transition-colors duration-300 hover:text-orange-600">
            {title}
          </h4>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default EstimatedDateBadge;
