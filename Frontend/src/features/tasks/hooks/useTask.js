import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { taskService } from "../services/task.service.js";
import { updateTask as updateTaskAction } from "../store/taskSlice.js";

export function useTask(id) {
  const dispatch = useDispatch();
  const reduxTask = useSelector((state) =>
    state.tasks.tasks.find((t) => t.id === id || t._id === id)
  );

  const [task, setTask] = useState(reduxTask);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (reduxTask) {
      setTask(reduxTask);
    }
  }, [reduxTask]);

  useEffect(() => {
    if (!reduxTask && id) {
      let isMounted = true;
      setLoading(true);
      setError(null);

      taskService
        .getTaskById(id)
        .then((res) => {
          if (!isMounted) return;
          const serverTask = res?.task || res?.data || res;
          if (serverTask) {
            setTask(serverTask);
            dispatch(updateTaskAction(serverTask));
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          setError(err.message || "Failed to fetch task");
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [id, reduxTask, dispatch]);

  return { task: reduxTask || task, loading, error };
}
