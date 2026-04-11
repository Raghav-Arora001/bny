import { createClient } from "@/lib/supabase/client";

/**
 * Example: Using Supabase from a Client Component
 *
 * This shows how to query data from Supabase in a Client Component.
 * For Server Components, use lib/supabase/server.ts instead.
 */

export default function ClientExample() {
  const supabase = createClient();

  // Example: Fetch data from a public table
  const handleFetchData = async () => {
    const { data, error } = await supabase
      .from("your_table_name") // Replace with your table name
      .select("*");

    if (error) {
      console.error("Error:", error);
    } else {
      console.log("Data:", data);
    }
  };

  // Example: Listen to real-time changes
  const handleSubscribe = () => {
    const channel = supabase
      .channel("your_table:*")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "your_table_name",
        },
        (payload) => {
          console.log("Change received!", payload);
        },
      )
      .subscribe();

    // Clean up subscription when done
    return () => {
      supabase.removeChannel(channel);
    };
  };

  return (
    <div>
      <button onClick={handleFetchData}>Fetch Data</button>
      <button onClick={handleSubscribe}>Subscribe to Changes</button>
    </div>
  );
}
