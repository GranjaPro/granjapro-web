"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockTasks } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function TasksChecklist() {
  const [tasks, setTasks] = useState(mockTasks);

  const doneCount = tasks.filter((t) => t.done).length;

  function toggleTask(id: number) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-800">
            Tarefas de Hoje
          </CardTitle>
          <Badge variant="secondary">
            {doneCount}/{tasks.length}
          </Badge>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
          <div
            className="h-1.5 rounded-full bg-brand-600 transition-all duration-300"
            style={{ width: `${(doneCount / tasks.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className="flex w-full items-center gap-3 rounded-lg px-1 py-2.5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
          >
            {task.done ? (
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-brand-600" />
            ) : (
              <Circle className="h-5 w-5 flex-shrink-0 text-gray-300" />
            )}
            <span
              className={cn(
                "flex-1 text-sm",
                task.done ? "text-gray-400 line-through" : "text-gray-800"
              )}
            >
              {task.title}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              {task.time}
            </span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
