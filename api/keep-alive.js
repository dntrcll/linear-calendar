// Keep-alive cron — pings the database daily so the Supabase free-tier
// project never hits the ~7-day inactivity auto-pause.
// Triggered by Vercel Cron (see "crons" in vercel.json). A single lightweight
// read counts as project activity and resets the inactivity timer.
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  // If CRON_SECRET is configured in Vercel, Vercel Cron sends it as a Bearer
  // token. Reject anything that doesn't match so the endpoint can't be abused.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization || '';
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Trivial read — bypasses RLS via the service role key. `head: true` fetches
    // no rows, just enough to register database activity.
    const { error } = await supabase
      .from('tags')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('Keep-alive query error:', error.message);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({ ok: true, pingedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Keep-alive error:', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
};
