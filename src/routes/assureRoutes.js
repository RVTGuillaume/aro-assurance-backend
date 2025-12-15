/**
 * Routes Assurés - MODE DEBUG SANS AUTH
 * ARO Assurance Madagascar
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

import * as assureController from '../controllers/assureController.js';

// Configuration Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/assures');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'assure-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'));
    }
  }
});

console.log('🔥 Routes assurés chargées (MODE DEBUG - SANS AUTH)');

// ==============================================
// TOUTES LES ROUTES SANS AUTH
// ==============================================

router.get('/test', (req, res) => {
  console.log('✅ Test route OK');
  res.json({ success: true, message: 'Routes assurés OK' });
});

// STATS
router.get('/stats', (req, res, next) => {
  console.log('📊 GET /stats');
  assureController.getStats(req, res, next);
});

router.get('/agences', (req, res, next) => {
  console.log('🏢 GET /agences');
  assureController.getAgences(req, res, next);
});

router.get('/titulaires', (req, res, next) => {
  console.log('👥 GET /titulaires');
  assureController.getTitulaires(req, res, next);
});

// EXPORT (AVANT /:id)
router.get('/export', (req, res, next) => {
  console.log('📥 GET /export');
  assureController.exportExcel(req, res, next);
});

// LIST ALL
router.get('/', (req, res, next) => {
  console.log('📋 GET / (list all)');
  assureController.getAllAssures(req, res, next);
});

// GET BY ID
router.get('/:id', (req, res, next) => {
  console.log(`🔍 GET /${req.params.id}`);
  assureController.getAssureById(req, res, next);
});

// CREATE
router.post('/', (req, res, next) => {
  console.log('➕ POST / - Création assuré');
  console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  assureController.createAssure(req, res, next);
});

// UPDATE
router.put('/:id', (req, res, next) => {
  console.log(`✏️ PUT /${req.params.id} - Mise à jour`);
  console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  assureController.updateAssure(req, res, next);
});

// DELETE
router.delete('/:id', (req, res, next) => {
  console.log(`🗑️ DELETE /${req.params.id}`);
  assureController.deleteAssure(req, res, next);
});

// UPLOAD PHOTO
router.post('/:id/photo', upload.single('photo'), (req, res, next) => {
  console.log(`📸 POST /${req.params.id}/photo`);
  console.log('📁 Fichier:', req.file?.originalname);
  assureController.uploadPhoto(req, res, next);
});

export default router;
