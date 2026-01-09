import { RpsSession } from '@/components/rps-session';

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-0 md:p-6 lg:p-8 h-full">
      <RpsSession />
    </div>
  );
}
