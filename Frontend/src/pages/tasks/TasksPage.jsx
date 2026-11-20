import React, { useState } from "react";
import { PageHeader } from "../../shared/components/layout/PageHeader.jsx";
import { Button } from "../../shared/components/ui/Button.jsx";
import { Modal } from "../../shared/components/ui/Modal.jsx";
import { TaskList } from "../../features/tasks/components/TaskList.jsx";
import { TaskFilter } from "../../features/tasks/components/TaskFilter.jsx";
import { CreateTaskModal } from "../../features/tasks/components/CreateTaskModal.jsx";
import { TaskDetails } from "../../features/tasks/components/TaskDetails.jsx";
import { useTasks } from "../../features/tasks/hooks/useTasks.js";
import { Plus } from "lucide-react";

/**
 * Presentation Layer: TasksPage
 * Layer: pages/tasks/
 * Responsibility: Task overview, filtering, Kanban/list view, modal creation and full-page navigation.
 */
export const TasksPage = () => {
  const { tasks, filter, setFilter, addTask } = useTasks();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const handleCreate = async (data) => {
    try {
      await addTask(data);
      setIsCreateOpen(false);
    } catch (err) {
      console.error("Failed to add task:", err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        subtitle="Manage and organize your team's workflow."
        action={
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover active:scale-98 text-white text-xs font-bold shadow-md shadow-indigo-100 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Create Task</span>
          </Button>
        }
      />

      <TaskFilter currentFilter={filter} onFilterChange={setFilter} />
      <TaskList tasks={tasks} onTaskClick={(task) => setSelectedTask(task)} />

      {/* Modern Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
      />

      {/* Task Details Modal */}
      <Modal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title="Task Overview"
        maxWidth="max-w-2xl"
      >
        <TaskDetails
          task={selectedTask}
          taskId={selectedTask?.id || selectedTask?._id}
          onUpdate={(updated) => setSelectedTask(updated)}
          onDelete={() => setSelectedTask(null)}
          onClose={() => setSelectedTask(null)}
        />
      </Modal>
    </div>
  );
};

export default TasksPage;
