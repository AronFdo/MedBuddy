# Database Performance Optimization Guide

This guide outlines optimizations to improve database load speed and reduce latency in the MedBuddy application.

## Table of Contents
1. [Database Indexing](#database-indexing)
2. [Query Optimization](#query-optimization)
3. [Caching Strategies](#caching-strategies)
4. [Connection Pooling](#connection-pooling)
5. [Pagination & Limits](#pagination--limits)
6. [Real-time Subscriptions](#real-time-subscriptions)
7. [Batch Operations](#batch-operations)
8. [Supabase-Specific Optimizations](#supabase-specific-optimizations)

---

## Database Indexing

### Critical Indexes to Add

Add these indexes to improve query performance on frequently filtered columns:

```sql
-- Profiles table (most queried by user_id)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at DESC);

-- Medications table (queried by profile_id frequently)
CREATE INDEX IF NOT EXISTS idx_medications_profile_id ON medications(profile_id);
CREATE INDEX IF NOT EXISTS idx_medications_prescription_id ON medications(prescription_id);
CREATE INDEX IF NOT EXISTS idx_medications_medication_id ON medications(medication_id);

-- Appointments table
CREATE INDEX IF NOT EXISTS idx_appointments_profile_id ON appointments(profile_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_attended ON appointments(attended) WHERE attended = false;

-- Health Records table
CREATE INDEX IF NOT EXISTS idx_health_records_profile_id ON health_records(profile_id);
CREATE INDEX IF NOT EXISTS idx_health_records_event_date ON health_records(event_date DESC);

-- Medication Logs table (queried by profile_id and date)
CREATE INDEX IF NOT EXISTS idx_medication_logs_profile_id ON medication_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_log_date ON medication_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_medication_logs_profile_date ON medication_logs(profile_id, log_date DESC);

-- AI Conversations table
CREATE INDEX IF NOT EXISTS idx_ai_conversations_profile_id ON ai_conversations(profile_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_profile_created ON ai_conversations(profile_id, created_at DESC);

-- Prescriptions table
CREATE INDEX IF NOT EXISTS idx_prescriptions_profile_id ON prescriptions(profile_id);
```

### Composite Indexes for Common Query Patterns

```sql
-- For queries filtering by profile_id and ordering by date
CREATE INDEX IF NOT EXISTS idx_appointments_profile_date ON appointments(profile_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_health_records_profile_event_date ON health_records(profile_id, event_date DESC);
```

**Impact**: Indexes can reduce query time from 100-500ms to 5-20ms for filtered queries.

---

## Query Optimization

### 1. Parallelize Sequential Queries

**Current Issue**: In `HomeDashboard.tsx`, queries run sequentially, adding up latency.

**Before** (Sequential - ~400-800ms total):
```typescript
const { data: meds } = await supabase.from('medications')...;
const { data: appts } = await supabase.from('appointments')...;
const { data: records } = await supabase.from('health_records')...;
const { data: logData } = await supabase.from('medication_logs')...;
```

**After** (Parallel - ~100-200ms total):
```typescript
const [medsResult, apptsResult, recordsResult, logResult] = await Promise.all([
  supabase.from('medications').select(`*, prescriptions:prescription_id (id, doctor_name, issued_date, notes)`).eq('profile_id', profile.id),
  supabase.from('appointments').select('appointment_id, profile_id, date, doctor_name, visit_reason, notes, time, location, attended, attended_date').eq('profile_id', profile.id),
  supabase.from('health_records').select('*').eq('profile_id', profile.id),
  supabase.from('medication_logs').select('*').eq('profile_id', profile.id).gte('log_date', twoDaysAgoStr).order('log_date', { ascending: false })
]);

const { data: meds, error: medsError } = medsResult;
const { data: appts, error: apptError } = apptsResult;
const { data: records, error: recordsError } = recordsResult;
const { data: logData, error: logError } = logResult;
```

**Apply to**:
- `HomeDashboard.tsx` (lines 207-263)
- `Profile.tsx` (lines 1002-1026)
- `Appointments.tsx` (lines 1001-1022)
- `backend/api/ai-chat.js` (lines 21-45)

### 2. Select Only Required Fields

**Current Issue**: Many queries use `select('*')` fetching unnecessary data.

**Before**:
```typescript
.select('*')  // Fetches all columns
```

**After** (Select only what you need):
```typescript
// For dashboard summary
.select('id, name, dosage, frequency, days_remaining, prescription_id')

// For health records list
.select('id, event_date, record_type, title, attachment_url')
```

**Impact**: Reduces payload size by 30-60%, improving network transfer time.

### 3. Use Query Limits

**Current Issue**: Some queries fetch all records without limits.

**Add limits**:
```typescript
// For recent activity
.select('*').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(10)

// For appointments list
.select('*').eq('profile_id', profile.id).order('date', { ascending: false }).limit(50)
```

---

## Caching Strategies

### 1. Implement React Query or SWR

Install React Query for intelligent caching:

```bash
cd frontend
npm install @tanstack/react-query
```

**Create a query hook** (`frontend/lib/hooks/useMedications.ts`):
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';

export function useMedications(profileId: string | null) {
  return useQuery({
    queryKey: ['medications', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('medications')
        .select('*, prescriptions:prescription_id (id, doctor_name, issued_date, notes)')
        .eq('profile_id', profileId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profileId,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

**Benefits**:
- Automatic caching (no refetch on remount)
- Background refetching
- Request deduplication
- Optimistic updates

### 2. In-Memory Cache for Profile Data

**Update `ProfileContext.tsx`** to cache profile data:

```typescript
// Add cache with TTL
const profileCache = new Map<string, { data: Profile[], timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

const refreshProfiles = async () => {
  setLoading(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Check cache first
      const cached = profileCache.get(user.id);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setProfiles(cached.data);
        // ... set profile logic
        setLoading(false);
        return;
      }

      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      
      // Update cache
      profileCache.set(user.id, { data: allProfiles || [], timestamp: Date.now() });
      
      setProfiles(allProfiles || []);
      // ... rest of logic
    }
  } catch (error) {
    console.error('Error refreshing profiles:', error);
  } finally {
    setLoading(false);
  }
};
```

### 3. Backend Response Caching

**For AI Chat endpoint** (`backend/api/ai-chat.js`), cache medication/appointment data:

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5 minute TTL

router.post('/api/ai-chat', async (req, res) => {
  const { profile_id } = req.body;
  
  // Check cache for context data
  const cacheKey = `profile_context_${profile_id}`;
  let contextData = cache.get(cacheKey);
  
  if (!contextData) {
    // Fetch in parallel
    const [medsResult, apptsResult, historyResult] = await Promise.all([
      supabase.from('medications').select('name, dosage, frequency, explanation_en').eq('profile_id', profile_id),
      supabase.from('appointments').select('doctor_name, date, notes').eq('profile_id', profile_id),
      supabase.from('ai_conversations').select('message, sender, created_at').eq('profile_id', profile_id).order('created_at', { ascending: true }).limit(20)
    ]);
    
    contextData = {
      medications: medsResult.data || [],
      appointments: apptsResult.data || [],
      history: historyResult.data || []
    };
    
    cache.set(cacheKey, contextData);
  }
  
  // Use cached contextData for prompt building
  // ... rest of logic
});
```

---

## Connection Pooling

### Supabase Client Configuration

**Update `frontend/lib/supabase.ts`**:

```typescript
import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'x-client-info': 'medbuddy-frontend',
      },
    },
    // Enable connection pooling hints
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
```

**Update `backend/supabaseClient.js`**:

```javascript
const { createClient } = require('@supabase/supabase-js');

let cachedClient = null;

function getSupabase() {
  if (cachedClient) return cachedClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  cachedClient = createClient(supabaseUrl, supabaseKey, {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false, // Backend doesn't need session persistence
    },
    global: {
      headers: {
        'x-client-info': 'medbuddy-backend',
      },
    },
  });
  
  return cachedClient;
}
```

---

## Pagination & Limits

### Implement Cursor-Based Pagination

**For large lists** (medications, appointments, health records):

```typescript
// Create a reusable pagination hook
export function usePaginatedQuery<T>(
  table: string,
  profileId: string,
  pageSize: number = 20
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const loadMore = async () => {
    if (!hasMore || loading) return;
    
    setLoading(true);
    const { data: newData, error } = await supabase
      .from(table)
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) {
      console.error(`Error loading ${table}:`, error);
      return;
    }
    
    if (newData && newData.length > 0) {
      setData(prev => [...prev, ...newData]);
      setPage(prev => prev + 1);
      setHasMore(newData.length === pageSize);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  };

  return { data, loading, hasMore, loadMore, refresh: () => { setData([]); setPage(0); setHasMore(true); loadMore(); } };
}
```

**Apply to**:
- Medications list (limit to 50 initially)
- Appointments list (limit to 30 initially)
- Health records (limit to 20 initially)

---

## Real-time Subscriptions

### Use Supabase Realtime for Live Updates

**Instead of polling**, use real-time subscriptions:

```typescript
// In HomeDashboard.tsx
useEffect(() => {
  if (!profile) return;

  // Subscribe to medication changes
  const medSubscription = supabase
    .channel('medications-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'medications', filter: `profile_id=eq.${profile.id}` },
      (payload) => {
        console.log('Medication changed:', payload);
        // Update local state or refetch
        refreshMedications();
      }
    )
    .subscribe();

  // Subscribe to appointment changes
  const apptSubscription = supabase
    .channel('appointments-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'appointments', filter: `profile_id=eq.${profile.id}` },
      (payload) => {
        console.log('Appointment changed:', payload);
        refreshAppointments();
      }
    )
    .subscribe();

  return () => {
    medSubscription.unsubscribe();
    apptSubscription.unsubscribe();
  };
}, [profile]);
```

**Benefits**:
- Instant UI updates when data changes
- Reduces unnecessary polling
- Better user experience

---

## Batch Operations

### Batch Inserts/Updates

**For medication logs** (`Medications.tsx`):

```typescript
// Instead of individual inserts, batch them
const logEntries = medications.map(med => ({
  profile_id: profile.id,
  medication_id: med.medication_id,
  log_date: today,
  taken: true,
  taken_time: new Date().toISOString(),
}));

const { error } = await supabase
  .from('medication_logs')
  .insert(logEntries); // Single query instead of N queries
```

**For AI conversation inserts** (`backend/api/ai-chat.js`):

```javascript
// Already batching, but ensure it's atomic
const { error: insertError } = await supabase
  .from('ai_conversations')
  .insert([
    { profile_id, message, sender: 'user' },
    { profile_id, message: aiResponse, sender: 'bot' }
  ], { returning: 'minimal' }); // Don't return data if not needed
```

---

## Supabase-Specific Optimizations

### 1. Use RPC Functions for Complex Queries

**Create a database function** for dashboard data:

```sql
CREATE OR REPLACE FUNCTION get_dashboard_data(p_profile_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'medications', (
      SELECT json_agg(row_to_json(m))
      FROM medications m
      WHERE m.profile_id = p_profile_id
    ),
    'appointments', (
      SELECT json_agg(row_to_json(a))
      FROM appointments a
      WHERE a.profile_id = p_profile_id
    ),
    'health_records', (
      SELECT json_agg(row_to_json(h))
      FROM health_records h
      WHERE h.profile_id = p_profile_id
      LIMIT 10
    ),
    'recent_logs', (
      SELECT json_agg(row_to_json(l))
      FROM medication_logs l
      WHERE l.profile_id = p_profile_id
        AND l.log_date >= CURRENT_DATE - INTERVAL '2 days'
      ORDER BY l.log_date DESC
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

**Call from frontend**:
```typescript
const { data, error } = await supabase.rpc('get_dashboard_data', {
  p_profile_id: profile.id
});
```

**Benefits**: Single round-trip instead of 4+ queries.

### 2. Enable Query Performance Monitoring

**Add to Supabase dashboard**:
- Go to Database → Reports
- Monitor slow queries (>100ms)
- Identify N+1 query patterns

### 3. Use Materialized Views for Aggregations

**For statistics** (medication counts, upcoming appointments):

```sql
CREATE MATERIALIZED VIEW profile_stats AS
SELECT 
  profile_id,
  COUNT(DISTINCT medication_id) as medication_count,
  COUNT(DISTINCT appointment_id) FILTER (WHERE date >= CURRENT_DATE) as upcoming_appointments,
  MAX(event_date) as last_health_record_date
FROM profiles p
LEFT JOIN medications m ON m.profile_id = p.id
LEFT JOIN appointments a ON a.profile_id = p.id
LEFT JOIN health_records h ON h.profile_id = p.id
GROUP BY profile_id;

-- Refresh periodically (or via trigger)
CREATE INDEX idx_profile_stats_profile_id ON profile_stats(profile_id);
```

**Refresh strategy**: Update on INSERT/UPDATE triggers or cron job.

---

## Implementation Priority

### High Priority (Immediate Impact)
1. ✅ Add database indexes (5-10 minutes)
2. ✅ Parallelize queries in HomeDashboard (15 minutes)
3. ✅ Add query limits (10 minutes)
4. ✅ Select only required fields (30 minutes)

### Medium Priority (Significant Improvement)
5. ⚠️ Implement React Query caching (2-3 hours)
6. ⚠️ Add pagination to large lists (1-2 hours)
7. ⚠️ Batch operations where applicable (1 hour)

### Low Priority (Nice to Have)
8. 📋 Real-time subscriptions (2-3 hours)
9. 📋 RPC functions for complex queries (2-3 hours)
10. 📋 Materialized views (1-2 hours)

---

## Monitoring & Measurement

### Track Performance Metrics

**Add performance logging**:

```typescript
// Create a performance wrapper
export async function timedQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await queryFn();
    const duration = performance.now() - start;
    console.log(`[Query] ${queryName}: ${duration.toFixed(2)}ms`);
    
    // Log slow queries
    if (duration > 200) {
      console.warn(`[Slow Query] ${queryName} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[Query Error] ${queryName} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}

// Usage
const { data } = await timedQuery('fetchMedications', () =>
  supabase.from('medications').select('*').eq('profile_id', profile.id)
);
```

---

## Expected Performance Improvements

| Optimization | Current | After | Improvement |
|-------------|---------|-------|-------------|
| Dashboard load (sequential) | 400-800ms | 100-200ms | **75% faster** |
| Indexed queries | 100-500ms | 5-20ms | **95% faster** |
| Cached profile data | 50-100ms | 0-5ms | **90% faster** |
| Paginated lists | 200-500ms | 50-100ms | **75% faster** |
| AI chat context fetch | 300-600ms | 100-200ms | **66% faster** |

**Total expected improvement**: 60-80% reduction in database-related latency.

---

## Next Steps

1. **Run the index creation SQL** in Supabase SQL Editor
2. **Update HomeDashboard.tsx** to parallelize queries
3. **Add React Query** for caching (optional but recommended)
4. **Monitor query performance** using Supabase dashboard
5. **Iterate** based on real-world usage patterns

For questions or issues, refer to:
- [Supabase Performance Guide](https://supabase.com/docs/guides/database/performance)
- [PostgreSQL Indexing Best Practices](https://www.postgresql.org/docs/current/indexes.html)

