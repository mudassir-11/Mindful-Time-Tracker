# Security Specification - Hours App

## Data Invariants
1. A log entry must belong to the authenticated user.
2. An hour must be between 0 and 23.
3. A category ID must match one of the user's defined categories (though strict relational check on dynamic arrays in user doc is hard in rules without performance hit, we'll enforce type and ownership).
4. Goals and Journals must be owned by the creator.

## The Dirty Dozen Payloads

1. **Identity Theft (Create Log for Other):** `activityLogs/hack` { userId: 'victim_id', date: '2026-05-05', hour: 10, categoryId: 'work' } - **Expected: DENIED**
2. **Invalid Hour (Negative):** `activityLogs/invalid` { userId: 'current_user', date: '2026-05-05', hour: -1 } - **Expected: DENIED**
3. **Invalid Hour (Overflow):** `activityLogs/invalid` { userId: 'current_user', date: '2026-05-05', hour: 24 } - **Expected: DENIED**
4. **Time Poisoning (Giant Date):** `activityLogs/poison` { userId: 'current_user', date: 'A'.repeat(1000), hour: 10 } - **Expected: DENIED**
5. **Goal Hijack (Update Target):** `goals/friend_goal` { targetHoursPerDay: 0 } as non-owner. - **Expected: DENIED**
6. **Journal Tampering (Update Content):** `journals/friend_journal` { content: 'hacked' } as non-owner. - **Expected: DENIED**
7. **Shadow Field Injection:** `users/uid` { isAdmin: true } (User tries to upgrade themselves). - **Expected: DENIED**
8. **Invalid Data Type (Goal):** `goals/id` { targetHoursPerDay: "ten hours" } - **Expected: DENIED**
9. **Missing Required Field (Log):** `activityLogs/id` { userId: 'uid', date: '...'} (missing hour) - **Expected: DENIED**
10. **ID Poisoning (Malformed Log ID):** `activityLogs/!!@@##` { ... } - **Expected: DENIED**
11. **PII Leak (List All Users):** `users/` - **Expected: DENIED (unless owner)**
12. **Future Log (Anti-Cheat):** `activityLogs/future` { createdAt: <future_timestamp> } - **Expected: DENIED**

## The Test Runner
I will verify these patterns in the rules.
