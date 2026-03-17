import express from 'express';
import { body, validationResult } from 'express-validator';
import Project from '../models/Project.js';
import Customer from '../models/Customer.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

const PROJECT_NAME_REGEX = /^[A-Za-z\s]{3,100}$/;

// Get all projects
router.get('/', authenticate, async (req, res) => {
  try {
    const where = {};
    if (req.user.role !== 'ca') {
      where.createdBy = req.user.id;
    }

    if (req.query.customer) {
      where.customerId = req.query.customer;
    }

    const projects = await Project.findAllWithCustomer(where, {
      orderBy: 'p.createdAt DESC'
    });
    
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single project
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findByIdWithCustomer(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (req.user.role !== 'ca' && project.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create project
router.post('/', authenticate, authorize('admin'), [
  body('name').trim().notEmpty().withMessage('Project name is required')
    .matches(PROJECT_NAME_REGEX).withMessage('Project name must contain only alphabets and spaces.'),
  body('customer').notEmpty().withMessage('Customer is required'),
  body('totalBudget').notEmpty().withMessage('Enter a valid project budget greater than zero.').custom((val) => {
    const num = Number(val);
    if (Number.isNaN(num) || num <= 0) throw new Error('Enter a valid project budget greater than zero.');
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const msg = errors.array().map(e => e.msg).join(' ');
      return res.status(400).json({ message: msg, errors: errors.array() });
    }

    const { customer, ...projectData } = req.body;
    projectData.name = (projectData.name || '').trim();
    if (projectData.totalBudget !== undefined) projectData.totalBudget = Number(projectData.totalBudget);

    // Validate customer exists
    const customerExists = await Customer.findById(customer);
    if (!customerExists) {
      return res.status(400).json({ message: 'Invalid customer selected' });
    }

    // Ensure customer belongs to the user (unless CA role)
    if (req.user.role !== 'ca' && customerExists.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'You can only create projects for your own customers' });
    }

    const project = await Project.create({
      ...projectData,
      customerId: customer,
      createdBy: req.user.id
    });

    const projectWithCustomer = await Project.findByIdWithCustomer(project.id);
    
    res.status(201).json(projectWithCustomer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update project
router.put('/:id', authenticate, authorize('admin'), [
  body('name').optional().trim().matches(PROJECT_NAME_REGEX).withMessage('Project name must contain only alphabets and spaces.'),
  body('totalBudget').optional().custom((val) => {
    if (val === undefined || val === null || val === '') return true;
    const num = Number(val);
    if (Number.isNaN(num) || num <= 0) throw new Error('Enter a valid project budget greater than zero.');
    return true;
  })
], async (req, res) => {
  try {
    const valErrors = validationResult(req);
    if (!valErrors.isEmpty()) {
      const msg = valErrors.array().map(e => e.msg).join(' ');
      return res.status(400).json({ message: msg, errors: valErrors.array() });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { customer, ...projectData } = req.body;
    const updateData = { ...projectData };
    if (projectData.name !== undefined) updateData.name = (projectData.name || '').trim();
    if (projectData.totalBudget !== undefined) updateData.totalBudget = Number(projectData.totalBudget);
    if (customer) {
      updateData.customerId = customer;
    }

    await Project.update(req.params.id, updateData);

    const projectWithCustomer = await Project.findByIdWithCustomer(req.params.id);

    res.json(projectWithCustomer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete project
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Project.delete(req.params.id);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
