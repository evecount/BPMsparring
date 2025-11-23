import { SparringSession } from '@/components/sparring-session';

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 lg:p-8">
      <SparringSession />
    </div>
  );
}
