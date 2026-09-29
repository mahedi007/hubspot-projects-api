const { Router } = require('express');
const projectService = require('../services/projectService');

const router = Router();

router.post('/', async (req, res) => {
  res.status(201).json(await projectService.createProject(req.body));
});

router.get('/', async (req, res) => {
  const { limit, after, status } = req.query;
  res.json(await projectService.listProjects({ limit, after, status }));
});

router.get('/:id', async (req, res) => {
  res.json(await projectService.getProject(req.params.id, { idProperty: req.query.idProperty }));
});

router.patch('/:id', async (req, res) => {
  res.json(await projectService.updateProject(req.params.id, req.body));
});

router.put('/:id/associations/:toType/:toId', async (req, res) => {
  const { id, toType, toId } = req.params;
  res.json(await projectService.associateProject(id, toType, toId));
});

module.exports = router;
