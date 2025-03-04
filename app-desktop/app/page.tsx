"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, Reorder, motion } from "framer-motion"
import { Plus, Minus, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface TodoItem {
  id: string
  text: string
  completed: boolean
}

export default function TodoApp() {
  const [appState, setAppState] = useState<"welcome" | "create" | "complete" | "accomplished">("welcome")
  const [items, setItems] = useState<TodoItem[]>([{ id: "1", text: "", completed: false }])

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), text: "", completed: false }])
  }

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const updateItemText = (id: string, text: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, text } : item)))
  }

  const toggleComplete = (id: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)))
  }

  // Find the first uncompleted item
  const firstUncompletedIndex = items.findIndex((item) => !item.completed)

  // Check if all tasks are completed and there are tasks
  useEffect(() => {
    if (appState === "complete" && items.length > 0 && items.every((item) => item.completed)) {
      const timer = setTimeout(() => {
        setAppState("accomplished")
      }, 1000) // Delay for a second to show all tasks completed
      return () => clearTimeout(timer)
    }
  }, [items, appState])

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {appState === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <button
              onClick={() => setAppState("create")}
              className="w-full p-6 rounded-lg border border-gray-800 bg-gray-900/50 text-center text-xl font-medium shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all duration-300"
            >
              Ready to lock in?
            </button>
          </motion.div>
        )}

        {appState === "create" && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <h1 className="text-2xl font-bold mb-6 text-center text-white/90">Create Your Action Items</h1>

            <Reorder.Group values={items} onReorder={setItems} className="space-y-3">
              {items.map((item, index) => (
                <Reorder.Item key={item.id} value={item} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-800/50 flex items-center justify-center text-gray-400">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => updateItemText(item.id, e.target.value)}
                    placeholder="Enter task..."
                    className="flex-1 bg-gray-900/50 border border-gray-800 rounded-lg p-3 shadow-[0_0_10px_rgba(255,255,255,0.05)] focus:shadow-[0_0_15px_rgba(255,255,255,0.15)] outline-none transition-all"
                  />
                  <button
                    onClick={() => removeItem(item.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-900/50 border border-red-900/50 text-red-500 shadow-[0_0_10px_rgba(255,0,0,0.2)] hover:shadow-[0_0_15px_rgba(255,0,0,0.3)] transition-all"
                  >
                    <Minus size={16} />
                  </button>
                </Reorder.Item>
              ))}
            </Reorder.Group>

            <div className="mt-6 flex flex-col gap-4">
              <button
                onClick={addItem}
                className="flex items-center justify-center gap-2 p-3 rounded-lg border border-gray-800 bg-gray-900/50 text-gray-300 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all"
              >
                <Plus size={16} />
                Add Step
              </button>

              <button
                onClick={() => setAppState("complete")}
                className="p-3 rounded-lg border border-gray-800 bg-gray-900/50 text-gray-300 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all"
              >
                Complete List
              </button>
            </div>
          </motion.div>
        )}

        {appState === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <h1 className="text-2xl font-bold mb-6 text-center text-white/90">Your Action Items</h1>

            <div className="space-y-3">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border border-gray-800 bg-gray-900/50 transition-all",
                    index === firstUncompletedIndex &&
                      !item.completed &&
                      "border-gray-600 shadow-[0_0_15px_rgba(255,255,255,0.2)]",
                  )}
                >
                  <button
                    onClick={() => toggleComplete(item.id)}
                    className={cn(
                      "w-6 h-6 rounded-full border flex items-center justify-center transition-all",
                      item.completed
                        ? "border-green-500 text-green-500 shadow-[0_0_10px_rgba(0,255,0,0.2)]"
                        : "border-gray-600 text-transparent",
                    )}
                  >
                    {item.completed && <CheckCircle2 size={16} />}
                  </button>
                  <span className={cn("flex-1", item.completed && "text-gray-500 line-through")}>
                    {item.text || "Untitled task"}
                  </span>
                  <div className="w-6 h-6 rounded-full bg-gray-800/50 flex items-center justify-center text-gray-500 text-xs">
                    {index + 1}
                  </div>
                </motion.div>
              ))}
            </div>

            <button
              onClick={() => setAppState("create")}
              className="mt-6 w-full p-3 rounded-lg border border-gray-800 bg-gray-900/50 text-gray-300 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:shadow-[0_0_15px_rgba(255,255,255,0.15)] transition-all"
            >
              Edit List
            </button>
          </motion.div>
        )}

        {appState === "accomplished" && (
          <motion.div
            key="accomplished"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-md flex flex-col items-center"
          >
            <motion.h1
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-3xl font-bold mb-6 text-center text-white"
            >
              Mission Accomplished
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-12"
            >
              <button
                onClick={() => {
                  setAppState("welcome")
                  setItems([{ id: "1", text: "", completed: false }])
                }}
                className="px-6 py-3 rounded-lg border border-gray-800 bg-gray-900/50 text-gray-300 shadow-[0_0_10px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-all"
              >
                More to get done?
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

