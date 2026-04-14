import React,{useState,useEffect} from 'react'

const Todo = () => {
    const [tasks, setTasks] = useState(() => {
    try {
      const stored = localStorage.getItem("tasks");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [newTask, setNewTask] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  const addTask = () => {
    const trimmed = newTask.trim();
    if (!trimmed) return;

    if (tasks.some((t) => t.text === trimmed)) return;

    const taskObj = {
      id: Date.now(),
      text: trimmed,
      completed: false,
    };

    setTasks((prev) => [...prev, taskObj]);
    setNewTask("");
  };

  const toggleComplete = (id) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, completed: !task.completed }
          : task
      )
    );
  };

  const removeTask = (id) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const updated = [...tasks];
    [updated[index], updated[index - 1]] = [
      updated[index - 1],
      updated[index],
    ];
    setTasks(updated);
  };

  const moveDown = (index) => {
    if (index === tasks.length - 1) return;
    const updated = [...tasks];
    [updated[index], updated[index + 1]] = [
      updated[index + 1],
      updated[index],
    ];
    setTasks(updated);
  };

  const clearCompleted = () => {
    setTasks((prev) => prev.filter((t) => !t.completed));
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === "completed") return task.completed;
    if (filter === "pending") return !task.completed;
    return true;
  });
  return (
     <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-5">
      <div className="w-full max-w-xl bg-slate-900 shadow-xl rounded-2xl p-6 text-white">
        <h1 className="text-3xl font-bold text-center mb-6">
          🚀 Todo List
        </h1>

        {/* Input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Enter task..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            className="flex-1 p-3 rounded-lg bg-slate-800 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            onClick={addTask}
            className="bg-violet-600 hover:bg-violet-700 px-4 rounded-lg font-semibold"
          >
            Add
          </button>
        </div>

        {/* Filters */}
        <div className="flex justify-between mb-4 text-sm">
          <div className="flex gap-2">
            {["all", "completed", "pending"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md ${
                  filter === f
                    ? "bg-violet-600"
                    : "bg-slate-700 hover:bg-slate-600"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={clearCompleted}
            className="text-red-400 hover:text-red-500"
          >
            Clear Completed
          </button>
        </div>

        {/* Task List */}
        <ul className="space-y-2">
          {filteredTasks.length === 0 && (
            <p className="text-center text-slate-400">
              No tasks found
            </p>
          )}

          {filteredTasks.map((task, index) => (
            <li
              key={task.id}
              className="flex items-center justify-between bg-slate-800 p-3 rounded-lg"
            >
              <button
                onClick={() => toggleComplete(task.id)}
                className={`flex-1 text-left mouse ${
                  task.completed
                    ? "line-through text-slate-400"
                    : ""
                }`}
              >
                {task.text}
              </button>

              <div className="flex gap-2 ml-3">
                <button
                  onClick={() => moveUp(index)}
                  className="hover:text-blue-400 mouse"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveDown(index)}
                  className="hover:text-blue-400 mouse"
                >
                  ↓
                </button>
                <button
                  onClick={() => removeTask(task.id)}
                  className="hover:text-red-400 mouse"
                >
                  🗑
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default Todo
