import bcrypt from 'bcryptjs';
import fs from 'fs';
const h = bcrypt.hashSync('password123', 10);
const sql = `UPDATE users SET password_hash = '${h}' WHERE username IN ('admin', 'janelle', 'garrett', 'fiona', 'desi', 'afri', 'lovely');`;
fs.writeFileSync('update_users.sql', sql, 'utf8');
console.log('SQL generated with hash:', h);
