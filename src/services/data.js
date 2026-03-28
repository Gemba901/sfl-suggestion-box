// src/services/data.js
// ================================================
// SUPABASE VERSION — reads/writes real database
// ================================================
import { supabase } from "./supabase";

// Login: find employee by name + phone
function normalizePhone(raw, dialCode = "254") {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith(dialCode)) return digits;            // already has country code
  if (digits.startsWith("0")) return dialCode + digits.slice(1); // local format with leading 0
  return dialCode + digits;                                  // bare local number
}

export async function loginUser(name, phone, dialCode = "254") {
  const cleanPhone = normalizePhone(phone, dialCode);
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

// Get all active departments (unique)
export async function getGembas() {
  const { data } = await supabase
    .from("gemba")
    .select("*")
    .eq("is_active", true)
    .order("department_name");

  if (!data) return [];

  // Deduplicate by department_name — gemba table has one row per job position
  const seen = new Set();
  const unique = [];
  data.forEach((row) => {
    const name = row.department_name;
    if (name && !seen.has(name)) {
      seen.add(name);
      unique.push({ id: row.id, gemba_name: name });
    }
  });
  return unique;
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
    .select("name, owner_title, department")
    .neq("owner_title", "")
    .eq("is_active", true);
  return (data || []).map((e) => ({
    name: e.name,
    title: e.owner_title,
    gemba: e.department,
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
  } else if (user.role === "HOD" || user.role === "HOD/Reviewer") {
    query = query.eq("area", user.department);
  }

  const { data } = await query;
  return (data || []).map((s) => ({
    id: s.suggestion_id,
    dbId: s.id,
    employeeName: s.employee_name,
    submittedDate: s.submitted_date,
    gemba: s.area,
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
    impactRating: s.impact_rating || 0,
    ratingComment: s.rating_comment || "",
  }));
}

// Get suggestions for a specific department (for My Dept tab)
export async function getDeptSuggestions(department) {
  if (!department) return [];

  const { data } = await supabase
    .from("suggestions")
    .select("*")
    .eq("area", department)
    .order("submitted_date", { ascending: false });

  return (data || []).map((s) => ({
    id: s.suggestion_id,
    dbId: s.id,
    employeeName: s.employee_name,
    submittedDate: s.submitted_date,
    gemba: s.area,
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
    impactRating: s.impact_rating || 0,
    ratingComment: s.rating_comment || "",
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

// Upload a media file (image or video) to Supabase Storage
const ALLOWED_MIME_TYPES = ["image/jpeg","image/png","image/webp","image/gif","video/mp4","video/webm","video/quicktime"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function uploadMedia(file) {
  if (file.size > MAX_FILE_SIZE) throw new Error("File too large. Maximum size is 50MB.");
  if (!ALLOWED_MIME_TYPES.includes(file.type)) throw new Error("File type not allowed. Use images (JPEG, PNG, WebP, GIF) or videos (MP4, WebM, MOV).");
  const ext = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage
    .from("suggestion-media")
    .upload(fileName, file, { cacheControl: "3600", upsert: false });
  if (error) { console.error("Upload error:", error); return null; }
  const { data: urlData } = supabase.storage.from("suggestion-media").getPublicUrl(data.path);
  return urlData.publicUrl;
}

// Submit a new suggestion (Employee/Reviewer/Management)
export async function submitSuggestion(user, gemba, problem, suggestion, employeeImpact, mediaUrl) {
  const newId = await getNextId();
  const { data, error } = await supabase
    .from("suggestions")
    .insert({
      suggestion_id: newId,
      employee_name: user.name,
      submitted_date: new Date().toISOString().split("T")[0],
      area: gemba,
      problem: problem,
      suggestion: suggestion,
      primary_impact: employeeImpact || "",
      photo_url: mediaUrl || null,
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

// HOD assign owner + due date only (no status change, no approve/reject)
export async function assignSuggestionOwner(suggestionId, { assignedOwner, dueDate, comment }) {
  const { error } = await supabase
    .from("suggestions")
    .update({
      assigned_owner: assignedOwner,
      due_date: dueDate || null,
      reviewer_comment: comment || "",
    })
    .eq("suggestion_id", suggestionId);
  if (error) throw error;
}

// Review a suggestion (Reviewer)
export async function reviewSuggestion(suggestionId, updates) {
  let newStatus = "Under Review";
  if (updates.reviewDecision === "Approve") newStatus = "Approved";
  if (updates.reviewDecision === "Need Clarification") newStatus = "Need Clarification";
  if (updates.reviewDecision === "On Hold") newStatus = "On Hold";
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
  if (extras.impactRating) updateData.impact_rating = extras.impactRating;
  if (extras.ratingComment) updateData.rating_comment = extras.ratingComment;

  const { error } = await supabase
    .from("suggestions")
    .update(updateData)
    .eq("suggestion_id", id);

  if (error) console.error("Status update error:", error);
}
