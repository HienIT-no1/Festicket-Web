const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function dump() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'VeSuKienDB',
    charset: 'utf8mb4'
  });

  console.log('Connected to MySQL');

  const [tables] = await connection.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
  let sqlDump = 'SET FOREIGN_KEY_CHECKS = 0;\n\n';

  for (const tableObj of tables) {
    const tableName = Object.values(tableObj)[0];
    console.log(`Exporting table: ${tableName}`);

    const [createTableResult] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
    sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
    sqlDump += `${createTableResult[0]['Create Table']};\n\n`;

    const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
    if (rows.length > 0) {
      for (const row of rows) {
        const columns = Object.keys(row).map(c => `\`${c}\``).join(', ');
        const values = Object.values(row).map(v => {
          if (v === null) return 'NULL';
          if (typeof v === 'number') return v;
          if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
          return `'${v.toString().replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
        }).join(', ');
        sqlDump += `INSERT INTO \`${tableName}\` (${columns}) VALUES (${values});\n`;
      }
      sqlDump += '\n';
    }
  }

  sqlDump += 'SET FOREIGN_KEY_CHECKS = 1;\n';
  const outputPath = path.join(__dirname, 'dump_VeSuKienDB.sql');
  fs.writeFileSync(outputPath, sqlDump, 'utf8');
  console.log(`✅ Dump completed: ${outputPath}`);
  await connection.end();
}

dump().catch(err => {
  console.error('❌ Error dumping database:', err);
  process.exit(1);
});
