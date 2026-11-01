const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

for (const envPath of [
  path.join(__dirname, '.env'),
  path.join(__dirname, 'src', '.env'),
]) {
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
}

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Documentación Swagger en http://localhost:${PORT}/api-docs`);
});