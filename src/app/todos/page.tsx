import { cookies } from "next/headers";

import { createClient } from "@/utils/supabase/server";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: todos, error } = await supabase.from("todos").select();

  if (error) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Could not load todos: {error.message}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2 p-6">
      {todos?.map((todo: { id: string; name: string }) => (
        <li key={todo.id}>{todo.name}</li>
      ))}
    </ul>
  );
}
