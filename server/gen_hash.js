import bcrypt from 'bcryptjs';
const p = 'password123';
const h = bcrypt.hashSync(p, 10);
console.log('Hash: ' + h);
console.log('Valid: ' + bcrypt.compareSync(p, h));
