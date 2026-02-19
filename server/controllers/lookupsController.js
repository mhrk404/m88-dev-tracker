import { supabase } from '../config/supabase.js';

/** Aggregate all lookups into one object for frontend convenience. */
export const getLookups = async (req, res) => {
    try {
        const type = req.query.type;

        // Fetch brands and seasons from DB
        const [brandsRes, seasonsRes, rolesRes] = await Promise.all([
            supabase.from('brands').select('*').order('name'),
            supabase.from('seasons').select('*').order('year', { ascending: false }).order('code'),
            supabase.from('roles').select('*').order('name'),
        ]);

        if (brandsRes.error) throw brandsRes.error;
        if (seasonsRes.error) throw seasonsRes.error;
        if (rolesRes.error) throw rolesRes.error;

        // Try to fetch divisions, product_categories and sample_types from DB.
        // If the tables don't exist or there's an error, fall back to a small default list.
        const [divisionsRes, productCategoriesRes, sampleTypesRes] = await Promise.all([
            supabase.from('divisions').select('*').order('name'),
            supabase.from('product_categories').select('*').order('name'),
            supabase.from('sample_types').select('*').order('name'),
        ]);

        const defaultDivisions = [
            { id: 1, name: 'Mens' },
            { id: 2, name: 'Womens' },
            { id: 3, name: 'Kids' },
            { id: 4, name: 'Accessories' },
            { id: 5, name: 'Footwear' },
        ];

        const defaultProductCategories = [
            { id: 1, name: 'Knit' },
            { id: 2, name: 'Woven' },
            { id: 3, name: 'Sweater' },
            { id: 4, name: 'Denim' },
            { id: 5, name: 'Outerwear' },
            { id: 6, name: 'Tee' },
            { id: 7, name: 'Polo' },
        ];

        const defaultSampleTypes = [
            { id: 1, name: 'P2', group: 'SAMPLE' },
            { id: 2, name: 'Proto', group: 'SAMPLE' },
            { id: 3, name: 'SMS', group: 'SAMPLE' },
            { id: 4, name: 'TOP', group: 'SAMPLE' },
            { id: 5, name: 'Fit', group: 'SAMPLE' },
            { id: 6, name: 'Wear Test', group: 'SAMPLE' },
            { id: 7, name: 'Counter Sample', group: 'SAMPLE' },
        ];

        const divisions = (divisionsRes && !divisionsRes.error && divisionsRes.data) ? divisionsRes.data : defaultDivisions;
        const product_categories = (productCategoriesRes && !productCategoriesRes.error && productCategoriesRes.data) ? productCategoriesRes.data : defaultProductCategories;
        const sample_types = (sampleTypesRes && !sampleTypesRes.error && sampleTypesRes.data) ? sampleTypesRes.data : defaultSampleTypes;

        const allLookups = {
            brands: brandsRes.data || [],
            seasons: seasonsRes.data || [],
            divisions,
            product_categories,
            sample_types,
            roles: rolesRes.data || [],
        };

        if (type && allLookups[type]) {
            return res.json(allLookups[type]);
        }

        return res.json(allLookups);
    } catch (err) {
        console.error('getLookups:', err);
        return res.status(500).json({ error: err.message ?? 'Failed to get lookups' });
    }
};
