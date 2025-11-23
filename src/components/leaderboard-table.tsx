"use client";

import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUser, useDoc, useMemoFirebase } from "@/firebase";
import { doc, Firestore } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { type SparringStats } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";

const defaultStats: SparringStats = {
  score: 0,
  punches: 0,
  accuracy: 0,
  streak: 0,
  bestStreak: 0,
  avgSpeed: 0,
};

export function LeaderboardTable() {
  const { user } = useUser();
  const firestore = useFirestore() as Firestore;
  
  const userMetricsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'metrics', user.uid);
  }, [firestore, user]);

  const { data: stats } = useDoc<SparringStats>(userMetricsRef);
  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar');

  const displayStats = stats || defaultStats;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">Rank</TableHead>
          <TableHead>Player</TableHead>
          <TableHead className="text-right">Total Score</TableHead>
          <TableHead className="text-right">Total Punches</TableHead>
          <TableHead className="text-right">Best Streak</TableHead>
          <TableHead className="text-right">Accuracy</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium">1</TableCell>
          <TableCell>
            <div className="flex items-center gap-3">
              <Avatar>
                {userAvatar && (
                    <AvatarImage asChild src={userAvatar.imageUrl}>
                        <Image src={userAvatar.imageUrl} alt={userAvatar.description} width={40} height={40} data-ai-hint={userAvatar.imageHint}/>
                    </AvatarImage>
                )}
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <span className="font-medium">{user?.displayName || user?.email?.split('@')[0] || 'You'}</span>
            </div>
          </TableCell>
          <TableCell className="text-right">{displayStats.score.toLocaleString()}</TableCell>
          <TableCell className="text-right">{displayStats.punches.toLocaleString()}</TableCell>
          <TableCell className="text-right">{displayStats.bestStreak.toLocaleString()}</TableCell>
          <TableCell className="text-right">{displayStats.accuracy.toFixed(1)}%</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
