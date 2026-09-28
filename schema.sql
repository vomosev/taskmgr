-- TaskMgr MySQL schema
-- Engine: InnoDB, Charset: utf8mb4
--
-- Apply with:
--   mysql -h "$DB_HOST" -u "$DB_USER" -p "$DB_NAME" < schema.sql
--
-- Note: create the database first if it does not exist, e.g.
--   CREATE DATABASE taskmgr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(190) NOT NULL,
  name          VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  name       VARCHAR(120) NOT NULL,
  color      VARCHAR(20) NOT NULL DEFAULT 'accent',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_projects_user (user_id),
  CONSTRAINT fk_projects_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  project_id  INT UNSIGNED NULL DEFAULT NULL,
  title       VARCHAR(200) NOT NULL,
  description TEXT NULL DEFAULT NULL,
  status      ENUM('todo','in_progress','done') NOT NULL DEFAULT 'todo',
  priority    ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  due_date    DATE NULL DEFAULT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tasks_user_status (user_id, status),
  KEY idx_tasks_user_due (user_id, due_date),
  KEY idx_tasks_project (project_id),
  CONSTRAINT fk_tasks_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_tasks_project
    FOREIGN KEY (project_id) REFERENCES projects (id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- sessions (required by express-mysql-session; createDatabaseTable is false)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) NOT NULL,
  expires    INT UNSIGNED NOT NULL,
  data       MEDIUMTEXT NULL,
  PRIMARY KEY (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Optional demo seed data (commented out).
-- The password_hash below is a bcrypt hash placeholder — replace it with a
-- hash generated locally, e.g.
--   node -e "console.log(require('bcryptjs').hashSync('password123', 10))"
-- ---------------------------------------------------------------------------
-- INSERT INTO users (email, name, password_hash) VALUES
--   ('demo@example.com', 'Demo User', '$2a$10$REPLACE_WITH_A_LOCALLY_GENERATED_BCRYPT_HASH');
--
-- INSERT INTO projects (user_id, name, color) VALUES
--   (1, 'Website Redesign', 'accent'),
--   (1, 'Q3 Marketing',     'success'),
--   (1, 'Personal Errands', 'warning');
--
-- INSERT INTO tasks (user_id, project_id, title, description, status, priority, due_date) VALUES
--   (1, 1, 'Audit current landing page',      'Note load times, copy gaps and broken links on the live marketing site.', 'done',        'medium', '2025-03-04'),
--   (1, 1, 'Draft new pricing section',       'Three tiers with a highlighted recommended plan and an annual toggle.',   'in_progress', 'high',   '2025-03-18'),
--   (1, 1, 'Ship responsive navigation',      'Mobile menu must work at 360px with no horizontal scroll.',               'todo',        'high',   '2025-03-25'),
--   (1, 2, 'Write launch announcement email', 'Keep it under 200 words with a single clear call to action.',             'todo',        'medium', '2025-03-12'),
--   (1, 2, 'Book social ad budget',           NULL,                                                                      'todo',        'low',    '2025-04-02'),
--   (1, 3, 'Renew car insurance',             'Compare at least three quotes before renewing.',                          'todo',        'high',   '2025-03-09'),
--   (1, NULL, 'Plan quarterly review',        'Collect metrics from analytics and the support inbox.',                   'todo',        'medium', NULL);