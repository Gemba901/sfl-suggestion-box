// src/services/data.js
// ================================================
// SUPABASE VERSION — reads/writes real database
// ================================================
import { supabase } from "./supabase";

// Login: find employee by name + phone
export async function loginUser(name, phone) {
  const cleanPhone = phone.replace(/\s/g, "").replace(/^\+/, "");
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .ilike("name", name.trim())
    .eq("phone", cleanPhone)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return data;
}

// Get all active areas
export async function getAreas() {
  const { data } = await supabase
    .from("areas")
    .select("*")
    .eq("is_active", true)
    .order("area_name");
  return data || [];
}

// Get all QCDSMT categories
export async function getQCDSMT() {
  const { data } = await supabase
    .from("qcdsmt")
    .select("*")
    .order("code");
  return data || [];
}

// Get all statuses
export async function getStatusFlow() {
  const { data } = await supabase
    .from("status_flow")
    .select("*")
    .order("status_order");
  return data || [];
}

// Get owners (employees with an owner_title)
export async function getOwners() {
  const { data } = await supabase
    .from("employees")
    .select("name, owner_title, area")
    .neq("owner_title", "")
    .eq("is_active", true);
  return (data || []).map((e) => ({
    name: e.name,
    title: e.owner_title,
    area: e.area,
  }));
}

// Get suggestions — filtered by role
export async function getSuggestions(user) {
  let query = supabase
    .from("suggestions")
    .select("*")
    .order("submitted_date", { ascending: false });

  if (user.role === "Employee") {
    query = query.eq("employee_name", user.name);
  }

  const { data } = await query;
  return (data || []).map((s) => ({
    id: s.suggestion_id,
    dbId: s.id,
    employeeName: s.employee_name,
    submittedDate: s.submitted_date,
    area: s.area,
    problem: s.problem,
    suggestion: s.suggestion,
    photo: s.photo_url,
    status: s.status,
    primaryImpact: s.primary_impact || "",
    secondaryImpact: s.secondary_impact || "",
    reviewDecision: s.review_decision || "",
    reviewerComment: s.reviewer_comment || "",
    assignedOwner: s.assigned_owner || "",
    dueDate: s.due_date || "",
    actionTaken: s.action_taken || "",
    closedDate: s.closed_date || "",
    closedBy: s.closed_by || "",
  }));
}

// Generate next suggestion ID
export async function getNextId() {
  const { data } = await supabase
    .from("suggestions")
    .select("suggestion_id")
    .order("suggestion_id", { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    const lastNum = parseInt(data[0].suggestion_id.replace("SUG-", ""), 10);
    return "SUG-" + String(lastNum + 1).padStart(3, "0");
  }
  return "SUG-001";
}

// Submit a new suggestion (Employee)
export async function submitSuggestion(user, area, problem, suggestion) {
  const newId = await getNextId();
  const { data, error } = await supabase
    .from("suggestions")
    .insert({
      suggestion_id: newId,
      employee_name: user.name,
      submitted_date: new Date().toISOString().split("T")[0],
      area: area,
      problem: problem,
      suggestion: suggestion,
      status: "New",
    })
    .select()
    .single();

  if (error) {
    console.error("Submit error:", error);
    return null;
  }
  return data;
}

// Review a suggestion (Reviewer)
export async function reviewSuggestion(suggestionId, updates) {
  let newStatus = "Under Review";
  if (updates.reviewDecision === "Approve") newStatus = "Approved";
  if (updates.reviewDecision === "Need Clarification") newStatus = "Need Clarification";
  if (updates.reviewDecision === "Reject") newStatus = "Rejected";

  const { error } = await supabase
    .from("suggestions")
    .update({
      primary_impact: updates.primaryImpact,
      secondary_impact: updates.secondaryImpact || "",
      review_decision: updates.reviewDecision,
      assigned_owner: updates.assignedOwner || "",
      due_date: updates.dueDate || null,
      reviewer_comment: updates.reviewerComment || "",
      status: newStatus,
    })
    .eq("suggestion_id", suggestionId);

  if (error) console.error("Review error:", error);
}

// Update suggestion status
export async function updateSuggestionStatus(id, newStatus, extras = {}) {
  const updateData = { status: newStatus };

  if (extras.closedDate) updateData.closed_date = extras.closedDate;
  if (extras.closedBy) updateData.closed_by = extras.closedBy;
  if (extras.actionTaken) updateData.action_taken = extras.actionTaken;

  const { error } = await supabase
    .from("suggestions")
    .update(updateData)
    .eq("suggestion_id", id);

  if (error) console.error("Status update error:", error);
}
