-- Alerte SMS OVH remplacée par l'alerte mail : identifiants OVH retirés de la base
DELETE FROM "app_param" WHERE "param" LIKE 'OVH_SMS_%';
