import bcrypt from 'bcrypt';

const password = 'trabajandoando789';

const hash = await bcrypt.hash(password, 10);
console.log(hash);