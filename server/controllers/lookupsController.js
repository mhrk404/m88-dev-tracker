import { supabase } from '../config/supabase.js';

export const getAll = async (req, res) => {
  try {
    const type = req.query.type?.toLowerCase();
    if (type) {
      const table = type.replace(/-/g, '_');
      const allowed = ['brands', 'seasons', 'divisions', 'product_categories', 'sample_types', 'roles'];
      if (!allowed.includes(table)) {
        return res.status(400).json({ error: 'type must be one of: brands, seasons, divisions, product_categories, sample_types, roles' });
      }
      const { data, error } = await supabase.from(table).select('*').order('name');
      if (error) throw error;
      return res.json(data ?? []);
    }
    const [brands, seasons, divisions, product_categories, sample_types, roles] = await Promise.all([
      supabase.from('brands').select('*').order('name'),
      supabase.from('seasons').select('*').order('year', { ascending: false }).order('name'),
      supabase.from('divisions').select('*').order('name'),
      supabase.from('product_categories').select('*').order('name'),
      supabase.from('sample_types').select('*').order('name'),
      supabase.from('roles').select('*').order('name'),
    ]);
    if (brands.error) throw brands.error;
    if (seasons.error) throw seasons.error;
    if (divisions.error) throw divisions.error;
    if (product_categories.error) throw product_categories.error;
    if (sample_types.error) throw sample_types.error;
    if (roles.error) throw roles.error;
    return res.json({
      brands: brands.data ?? [],
      seasons: seasons.data ?? [],
      divisions: divisions.data ?? [],
      product_categories: product_categories.data ?? [],
      sample_types: sample_types.data ?? [],
      roles: roles.data ?? [],
    });
  } catch (err) {
    console.error('lookups getAll:', err);
    return res.status(500).json({ error: err.message ?? 'Failed to get lookups' });
  }
};
