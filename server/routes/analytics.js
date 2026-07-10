import express from 'express';
import { supabase as supabaseAdmin } from '../supabase/client.js';

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function cutoffDate(range) {
  if (!range || range === 'all') return null;
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function afterCutoff(arr, cutoff) {
  if (!cutoff) return arr;
  return arr.filter(r => r.created_at >= cutoff);
}

// Wraps any Supabase query — always resolves to { data: [] }, never throws.
function safe(query) {
  return query
    .then(({ data, error }) => {
      if (error) {
        console.warn('[analytics] query error (returning []):', error.message);
        return { data: [] };
      }
      return { data: data ?? [] };
    })
    .catch((err) => {
      console.warn('[analytics] query threw (returning []):', err?.message);
      return { data: [] };
    });
}

// ── GET /api/admin/analytics?range=7d|30d|90d|all ────────────────────────────
router.get('/', async (req, res) => {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const authResp = await supabaseAdmin.auth.getUser(token);
    const user = authResp.data?.user;
    if (authResp.error || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const r = profile?.role;
    if (r !== 'admin' && r !== 'creator_admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    // ── Range ─────────────────────────────────────────────────────────────────
    const range  = req.query.range || 'all';
    const cutoff = cutoffDate(range);

    // ── Parallel queries ──────────────────────────────────────────────────────
    const [
      contestsRes,
      eventsRes,
      profilesRes,
      ticketsRes,
      winnersRes,
      entriesRes,
      votesRes,
    ] = await Promise.all([
      safe(supabaseAdmin.from('contests').select('id, title, status, created_at')),
      safe(supabaseAdmin.from('events').select('id, title, created_at')),
      safe(supabaseAdmin.from('profiles').select('id, created_at')),
      safe(supabaseAdmin.from('ticket_purchases').select('id, event_id, ticket_price, created_at')),
      safe(supabaseAdmin.from('winner_history').select('id, user_id, place_number, contest_id, event_id, created_at')),
      safe(supabaseAdmin.from('submissions').select('id, contest_id, user_email, created_at').not('contest_id', 'is', null).limit(2000)),
      safe(supabaseAdmin.from('likes').select('id, created_at').limit(5000)),
    ]);

    const allContests = contestsRes.data;
    const allEvents   = eventsRes.data;
    const allProfiles = profilesRes.data;
    const allTickets  = ticketsRes.data;
    const allWinners  = winnersRes.data;
    const allEntries  = entriesRes.data;
    const allVotes    = votesRes.data;

    // ── Apply range filter ────────────────────────────────────────────────────
    const contests = afterCutoff(allContests, cutoff);
    const events   = afterCutoff(allEvents,   cutoff);
    const profiles = afterCutoff(allProfiles, cutoff);
    const tickets  = afterCutoff(allTickets,  cutoff);
    const winners  = afterCutoff(allWinners,  cutoff);
    const entries  = afterCutoff(allEntries,  cutoff);
    const votes    = afterCutoff(allVotes,    cutoff);

    // ── Computed totals ───────────────────────────────────────────────────────
    const totalRevenue  = tickets.reduce((s, t) => s + Number(t.ticket_price || 0), 0);
    const uniqueWinners = new Set(winners.map(w => w.user_id)).size;

    // ── Tickets by day ────────────────────────────────────────────────────────
    const ticketsByDay = Object.values(
      tickets.reduce((acc, t) => {
        const day = t.created_at?.slice(0, 10);
        if (!day) return acc;
        if (!acc[day]) acc[day] = { date: day, count: 0, revenue: 0 };
        acc[day].count++;
        acc[day].revenue += Number(t.ticket_price || 0);
        return acc;
      }, {})
    ).sort((a, b) => a.date.localeCompare(b.date));

    // ── Revenue by event ──────────────────────────────────────────────────────
    const revenueByEvent = Object.values(
      allTickets.reduce((acc, t) => {
        if (!t.event_id) return acc;
        if (!acc[t.event_id]) acc[t.event_id] = { eventId: t.event_id, count: 0, revenue: 0 };
        acc[t.event_id].count++;
        acc[t.event_id].revenue += Number(t.ticket_price || 0);
        return acc;
      }, {})
    )
      .map(v => ({
        ...v,
        title: allEvents.find(e => e.id === v.eventId)?.title?.slice(0, 22) || 'Unknown',
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    // ── Winners by place ──────────────────────────────────────────────────────
    const winnersByPlace = Object.entries(
      allWinners.reduce((acc, w) => {
        const p = w.place_number || 1;
        acc[p] = (acc[p] || 0) + 1;
        return acc;
      }, {})
    )
      .map(([place, count]) => ({ place: Number(place), count, name: `Place ${place}` }))
      .sort((a, b) => a.place - b.place);

    // ── New users by week ─────────────────────────────────────────────────────
    const usersByWeek = Object.values(
      allProfiles.reduce((acc, p) => {
        if (!p.created_at) return acc;
        const d    = new Date(p.created_at);
        const week = `${d.getFullYear()}-W${String(
          Math.ceil(((d - new Date(d.getFullYear(), 0, 1)) / 86400000 + 1) / 7)
        ).padStart(2, '0')}`;
        if (!acc[week]) acc[week] = { week, count: 0 };
        acc[week].count++;
        return acc;
      }, {})
    ).sort((a, b) => a.week.localeCompare(b.week)).slice(-12);

    // ── Top events by ticket sales ────────────────────────────────────────────
    const topEvents = revenueByEvent.slice(0, 5).map(ev => ({
      id:          ev.eventId,
      title:       allEvents.find(e => e.id === ev.eventId)?.title || 'Unknown',
      ticketsSold: ev.count,
      revenue:     ev.revenue,
      date:        allEvents.find(e => e.id === ev.eventId)?.created_at,
    }));

    // ── Top contests by entries ───────────────────────────────────────────────
    const entryMap = allEntries.reduce((acc, e) => {
      if (!acc[e.contest_id]) acc[e.contest_id] = { count: 0, emails: new Set() };
      acc[e.contest_id].count++;
      if (e.user_email) acc[e.contest_id].emails.add(e.user_email);
      return acc;
    }, {});
    const winnerContestMap = allWinners.reduce((acc, w) => {
      if (w.contest_id) acc[w.contest_id] = (acc[w.contest_id] || 0) + 1;
      return acc;
    }, {});
    const topContests = allContests
      .map(c => ({
        id:           c.id,
        title:        c.title,
        status:       c.status,
        entries:      entryMap[c.id]?.count || 0,
        participants: entryMap[c.id]?.emails.size || 0,
        winners:      winnerContestMap[c.id] || 0,
      }))
      .sort((a, b) => b.entries - a.entries)
      .slice(0, 6);

    // ── Recent activity feed ──────────────────────────────────────────────────
    const activity = [
      ...contests.map(c => ({ type: 'contest', icon: '🎵', text: `Contest created: "${c.title}"`,                            ts: c.created_at })),
      ...events.map(e   => ({ type: 'event',   icon: '🎤', text: `Event created: "${e.title}"`,                              ts: e.created_at })),
      ...profiles.map(p => ({ type: 'user',    icon: '👤', text: 'New user registered',                                      ts: p.created_at })),
      ...tickets.map(t  => ({ type: 'ticket',  icon: '🎟', text: `Ticket purchased — $${Number(t.ticket_price).toFixed(2)}`, ts: t.created_at })),
      ...winners.map(w  => ({ type: 'winner',  icon: '🏆', text: `Winner selected — place #${w.place_number}`,               ts: w.created_at })),
    ]
      .filter(a => a.ts)
      .sort((a, b) => b.ts.localeCompare(a.ts))
      .slice(0, 20);

    res.json({
      contests:    contests.length,
      submissions: entries.length,
      votes:       votes.length,
      events:      events.length,
      revenue:     totalRevenue,

      totals: {
        contests:        contests.length,
        events:          events.length,
        users:           profiles.length,
        ticketPurchases: tickets.length,
        submissions:     entries.length,
        votes:           votes.length,
        revenue:         totalRevenue,
        winners:         winners.length,
        uniqueWinners,
      },

      ticketsByDay,
      revenueByEvent,
      winnersByPlace,
      usersByWeek,
      topEvents,
      topContests,
      recentActivity: activity,
    });
  } catch (err) {
    console.error('[analytics] unhandled error:', err.message);
    res.status(500).json({
      error:       'Failed to load analytics data.',
      contests:    0,
      submissions: 0,
      votes:       0,
      events:      0,
      revenue:     0,
      totals: {
        contests: 0, events: 0, users: 0, ticketPurchases: 0,
        submissions: 0, votes: 0, revenue: 0, winners: 0, uniqueWinners: 0,
      },
      ticketsByDay:   [],
      revenueByEvent: [],
      winnersByPlace: [],
      usersByWeek:    [],
      topEvents:      [],
      topContests:    [],
      recentActivity: [],
    });
  }
});

export default router;
