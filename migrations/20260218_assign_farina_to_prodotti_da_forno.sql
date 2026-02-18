-- Migration: assign foods containing 'farina' to category 'Prodotti da Forno'
-- Run against server/database.sqlite

BEGIN TRANSACTION;
UPDATE tblFood
SET ID_Category = (
  SELECT ID FROM tblFoodCategories WHERE lower(Category) = lower('Prodotti da Forno') LIMIT 1
)
WHERE lower(Food) LIKE '%farina%';

COMMIT;
