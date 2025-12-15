/**
 * Contrôleur Assurés - VERSION POSTGRESQL
 * ARO Assurance Madagascar
 */

import Assure from '../models/Assure.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Récupérer tous les assurés
export const getAllAssures = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      statut = '',
      type = '',
      agence = '',
      sortBy = 'date_creation',
      sortOrder = 'DESC'
    } = req.query;

    const result = await Assure.getAll({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      statut,
      type,
      agence,
      sortBy,
      sortOrder
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Erreur getAllAssures:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des assurés',
      error: error.message
    });
  }
};

// Récupérer un assuré par ID
export const getAssureById = async (req, res) => {
  try {
    const { id } = req.params;
    const assure = await Assure.getById(id);

    if (!assure) {
      return res.status(404).json({
        success: false,
        message: 'Assuré non trouvé'
      });
    }

    res.json({
      success: true,
      data: assure
    });
  } catch (error) {
    console.error('Erreur getAssureById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'assuré',
      error: error.message
    });
  }
};

// Créer un nouvel assuré
export const createAssure = async (req, res) => {
  try {
    console.log('📝 Création assuré - Body:', req.body);

    const data = { ...req.body };
    if (data.titulaire_id === '' || data.titulaire_id === null) {
      data.titulaire_id = null;
    }
    if (data.parente_avec_titulaire === '') {
      data.parente_avec_titulaire = null;
    }

    const result = await Assure.create(data);

    // ✅ POSTGRESQL: result.id au lieu de result.insertId
    console.log('✅ Assuré créé avec succès:', result.id);
    
    res.status(201).json({
      success: true,
      message: 'Assuré créé avec succès',
      data: { id: result.id }
    });
  } catch (error) {
    console.error('❌ Erreur createAssure:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'assuré',
      error: error.message
    });
  }
};

// Mettre à jour un assuré
export const updateAssure = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📝 Mise à jour assuré ${id} - Body:`, req.body);

    const data = { ...req.body };
    if (data.titulaire_id === '' || data.titulaire_id === null) {
      data.titulaire_id = null;
    }
    if (data.parente_avec_titulaire === '') {
      data.parente_avec_titulaire = null;
    }

    await Assure.update(id, data);

    console.log('✅ Assuré mis à jour avec succès');

    res.json({
      success: true,
      message: 'Assuré mis à jour avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur updateAssure:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de l\'assuré',
      error: error.message
    });
  }
};

// Supprimer un assuré
export const deleteAssure = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Suppression assuré ${id}`);

    await Assure.delete(id);

    console.log('✅ Assuré supprimé avec succès');

    res.json({
      success: true,
      message: 'Assuré supprimé avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur deleteAssure:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'assuré',
      error: error.message
    });
  }
};

// Upload photo
export const uploadPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📸 Upload photo pour assuré ${id}`);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    const photoUrl = `/uploads/assures/${req.file.filename}`;
    
    await Assure.update(id, { photo: photoUrl });

    console.log('✅ Photo uploadée avec succès:', photoUrl);

    res.json({
      success: true,
      message: 'Photo mise à jour avec succès',
      data: { photo: photoUrl }
    });
  } catch (error) {
    console.error('❌ Erreur uploadPhoto:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload de la photo',
      error: error.message
    });
  }
};

// Statistiques
export const getStats = async (req, res) => {
  try {
    const stats = await Assure.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erreur getStats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
};

// Liste des agences
export const getAgences = async (req, res) => {
  try {
    const agences = await Assure.getAgences();
    res.json({
      success: true,
      data: agences
    });
  } catch (error) {
    console.error('Erreur getAgences:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des agences',
      error: error.message
    });
  }
};

// Liste des titulaires
export const getTitulaires = async (req, res) => {
  try {
    const titulaires = await Assure.getTitulaires();
    res.json({
      success: true,
      data: titulaires
    });
  } catch (error) {
    console.error('Erreur getTitulaires:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des titulaires',
      error: error.message
    });
  }
};

// Export Excel PROFESSIONNEL (Style iOS/Apple)
export const exportExcel = async (req, res) => {
  try {
    console.log('📊 Export Excel demandé');
    
    const filters = {
      search: req.query.search || '',
      statut: req.query.statut || '',
      type: req.query.type || '',
      agence: req.query.agence || '',
      limit: 10000
    };

    const result = await Assure.getAll(filters);
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ARO Assurance Madagascar';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('Assurés', {
      properties: { tabColor: { argb: 'FF0E7F5C' } },
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    });

    // En-têtes
    worksheet.columns = [
      { header: 'N° Dossier', key: 'numero_dossier', width: 15 },
      { header: 'Nom Complet', key: 'nom_complet', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Téléphone', key: 'telephone', width: 18 },
      { header: 'Date Naissance', key: 'date_naissance', width: 15 },
      { header: 'Agence', key: 'agence', width: 20 },
      { header: 'Type', key: 'type_assure', width: 15 },
      { header: 'Statut', key: 'statut_contrat', width: 12 },
      { header: 'Début Contrat', key: 'date_debut_contrat', width: 15 },
      { header: 'Fin Contrat', key: 'date_fin_contrat', width: 15 }
    ];

    // Style header
    worksheet.getRow(1).height = 35;
    worksheet.getRow(1).font = {
      name: 'SF Pro Display',
      size: 12,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF007AFF' }
    };
    worksheet.getRow(1).alignment = {
      vertical: 'middle',
      horizontal: 'center'
    };
    worksheet.getRow(1).border = {
      bottom: { style: 'thick', color: { argb: 'FF0051D5' } }
    };

    // Données
    result.data.forEach((assure, index) => {
      const row = worksheet.addRow({
        numero_dossier: assure.numero_dossier,
        nom_complet: assure.nom_complet,
        email: assure.email,
        telephone: assure.telephone,
        date_naissance: assure.date_naissance ? new Date(assure.date_naissance).toLocaleDateString('fr-FR') : '',
        agence: assure.agence,
        type_assure: assure.type_assure === 'titulaire' ? 'Titulaire' : 'Ayant droit',
        statut_contrat: assure.statut_contrat.toUpperCase(),
        date_debut_contrat: assure.date_debut_contrat ? new Date(assure.date_debut_contrat).toLocaleDateString('fr-FR') : '',
        date_fin_contrat: assure.date_fin_contrat ? new Date(assure.date_fin_contrat).toLocaleDateString('fr-FR') : ''
      });

      row.height = 28;
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: index % 2 === 0 ? 'FFF5F5F7' : 'FFFFFFFF' }
      };
      row.font = { name: 'SF Pro Text', size: 11 };
      row.alignment = { vertical: 'middle', horizontal: 'left' };

      const statutCell = row.getCell('statut_contrat');
      if (assure.statut_contrat === 'actif') {
        statutCell.font = { color: { argb: 'FF34C759' }, bold: true };
      } else if (assure.statut_contrat === 'resilie') {
        statutCell.font = { color: { argb: 'FFFF3B30' }, bold: true };
      }

      row.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E5EA' } }
      };
    });

    // Footer
    const footerRow = worksheet.addRow([]);
    footerRow.height = 35;
    worksheet.mergeCells(footerRow.number, 1, footerRow.number, 10);
    const footerCell = footerRow.getCell(1);
    footerCell.value = `📊 Total: ${result.data.length} assurés | Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} | ARO Assurance Madagascar`;
    footerCell.font = {
      name: 'SF Pro Display',
      size: 10,
      italic: true,
      color: { argb: 'FF8E8E93' }
    };
    footerCell.alignment = {
      vertical: 'middle',
      horizontal: 'center'
    };

    const filename = `ARO_Assures_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    
    console.log('✅ Export Excel professionnel envoyé');
    res.end();

  } catch (error) {
    console.error('❌ Erreur exportExcel:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'export Excel',
      error: error.message
    });
  }
};
