import { useEffect, useState } from 'react';
import { BackgroundCircles } from './background-circles';

const loadingMessages = [
  {
    title: 'Just a moment',
    description: 'Setting up your personalized experience...',
  },
  {
    title: 'Hang on, authenticating you',
    description: 'Verifying your identity...',
  },
  { title: 'Loading your profile', description: 'Preparing your dashboard...' },
  { title: 'One sec', description: "Checking if you're really you..." },
  { title: 'Hold tight', description: 'Cross-referencing your existence...' },
  {
    title: 'Patience, young padawan',
    description: 'Authenticating your Jedi status...',
  },
  {
    title: 'Almost there',
    description: 'Consulting the ancient scrolls of authentication...',
  },
  {
    title: 'Still here',
    description: "Making sure you're not a robot (or are you?)",
  },
  {
    title: 'Loading magic',
    description: 'Spinning up your personalized experience...',
  },
  { title: 'Be right back', description: 'Fetching your digital essence...' },
  {
    title: 'Counting to infinity',
    description: 'Actually, just authenticating you...',
  },
];

export function UserLoading() {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const intervalFn = () => {
      const randomIndex = Math.floor(Math.random() * loadingMessages.length);
      setCurrentMessageIndex(randomIndex);
    };
    intervalFn();
    const interval = setInterval(intervalFn, 4000);

    return () => clearInterval(interval);
  }, []);

  const currentMessage = loadingMessages[currentMessageIndex];

  return (
    <BackgroundCircles
      variant="default"
      title={currentMessage.title}
      description={currentMessage.description}
    />
  );
}
