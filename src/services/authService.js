import { supabase } from '../supabaseClient';

export const signInWithGoogle = async () => {
  try {
    console.log('[Auth] Starting Google sign-in...');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        skipBrowserRedirect: false,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) {
      console.error('[Auth] Sign-in error:', error);
      throw error;
    }
    console.log('[Auth] OAuth initiated successfully');
    return { data, error: null };
  } catch (error) {
    console.error('Error signing in with Google:', error);
    return { data, null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error };
  }
};

export const onAuthStateChange = (callback) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    callback(event, session);

    if (event === 'SIGNED_IN' && session?.user) {
      await ensureUserRecord(session.user);
    }
  });

  return subscription;
};

const ensureUserRecord = async (authUser) => {
  try {
    // Check if user record exists
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id')
      .eq('id', authUser.id)
      .maybeSingle(); // Use maybeSingle instead of single to avoid error if not found

    if (selectError) {
      console.error('Error checking user record:', selectError);
      return;
    }

    if (!existingUser) {
      // User record doesn't exist - it should have been created by the database trigger
      // This is likely a timing issue, wait a moment and check again
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: recheckUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!recheckUser) {
        console.warn('⚠️ User record not found. Database trigger may not have run.');
        // Don't try to insert from client - RLS will block it
        // The database trigger should handle user creation
      } else {
        console.log('✅ User record found');
      }
    }
  } catch (error) {
    console.error('Error ensuring user record:', error);
  }
};