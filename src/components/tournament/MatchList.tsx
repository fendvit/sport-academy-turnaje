import { useState } from 'react';
import { Group, Match, Team } from '@/types/tournament';
import { getTeamName, getFieldColorClass } from '@/utils/tournament';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, GripVertical, Play, Plus, Minus, ArrowLeftRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function TeamName({ teams, teamId, align }: { teams: Team[]; teamId: string; align: 'left' | 'right' }) {
  const name = getTeamName(teams, teamId);
  const [open, setOpen] = useState(false);
  return (
    <>
      <span
        className={`${align === 'right' ? 'text-right' : 'text-left'} flex-1 min-w-0 truncate cursor-pointer`}
        onClick={() => setOpen(true)}
      >
        {name}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[300px]">
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface MatchRowProps {
  match: Match;
  teams: Team[];
  groups: Group[];
  allMatches: Match[];
  isAdmin: boolean;
  editingId: string | null;
  editingTimeId: string | null;
  homeScore: string;
  awayScore: string;
  editTime: string;
  onStartEdit: (match: Match) => void;
  onStartTimeEdit: (match: Match) => void;
  onSaveScore: (matchId: string) => void;
  onConfirmMatch: (matchId: string) => void;
  onSaveTime: (matchId: string) => void;
  onSetHomeScore: (v: string) => void;
  onSetAwayScore: (v: string) => void;
  onSetEditTime: (v: string) => void;
  onQuickGoal?: (matchId: string, side: 'home' | 'away', delta: number) => void;
  isPlayed: boolean;
  sortable?: boolean;
  swapSelected?: boolean;
  onSwapClick?: (matchId: string) => void;
}

function MatchRow({
  match, teams, groups, allMatches, isAdmin, editingId, editingTimeId,
  homeScore, awayScore, editTime, onStartEdit, onStartTimeEdit,
  onSaveScore, onConfirmMatch, onSaveTime, onSetHomeScore, onSetAwayScore, onSetEditTime,
  onQuickGoal, isPlayed, sortable, swapSelected, onSwapClick,
}: MatchRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: match.id,
    disabled: !sortable,
  });

  const style = sortable ? {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  const groupName = groups.find(g => g.id === match.groupId)?.name || '';
  const isLive = match.active && !isPlayed;

  return (
    <div
      ref={sortable ? setNodeRef : undefined}
      style={style}
      className={`flex items-center gap-2 rounded-lg border p-3 transition-colors ${
        isPlayed ? 'bg-muted/30' : ''
      } ${isLive ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : ''} ${
        swapSelected ? 'border-primary ring-2 ring-primary/40' : ''
      }`}
    >
      {sortable && (
        <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground hover:text-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      {isAdmin && !isPlayed && onSwapClick && (
        <button
          type="button"
          onClick={() => onSwapClick(match.id)}
          className={`text-muted-foreground hover:text-foreground ${swapSelected ? 'text-primary' : ''}`}
          title="Prohodit s jiným zápasem"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>
      )}

      {editingTimeId === match.id ? (
        <div className="flex items-center gap-1 min-w-[3rem]">
          <Input type="time" className="w-24 h-7 text-xs" value={editTime} onChange={e => onSetEditTime(e.target.value)} />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onSaveTime(match.id)}>
            <Check className="h-3 w-3" />
          </Button>
        </div>
      ) : match.scheduledTime ? (
        <span
          className={`flex items-center gap-1 text-xs font-medium text-muted-foreground min-w-[3rem] ${isAdmin ? 'cursor-pointer hover:text-foreground' : ''}`}
          onClick={() => isAdmin && onStartTimeEdit(match)}
        >
          <Clock className="h-3 w-3" />
          {match.scheduledTime}
        </span>
      ) : isAdmin ? (
        <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => onStartTimeEdit(match)}>
          <Clock className="h-3 w-3 mr-1" /> Čas
        </Button>
      ) : null}

      <Badge variant="outline" className={`${getFieldColorClass(match.field)} text-white border-0 text-xs`}>
        H{match.field}
      </Badge>
      <span className="text-xs text-muted-foreground">{groupName}</span>

      <div className="flex-1 min-w-0 flex items-center justify-center gap-1 text-sm font-medium">
        <TeamName teams={teams} teamId={match.homeTeamId} align="right" />
        {editingId === match.id ? (
          <div className="flex items-center gap-1 shrink-0">
            <Input type="number" min="0" className="w-14 text-center h-8" value={homeScore} onChange={e => onSetHomeScore(e.target.value)} />
            <span>:</span>
            <Input type="number" min="0" className="w-14 text-center h-8" value={awayScore} onChange={e => onSetAwayScore(e.target.value)} />
            <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => onSaveScore(match.id)}>
              Skóre
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={() => onConfirmMatch(match.id)}>
              Potvrdit
            </Button>
          </div>
        ) : isPlayed ? (
          <span className="font-bold text-base shrink-0">{match.homeScore} : {match.awayScore}</span>
        ) : isLive && (match.homeScore !== null || match.awayScore !== null) ? (
          <div className="flex items-center gap-1 shrink-0">
            {isAdmin && onQuickGoal && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onQuickGoal(match.id, 'home', -1)}>
                <Minus className="h-3 w-3" />
              </Button>
            )}
            <span className="font-bold text-base">{match.homeScore ?? 0} : {match.awayScore ?? 0}</span>
            {isAdmin && onQuickGoal && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onQuickGoal(match.id, 'away', -1)}>
                <Minus className="h-3 w-3" />
              </Button>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground shrink-0">vs</span>
        )}
        <TeamName teams={teams} teamId={match.awayTeamId} align="left" />
      </div>

      {isAdmin && editingId !== match.id && (
        <Button variant={isPlayed ? 'ghost' : 'outline'} size="sm" onClick={() => onStartEdit(match)}>
          {isPlayed ? 'Upravit' : 'Zadat'}
        </Button>
      )}
    </div>
  );
}

interface FreeSlotRowProps {
  slotKey: string;
  field: number;
  scheduledTime: string | null;
  swapSelected: boolean;
  onSwapClick: (slotKey: string) => void;
  swapActive: boolean;
}

function FreeSlotRow({ slotKey, field, scheduledTime, swapSelected, onSwapClick, swapActive }: FreeSlotRowProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border border-dashed p-3 bg-muted/20 ${
        swapSelected ? 'border-primary ring-2 ring-primary/40' : ''
      }`}
    >
      <span className="w-4" />
      <button
        type="button"
        onClick={() => onSwapClick(slotKey)}
        disabled={!swapActive}
        className={`text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed ${swapSelected ? 'text-primary' : ''}`}
        title={swapActive ? 'Přesunout vybraný zápas sem' : 'Nejprve vyberte zápas k přesunu'}
      >
        <ArrowLeftRight className="h-4 w-4" />
      </button>
      {scheduledTime ? (
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground min-w-[3rem]">
          <Clock className="h-3 w-3" />
          {scheduledTime}
        </span>
      ) : (
        <span className="min-w-[3rem]" />
      )}
      <Badge variant="outline" className={`${getFieldColorClass(field)} text-white border-0 text-xs opacity-70`}>
        H{field}
      </Badge>
      <div className="flex-1 min-w-0 text-center text-sm italic text-muted-foreground">
        Volný slot
      </div>
    </div>
  );
}

interface Props {
  matches: Match[];
  teams: Team[];
  groups: Group[];
  fieldCount?: number;
  onUpdateScore?: (matchId: string, homeScore: number, awayScore: number) => void;
  onUpdateMatchScore?: (matchId: string, homeScore: number, awayScore: number) => void;
  onUpdateTime?: (matchId: string, time: string) => void;
  onReorderMatches?: (reorderedMatches: { id: string; order: number }[]) => void;
  onStartTournament?: () => void;
  isAdmin: boolean;
  filterTeamId?: string | null;
}

type ListItem =
  | { kind: 'match'; match: Match; slot: number }
  | { kind: 'free'; slot: number; field: number; scheduledTime: string | null; key: string };

export default function MatchList({ matches, teams, groups, fieldCount, onUpdateScore, onUpdateMatchScore, onUpdateTime, onReorderMatches, onStartTournament, isAdmin, filterTeamId }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState('');
  const [swapSelected, setSwapSelected] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const startEdit = (match: Match) => {
    setEditingId(match.id);
    setHomeScore(match.homeScore?.toString() || '0');
    setAwayScore(match.awayScore?.toString() || '0');
  };

  const startTimeEdit = (match: Match) => {
    setEditingTimeId(match.id);
    setEditTime(match.scheduledTime || '');
  };

  const saveTime = (matchId: string) => {
    if (editTime && onUpdateTime) {
      onUpdateTime(matchId, editTime);
      setEditingTimeId(null);
    }
  };

  const saveScore = (matchId: string) => {
    const h = parseInt(homeScore);
    const a = parseInt(awayScore);
    if (!isNaN(h) && !isNaN(a) && h >= 0 && a >= 0) {
      if (onUpdateMatchScore) onUpdateMatchScore(matchId, h, a);
    }
  };

  const confirmMatch = (matchId: string) => {
    const h = parseInt(homeScore);
    const a = parseInt(awayScore);
    if (!isNaN(h) && !isNaN(a) && h >= 0 && a >= 0 && onUpdateScore) {
      onUpdateScore(matchId, h, a);
      setEditingId(null);
    }
  };

  const quickGoal = (matchId: string, side: 'home' | 'away', delta: number) => {
    const match = matches.find(m => m.id === matchId);
    if (!match || !onUpdateMatchScore) return;
    const newHome = Math.max(0, (match.homeScore ?? 0) + (side === 'home' ? delta : 0));
    const newAway = Math.max(0, (match.awayScore ?? 0) + (side === 'away' ? delta : 0));
    onUpdateMatchScore(matchId, newHome, newAway);
  };

  const filteredMatches = filterTeamId
    ? matches.filter(m => m.homeTeamId === filterTeamId || m.awayTeamId === filterTeamId)
    : matches;
  const sortedMatches = [...filteredMatches].sort((a, b) => a.order - b.order);
  const unplayed = sortedMatches.filter(m => !m.played);
  const played = sortedMatches.filter(m => m.played);

  const hasActiveMatch = matches.some(m => m.active);
  const hasTournamentStarted = hasActiveMatch || played.length > 0;

  // Determine fieldCount: prop wins, fallback to max field across all matches
  const effectiveFieldCount = fieldCount ?? Math.max(1, ...matches.map(m => m.field));

  // Build a list interleaving real matches and free-slot placeholders.
  // Free slots: for any (slot, field) where the slot has at least one unplayed match
  // but this specific field is empty, render a placeholder using that slot's time.
  // Only enabled when admin, no filter, no DnD reordering active concerns, swap supported.
  const buildItems = (): ListItem[] => {
    const items: ListItem[] = [];
    if (!isAdmin || filterTeamId) {
      // No placeholders for non-admin or filtered view
      for (const m of unplayed) items.push({ kind: 'match', match: m, slot: Math.floor(m.order / effectiveFieldCount) });
      return items;
    }

    // Group unplayed matches by slot
    const bySlot = new Map<number, Match[]>();
    for (const m of unplayed) {
      const slot = Math.floor(m.order / effectiveFieldCount);
      const arr = bySlot.get(slot) ?? [];
      arr.push(m);
      bySlot.set(slot, arr);
    }
    const slots = [...bySlot.keys()].sort((a, b) => a - b);
    for (const slot of slots) {
      const slotMatches = bySlot.get(slot)!;
      // Time for this slot: take any match's scheduledTime
      const slotTime = slotMatches.find(m => m.scheduledTime)?.scheduledTime ?? null;
      const occupiedFields = new Set(slotMatches.map(m => m.field));
      // Order entries for this slot by field 1..N
      for (let f = 1; f <= effectiveFieldCount; f++) {
        const m = slotMatches.find(x => x.field === f);
        if (m) {
          items.push({ kind: 'match', match: m, slot });
        } else if (occupiedFields.size > 0) {
          items.push({
            kind: 'free',
            slot,
            field: f,
            scheduledTime: slotTime,
            key: `free-${slot}-${f}`,
          });
        }
      }
    }
    return items;
  };

  const items = buildItems();

  const handleSwapClick = (id: string) => {
    if (!onReorderMatches) return;
    if (swapSelected === id) {
      setSwapSelected(null);
      return;
    }
    if (!swapSelected) {
      setSwapSelected(id);
      return;
    }

    // We have a previously-selected item and a new clicked item
    const a = swapSelected;
    const b = id;
    setSwapSelected(null);

    const aIsFree = a.startsWith('free-');
    const bIsFree = b.startsWith('free-');
    if (aIsFree && bIsFree) return; // no-op

    const parseFree = (key: string) => {
      const [, slotStr, fieldStr] = key.split('-');
      const slot = parseInt(slotStr, 10);
      const field = parseInt(fieldStr, 10);
      return { slot, field, order: slot * effectiveFieldCount + (field - 1) };
    };

    if (!aIsFree && !bIsFree) {
      // Swap two real matches: exchange their orders
      const ma = matches.find(m => m.id === a);
      const mb = matches.find(m => m.id === b);
      if (!ma || !mb) return;
      onReorderMatches([
        { id: ma.id, order: mb.order },
        { id: mb.id, order: ma.order },
      ]);
      return;
    }

    // One is free, the other is a real match
    const realId = aIsFree ? b : a;
    const freeKey = aIsFree ? a : b;
    const real = matches.find(m => m.id === realId);
    if (!real) return;
    const target = parseFree(freeKey);
    onReorderMatches([{ id: real.id, order: target.order }]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorderMatches) return;

    const oldIndex = unplayed.findIndex(m => m.id === active.id);
    const newIndex = unplayed.findIndex(m => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(unplayed, oldIndex, newIndex);
    const updates = reordered.map((m, i) => ({ id: m.id, order: i }));
    onReorderMatches(updates);
  };

  const sharedProps = {
    teams, groups, allMatches: matches,
    isAdmin, editingId, editingTimeId, homeScore, awayScore, editTime,
    onStartEdit: startEdit, onStartTimeEdit: startTimeEdit,
    onSaveScore: saveScore, onConfirmMatch: confirmMatch, onSaveTime: saveTime,
    onSetHomeScore: setHomeScore, onSetAwayScore: setAwayScore, onSetEditTime: setEditTime,
    onQuickGoal: onUpdateMatchScore ? quickGoal : undefined,
  };

  const renderItems = () => items.map(item => {
    if (item.kind === 'free') {
      return (
        <FreeSlotRow
          key={item.key}
          slotKey={item.key}
          field={item.field}
          scheduledTime={item.scheduledTime}
          swapSelected={swapSelected === item.key}
          onSwapClick={handleSwapClick}
          swapActive={swapSelected !== null && !swapSelected.startsWith('free-')}
        />
      );
    }
    return (
      <MatchRow
        key={item.match.id}
        match={item.match}
        {...sharedProps}
        isPlayed={false}
        sortable={isAdmin && !!onReorderMatches}
        swapSelected={swapSelected === item.match.id}
        onSwapClick={onReorderMatches ? handleSwapClick : undefined}
      />
    );
  });

  return (
    <div className="space-y-4">
      {isAdmin && onStartTournament && !hasTournamentStarted && unplayed.length > 0 && (
        <Button onClick={onStartTournament} className="w-full" variant="default">
          <Play className="mr-2 h-4 w-4" />
          Zahájit turnaj
        </Button>
      )}

      {unplayed.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nadcházející zápasy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {isAdmin && onReorderMatches ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={unplayed.map(m => m.id)} strategy={verticalListSortingStrategy}>
                  {renderItems()}
                </SortableContext>
              </DndContext>
            ) : (
              renderItems()
            )}
          </CardContent>
        </Card>
      )}

      {played.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Odehrané zápasy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {played.map(match => (
              <MatchRow key={match.id} match={match} {...sharedProps} isPlayed />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
