import { Group, Match, Team, TiebreakerRule } from '@/types/tournament';
import { calculateStandings } from '@/utils/tournament';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Props {
  group: Group;
  matches: Match[];
  teams: Team[];
  tiebreakerRule?: TiebreakerRule;
}

export default function GroupStandings({ group, matches, teams, tiebreakerRule }: Props) {
  const standings = calculateStandings(matches, teams, group.id, tiebreakerRule);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{group.name}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 text-center">#</TableHead>
              <TableHead>Tým</TableHead>
              <TableHead className="text-center w-10">Z</TableHead>
              <TableHead className="text-center w-10">V</TableHead>
              <TableHead className="text-center w-10">R</TableHead>
              <TableHead className="text-center w-10">P</TableHead>
              <TableHead className="text-center w-16">Skóre</TableHead>
              <TableHead className="text-center w-10 font-bold">B</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standings.map((s, i) => (
              <TableRow key={s.teamId}>
                <TableCell className="text-center font-medium">{i + 1}</TableCell>
                <TableCell className="font-medium">{s.teamName}</TableCell>
                <TableCell className="text-center text-muted-foreground">{s.played}</TableCell>
                <TableCell className="text-center text-muted-foreground">{s.wins}</TableCell>
                <TableCell className="text-center text-muted-foreground">{s.draws}</TableCell>
                <TableCell className="text-center text-muted-foreground">{s.losses}</TableCell>
                <TableCell className="text-center text-muted-foreground">{s.goalsFor}:{s.goalsAgainst}</TableCell>
                <TableCell className="text-center font-bold">{s.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
