-- Administrative purchase costs; nullable means unknown, never infer costs from selling prices.
-- cost_qc stores integer cents CAD, cost_conakry stores integer GNF.
ALTER TABLE products ADD COLUMN cost_qc INTEGER;
ALTER TABLE products ADD COLUMN cost_conakry INTEGER;
