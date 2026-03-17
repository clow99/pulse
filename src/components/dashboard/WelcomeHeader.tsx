'use client';

import { format } from 'date-fns';
import { FadeIn } from '@/components/motion';

interface WelcomeHeaderProps {
  userName: string;
  siteCount: number;
}

export function WelcomeHeader({ userName, siteCount }: WelcomeHeaderProps) {
  const firstName = userName.split(' ')[0];
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  return (
    <FadeIn>
      <div className="pulse-welcome-header">
        <div>
          <h1 className="pulse-welcome-title">
            Welcome back, {firstName}
          </h1>
          <p className="pulse-welcome-subtitle">
            You have <strong>{siteCount} site{siteCount !== 1 ? 's' : ''}</strong> being tracked.
            Keep up the good work!
          </p>
        </div>
        <div className="pulse-welcome-date">
          {today}
        </div>
      </div>
    </FadeIn>
  );
}
