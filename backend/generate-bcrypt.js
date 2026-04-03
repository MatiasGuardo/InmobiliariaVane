import bcrypt from 'bcrypt';

const password = 'admin123';
const saltRounds = 10;

(async () => {
  const hash = await bcrypt.hash(password, saltRounds);
  console.log('Hash bcrypt para "admin123":');
  console.log(hash);
  console.log('\nUsa este hash en todos los usuarios de testing');
  process.exit(0);
})();

