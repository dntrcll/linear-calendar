/**
 * Migration script to transfer data from Firebase to Supabase
 *
 * IMPORTANT: Run this script ONCE after setting up your Supabase schema
 *
 * How to use:
 * 1. Make sure you're logged in to your Firebase account
 * 2. Open your browser console on your app
 * 3. Run: window.migrateToSupabase()
 * 4. Check console for migration progress
 *
 * Or run via Node.js (requires firebase-admin setup)
 */

import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { supabase } from '../supabaseClient';

/**
 * Migrate all data for a specific user from Firebase to Supabase
 * @param {string} userId - The user's Firebase/Supabase UUID
 * @param {boolean} dryRun - If true, only log what would be migrated without writing to Supabase
 */
export const migrateUserData = async (userId, dryRun = false) => {
  console.log(`🚀 Starting migration for user: ${userId}`);
  console.log(`Dry run mode: ${dryRun ? 'ON (no data will be written)' : 'OFF'}`);

  const results = {
    events: { total: 0, success: 0, failed: 0 },
    tags: { total: 0, success: 0, failed: 0 },
    errors: []
  };

  try {
    // Step 1: Migrate Tags First (events depend on tags)
    console.log('\n📋 Step 1: Migrating Tags...');

    const tagsQuery = query(collection(db, 'tags'), where('userId', '==', userId));
    const tagsSnapshot = await getDocs(tagsQuery);

    results.tags.total = tagsSnapshot.size;
    console.log(`Found ${tagsSnapshot.size} tags in Firebase`);

    const tagMapping = {}; // Map Firebase tag IDs to Supabase tag UUIDs

    for (const tagDoc of tagsSnapshot.docs) {
      const firebaseTag = tagDoc.data();

      try {
        if (dryRun) {
          console.log('  [DRY RUN] Would migrate tag:', {
            tag_id: firebaseTag.tagId,
            name: firebaseTag.name,
            context: firebaseTag.context
          });
          results.tags.success++;
        } else {
          // Check if tag already exists
          const { data: existingTag } = await supabase
            .from('tags')
            .select('id, tag_id')
            .eq('user_id', userId)
            .eq('tag_id', firebaseTag.tagId)
            .eq('context', firebaseTag.context)
            .single();

          if (existingTag) {
            console.log(`  ℹ️  Tag '${firebaseTag.name}' already exists, skipping`);
            tagMapping[firebaseTag.tagId] = existingTag.id;
            results.tags.success++;
          } else {
            // Insert new tag
            const { data: newTag, error } = await supabase
              .from('tags')
              .insert({
                user_id: userId,
                tag_id: firebaseTag.tagId,
                name: firebaseTag.name,
                icon_name: firebaseTag.iconName,
                context: firebaseTag.context,
                color: firebaseTag.color,
                bg_color: firebaseTag.bgColor,
                text_color: firebaseTag.textColor,
                border_color: firebaseTag.borderColor
              })
              .select()
              .single();

            if (error) throw error;

            tagMapping[firebaseTag.tagId] = newTag.id;
            console.log(`  ✅ Migrated tag: ${firebaseTag.name}`);
            results.tags.success++;
          }
        }
      } catch (error) {
        console.error(`  ❌ Failed to migrate tag: ${firebaseTag.name}`, error);
        results.tags.failed++;
        results.errors.push({ type: 'tag', data: firebaseTag, error: error.message });
      }
    }

    // Step 2: Migrate Events
    console.log('\n📅 Step 2: Migrating Events...');

    const eventsQuery = query(collection(db, 'events'), where('userId', '==', userId));
    const eventsSnapshot = await getDocs(eventsQuery);

    results.events.total = eventsSnapshot.size;
    console.log(`Found ${eventsSnapshot.size} events in Firebase`);

    for (const eventDoc of eventsSnapshot.docs) {
      const firebaseEvent = eventDoc.data();

      try {
        if (dryRun) {
          console.log('  [DRY RUN] Would migrate event:', {
            title: firebaseEvent.title,
            category: firebaseEvent.category,
            start: firebaseEvent.start
          });
          results.events.success++;
        } else {
          // Get the Supabase tag UUID for this event's category
          const tagUuid = tagMapping[firebaseEvent.category];

          if (!tagUuid) {
            throw new Error(`Tag UUID not found for category: ${firebaseEvent.category}`);
          }

          // Convert Firebase Timestamp to ISO string
          const startTime = firebaseEvent.start?.toDate ?
            firebaseEvent.start.toDate().toISOString() :
            new Date(firebaseEvent.start).toISOString();

          const endTime = firebaseEvent.end?.toDate ?
            firebaseEvent.end.toDate().toISOString() :
            new Date(firebaseEvent.end).toISOString();

          // Check if event already exists (by title, start time, and user)
          const { data: existingEvent } = await supabase
            .from('events')
            .select('id')
            .eq('user_id', userId)
            .eq('title', firebaseEvent.title)
            .eq('start_time', startTime)
            .single();

          if (existingEvent) {
            console.log(`  ℹ️  Event '${firebaseEvent.title}' already exists, skipping`);
            results.events.success++;
          } else {
            // Insert new event
            const { error } = await supabase
              .from('events')
              .insert({
                user_id: userId,
                title: firebaseEvent.title,
                description: firebaseEvent.description || '',
                location: firebaseEvent.location || '',
                tag_id: tagUuid,
                context: firebaseEvent.context,
                start_time: startTime,
                end_time: endTime,
                deleted: firebaseEvent.deleted || false,
                deleted_at: firebaseEvent.deletedAt?.toDate ?
                  firebaseEvent.deletedAt.toDate().toISOString() :
                  null
              });

            if (error) throw error;

            console.log(`  ✅ Migrated event: ${firebaseEvent.title}`);
            results.events.success++;
          }
        }
      } catch (error) {
        console.error(`  ❌ Failed to migrate event: ${firebaseEvent.title}`, error);
        results.events.failed++;
        results.errors.push({ type: 'event', data: firebaseEvent, error: error.message });
      }
    }

    // Print Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Tags: ${results.tags.success}/${results.tags.total} successful, ${results.tags.failed} failed`);
    console.log(`Events: ${results.events.success}/${results.events.total} successful, ${results.events.failed} failed`);

    if (results.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      results.errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. [${err.type}] ${err.error}`);
      });
    }

    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN. No data was written to Supabase.');
      console.log('Run with dryRun=false to perform the actual migration.');
    } else {
      console.log('\n✅ Migration complete!');
    }

    return results;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

/**
 * Helper function to be called from browser console
 * Usage: window.migrateToSupabase()
 */
if (typeof window !== 'undefined') {
  window.migrateToSupabase = async (dryRun = true) => {
    try {
      // Get current user from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error('❌ No user logged in. Please log in first.');
        return;
      }

      console.log(`Found logged in user: ${user.email}`);
      console.log('Starting migration...\n');

      return await migrateUserData(user.id, dryRun);
    } catch (error) {
      console.error('❌ Migration error:', error);
      throw error;
    }
  };

  console.log('✅ Migration utility loaded!');
  console.log('To migrate your data, run: window.migrateToSupabase(false)');
  console.log('For a dry run (no changes), run: window.migrateToSupabase(true)');
}

export default migrateUserData;
