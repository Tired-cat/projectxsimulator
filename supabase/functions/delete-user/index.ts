import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await adminClient.rpc('is_admin', { _user_id: caller.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_id } = await req.json();
    if (!user_id || typeof user_id !== 'string') {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (user_id === caller.id) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete all related data first (service role bypasses RLS)
    const userIdTables = [
      'ai_feedback_events',
      'allocation_events',
      'board_events',
      'navigation_events',
      'tutorial_events',
      'resets',
      'submissions',
      'reasoning_board_state',
      'sessions',
      'student_enrollments',
      'user_roles',
    ];

    for (const table of userIdTables) {
      const { error } = await adminClient.from(table).delete().eq('user_id', user_id);
      if (error) console.error(`Error deleting from ${table}:`, error.message);
    }

    // Delete profile (uses 'id' column)
    const { error: profileErr } = await adminClient.from('profiles').delete().eq('id', user_id);
    if (profileErr) console.error('Error deleting profile:', profileErr.message);

    // Delete user from auth.users (ignore "not found" — may already be gone)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);
    if (deleteError && !deleteError.message.includes('not found')) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});