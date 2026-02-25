// src/services/notifications.js
// ================================================
// IN-APP + BROWSER NOTIFICATIONS via Supabase Realtime
// ================================================
import { supabase } from "./supabase";

// Request browser notification permission
export async function requestBrowserPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

// Show a browser notification (works even when on another tab)
function showBrowserNotification(title, body) {
  if (Notification.permission === "granted") {
    try {
      new Notification(title, {
        body: body,
        icon: "/sfl-logo.png",
        badge: "/favicon.ico",
      });
    } catch (e) {
      // Some browsers don't support this
      console.log("Browser notification not supported:", e);
    }
  }
}

// Listen for NEW suggestions (for Reviewers & Management)
export function subscribeToNewSuggestions(onNotification) {
  const channel = supabase
    .channel("new-suggestions")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "suggestions",
      },
      (payload) => {
        const sug = payload.new;
        const title = "📥 New Suggestion";
        const body = `${sug.employee_name} submitted a suggestion for ${sug.area}`;

        // In-app notification
        onNotification({ title, body, type: "new", data: sug });

        // Browser notification (if on another tab)
        showBrowserNotification(title, body);
      }
    )
    .subscribe();

  return channel;
}

// Listen for STATUS CHANGES on suggestions (for Employees)
export function subscribeToStatusChanges(employeeName, onNotification) {
  const channel = supabase
    .channel("status-changes")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "suggestions",
      },
      (payload) => {
        const oldRow = payload.old;
        const newRow = payload.new;

        // Only notify if status actually changed
        if (oldRow.status === newRow.status) return;

        // Only notify the employee who submitted this suggestion
        if (newRow.employee_name !== employeeName) return;

        let emoji = "📋";
        if (newRow.status === "Approved") emoji = "✅";
        if (newRow.status === "Rejected") emoji = "❌";
        if (newRow.status === "Need Clarification") emoji = "❓";
        if (newRow.status === "Implementing") emoji = "🔨";
        if (newRow.status === "Implemented") emoji = "🎉";
        if (newRow.status === "Closed") emoji = "🔒";

        const title = `${emoji} Suggestion ${newRow.suggestion_id} Updated`;
        const body = `Your suggestion has been ${newRow.status.toLowerCase()}`;

        onNotification({ title, body, type: "status", data: newRow });
        showBrowserNotification(title, body);
      }
    )
    .subscribe();

  return channel;
}

// Listen for ALL status changes (for Reviewers & Management who also submit)
export function subscribeToAllStatusChanges(userName, onNotification) {
  const channel = supabase
    .channel("all-status-changes")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "suggestions",
      },
      (payload) => {
        const oldRow = payload.old;
        const newRow = payload.new;

        if (oldRow.status === newRow.status) return;

        // Notify if this user submitted the suggestion
        if (newRow.employee_name !== userName) return;

        let emoji = "📋";
        if (newRow.status === "Approved") emoji = "✅";
        if (newRow.status === "Rejected") emoji = "❌";
        if (newRow.status === "Need Clarification") emoji = "❓";

        const title = `${emoji} Your Suggestion Updated`;
        const body = `${newRow.suggestion_id} is now: ${newRow.status}`;

        onNotification({ title, body, type: "status", data: newRow });
        showBrowserNotification(title, body);
      }
    )
    .subscribe();

  return channel;
}

// Cleanup — call when user logs out
export function unsubscribeAll() {
  supabase.removeAllChannels();
}
