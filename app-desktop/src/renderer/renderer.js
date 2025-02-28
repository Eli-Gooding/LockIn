document.addEventListener('DOMContentLoaded', () => {
  const taskInput = document.getElementById('task-input');
  const addTaskButton = document.getElementById('add-task');
  const taskList = document.getElementById('task-list');
  const startMonitoringButton = document.getElementById('start-monitoring');
  const notificationDiv = document.getElementById('notification');

  let tasks = [];

  function updateTaskList() {
    taskList.innerHTML = '';
    tasks.forEach((task, index) => {
      const listItem = document.createElement('li');
      listItem.className = 'list-group-item d-flex align-items-center';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'form-check-input me-2';
      checkbox.addEventListener('change', () => {
        task.completed = checkbox.checked;
        // You can add further logic to handle task progress
      });

      const taskText = document.createElement('span');
      taskText.textContent = task.name;

      listItem.appendChild(checkbox);
      listItem.appendChild(taskText);
      taskList.appendChild(listItem);
    });

    // Show start button if there is at least one task
    startMonitoringButton.style.display = tasks.length > 0 ? 'block' : 'none';
  }

  addTaskButton.addEventListener('click', () => {
    const taskName = taskInput.value.trim();
    if (taskName === '') {
      alert('Please enter a task.');
      return;
    }
    tasks.push({ name: taskName, completed: false });
    taskInput.value = '';
    updateTaskList();
  });

  startMonitoringButton.addEventListener('click', () => {
    // This is where you would initiate the screenshot capture and monitoring logic
    alert('Monitoring started!');
    // Hide input elements to lock the checklist if required
  });

  // Placeholder for handling off-track notifications
  function showNotification(message) {
    notificationDiv.textContent = message;
    notificationDiv.style.display = 'block';
  }

  // Example usage of notification
  // showNotification('Focus on your current task!');
}); 