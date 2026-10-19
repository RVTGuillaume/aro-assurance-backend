CREATE SCHEMA IF NOT EXISTS aro_assurance_db;
SET search_path TO aro_assurance_db, public;

CREATE TABLE IF NOT EXISTS administrateurs (
  id SERIAL PRIMARY KEY,
  nom_complet VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  username VARCHAR(80) UNIQUE,
  mot_de_passe_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  statut VARCHAR(20) NOT NULL DEFAULT 'actif',
  photo_profil VARCHAR(500),
  derniere_connexion TIMESTAMPTZ,
  date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_modification TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assures (
  id SERIAL PRIMARY KEY,
  numero_dossier VARCHAR(50) NOT NULL UNIQUE,
  numero_police VARCHAR(50),
  numero_compte VARCHAR(50),
  nom_complet VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  telephone VARCHAR(30),
  agence VARCHAR(100),
  type_assure VARCHAR(20) NOT NULL DEFAULT 'titulaire',
  titulaire_id INTEGER REFERENCES assures(id) ON DELETE SET NULL,
  statut_contrat VARCHAR(20) NOT NULL DEFAULT 'actif',
  photo VARCHAR(500),
  date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_modification TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS declarations (
  id SERIAL PRIMARY KEY,
  assure_id INTEGER NOT NULL REFERENCES assures(id) ON DELETE CASCADE,
  numero_declaration VARCHAR(50) UNIQUE,
  adresse_assure TEXT,
  personne_soignee_nom VARCHAR(150),
  personne_soignee_profession VARCHAR(150),
  personne_soignee_age VARCHAR(20),
  personne_soignee_parente VARCHAR(100),
  autre_garantie_couvre TEXT,
  type_sinistre VARCHAR(50),
  accident_date DATE,
  accident_lieu TEXT,
  accident_constate_par TEXT,
  accident_circonstances TEXT,
  accident_blessures TEXT,
  accident_soigne_par TEXT,
  maladie_type VARCHAR(100),
  maladie_code_oms VARCHAR(50),
  maladie_designation TEXT,
  maladie_soignee_par TEXT,
  maladie_date_debut DATE,
  hospitalisation_etablissement TEXT,
  hospitalisation_date_debut DATE,
  hospitalisation_date_fin DATE,
  hospitalisation_operation_par TEXT,
  hospitalisation_description TEXT,
  soins_dentaires_date_debut DATE,
  soins_dentaires_date_fin DATE,
  soins_dentaires_effectues_par TEXT,
  soins_dentaires_codes_actes TEXT,
  lieu_declaration VARCHAR(150),
  date_sinistre DATE,
  lieu_sinistre TEXT,
  description TEXT,
  montant_estime NUMERIC(14,2),
  etablissement_soins TEXT,
  statut_declaration VARCHAR(30) NOT NULL DEFAULT 'en_attente',
  commentaire_admin TEXT,
  motif_rejet TEXT,
  traite_par INTEGER REFERENCES administrateurs(id) ON DELETE SET NULL,
  date_traitement TIMESTAMPTZ,
  date_declaration TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date_modification TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS declaration_fichiers (
  id SERIAL PRIMARY KEY,
  declaration_id INTEGER NOT NULL REFERENCES declarations(id) ON DELETE CASCADE,
  type_sinistre VARCHAR(50),
  nom_original VARCHAR(255),
  nom_stockage VARCHAR(255),
  chemin_fichier TEXT,
  type_mime VARCHAR(150),
  taille_octets BIGINT,
  source_fichier VARCHAR(30) DEFAULT 'original',
  statut VARCHAR(30) DEFAULT 'complete',
  date_upload TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pieces_jointes (
  id SERIAL PRIMARY KEY,
  declaration_id INTEGER NOT NULL REFERENCES declarations(id) ON DELETE CASCADE,
  nom_fichier_original VARCHAR(255),
  nom_fichier_stocke VARCHAR(255),
  chemin_fichier TEXT,
  type_fichier VARCHAR(150),
  taille_fichier BIGINT,
  categorie_document VARCHAR(50) DEFAULT 'autre',
  hash_fichier VARCHAR(128),
  date_upload TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historique_declarations (
  id SERIAL PRIMARY KEY,
  declaration_id INTEGER NOT NULL REFERENCES declarations(id) ON DELETE CASCADE,
  admin_id INTEGER REFERENCES administrateurs(id) ON DELETE SET NULL,
  action VARCHAR(100),
  ancien_statut VARCHAR(30),
  nouveau_statut VARCHAR(30),
  commentaire TEXT,
  date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  acteur_type VARCHAR(20),
  acteur_id INTEGER,
  action VARCHAR(100),
  table_affectee VARCHAR(100),
  enregistrement_id INTEGER,
  resultat VARCHAR(30),
  ip_address VARCHAR(100),
  user_agent TEXT,
  date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  destinataire_type VARCHAR(20) NOT NULL,
  destinataire_id INTEGER NOT NULL,
  titre VARCHAR(255),
  message TEXT,
  type_notification VARCHAR(30) DEFAULT 'info',
  est_lu BOOLEAN NOT NULL DEFAULT FALSE,
  date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions_assures (
  id SERIAL PRIMARY KEY,
  assure_id INTEGER NOT NULL REFERENCES assures(id) ON DELETE CASCADE,
  token_jwt TEXT,
  ip_address VARCHAR(100),
  user_agent TEXT,
  est_actif BOOLEAN NOT NULL DEFAULT TRUE,
  date_expiration TIMESTAMPTZ,
  date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_reinitialisations (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES administrateurs(id) ON DELETE CASCADE,
  otp_hash VARCHAR(255) NOT NULL,
  date_expiration TIMESTAMPTZ NOT NULL,
  tentatives_restantes INTEGER NOT NULL DEFAULT 5,
  est_utilise BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address VARCHAR(100),
  user_agent TEXT,
  date_creation TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assures_titulaire ON assures(titulaire_id);
CREATE INDEX IF NOT EXISTS idx_declarations_assure ON declarations(assure_id);
CREATE INDEX IF NOT EXISTS idx_declarations_statut ON declarations(statut_declaration);
CREATE INDEX IF NOT EXISTS idx_fichiers_declaration ON declaration_fichiers(declaration_id);
CREATE INDEX IF NOT EXISTS idx_pieces_declaration ON pieces_jointes(declaration_id);
CREATE INDEX IF NOT EXISTS idx_historique_declaration ON historique_declarations(declaration_id);
CREATE INDEX IF NOT EXISTS idx_notifications_dest ON notifications(destinataire_type, destinataire_id);
CREATE INDEX IF NOT EXISTS idx_otp_admin ON otp_reinitialisations(admin_id);
ALTER TABLE assures ADD COLUMN IF NOT EXISTS adresse TEXT;
ALTER TABLE assures ADD COLUMN IF NOT EXISTS date_naissance DATE;
ALTER TABLE assures ADD COLUMN IF NOT EXISTS date_debut_contrat DATE;
ALTER TABLE assures ADD COLUMN IF NOT EXISTS date_fin_contrat DATE;
ALTER TABLE assures ADD COLUMN IF NOT EXISTS parente_avec_titulaire VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS message_erreur TEXT;