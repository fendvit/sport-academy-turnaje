import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://diiyuvqhxturpebbutec.supabase.co', 'sb_publishable_QEaPmnD1W-dVYsfHrGkiWg_Z8EACr6o');

async function run() {
  const { data: groups, error: gErr } = await supabase.from('groups').select('id, name');
  if (gErr) { console.error('Error fetching groups', gErr); return; }

  const { data: teams, error: tErr } = await supabase.from('teams').select('group_id');
  if (tErr) { console.error('Error fetching teams', tErr); return; }

  const { data: matches, error: mErr } = await supabase.from('matches').select('group_id');
  if (mErr) { console.error('Error fetching matches', mErr); return; }

  const usedGroupIds = new Set([
    ...teams.map(t => t.group_id),
    ...matches.map(m => m.group_id)
  ].filter(Boolean));

  const unusedGroups = groups.filter(g => !usedGroupIds.has(g.id));
  console.log(`Found ${unusedGroups.length} unused groups.`);

  if (unusedGroups.length > 0) {
    const { error: delErr } = await supabase.from('groups').delete().in('id', unusedGroups.map(g => g.id));
    if (delErr) {
      console.error('Failed to delete', delErr);
    } else {
      console.log('Successfully deleted unused groups!');
    }
  }
}

run();
