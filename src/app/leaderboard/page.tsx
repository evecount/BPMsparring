import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LeaderboardTable } from "@/components/leaderboard-table";

export default function LeaderboardPage() {
  return (
    <div className="flex-1 p-4 md:p-8">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>
            Check your personal bests and track your progress.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeaderboardTable />
        </CardContent>
      </Card>
    </div>
  );
}
