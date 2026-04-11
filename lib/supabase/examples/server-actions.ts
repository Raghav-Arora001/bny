"use server";

import {
  createUserRecord,
  updateUserRecord,
  deleteUserRecord,
  getUserRecord,
} from "@/lib/supabase/auth-helpers";

/**
 * Create a new item (automatically sets clerk_user_id)
 */
export async function createItem(title: string, description: string) {
  return createUserRecord("items", {
    title,
    description,
  });
}

/**
 * Update an item (verifies ownership before allowing update)
 */
export async function updateItem(id: string, title: string) {
  return updateUserRecord("items", id, { title });
}

/**
 * Delete an item (verifies ownership before allowing delete)
 */
export async function deleteItem(id: string) {
  return deleteUserRecord("items", id);
}

/**
 * Get a single item (verifies user owns it)
 */
export async function getItem(id: string) {
  return getUserRecord("items", id);
}

/**
 * Example: More complex server action with validation
 */
export async function createItemWithValidation(
  title: string,
  description: string,
) {
  // Validate inputs
  if (!title || title.trim().length === 0) {
    throw new Error("Title is required");
  }

  if (title.length > 255) {
    throw new Error("Title must be less than 255 characters");
  }

  if (description && description.length > 1000) {
    throw new Error("Description must be less than 1000 characters");
  }

  // Create record (clerk_user_id is automatically added)
  return createUserRecord("items", {
    title: title.trim(),
    description: description?.trim() || null,
  });
}
