const html = document.documentElement;
const toggleButton = document.querySelector('[name="theme-toggle"]');

const theme = () => {
  if (localStorage.getItem("theme")) return localStorage.getItem("theme");
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
};
const detectedTheme = theme();

const getCurrentInvertedTheme = () => invertTheme(theme());

const invertTheme = (originalTheme) =>
  originalTheme === "dark" ? "light" : "dark";

const getIcon = (theme) => (theme === "dark" ? "☾" : "☼");

const getMessage = () => {
  return `Use ${getCurrentInvertedTheme()}-mode`;
};

const toggleTheme = (theme) => {
  const invertedTheme = invertTheme(theme);
  html.classList.add(theme);
  html.classList.remove(invertedTheme);
  toggleButton?.setAttribute("title", getMessage());
  toggleButton?.setAttribute("aria-label", getMessage());
  if (toggleButton) toggleButton.innerHTML = getIcon(invertedTheme);
};

if (detectedTheme) {
  toggleButton?.setAttribute("title", getMessage());
  toggleButton?.setAttribute("aria-label", getMessage());
  if (toggleButton)
    toggleButton.innerHTML = getIcon(invertTheme(detectedTheme));
  if (!localStorage.getItem("theme")) toggleTheme(detectedTheme);
}

toggleButton?.addEventListener("click", () => {
  const invertedTheme = getCurrentInvertedTheme();
  toggleTheme(invertedTheme);
  localStorage.setItem("theme", invertedTheme);
});

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    document.body.style.transition = "color 0.75s ease";
    // Using system theme
    if (localStorage.getItem("theme")) return;
    toggleTheme(e.matches ? "dark" : "light");
  });

const timer = document.getElementById("timer");

const startButton = document.getElementById("start");
const cancelButton = document.getElementById("cancel");

const pomodorosText = document.getElementById("pomodoros");
const breaksText = document.getElementById("breaks");

const addFirstTaskButton = document.getElementById("add-first-task-button");
const addTaskButton = document.getElementById("add-task-button");
const deleteAllTasksButton = document.getElementById("delete-all-tasks-button");

const taskDialog = document.getElementById("task-dialog");
const taskForm = taskDialog?.querySelector("form");
const taskFormCancelButton = taskDialog?.querySelector(
  "button[value='cancel']"
);

const taskTemplate = document.getElementById("task-template");

const destructiveDialog = document.getElementById("destructive-dialog");
const destructiveDialogCancelButton = destructiveDialog.querySelector(
  "button[value='cancel']"
);
const destructiveDialogProceedButton = document.getElementById(
  "destructive-dialog-proceed"
);
const destructiveDialogDescription = document.getElementById(
  "destructive-dialog-description"
);

let intervalId;
let time = new Date(25 * 60 * 1000);
let state = "work";
let pomodoros = 0;
let breaks = 0;

const notifications = [];
let permission;

const getModalInputs = () => {
  const taskNameElement = document.getElementById("task-name");
  const taskDescriptionElement = document.getElementById("task-description");
  const totalPomodorosElement = document.getElementById("task-pomodoros");
  return [taskNameElement, taskDescriptionElement, totalPomodorosElement];
};

const [taskNameElement, taskDescriptionElement, totalPomodorosElement] =
  getModalInputs();

const storeTasksInStorage = () =>
  localStorage.setItem("tasks", JSON.stringify(tasks));

const openEditModal = (task) => {
  taskDialog.setAttribute("data-type", "edit");
  taskDialog.setAttribute("data-task-id", task.id);

  // forced to use querySelector for some reason
  taskForm.querySelector("#task-dialog-title").innerHTML =
    taskForm.querySelector("#task-dialog-confirm").innerHTML = "Edit Task";
  taskForm.querySelector("#task-dialog-description").innerHTML = task.name;

  taskNameElement.value = task.name;
  taskDescriptionElement.value = task.description;
  totalPomodorosElement.value = task.totalPomodoros;

  taskDialog.showModal();
};

const updateConditionalButtons = () => {
  if (tasks.length === 0) {
    addFirstTaskButton.removeAttribute("style");
    addTaskButton.style.display = "none";
    deleteAllTasksButton.style.display = "none";
  } else {
    addFirstTaskButton.style.display = "none";
    addTaskButton.removeAttribute("style");
    // no point in showing an extra button if there is only going to be one anyway
    if (tasks.length > 1) deleteAllTasksButton.removeAttribute("style");
  }
};

const removeTask = (currentTask) => {
  const taskToRemove = tasks.findIndex((task) => task.id === currentTask.id);
  if (tasks.splice(taskToRemove, 1).length === 1)
    tasksElement.removeChild(currentTask.element);

  storeTasksInStorage();
  updateConditionalButtons();
};

const updateTaskElement = (task) => {
  task.element.getElementsByClassName("task-name").item(0).innerHTML =
    task.name;
  task.element.getElementsByClassName("task-description").item(0).innerHTML =
    task.description;
  task.element
    .getElementsByClassName("task-progress")
    .item(0).innerHTML = `${task.pomodoros}/${task.totalPomodoros}`;
};

const tasksElement = document.getElementById("tasks");

const hydrateTask = (task) => {
  const clonedTask = taskTemplate?.cloneNode(true);
  if (clonedTask) {
    clonedTask.removeAttribute("id");
    clonedTask.removeAttribute("style");
    updateTaskElement({
      ...task,
      element: clonedTask,
    });

    task.element = tasksElement?.appendChild(clonedTask);

    // finding task accommodates for reordering of tasks
    task.element.addEventListener("click", () =>
      openEditModal(tasks.find((iteratedTask) => iteratedTask.id === task.id))
    );

    const deleteTaskElement = task.element.querySelector(".delete-task");

    const stopBubbling = (e) => {
      // prevent the child events (click, keydown) from going to the parent
      e.preventDefault();
      e.stopPropagation();
    };

    const deleteAction = () => {
      destructiveDialog.setAttribute("data-action", "single");
      destructiveDialog.setAttribute("data-task-id", task.id);
      destructiveDialogDescription.innerHTML =
        "This will permanently delete this task.";
      destructiveDialog.showModal();
    };

    // workaround for right click on focus (for svg)
    deleteTaskElement.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        deleteAction();
        stopBubbling(e);
      }
    });

    deleteTaskElement.addEventListener("click", (e) => {
      deleteAction();
      stopBubbling(e);
    });

    return task;
  }
};

const getTasksFromStorage = () => {
  const dehydratedTasks = JSON.parse(localStorage.getItem("tasks"));
  const hydratedTasks = dehydratedTasks?.map((task) => hydrateTask(task)) ?? [];

  return hydratedTasks;
};

let hasNotificationPermission = () =>
  permission === "granted" && "Notification" in window;

const getFormattedTime = (date) =>
  date.toLocaleTimeString([], {
    minute: "2-digit",
    second: "2-digit",
  });

const setTitle = (date) => {
  document.title = `${getFormattedTime(date)}`;
};

const setTime = (date) => {
  timer?.setAttribute("datetime", date.getTime());
  timer.innerHTML = getFormattedTime(date);
  setTitle(date);
};

let tasks = [];
tasks = getTasksFromStorage();

setTime(time);
// pomodorosText.innerHTML = pomodoros;
// breaksText.innerHTML = breaks;
taskTemplate.style.display = "none";
deleteAllTasksButton.style.display = "none";
updateConditionalButtons();

const startTimer = (finishCallback) => {
  intervalId = setInterval(() => {
    time.setTime(time.getTime() - 1000);
    if (time <= 0) finishCallback();
    setTime(time);
  }, 1000);

  startButton.innerHTML = "Pause";
};

const pauseTimer = () => {
  clearInterval(intervalId);
  startButton.innerHTML = "Resume";
};

const manageTaskCycle = () => {
  const task = tasks[0];

  if (!task) return;

  // increment pomodoro count (value & html)
  task.pomodoros++;
  task.element.querySelector(
    ".task-progress"
  ).innerHTML = `${task.pomodoros}/${task.totalPomodoros}`;

  // remove task if all pomodoros for task are completed
  if (task.totalPomodoros - task.pomodoros <= 0) removeTask(task);
};

const finishedWorkCycle = () => {
  clearInterval(intervalId);
  state = "break";
  time.setTime(5 * 60 * 1000);

  if (hasNotificationPermission) {
    const notification = new Notification("Pomodoro", {
      body: "Time to start your break!",
    });
    notifications.push(notification);
  }

  pomodoros++;
  // pomodorosText.innerHTML = pomodoros;

  manageTaskCycle();

  startTimer(() => finishedBreakCycle());
};

const finishedBreakCycle = () => {
  clearInterval(intervalId);
  state = "work";
  time.setTime(25 * 60 * 1000);

  if (hasNotificationPermission) {
    const notification = new Notification("Pomodoro", {
      body: "Back to work!",
    });
    notifications.push(notification);
  }

  breaks++;
  // breaksText.innerHTML = breaks;

  startTimer(() => finishedWorkCycle());
};

startButton?.addEventListener("click", async () => {
  if (
    startButton?.innerHTML === "Start" &&
    "Notification" in window &&
    !permission
  )
    permission = await Notification.requestPermission();

  if (startButton?.innerHTML === "Pause") pauseTimer();
  else
    startTimer(() =>
      state === "work" ? finishedWorkCycle() : finishedBreakCycle()
    );
  cancelButton.removeAttribute("disabled");
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    // Tab has become visible so clear the now-stale notification
    notifications.forEach((notification) => notification.close());
    notifications.length = 0;
  }
});

cancelButton?.addEventListener("click", () => {
  clearInterval(intervalId);
  startButton.innerHTML = "Start";
  cancelButton.setAttribute("disabled", "");
  state = "work";
  time.setTime(25 * 60 * 1000);
  setTime(time);
});

const openAddModal = () => {
  taskDialog.setAttribute("data-type", "add");
  taskDialog.showModal();
};

const closeAndClearAddModal = () => {
  taskDialog.removeAttribute("data-task-id");
  taskDialog.close();
  updateConditionalButtons();

  taskNameElement.value = "";
  taskDescriptionElement.value = "";
  totalPomodorosElement.value = 1;

  taskForm.querySelector("#task-dialog-title").innerHTML =
    taskForm.querySelector("#task-dialog-confirm").innerHTML = "Add Task";
  taskForm.querySelector("#task-dialog-description").innerHTML =
    "Add a pomodoro task.";
};

addFirstTaskButton?.addEventListener("click", openAddModal);
addTaskButton?.addEventListener("click", openAddModal);

const closeDestructiveModal = () => {
  updateConditionalButtons();
  destructiveDialog.close();
};

destructiveDialogCancelButton?.addEventListener("click", closeDestructiveModal);
destructiveDialog?.addEventListener("close", closeDestructiveModal);

destructiveDialogProceedButton?.addEventListener("click", () => {
  switch (destructiveDialog.getAttribute("data-action")) {
    case "all": {
      tasks.forEach((task) => tasksElement.removeChild(task.element));
      tasks.length = 0;
      storeTasksInStorage();
      closeDestructiveModal();
      break;
    }
    case "single": {
      const task = tasks.find(
        (t) => t.id === destructiveDialog.getAttribute("data-task-id")
      );
      removeTask(task);
      closeDestructiveModal();
      if (tasks.length === 0) addFirstTaskButton.focus();
      else addTaskButton.focus();
      break;
    }
  }
});

deleteAllTasksButton.addEventListener("click", () => {
  destructiveDialog.setAttribute("data-action", "all");
  destructiveDialogDescription.innerHTML =
    "This action will permanently delete all of your tasks.";
  destructiveDialog.showModal();
});

taskForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  switch (taskDialog.getAttribute("data-type")) {
    case "add": {
      const id = await window.nanoid(10);
      const newTask = addTask({
        id,
        name: taskNameElement?.value,
        description: taskDescriptionElement?.value,
        totalPomodoros: Number(totalPomodorosElement?.value),
        pomodoros: 0,
      });
      closeAndClearAddModal();
      newTask.element.focus();

      addTaskButton.style.display = "flex";
      break;
    }
    case "edit": {
      const updatedTask = updateTask({
        id: taskDialog.getAttribute("data-task-id"),
        name: taskNameElement?.value,
        description: taskDescriptionElement?.value,
        totalPomodoros: Number(totalPomodorosElement?.value),
      });
      closeAndClearAddModal();
      updatedTask.element.focus();

      break;
    }
  }
});

taskFormCancelButton?.addEventListener("click", closeAndClearAddModal);
taskDialog.addEventListener("cancel", closeAndClearAddModal);

const updateTask = (updatedTask) => {
  const index = tasks.findIndex((task) => task.id === updatedTask.id);

  // remove all undefined values from updated task
  Object.keys(updatedTask).forEach((key) => {
    if (updatedTask[key] === undefined) delete updatedTask[key];
  });

  const newTask = {
    // keep old task values but replace new ones provided by function call
    ...tasks[index],
    ...updatedTask,
  };
  tasks[index] = newTask;
  storeTasksInStorage();
  updateTaskElement(newTask);
  return newTask;
};

const addTask = (task) => {
  const hydratedTask = hydrateTask(task);
  tasks.push(hydratedTask);
  storeTasksInStorage();

  return task;
};
