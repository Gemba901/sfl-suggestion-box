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
      console.log("Browser notification not supported:", e);
    }
  }
}

// Helper: build star string like ★★★☆☆
function starString(rating) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
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

// Listen for STATUS + RATING changes on suggestions (for Employees)
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

        // Only notify the employee who submitted this suggestion
        if (newRow.employee_name !== employeeName) return;

        // Check if status changed (oldRow may only have id without REPLICA IDENTITY FULL)
        const statusChanged = oldRow.status ? (oldRow.status !== newRow.status) : true;

        // Check if a rating was given — if status is Closed and rating > 0, show rating notif
        if (newRow.impact_rating > 0 && newRow.status === "Closed") {
          const stars = starString(newRow.impact_rating);
          const title = `⭐ Your Suggestion ${newRow.suggestion_id} Was Rated!`;
          let body = `${stars} — Impact Rating: ${newRow.impact_rating}/5`;
          if (newRow.rating_comment) {
            body += ` — "${newRow.rating_comment}"`;
          }

          onNotification({ title, body, type: "rating", data: newRow });
          showBrowserNotification(title, body);
          return; // Don't also send status notification
        }

        // STATUS NOTIFICATION
        if (statusChanged) {
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
      }
    )
    .subscribe();

  return channel;
}

// Listen for ALL status + rating changes (for Reviewers & Management who also submit)
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

        // Only notify if this user submitted the suggestion
        if (newRow.employee_name !== userName) return;

        const statusChanged = oldRow.status ? (oldRow.status !== newRow.status) : true;

        // RATING NOTIFICATION — Closed with a rating
        if (newRow.impact_rating > 0 && newRow.status === "Closed") {
          const stars = starString(newRow.impact_rating);
          const title = `⭐ Your Suggestion ${newRow.suggestion_id} Was Rated!`;
          let body = `${stars} — Impact Rating: ${newRow.impact_rating}/5`;
          if (newRow.rating_comment) {
            body += ` — "${newRow.rating_comment}"`;
          }

          onNotification({ title, body, type: "rating", data: newRow });
          showBrowserNotification(title, body);
          return;
        }

        // STATUS NOTIFICATION
        if (statusChanged) {
          let emoji = "📋";
          if (newRow.status === "Approved") emoji = "✅";
          if (newRow.status === "Rejected") emoji = "❌";
          if (newRow.status === "Need Clarification") emoji = "❓";
          if (newRow.status === "Implementing") emoji = "🔨";
          if (newRow.status === "Implemented") emoji = "🎉";
          if (newRow.status === "Closed") emoji = "🔒";

          const title = `${emoji} Your Suggestion Updated`;
          const body = `${newRow.suggestion_id} is now: ${newRow.status}`;

          onNotification({ title, body, type: "status", data: newRow });
          showBrowserNotification(title, body);
        }
      }
    )
    .subscribe();

  return channel;
}

// Cleanup — call when user logs out
export function unsubscribeAll() {
  supabase.removeAllChannels();
}
