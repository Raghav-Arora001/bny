"use client";

import { insertData } from "@/lib/supabase/examples/server-actions";
import { useFormStatus } from "react-dom";

/**
 * Example: Form with Server Action
 *
 * This shows how to use Supabase Server Actions with a form.
 */

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

export default function FormExample() {
  return (
    <form action={insertData} className="space-y-4">
      <div>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          className="border rounded px-3 py-2 w-full"
        />
      </div>

      <div>
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          required
          className="border rounded px-3 py-2 w-full"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
