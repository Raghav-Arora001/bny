// lib/supabase/examples/full-example.tsx
// Complete example using Clerk + Supabase

"use client";
import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createItem, updateItem, deleteItem } from "./server-actions";

interface Item {
  id: string;
  clerk_user_id: string;
  title: string;
  description: string;
  created_at: string;
}

export default function ItemsList() {
  const { user, isLoaded } = useUser();
  const supabase = createClient();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Fetch items when user is loaded
  useEffect(() => {
    if (isLoaded && user?.id) {
      fetchItems();
    }
  }, [isLoaded, user?.id]);

  // Fetch all items for current user
  const fetchItems = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("clerk_user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching items:", error);
    } else {
      setItems(data as Item[]);
    }
    setLoading(false);
  }, [user?.id, supabase]);

  // Subscribe to real-time changes for current user
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`items:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "items",
          filter: `clerk_user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setItems((prev) => [payload.new as Item, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setItems((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? (payload.new as Item) : item,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            setItems((prev) =>
              prev.filter((item) => item.id !== payload.old.id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabase]);

  // Handle form submission
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await createItem(newTitle, newDescription);
      setNewTitle("");
      setNewDescription("");
    } catch (error) {
      console.error("Failed to create item:", error);
    }
  };

  // Handle update
  const handleUpdate = async (id: string, title: string) => {
    try {
      await updateItem(id, title);
    } catch (error) {
      console.error("Failed to update item:", error);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deleteItem(id);
    } catch (error) {
      console.error("Failed to delete item:", error);
    }
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Please sign in to view your items</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Items</h1>

      {/* Add New Item Form */}
      <form onSubmit={handleAddItem} className="mb-8 p-4 border rounded-lg">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Title</label>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Enter item title"
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Enter item description"
            className="w-full px-3 py-2 border rounded"
            rows={3}
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Item
        </button>
      </form>

      {/* Items List */}
      {loading ? (
        <div>Loading items...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-gray-500">No items yet</div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="p-4 border rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>

              {item.description && (
                <p className="text-gray-600 mb-2">{item.description}</p>
              )}

              <p className="text-xs text-gray-400">
                Created: {new Date(item.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
