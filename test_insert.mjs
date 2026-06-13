import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://diiyuvqhxturpebbutec.supabase.co', 'sb_publishable_QEaPmnD1W-dVYsfHrGkiWg_Z8EACr6o');

async function run() {
  const t = {
    id: crypto.randomUUID(),
    name: 'Test Tournament 2',
    date: '2026-06-11', // same day
    fieldCount: 2,
    password: '123',
    phase: 'group',
    category: 'Test',
    matchDurationMinutes: 10,
    breakDurationMinutes: 2,
    startTime: '10:00',
    roundCount: 1,
    tiebreakerRule: 'head_to_head',
    playoffFormat: 'bracket',
    playoffMatchDurationMinutes: null,
    playoffConsolationMatches: false,
    playoffStartTime: null
  };

  const { error: tErr } = await supabase.from('tournaments').insert({
    id: t.id, name: t.name, date: t.date,
    field_count: t.fieldCount, password: t.password, phase: t.phase,
    category: t.category,
    match_duration_minutes: t.matchDurationMinutes,
    break_duration_minutes: t.breakDurationMinutes,
    start_time: t.startTime,
    round_count: t.roundCount,
    playoff_start_time: t.playoffStartTime || null,
    tiebreaker_rule: t.tiebreakerRule,
    playoff_format: t.playoffFormat,
    playoff_match_duration_minutes: t.playoffMatchDurationMinutes,
    playoff_consolation_matches: t.playoffConsolationMatches,
  });

  console.log('Tournament insert:', tErr);
}

run();
