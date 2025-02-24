const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

// Get all tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find().sort('order');
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new task
router.post('/', async (req, res) => {
  try {
    const tasksInStatus = await Task.countDocuments({ status: req.body.status || 'todo' });

    const task = new Task({
      title: req.body.title,
      description: req.body.description,
      status: req.body.status || 'todo',
      order: tasksInStatus,
      createdAt: new Date(),
    });

    const newTask = await task.save();
    res.status(201).json(newTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update task status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const updates = {
      status,
      order: req.body.order,
    };

    // Update timestamps based on status change
    if (status === 'doing' && task.status !== 'doing') {
      updates.startedAt = new Date();
    } else if (status === 'completed' && task.status !== 'completed') {
      updates.completedAt = new Date();
    }

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, updates, { new: true });

    res.json(updatedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update task details
router.patch('/:id', async (req, res) => {
  try {
    const { title, description, status } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const updates = {
      ...(title && { title }),
      ...(description && { description }),
    };

    // If status is being updated, handle timestamps
    if (status && status !== task.status) {
      updates.status = status;
      if (status === 'doing' && !task.startedAt) {
        updates.startedAt = new Date();
      } else if (status === 'completed' && !task.completedAt) {
        updates.completedAt = new Date();
      }
    }

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, updates, { new: true });

    res.json(updatedTask);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Reorder remaining tasks
    await Task.updateMany(
      {
        status: task.status,
        order: { $gt: task.order },
      },
      { $inc: { order: -1 } }
    );

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
